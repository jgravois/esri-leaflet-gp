/* esri-leaflet-gp - v2.0.3 - Thu Dec 28 2017 14:51:10 GMT-0800 (PST)
 * Copyright (c) 2017 Environmental Systems Research Institute, Inc.
 * Apache-2.0 */
(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('leaflet'), require('esri-leaflet')) :
	typeof define === 'function' && define.amd ? define(['exports', 'leaflet', 'esri-leaflet'], factory) :
	(factory((global.L = global.L || {}, global.L.esri = global.L.esri || {}, global.L.esri.GP = global.L.esri.GP || {}),global.L,global.L.esri));
}(this, function (exports,L,esriLeaflet) { 'use strict';

	L = 'default' in L ? L['default'] : L;

	var version = "2.0.3";

	var Task$1 = esriLeaflet.Task.extend({

	  includes: L.Evented.prototype,

	  // setters: {}, we don't use these because we don't know the ParamName OR value of custom GP services
	  params: {},
	  resultParams: {},

	  initialize: function (options) {
	    // don't replace parent initialize
	    esriLeaflet.Task.prototype.initialize.call(this, options);

	    // if no constuctor options are supplied try and determine if its sync or async and set path via metadata
	    if (!this.options.path && typeof this.options.async === 'undefined') {
	      // assume initially that the service is synchronous
	      this.options.async = false;
	      this.options.path = 'execute';

	      // the parameters below seem wonky to me, but work for both CORS and JSONP requests
	      this._service.metadata(function (error, results) {
	        if (!error) {
	          if (results.executionType === 'esriExecutionTypeSynchronous') {
	            this.options.async = false;
	            this.options.path = 'execute';
	          } else {
	            this.options.async = true;
	            this.options.path = 'submitJob';
	          }
	          this.fire('initialized');
	        } else {
	          // abort
	          return;
	        }
	      }, this);
	    } else {
	      // if async is set, but not path, default to submit job
	      if (this.options.async) {
	        this.options.path = this.options.path ? this.options.path : 'submitJob';
	      }
	      if (!this.options.async) {
	        this.options.path = this.options.path ? this.options.path : 'execute';
	      }
	    }
	  },

	  // doc for various GPInput types can be found here
	  // http://resources.arcgis.com/en/help/arcgis-rest-api/index.html#/GP_Result/02r3000000q7000000/
	  setParam: function (paramName, paramValue) {
	    if (typeof paramValue === 'boolean' || typeof paramValue !== 'object') {
	      // pass through booleans, numbers, strings
	      this.params[paramName] = paramValue;
	      return;
	    } else if (typeof paramValue === 'object' && paramValue.units) {
	      // pass through GPLinearUnit params unmolested also
	      this.params[paramName] = paramValue;
	      return;
	    } else if (paramName === 'geometry') {
	      // convert raw geojson geometries to esri geometries
	      this.params[paramName] = this._setGeometry(paramValue);
	    } else {
	      // otherwise assume its latlng, marker, bounds or geojson and package up an array of esri features
	      var geometryType = this._setGeometryType(paramValue);
	      var esriFeatures = {
	        'features': []
	      };

	      if (geometryType) {
	        esriFeatures.geometryType = geometryType;
	      }
	      if (paramValue.type === 'FeatureCollection' && paramValue.features[0].type === 'Feature') {
	        for (var i = 0; i < paramValue.features.length; i++) {
	          if (paramValue.features[i].type === 'Feature') {
	            // pass through feature attributes and geometries
	            esriFeatures.features.push(esriLeaflet.Util.geojsonToArcGIS(paramValue.features[i]));
	          } else {
	            // otherwise assume the array only contains geometries
	            esriFeatures.features.push({ geometry: esriLeaflet.Util.geojsonToArcGIS(paramValue.features[i].geometry) });
	          }
	        }
	      } else {
	        esriFeatures.features.push({'geometry': this._setGeometry(paramValue)});
	      }
	      this.params[paramName] = esriFeatures;
	    }
	  },

	  // give developer opportunity to point out where the output is going to be available
	  setOutputParam: function (paramName) {
	    this.params.outputParam = paramName;
	  },

	  /* async elevation services need resultParams in order to return Zs (unnecessarily confusing)*/
	  gpAsyncResultParam: function (paramName, paramValue) {
	    this.resultParams[paramName] = paramValue;
	  },

	  // we currently expect a single geometry or feature (ported from: Tasks.Query._setGeometry)
	  _setGeometry: function (geometry) {
	    // convert bounds to extent and finish
	    if (geometry instanceof L.LatLngBounds) {
	      return L.esri.Util.boundsToExtent(geometry);
	    }

	    // convert L.Marker > L.LatLng
	    if (geometry.getLatLng) {
	      geometry = geometry.getLatLng();
	    }

	    // convert L.LatLng to a geojson point and continue;
	    if (geometry instanceof L.LatLng) {
	      geometry = {
	        type: 'Point',
	        coordinates: [geometry.lng, geometry.lat]
	      };
	    }

	    // handle L.GeoJSON, pull out the first geometry
	    if (geometry instanceof L.GeoJSON) {
	      // reassign geometry to the GeoJSON value  (we assume one feature is present)
	      geometry = geometry.getLayers()[0].feature.geometry;
	      // processedInput.geometryType = Util.geojsonTypeToArcGIS(geometry.type);
	      return esriLeaflet.Util.geojsonToArcGIS(geometry);
	    }

	    // Handle L.Polyline and L.Polygon
	    if (geometry.toGeoJSON) {
	      geometry = geometry.toGeoJSON();
	    }

	    // handle GeoJSON feature by pulling out the geometry
	    if (geometry.type === 'Feature') {
	      // get the geometry of the geojson feature
	      geometry = geometry.geometry;
	    }

	    // confirm that our GeoJSON is a point, line or polygon
	    if (geometry.type === 'Point' || geometry.type === 'LineString' || geometry.type === 'Polygon') {
	      return esriLeaflet.Util.geojsonToArcGIS(geometry);
	      // processedInput.geometryType = Util.geojsonTypeToArcGIS(geometry.type);
	    } else {
	      esriLeaflet.Util.warn('invalid geometry passed as GP input. Should be an L.LatLng, L.LatLngBounds, L.Marker or GeoJSON Point Line or Polygon object');
	    }
	  },

	  _setGeometryType: function (geometry) {
	    if (geometry instanceof L.LatLngBounds) {
	      return 'esriGeometryEnvelope';
	    }

	    // convert L.Marker > L.LatLng
	    if (geometry.getLatLng || geometry instanceof L.LatLng) {
	      return 'esriGeometryPoint';
	    }

	    // handle L.GeoJSON, pull out the first geometry
	    if (geometry instanceof L.GeoJSON) {
	      geometry = geometry.getLayers()[0].feature.geometry;
	      return esriLeaflet.Util.geojsonTypeToArcGIS(geometry.type);
	    }

	    // Handle L.Polyline and L.Polygon
	    if (geometry.toGeoJSON) {
	      geometry = geometry.toGeoJSON();
	    }

	    // handle GeoJSON feature by pulling out the geometry
	    if (geometry.type === 'Feature') {
	      // get the geometry of the geojson feature
	      geometry = geometry.geometry;
	    }

	    // confirm that our GeoJSON is a point, line or polygon
	    if (geometry.type === 'Point' || geometry.type === 'LineString' || geometry.type === 'Polygon') {
	      return esriLeaflet.Util.geojsonTypeToArcGIS(geometry.type);
	    } else if (geometry.type === 'FeatureCollection') {
	      return esriLeaflet.Util.geojsonTypeToArcGIS(geometry.features[0].type);
	    } else {
	      return null;
	    }
	  },

	  run: function (callback, context) {
	    this._done = false;

	    if (this.options.async === true) {
	      /* eslint-disable */
	      this._service.request(this.options.path, this.params, function (error, response) {
	        this._currentJobId = response.jobId;
	        this.checkJob(this._currentJobId, callback, context);
	      }, this);
	      /* eslint-enable */
	    } else {
	      return this._service.request(this.options.path, this.params, function (error, response) {
	        if (!error) {
	          if (response.results) {
	            callback.call(context, error, (response && this._processGPOutput(response)), response);
	          } else if (response.histograms) {
	            callback.call(context, error, response, response);
	          } else if (response.routes) {
	            callback.call(context, error, (response && this._processNetworkAnalystOutput(response)), response);
	          }
	        } else {
	          callback.call(context, error, null, null);
	        }
	      }, this);
	    }
	  },

	  checkJob: function (jobId, callback, context) {
	    var pollJob = function () {
	      /* eslint-disable */
	      this._service.request('jobs/' + jobId, {}, function polledJob (error, response) {
	        if (response.jobStatus === 'esriJobSucceeded') {
	          if (!this._done) {
	            this._done = true;
	            // to do:
	            // refactor to make an array of async requests for output
	            this._service.request('jobs/' + jobId + '/results/' + this.params.outputParam, this.resultParams, function processJobResult (error, response) {
	              callback.call(context, error, (response && this._processAsyncOutput(response)), response);
	            }, this);
	          }
	          window.clearInterval(counter);
	        } else if (response.jobStatus === 'esriJobFailed') {
	          callback.call(context, 'Job Failed', null);
	          window.clearInterval(counter);
	        }
	      }, this);
	      /* eslint-enable */
	    }.bind(this);

	    var counter = window.setInterval(pollJob, this._service.options.asyncInterval * 1000);
	  },

	  _processGPOutput: function (response) {
	    var processedResponse = {};

	    var results = response.results;
	    // grab syncronous results
	    if (this.options.async === false) {
	      // loop through results and pass back, parsing esri json
	      for (var i = 0; i < results.length; i++) {
	        /* jshint ignore:start */
	        processedResponse[results[i].paramName];
	        /* jshint ignore:end */
	        if (results[i].dataType === 'GPFeatureRecordSetLayer') {
	          var featureCollection = esriLeaflet.Util.responseToFeatureCollection(results[i].value);
	          processedResponse[results[i].paramName] = featureCollection;
	        } else {
	          processedResponse[results[i].paramName] = results[i].value;
	        }
	      }
	    } else { // grab async results slightly differently
	      processedResponse.jobId = this._currentJobId;
	      // var responseValue = response.value;
	    }

	    // if output is a raster layer, we also need to stub out a MapService url using jobid
	    if (this.options.async === true && response.dataType === 'GPRasterDataLayer') {
	      var baseURL = this.options.url;
	      var n = baseURL.indexOf('GPServer');
	      var serviceURL = baseURL.slice(0, n) + 'MapServer/';
	      processedResponse.outputMapService = serviceURL + 'jobs/' + this._currentJobId;
	    }

	    return processedResponse;
	  },

	  _processNetworkAnalystOutput: function (response) {
	    var processedResponse = {};

	    if (response.routes.features.length > 0) {
	      var featureCollection = esriLeaflet.Util.responseToFeatureCollection(response.routes);
	      processedResponse.routes = featureCollection;
	    }

	    return processedResponse;
	  },

	  _processAsyncOutput: function (response) {
	    var processedResponse = {};
	    processedResponse.jobId = this._currentJobId;

	    // if output is a raster layer, we also need to stub out a MapService url using jobid
	    if (this.options.async === true && response.dataType === 'GPRasterDataLayer') {
	      var baseURL = this.options.url;
	      var n = baseURL.indexOf('GPServer');
	      var serviceURL = baseURL.slice(0, n) + 'MapServer/';
	      processedResponse.outputMapService = serviceURL + 'jobs/' + this._currentJobId;
	    }

	    // if output is GPFeatureRecordSetLayer, convert to GeoJSON
	    if (response.dataType === 'GPFeatureRecordSetLayer') {
	      var featureCollection = esriLeaflet.Util.responseToFeatureCollection(response.value);
	      processedResponse[response.paramName] = featureCollection;
	    } else {
	      processedResponse[response.paramName] = response.value;
	    }

	    return processedResponse;
	  }

	});

	function task (options) {
	  return new Task$1(options);
	}

	var Service$1 = esriLeaflet.Service.extend({
	  options: {
	    asyncInterval: 1
	  },

	  createTask: function () {
	    return new Task$1(this, this.options);
	  }

	});

	function service (options) {
	  return new Service$1(options);
	}

	exports.VERSION = version;
	exports.Task = Task$1;
	exports.task = task;
	exports.Service = Service$1;
	exports.service = service;

}));
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXNyaS1sZWFmbGV0LWdwLWRlYnVnLmpzIiwic291cmNlcyI6WyIuLi9wYWNrYWdlLmpzb24iLCIuLi9zcmMvVGFza3MvR2VvcHJvY2Vzc2luZy5qcyIsIi4uL3NyYy9TZXJ2aWNlcy9HZW9wcm9jZXNzaW5nLmpzIl0sInNvdXJjZXNDb250ZW50IjpbIntcbiAgXCJuYW1lXCI6IFwiZXNyaS1sZWFmbGV0LWdwXCIsXG4gIFwiZGVzY3JpcHRpb25cIjogXCJBIExlYWZsZXQgcGx1Z2luIGZvciBpbnRlcmFjdGluZyB3aXRoIEFyY0dJUyBnZW9wcm9jZXNzaW5nIHNlcnZpY2VzLlwiLFxuICBcInZlcnNpb25cIjogXCIyLjAuM1wiLFxuICBcImF1dGhvclwiOiBcIkpvaG4gR3Jhdm9pcyA8amdyYXZvaXNAZXNyaS5jb20+IChodHRwOi8vam9obmdyYXZvaXMuY29tKVwiLFxuICBcImJyb3dzZXJcIjogXCJkaXN0L2VzcmktbGVhZmxldC1ncC1kZWJ1Zy5qc1wiLFxuICBcImJ1Z3NcIjoge1xuICAgIFwidXJsXCI6IFwiaHR0cHM6Ly9naXRodWIuY29tL2pncmF2b2lzL2VzcmktbGVhZmxldC1ncC9pc3N1ZXNcIlxuICB9LFxuICBcImNvbnRyaWJ1dG9yc1wiOiBbXG4gICAgXCJKb2huIEdyYXZvaXMgPGpncmF2b2lzQGVzcmkuY29tPiAoaHR0cDovL2pvaG5ncmF2b2lzLmNvbSlcIixcbiAgICBcIk5pY2hvbGFzIEZ1cm5lc3MgPG5mdXJuZXNzQGVzcmkuY29tPiAoaHR0cDovL25peHRhLmdpdGh1Yi5pby8pXCIsXG4gICAgXCJQYXRyaWNrIEFybHQgPHBhcmx0QGVzcmkuY29tPiAoaHR0cDovL3BhdHJpY2thcmx0LmNvbSlcIixcbiAgICBcIlJvd2FuIFdpbnNlbWl1c1wiXG4gIF0sXG4gIFwiZGVwZW5kZW5jaWVzXCI6IHtcbiAgICBcImxlYWZsZXRcIjogXCJeMS4wLjBcIixcbiAgICBcImVzcmktbGVhZmxldFwiOiBcIl4yLjAuMFwiXG4gIH0sXG4gIFwiZGV2RGVwZW5kZW5jaWVzXCI6IHtcbiAgICBcImNoYWlcIjogXCIyLjMuMFwiLFxuICAgIFwiZ2gtcmVsZWFzZVwiOiBcIl4yLjAuMFwiLFxuICAgIFwiaGlnaGxpZ2h0LmpzXCI6IFwiXjguMC4wXCIsXG4gICAgXCJodHRwLXNlcnZlclwiOiBcIl4wLjguNVwiLFxuICAgIFwiaXNwYXJ0YVwiOiBcIl4zLjAuM1wiLFxuICAgIFwiaXN0YW5idWxcIjogXCJeMC40LjJcIixcbiAgICBcImthcm1hXCI6IFwiXjAuMTIuMjRcIixcbiAgICBcImthcm1hLWNoYWktc2lub25cIjogXCJeMC4xLjNcIixcbiAgICBcImthcm1hLWNvdmVyYWdlXCI6IFwiXjAuNS4zXCIsXG4gICAgXCJrYXJtYS1tb2NoYVwiOiBcIl4wLjEuMFwiLFxuICAgIFwia2FybWEtbW9jaGEtcmVwb3J0ZXJcIjogXCJeMC4yLjVcIixcbiAgICBcImthcm1hLXBoYW50b21qcy1sYXVuY2hlclwiOiBcIl4wLjIuMFwiLFxuICAgIFwia2FybWEtc291cmNlbWFwLWxvYWRlclwiOiBcIl4wLjMuNVwiLFxuICAgIFwibWtkaXJwXCI6IFwiXjAuNS4xXCIsXG4gICAgXCJwaGFudG9tanNcIjogXCJeMS45LjE3XCIsXG4gICAgXCJyb2xsdXBcIjogXCJeMC4yNS40XCIsXG4gICAgXCJyb2xsdXAtcGx1Z2luLWpzb25cIjogXCJeMi4wLjBcIixcbiAgICBcInJvbGx1cC1wbHVnaW4tbm9kZS1yZXNvbHZlXCI6IFwiXjEuNC4wXCIsXG4gICAgXCJyb2xsdXAtcGx1Z2luLXVnbGlmeVwiOiBcIl4wLjEuMFwiLFxuICAgIFwic2VtaXN0YW5kYXJkXCI6IFwiXjcuMC41XCIsXG4gICAgXCJzaW5vblwiOiBcIl4xLjExLjFcIixcbiAgICBcInNpbm9uLWNoYWlcIjogXCIyLjcuMFwiLFxuICAgIFwic25henp5XCI6IFwiXjIuMC4xXCIsXG4gICAgXCJ1Z2xpZnktanNcIjogXCJeMi42LjFcIixcbiAgICBcIndhdGNoXCI6IFwiXjAuMTcuMVwiXG4gIH0sXG4gIFwiaG9tZXBhZ2VcIjogXCJodHRwczovL2dpdGh1Yi5jb20vamdyYXZvaXMvZXNyaS1sZWFmbGV0LWdwXCIsXG4gIFwianNuZXh0Om1haW5cIjogXCJzcmMvRXNyaUxlYWZsZXRHUC5qc1wiLFxuICBcImpzcG1cIjoge1xuICAgIFwicmVnaXN0cnlcIjogXCJucG1cIixcbiAgICBcImZvcm1hdFwiOiBcImVzNlwiLFxuICAgIFwibWFpblwiOiBcInNyYy9Fc3JpTGVhZmxldEdQLmpzXCJcbiAgfSxcbiAgXCJsaWNlbnNlXCI6IFwiQXBhY2hlLTIuMFwiLFxuICBcIm1haW5cIjogXCJkaXN0L2VzcmktbGVhZmxldC1ncC1kZWJ1Zy5qc1wiLFxuICBcInJlYWRtZUZpbGVuYW1lXCI6IFwiUkVBRE1FLm1kXCIsXG4gIFwicmVwb3NpdG9yeVwiOiB7XG4gICAgXCJ0eXBlXCI6IFwiZ2l0XCIsXG4gICAgXCJ1cmxcIjogXCJodHRwczovL2dpdGh1Yi5jb20vamdyYXZvaXMvZXNyaS1sZWFmbGV0LWdwLmdpdFwiXG4gIH0sXG4gIFwic2NyaXB0c1wiOiB7XG4gICAgXCJwcmVidWlsZFwiOiBcIm1rZGlycCBkaXN0XCIsXG4gICAgXCJidWlsZFwiOiBcInJvbGx1cCAtYyBwcm9maWxlcy9kZWJ1Zy5qcyAmIHJvbGx1cCAtYyBwcm9maWxlcy9wcm9kdWN0aW9uLmpzXCIsXG4gICAgXCJsaW50XCI6IFwic2VtaXN0YW5kYXJkIHNyYy8qKi8qLmpzIHwgc25henp5XCIsXG4gICAgXCJwcmVwdWJsaXNoXCI6IFwibnBtIHJ1biBidWlsZFwiLFxuICAgIFwicHJldGVzdFwiOiBcIm5wbSBydW4gYnVpbGRcIixcbiAgICBcInRlc3RcIjogXCJucG0gcnVuIGxpbnQgJiYga2FybWEgc3RhcnRcIixcbiAgICBcInJlbGVhc2VcIjogXCIuL3NjcmlwdHMvcmVsZWFzZS5zaFwiLFxuICAgIFwic3RhcnRcIjogXCJ3YXRjaCAnbnBtIHJ1biBidWlsZCcgc3JjICYgaHR0cC1zZXJ2ZXIgLXAgNTAwMCAtYy0xIC1vXCJcbiAgfVxufVxuIiwiLypcbnRvIGRvOlxuc2V0UGFyYW0oW10pXG4qL1xuXG5pbXBvcnQgTCBmcm9tICdsZWFmbGV0JztcbmltcG9ydCB7IFRhc2sgYXMgQmFzZVRhc2ssIFV0aWwgfSBmcm9tICdlc3JpLWxlYWZsZXQnO1xuXG5leHBvcnQgdmFyIFRhc2sgPSBCYXNlVGFzay5leHRlbmQoe1xuXG4gIGluY2x1ZGVzOiBMLkV2ZW50ZWQucHJvdG90eXBlLFxuXG4gIC8vIHNldHRlcnM6IHt9LCB3ZSBkb24ndCB1c2UgdGhlc2UgYmVjYXVzZSB3ZSBkb24ndCBrbm93IHRoZSBQYXJhbU5hbWUgT1IgdmFsdWUgb2YgY3VzdG9tIEdQIHNlcnZpY2VzXG4gIHBhcmFtczoge30sXG4gIHJlc3VsdFBhcmFtczoge30sXG5cbiAgaW5pdGlhbGl6ZTogZnVuY3Rpb24gKG9wdGlvbnMpIHtcbiAgICAvLyBkb24ndCByZXBsYWNlIHBhcmVudCBpbml0aWFsaXplXG4gICAgQmFzZVRhc2sucHJvdG90eXBlLmluaXRpYWxpemUuY2FsbCh0aGlzLCBvcHRpb25zKTtcblxuICAgIC8vIGlmIG5vIGNvbnN0dWN0b3Igb3B0aW9ucyBhcmUgc3VwcGxpZWQgdHJ5IGFuZCBkZXRlcm1pbmUgaWYgaXRzIHN5bmMgb3IgYXN5bmMgYW5kIHNldCBwYXRoIHZpYSBtZXRhZGF0YVxuICAgIGlmICghdGhpcy5vcHRpb25zLnBhdGggJiYgdHlwZW9mIHRoaXMub3B0aW9ucy5hc3luYyA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgIC8vIGFzc3VtZSBpbml0aWFsbHkgdGhhdCB0aGUgc2VydmljZSBpcyBzeW5jaHJvbm91c1xuICAgICAgdGhpcy5vcHRpb25zLmFzeW5jID0gZmFsc2U7XG4gICAgICB0aGlzLm9wdGlvbnMucGF0aCA9ICdleGVjdXRlJztcblxuICAgICAgLy8gdGhlIHBhcmFtZXRlcnMgYmVsb3cgc2VlbSB3b25reSB0byBtZSwgYnV0IHdvcmsgZm9yIGJvdGggQ09SUyBhbmQgSlNPTlAgcmVxdWVzdHNcbiAgICAgIHRoaXMuX3NlcnZpY2UubWV0YWRhdGEoZnVuY3Rpb24gKGVycm9yLCByZXN1bHRzKSB7XG4gICAgICAgIGlmICghZXJyb3IpIHtcbiAgICAgICAgICBpZiAocmVzdWx0cy5leGVjdXRpb25UeXBlID09PSAnZXNyaUV4ZWN1dGlvblR5cGVTeW5jaHJvbm91cycpIHtcbiAgICAgICAgICAgIHRoaXMub3B0aW9ucy5hc3luYyA9IGZhbHNlO1xuICAgICAgICAgICAgdGhpcy5vcHRpb25zLnBhdGggPSAnZXhlY3V0ZSc7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMub3B0aW9ucy5hc3luYyA9IHRydWU7XG4gICAgICAgICAgICB0aGlzLm9wdGlvbnMucGF0aCA9ICdzdWJtaXRKb2InO1xuICAgICAgICAgIH1cbiAgICAgICAgICB0aGlzLmZpcmUoJ2luaXRpYWxpemVkJyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgLy8gYWJvcnRcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgIH0sIHRoaXMpO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBpZiBhc3luYyBpcyBzZXQsIGJ1dCBub3QgcGF0aCwgZGVmYXVsdCB0byBzdWJtaXQgam9iXG4gICAgICBpZiAodGhpcy5vcHRpb25zLmFzeW5jKSB7XG4gICAgICAgIHRoaXMub3B0aW9ucy5wYXRoID0gdGhpcy5vcHRpb25zLnBhdGggPyB0aGlzLm9wdGlvbnMucGF0aCA6ICdzdWJtaXRKb2InO1xuICAgICAgfVxuICAgICAgaWYgKCF0aGlzLm9wdGlvbnMuYXN5bmMpIHtcbiAgICAgICAgdGhpcy5vcHRpb25zLnBhdGggPSB0aGlzLm9wdGlvbnMucGF0aCA/IHRoaXMub3B0aW9ucy5wYXRoIDogJ2V4ZWN1dGUnO1xuICAgICAgfVxuICAgIH1cbiAgfSxcblxuICAvLyBkb2MgZm9yIHZhcmlvdXMgR1BJbnB1dCB0eXBlcyBjYW4gYmUgZm91bmQgaGVyZVxuICAvLyBodHRwOi8vcmVzb3VyY2VzLmFyY2dpcy5jb20vZW4vaGVscC9hcmNnaXMtcmVzdC1hcGkvaW5kZXguaHRtbCMvR1BfUmVzdWx0LzAycjMwMDAwMDBxNzAwMDAwMC9cbiAgc2V0UGFyYW06IGZ1bmN0aW9uIChwYXJhbU5hbWUsIHBhcmFtVmFsdWUpIHtcbiAgICBpZiAodHlwZW9mIHBhcmFtVmFsdWUgPT09ICdib29sZWFuJyB8fCB0eXBlb2YgcGFyYW1WYWx1ZSAhPT0gJ29iamVjdCcpIHtcbiAgICAgIC8vIHBhc3MgdGhyb3VnaCBib29sZWFucywgbnVtYmVycywgc3RyaW5nc1xuICAgICAgdGhpcy5wYXJhbXNbcGFyYW1OYW1lXSA9IHBhcmFtVmFsdWU7XG4gICAgICByZXR1cm47XG4gICAgfSBlbHNlIGlmICh0eXBlb2YgcGFyYW1WYWx1ZSA9PT0gJ29iamVjdCcgJiYgcGFyYW1WYWx1ZS51bml0cykge1xuICAgICAgLy8gcGFzcyB0aHJvdWdoIEdQTGluZWFyVW5pdCBwYXJhbXMgdW5tb2xlc3RlZCBhbHNvXG4gICAgICB0aGlzLnBhcmFtc1twYXJhbU5hbWVdID0gcGFyYW1WYWx1ZTtcbiAgICAgIHJldHVybjtcbiAgICB9IGVsc2UgaWYgKHBhcmFtTmFtZSA9PT0gJ2dlb21ldHJ5Jykge1xuICAgICAgLy8gY29udmVydCByYXcgZ2VvanNvbiBnZW9tZXRyaWVzIHRvIGVzcmkgZ2VvbWV0cmllc1xuICAgICAgdGhpcy5wYXJhbXNbcGFyYW1OYW1lXSA9IHRoaXMuX3NldEdlb21ldHJ5KHBhcmFtVmFsdWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBvdGhlcndpc2UgYXNzdW1lIGl0cyBsYXRsbmcsIG1hcmtlciwgYm91bmRzIG9yIGdlb2pzb24gYW5kIHBhY2thZ2UgdXAgYW4gYXJyYXkgb2YgZXNyaSBmZWF0dXJlc1xuICAgICAgdmFyIGdlb21ldHJ5VHlwZSA9IHRoaXMuX3NldEdlb21ldHJ5VHlwZShwYXJhbVZhbHVlKTtcbiAgICAgIHZhciBlc3JpRmVhdHVyZXMgPSB7XG4gICAgICAgICdmZWF0dXJlcyc6IFtdXG4gICAgICB9O1xuXG4gICAgICBpZiAoZ2VvbWV0cnlUeXBlKSB7XG4gICAgICAgIGVzcmlGZWF0dXJlcy5nZW9tZXRyeVR5cGUgPSBnZW9tZXRyeVR5cGU7XG4gICAgICB9XG4gICAgICBpZiAocGFyYW1WYWx1ZS50eXBlID09PSAnRmVhdHVyZUNvbGxlY3Rpb24nICYmIHBhcmFtVmFsdWUuZmVhdHVyZXNbMF0udHlwZSA9PT0gJ0ZlYXR1cmUnKSB7XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcGFyYW1WYWx1ZS5mZWF0dXJlcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgIGlmIChwYXJhbVZhbHVlLmZlYXR1cmVzW2ldLnR5cGUgPT09ICdGZWF0dXJlJykge1xuICAgICAgICAgICAgLy8gcGFzcyB0aHJvdWdoIGZlYXR1cmUgYXR0cmlidXRlcyBhbmQgZ2VvbWV0cmllc1xuICAgICAgICAgICAgZXNyaUZlYXR1cmVzLmZlYXR1cmVzLnB1c2goVXRpbC5nZW9qc29uVG9BcmNHSVMocGFyYW1WYWx1ZS5mZWF0dXJlc1tpXSkpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBvdGhlcndpc2UgYXNzdW1lIHRoZSBhcnJheSBvbmx5IGNvbnRhaW5zIGdlb21ldHJpZXNcbiAgICAgICAgICAgIGVzcmlGZWF0dXJlcy5mZWF0dXJlcy5wdXNoKHsgZ2VvbWV0cnk6IFV0aWwuZ2VvanNvblRvQXJjR0lTKHBhcmFtVmFsdWUuZmVhdHVyZXNbaV0uZ2VvbWV0cnkpIH0pO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZXNyaUZlYXR1cmVzLmZlYXR1cmVzLnB1c2goeydnZW9tZXRyeSc6IHRoaXMuX3NldEdlb21ldHJ5KHBhcmFtVmFsdWUpfSk7XG4gICAgICB9XG4gICAgICB0aGlzLnBhcmFtc1twYXJhbU5hbWVdID0gZXNyaUZlYXR1cmVzO1xuICAgIH1cbiAgfSxcblxuICAvLyBnaXZlIGRldmVsb3BlciBvcHBvcnR1bml0eSB0byBwb2ludCBvdXQgd2hlcmUgdGhlIG91dHB1dCBpcyBnb2luZyB0byBiZSBhdmFpbGFibGVcbiAgc2V0T3V0cHV0UGFyYW06IGZ1bmN0aW9uIChwYXJhbU5hbWUpIHtcbiAgICB0aGlzLnBhcmFtcy5vdXRwdXRQYXJhbSA9IHBhcmFtTmFtZTtcbiAgfSxcblxuICAvKiBhc3luYyBlbGV2YXRpb24gc2VydmljZXMgbmVlZCByZXN1bHRQYXJhbXMgaW4gb3JkZXIgdG8gcmV0dXJuIFpzICh1bm5lY2Vzc2FyaWx5IGNvbmZ1c2luZykqL1xuICBncEFzeW5jUmVzdWx0UGFyYW06IGZ1bmN0aW9uIChwYXJhbU5hbWUsIHBhcmFtVmFsdWUpIHtcbiAgICB0aGlzLnJlc3VsdFBhcmFtc1twYXJhbU5hbWVdID0gcGFyYW1WYWx1ZTtcbiAgfSxcblxuICAvLyB3ZSBjdXJyZW50bHkgZXhwZWN0IGEgc2luZ2xlIGdlb21ldHJ5IG9yIGZlYXR1cmUgKHBvcnRlZCBmcm9tOiBUYXNrcy5RdWVyeS5fc2V0R2VvbWV0cnkpXG4gIF9zZXRHZW9tZXRyeTogZnVuY3Rpb24gKGdlb21ldHJ5KSB7XG4gICAgLy8gY29udmVydCBib3VuZHMgdG8gZXh0ZW50IGFuZCBmaW5pc2hcbiAgICBpZiAoZ2VvbWV0cnkgaW5zdGFuY2VvZiBMLkxhdExuZ0JvdW5kcykge1xuICAgICAgcmV0dXJuIEwuZXNyaS5VdGlsLmJvdW5kc1RvRXh0ZW50KGdlb21ldHJ5KTtcbiAgICB9XG5cbiAgICAvLyBjb252ZXJ0IEwuTWFya2VyID4gTC5MYXRMbmdcbiAgICBpZiAoZ2VvbWV0cnkuZ2V0TGF0TG5nKSB7XG4gICAgICBnZW9tZXRyeSA9IGdlb21ldHJ5LmdldExhdExuZygpO1xuICAgIH1cblxuICAgIC8vIGNvbnZlcnQgTC5MYXRMbmcgdG8gYSBnZW9qc29uIHBvaW50IGFuZCBjb250aW51ZTtcbiAgICBpZiAoZ2VvbWV0cnkgaW5zdGFuY2VvZiBMLkxhdExuZykge1xuICAgICAgZ2VvbWV0cnkgPSB7XG4gICAgICAgIHR5cGU6ICdQb2ludCcsXG4gICAgICAgIGNvb3JkaW5hdGVzOiBbZ2VvbWV0cnkubG5nLCBnZW9tZXRyeS5sYXRdXG4gICAgICB9O1xuICAgIH1cblxuICAgIC8vIGhhbmRsZSBMLkdlb0pTT04sIHB1bGwgb3V0IHRoZSBmaXJzdCBnZW9tZXRyeVxuICAgIGlmIChnZW9tZXRyeSBpbnN0YW5jZW9mIEwuR2VvSlNPTikge1xuICAgICAgLy8gcmVhc3NpZ24gZ2VvbWV0cnkgdG8gdGhlIEdlb0pTT04gdmFsdWUgICh3ZSBhc3N1bWUgb25lIGZlYXR1cmUgaXMgcHJlc2VudClcbiAgICAgIGdlb21ldHJ5ID0gZ2VvbWV0cnkuZ2V0TGF5ZXJzKClbMF0uZmVhdHVyZS5nZW9tZXRyeTtcbiAgICAgIC8vIHByb2Nlc3NlZElucHV0Lmdlb21ldHJ5VHlwZSA9IFV0aWwuZ2VvanNvblR5cGVUb0FyY0dJUyhnZW9tZXRyeS50eXBlKTtcbiAgICAgIHJldHVybiBVdGlsLmdlb2pzb25Ub0FyY0dJUyhnZW9tZXRyeSk7XG4gICAgfVxuXG4gICAgLy8gSGFuZGxlIEwuUG9seWxpbmUgYW5kIEwuUG9seWdvblxuICAgIGlmIChnZW9tZXRyeS50b0dlb0pTT04pIHtcbiAgICAgIGdlb21ldHJ5ID0gZ2VvbWV0cnkudG9HZW9KU09OKCk7XG4gICAgfVxuXG4gICAgLy8gaGFuZGxlIEdlb0pTT04gZmVhdHVyZSBieSBwdWxsaW5nIG91dCB0aGUgZ2VvbWV0cnlcbiAgICBpZiAoZ2VvbWV0cnkudHlwZSA9PT0gJ0ZlYXR1cmUnKSB7XG4gICAgICAvLyBnZXQgdGhlIGdlb21ldHJ5IG9mIHRoZSBnZW9qc29uIGZlYXR1cmVcbiAgICAgIGdlb21ldHJ5ID0gZ2VvbWV0cnkuZ2VvbWV0cnk7XG4gICAgfVxuXG4gICAgLy8gY29uZmlybSB0aGF0IG91ciBHZW9KU09OIGlzIGEgcG9pbnQsIGxpbmUgb3IgcG9seWdvblxuICAgIGlmIChnZW9tZXRyeS50eXBlID09PSAnUG9pbnQnIHx8IGdlb21ldHJ5LnR5cGUgPT09ICdMaW5lU3RyaW5nJyB8fCBnZW9tZXRyeS50eXBlID09PSAnUG9seWdvbicpIHtcbiAgICAgIHJldHVybiBVdGlsLmdlb2pzb25Ub0FyY0dJUyhnZW9tZXRyeSk7XG4gICAgICAvLyBwcm9jZXNzZWRJbnB1dC5nZW9tZXRyeVR5cGUgPSBVdGlsLmdlb2pzb25UeXBlVG9BcmNHSVMoZ2VvbWV0cnkudHlwZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIFV0aWwud2FybignaW52YWxpZCBnZW9tZXRyeSBwYXNzZWQgYXMgR1AgaW5wdXQuIFNob3VsZCBiZSBhbiBMLkxhdExuZywgTC5MYXRMbmdCb3VuZHMsIEwuTWFya2VyIG9yIEdlb0pTT04gUG9pbnQgTGluZSBvciBQb2x5Z29uIG9iamVjdCcpO1xuICAgIH1cbiAgfSxcblxuICBfc2V0R2VvbWV0cnlUeXBlOiBmdW5jdGlvbiAoZ2VvbWV0cnkpIHtcbiAgICBpZiAoZ2VvbWV0cnkgaW5zdGFuY2VvZiBMLkxhdExuZ0JvdW5kcykge1xuICAgICAgcmV0dXJuICdlc3JpR2VvbWV0cnlFbnZlbG9wZSc7XG4gICAgfVxuXG4gICAgLy8gY29udmVydCBMLk1hcmtlciA+IEwuTGF0TG5nXG4gICAgaWYgKGdlb21ldHJ5LmdldExhdExuZyB8fCBnZW9tZXRyeSBpbnN0YW5jZW9mIEwuTGF0TG5nKSB7XG4gICAgICByZXR1cm4gJ2VzcmlHZW9tZXRyeVBvaW50JztcbiAgICB9XG5cbiAgICAvLyBoYW5kbGUgTC5HZW9KU09OLCBwdWxsIG91dCB0aGUgZmlyc3QgZ2VvbWV0cnlcbiAgICBpZiAoZ2VvbWV0cnkgaW5zdGFuY2VvZiBMLkdlb0pTT04pIHtcbiAgICAgIGdlb21ldHJ5ID0gZ2VvbWV0cnkuZ2V0TGF5ZXJzKClbMF0uZmVhdHVyZS5nZW9tZXRyeTtcbiAgICAgIHJldHVybiBVdGlsLmdlb2pzb25UeXBlVG9BcmNHSVMoZ2VvbWV0cnkudHlwZSk7XG4gICAgfVxuXG4gICAgLy8gSGFuZGxlIEwuUG9seWxpbmUgYW5kIEwuUG9seWdvblxuICAgIGlmIChnZW9tZXRyeS50b0dlb0pTT04pIHtcbiAgICAgIGdlb21ldHJ5ID0gZ2VvbWV0cnkudG9HZW9KU09OKCk7XG4gICAgfVxuXG4gICAgLy8gaGFuZGxlIEdlb0pTT04gZmVhdHVyZSBieSBwdWxsaW5nIG91dCB0aGUgZ2VvbWV0cnlcbiAgICBpZiAoZ2VvbWV0cnkudHlwZSA9PT0gJ0ZlYXR1cmUnKSB7XG4gICAgICAvLyBnZXQgdGhlIGdlb21ldHJ5IG9mIHRoZSBnZW9qc29uIGZlYXR1cmVcbiAgICAgIGdlb21ldHJ5ID0gZ2VvbWV0cnkuZ2VvbWV0cnk7XG4gICAgfVxuXG4gICAgLy8gY29uZmlybSB0aGF0IG91ciBHZW9KU09OIGlzIGEgcG9pbnQsIGxpbmUgb3IgcG9seWdvblxuICAgIGlmIChnZW9tZXRyeS50eXBlID09PSAnUG9pbnQnIHx8IGdlb21ldHJ5LnR5cGUgPT09ICdMaW5lU3RyaW5nJyB8fCBnZW9tZXRyeS50eXBlID09PSAnUG9seWdvbicpIHtcbiAgICAgIHJldHVybiBVdGlsLmdlb2pzb25UeXBlVG9BcmNHSVMoZ2VvbWV0cnkudHlwZSk7XG4gICAgfSBlbHNlIGlmIChnZW9tZXRyeS50eXBlID09PSAnRmVhdHVyZUNvbGxlY3Rpb24nKSB7XG4gICAgICByZXR1cm4gVXRpbC5nZW9qc29uVHlwZVRvQXJjR0lTKGdlb21ldHJ5LmZlYXR1cmVzWzBdLnR5cGUpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gIH0sXG5cbiAgcnVuOiBmdW5jdGlvbiAoY2FsbGJhY2ssIGNvbnRleHQpIHtcbiAgICB0aGlzLl9kb25lID0gZmFsc2U7XG5cbiAgICBpZiAodGhpcy5vcHRpb25zLmFzeW5jID09PSB0cnVlKSB7XG4gICAgICAvKiBlc2xpbnQtZGlzYWJsZSAqL1xuICAgICAgdGhpcy5fc2VydmljZS5yZXF1ZXN0KHRoaXMub3B0aW9ucy5wYXRoLCB0aGlzLnBhcmFtcywgZnVuY3Rpb24gKGVycm9yLCByZXNwb25zZSkge1xuICAgICAgICB0aGlzLl9jdXJyZW50Sm9iSWQgPSByZXNwb25zZS5qb2JJZDtcbiAgICAgICAgdGhpcy5jaGVja0pvYih0aGlzLl9jdXJyZW50Sm9iSWQsIGNhbGxiYWNrLCBjb250ZXh0KTtcbiAgICAgIH0sIHRoaXMpO1xuICAgICAgLyogZXNsaW50LWVuYWJsZSAqL1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gdGhpcy5fc2VydmljZS5yZXF1ZXN0KHRoaXMub3B0aW9ucy5wYXRoLCB0aGlzLnBhcmFtcywgZnVuY3Rpb24gKGVycm9yLCByZXNwb25zZSkge1xuICAgICAgICBpZiAoIWVycm9yKSB7XG4gICAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdHMpIHtcbiAgICAgICAgICAgIGNhbGxiYWNrLmNhbGwoY29udGV4dCwgZXJyb3IsIChyZXNwb25zZSAmJiB0aGlzLl9wcm9jZXNzR1BPdXRwdXQocmVzcG9uc2UpKSwgcmVzcG9uc2UpO1xuICAgICAgICAgIH0gZWxzZSBpZiAocmVzcG9uc2UuaGlzdG9ncmFtcykge1xuICAgICAgICAgICAgY2FsbGJhY2suY2FsbChjb250ZXh0LCBlcnJvciwgcmVzcG9uc2UsIHJlc3BvbnNlKTtcbiAgICAgICAgICB9IGVsc2UgaWYgKHJlc3BvbnNlLnJvdXRlcykge1xuICAgICAgICAgICAgY2FsbGJhY2suY2FsbChjb250ZXh0LCBlcnJvciwgKHJlc3BvbnNlICYmIHRoaXMuX3Byb2Nlc3NOZXR3b3JrQW5hbHlzdE91dHB1dChyZXNwb25zZSkpLCByZXNwb25zZSk7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGNhbGxiYWNrLmNhbGwoY29udGV4dCwgZXJyb3IsIG51bGwsIG51bGwpO1xuICAgICAgICB9XG4gICAgICB9LCB0aGlzKTtcbiAgICB9XG4gIH0sXG5cbiAgY2hlY2tKb2I6IGZ1bmN0aW9uIChqb2JJZCwgY2FsbGJhY2ssIGNvbnRleHQpIHtcbiAgICB2YXIgcG9sbEpvYiA9IGZ1bmN0aW9uICgpIHtcbiAgICAgIC8qIGVzbGludC1kaXNhYmxlICovXG4gICAgICB0aGlzLl9zZXJ2aWNlLnJlcXVlc3QoJ2pvYnMvJyArIGpvYklkLCB7fSwgZnVuY3Rpb24gcG9sbGVkSm9iIChlcnJvciwgcmVzcG9uc2UpIHtcbiAgICAgICAgaWYgKHJlc3BvbnNlLmpvYlN0YXR1cyA9PT0gJ2VzcmlKb2JTdWNjZWVkZWQnKSB7XG4gICAgICAgICAgaWYgKCF0aGlzLl9kb25lKSB7XG4gICAgICAgICAgICB0aGlzLl9kb25lID0gdHJ1ZTtcbiAgICAgICAgICAgIC8vIHRvIGRvOlxuICAgICAgICAgICAgLy8gcmVmYWN0b3IgdG8gbWFrZSBhbiBhcnJheSBvZiBhc3luYyByZXF1ZXN0cyBmb3Igb3V0cHV0XG4gICAgICAgICAgICB0aGlzLl9zZXJ2aWNlLnJlcXVlc3QoJ2pvYnMvJyArIGpvYklkICsgJy9yZXN1bHRzLycgKyB0aGlzLnBhcmFtcy5vdXRwdXRQYXJhbSwgdGhpcy5yZXN1bHRQYXJhbXMsIGZ1bmN0aW9uIHByb2Nlc3NKb2JSZXN1bHQgKGVycm9yLCByZXNwb25zZSkge1xuICAgICAgICAgICAgICBjYWxsYmFjay5jYWxsKGNvbnRleHQsIGVycm9yLCAocmVzcG9uc2UgJiYgdGhpcy5fcHJvY2Vzc0FzeW5jT3V0cHV0KHJlc3BvbnNlKSksIHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0sIHRoaXMpO1xuICAgICAgICAgIH1cbiAgICAgICAgICB3aW5kb3cuY2xlYXJJbnRlcnZhbChjb3VudGVyKTtcbiAgICAgICAgfSBlbHNlIGlmIChyZXNwb25zZS5qb2JTdGF0dXMgPT09ICdlc3JpSm9iRmFpbGVkJykge1xuICAgICAgICAgIGNhbGxiYWNrLmNhbGwoY29udGV4dCwgJ0pvYiBGYWlsZWQnLCBudWxsKTtcbiAgICAgICAgICB3aW5kb3cuY2xlYXJJbnRlcnZhbChjb3VudGVyKTtcbiAgICAgICAgfVxuICAgICAgfSwgdGhpcyk7XG4gICAgICAvKiBlc2xpbnQtZW5hYmxlICovXG4gICAgfS5iaW5kKHRoaXMpO1xuXG4gICAgdmFyIGNvdW50ZXIgPSB3aW5kb3cuc2V0SW50ZXJ2YWwocG9sbEpvYiwgdGhpcy5fc2VydmljZS5vcHRpb25zLmFzeW5jSW50ZXJ2YWwgKiAxMDAwKTtcbiAgfSxcblxuICBfcHJvY2Vzc0dQT3V0cHV0OiBmdW5jdGlvbiAocmVzcG9uc2UpIHtcbiAgICB2YXIgcHJvY2Vzc2VkUmVzcG9uc2UgPSB7fTtcblxuICAgIHZhciByZXN1bHRzID0gcmVzcG9uc2UucmVzdWx0cztcbiAgICAvLyBncmFiIHN5bmNyb25vdXMgcmVzdWx0c1xuICAgIGlmICh0aGlzLm9wdGlvbnMuYXN5bmMgPT09IGZhbHNlKSB7XG4gICAgICAvLyBsb29wIHRocm91Z2ggcmVzdWx0cyBhbmQgcGFzcyBiYWNrLCBwYXJzaW5nIGVzcmkganNvblxuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCByZXN1bHRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIC8qIGpzaGludCBpZ25vcmU6c3RhcnQgKi9cbiAgICAgICAgcHJvY2Vzc2VkUmVzcG9uc2VbcmVzdWx0c1tpXS5wYXJhbU5hbWVdO1xuICAgICAgICAvKiBqc2hpbnQgaWdub3JlOmVuZCAqL1xuICAgICAgICBpZiAocmVzdWx0c1tpXS5kYXRhVHlwZSA9PT0gJ0dQRmVhdHVyZVJlY29yZFNldExheWVyJykge1xuICAgICAgICAgIHZhciBmZWF0dXJlQ29sbGVjdGlvbiA9IFV0aWwucmVzcG9uc2VUb0ZlYXR1cmVDb2xsZWN0aW9uKHJlc3VsdHNbaV0udmFsdWUpO1xuICAgICAgICAgIHByb2Nlc3NlZFJlc3BvbnNlW3Jlc3VsdHNbaV0ucGFyYW1OYW1lXSA9IGZlYXR1cmVDb2xsZWN0aW9uO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHByb2Nlc3NlZFJlc3BvbnNlW3Jlc3VsdHNbaV0ucGFyYW1OYW1lXSA9IHJlc3VsdHNbaV0udmFsdWU7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGVsc2UgeyAvLyBncmFiIGFzeW5jIHJlc3VsdHMgc2xpZ2h0bHkgZGlmZmVyZW50bHlcbiAgICAgIHByb2Nlc3NlZFJlc3BvbnNlLmpvYklkID0gdGhpcy5fY3VycmVudEpvYklkO1xuICAgICAgLy8gdmFyIHJlc3BvbnNlVmFsdWUgPSByZXNwb25zZS52YWx1ZTtcbiAgICB9XG5cbiAgICAvLyBpZiBvdXRwdXQgaXMgYSByYXN0ZXIgbGF5ZXIsIHdlIGFsc28gbmVlZCB0byBzdHViIG91dCBhIE1hcFNlcnZpY2UgdXJsIHVzaW5nIGpvYmlkXG4gICAgaWYgKHRoaXMub3B0aW9ucy5hc3luYyA9PT0gdHJ1ZSAmJiByZXNwb25zZS5kYXRhVHlwZSA9PT0gJ0dQUmFzdGVyRGF0YUxheWVyJykge1xuICAgICAgdmFyIGJhc2VVUkwgPSB0aGlzLm9wdGlvbnMudXJsO1xuICAgICAgdmFyIG4gPSBiYXNlVVJMLmluZGV4T2YoJ0dQU2VydmVyJyk7XG4gICAgICB2YXIgc2VydmljZVVSTCA9IGJhc2VVUkwuc2xpY2UoMCwgbikgKyAnTWFwU2VydmVyLyc7XG4gICAgICBwcm9jZXNzZWRSZXNwb25zZS5vdXRwdXRNYXBTZXJ2aWNlID0gc2VydmljZVVSTCArICdqb2JzLycgKyB0aGlzLl9jdXJyZW50Sm9iSWQ7XG4gICAgfVxuXG4gICAgcmV0dXJuIHByb2Nlc3NlZFJlc3BvbnNlO1xuICB9LFxuXG4gIF9wcm9jZXNzTmV0d29ya0FuYWx5c3RPdXRwdXQ6IGZ1bmN0aW9uIChyZXNwb25zZSkge1xuICAgIHZhciBwcm9jZXNzZWRSZXNwb25zZSA9IHt9O1xuXG4gICAgaWYgKHJlc3BvbnNlLnJvdXRlcy5mZWF0dXJlcy5sZW5ndGggPiAwKSB7XG4gICAgICB2YXIgZmVhdHVyZUNvbGxlY3Rpb24gPSBVdGlsLnJlc3BvbnNlVG9GZWF0dXJlQ29sbGVjdGlvbihyZXNwb25zZS5yb3V0ZXMpO1xuICAgICAgcHJvY2Vzc2VkUmVzcG9uc2Uucm91dGVzID0gZmVhdHVyZUNvbGxlY3Rpb247XG4gICAgfVxuXG4gICAgcmV0dXJuIHByb2Nlc3NlZFJlc3BvbnNlO1xuICB9LFxuXG4gIF9wcm9jZXNzQXN5bmNPdXRwdXQ6IGZ1bmN0aW9uIChyZXNwb25zZSkge1xuICAgIHZhciBwcm9jZXNzZWRSZXNwb25zZSA9IHt9O1xuICAgIHByb2Nlc3NlZFJlc3BvbnNlLmpvYklkID0gdGhpcy5fY3VycmVudEpvYklkO1xuXG4gICAgLy8gaWYgb3V0cHV0IGlzIGEgcmFzdGVyIGxheWVyLCB3ZSBhbHNvIG5lZWQgdG8gc3R1YiBvdXQgYSBNYXBTZXJ2aWNlIHVybCB1c2luZyBqb2JpZFxuICAgIGlmICh0aGlzLm9wdGlvbnMuYXN5bmMgPT09IHRydWUgJiYgcmVzcG9uc2UuZGF0YVR5cGUgPT09ICdHUFJhc3RlckRhdGFMYXllcicpIHtcbiAgICAgIHZhciBiYXNlVVJMID0gdGhpcy5vcHRpb25zLnVybDtcbiAgICAgIHZhciBuID0gYmFzZVVSTC5pbmRleE9mKCdHUFNlcnZlcicpO1xuICAgICAgdmFyIHNlcnZpY2VVUkwgPSBiYXNlVVJMLnNsaWNlKDAsIG4pICsgJ01hcFNlcnZlci8nO1xuICAgICAgcHJvY2Vzc2VkUmVzcG9uc2Uub3V0cHV0TWFwU2VydmljZSA9IHNlcnZpY2VVUkwgKyAnam9icy8nICsgdGhpcy5fY3VycmVudEpvYklkO1xuICAgIH1cblxuICAgIC8vIGlmIG91dHB1dCBpcyBHUEZlYXR1cmVSZWNvcmRTZXRMYXllciwgY29udmVydCB0byBHZW9KU09OXG4gICAgaWYgKHJlc3BvbnNlLmRhdGFUeXBlID09PSAnR1BGZWF0dXJlUmVjb3JkU2V0TGF5ZXInKSB7XG4gICAgICB2YXIgZmVhdHVyZUNvbGxlY3Rpb24gPSBVdGlsLnJlc3BvbnNlVG9GZWF0dXJlQ29sbGVjdGlvbihyZXNwb25zZS52YWx1ZSk7XG4gICAgICBwcm9jZXNzZWRSZXNwb25zZVtyZXNwb25zZS5wYXJhbU5hbWVdID0gZmVhdHVyZUNvbGxlY3Rpb247XG4gICAgfSBlbHNlIHtcbiAgICAgIHByb2Nlc3NlZFJlc3BvbnNlW3Jlc3BvbnNlLnBhcmFtTmFtZV0gPSByZXNwb25zZS52YWx1ZTtcbiAgICB9XG5cbiAgICByZXR1cm4gcHJvY2Vzc2VkUmVzcG9uc2U7XG4gIH1cblxufSk7XG5cbmV4cG9ydCBmdW5jdGlvbiB0YXNrIChvcHRpb25zKSB7XG4gIHJldHVybiBuZXcgVGFzayhvcHRpb25zKTtcbn1cblxuZXhwb3J0IGRlZmF1bHQgdGFzaztcbiIsImltcG9ydCB7IFNlcnZpY2UgYXMgQmFzZVNlcnZpY2UgfSBmcm9tICdlc3JpLWxlYWZsZXQnO1xuaW1wb3J0IHsgVGFzayB9IGZyb20gJy4uL1Rhc2tzL0dlb3Byb2Nlc3NpbmcnO1xuXG5leHBvcnQgdmFyIFNlcnZpY2UgPSBCYXNlU2VydmljZS5leHRlbmQoe1xuICBvcHRpb25zOiB7XG4gICAgYXN5bmNJbnRlcnZhbDogMVxuICB9LFxuXG4gIGNyZWF0ZVRhc2s6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gbmV3IFRhc2sodGhpcywgdGhpcy5vcHRpb25zKTtcbiAgfVxuXG59KTtcblxuZXhwb3J0IGZ1bmN0aW9uIHNlcnZpY2UgKG9wdGlvbnMpIHtcbiAgcmV0dXJuIG5ldyBTZXJ2aWNlKG9wdGlvbnMpO1xufVxuXG5leHBvcnQgZGVmYXVsdCBzZXJ2aWNlO1xuIl0sIm5hbWVzIjpbIlRhc2siLCJCYXNlVGFzayIsIlV0aWwiLCJTZXJ2aWNlIiwiQmFzZVNlcnZpY2UiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Q0NRTyxJQUFJQSxNQUFJLEdBQUdDLGdCQUFRLENBQUMsTUFBTSxDQUFDOztBQUVsQyxDQUFBLEVBQUUsUUFBUSxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsU0FBUzs7QUFFL0IsQ0FBQTtBQUNBLENBQUEsRUFBRSxNQUFNLEVBQUUsRUFBRTtBQUNaLENBQUEsRUFBRSxZQUFZLEVBQUUsRUFBRTs7QUFFbEIsQ0FBQSxFQUFFLFVBQVUsRUFBRSxVQUFVLE9BQU8sRUFBRTtBQUNqQyxDQUFBO0FBQ0EsQ0FBQSxJQUFJQSxnQkFBUSxDQUFDLFNBQVMsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxPQUFPLENBQUMsQ0FBQzs7QUFFdEQsQ0FBQTtBQUNBLENBQUEsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLElBQUksT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssS0FBSyxXQUFXLEVBQUU7QUFDekUsQ0FBQTtBQUNBLENBQUEsTUFBTSxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssR0FBRyxLQUFLLENBQUM7QUFDakMsQ0FBQSxNQUFNLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxHQUFHLFNBQVMsQ0FBQzs7QUFFcEMsQ0FBQTtBQUNBLENBQUEsTUFBTSxJQUFJLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxVQUFVLEtBQUssRUFBRSxPQUFPLEVBQUU7QUFDdkQsQ0FBQSxRQUFRLElBQUksQ0FBQyxLQUFLLEVBQUU7QUFDcEIsQ0FBQSxVQUFVLElBQUksT0FBTyxDQUFDLGFBQWEsS0FBSyw4QkFBOEIsRUFBRTtBQUN4RSxDQUFBLFlBQVksSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFDO0FBQ3ZDLENBQUEsWUFBWSxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksR0FBRyxTQUFTLENBQUM7QUFDMUMsQ0FBQSxXQUFXLE1BQU07QUFDakIsQ0FBQSxZQUFZLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQztBQUN0QyxDQUFBLFlBQVksSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLEdBQUcsV0FBVyxDQUFDO0FBQzVDLENBQUEsV0FBVztBQUNYLENBQUEsVUFBVSxJQUFJLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDO0FBQ25DLENBQUEsU0FBUyxNQUFNO0FBQ2YsQ0FBQTtBQUNBLENBQUEsVUFBVSxPQUFPO0FBQ2pCLENBQUEsU0FBUztBQUNULENBQUEsT0FBTyxFQUFFLElBQUksQ0FBQyxDQUFDO0FBQ2YsQ0FBQSxLQUFLLE1BQU07QUFDWCxDQUFBO0FBQ0EsQ0FBQSxNQUFNLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUU7QUFDOUIsQ0FBQSxRQUFRLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxHQUFHLFdBQVcsQ0FBQztBQUNoRixDQUFBLE9BQU87QUFDUCxDQUFBLE1BQU0sSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFO0FBQy9CLENBQUEsUUFBUSxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksR0FBRyxTQUFTLENBQUM7QUFDOUUsQ0FBQSxPQUFPO0FBQ1AsQ0FBQSxLQUFLO0FBQ0wsQ0FBQSxHQUFHOztBQUVILENBQUE7QUFDQSxDQUFBO0FBQ0EsQ0FBQSxFQUFFLFFBQVEsRUFBRSxVQUFVLFNBQVMsRUFBRSxVQUFVLEVBQUU7QUFDN0MsQ0FBQSxJQUFJLElBQUksT0FBTyxVQUFVLEtBQUssU0FBUyxJQUFJLE9BQU8sVUFBVSxLQUFLLFFBQVEsRUFBRTtBQUMzRSxDQUFBO0FBQ0EsQ0FBQSxNQUFNLElBQUksQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLEdBQUcsVUFBVSxDQUFDO0FBQzFDLENBQUEsTUFBTSxPQUFPO0FBQ2IsQ0FBQSxLQUFLLE1BQU0sSUFBSSxPQUFPLFVBQVUsS0FBSyxRQUFRLElBQUksVUFBVSxDQUFDLEtBQUssRUFBRTtBQUNuRSxDQUFBO0FBQ0EsQ0FBQSxNQUFNLElBQUksQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLEdBQUcsVUFBVSxDQUFDO0FBQzFDLENBQUEsTUFBTSxPQUFPO0FBQ2IsQ0FBQSxLQUFLLE1BQU0sSUFBSSxTQUFTLEtBQUssVUFBVSxFQUFFO0FBQ3pDLENBQUE7QUFDQSxDQUFBLE1BQU0sSUFBSSxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLFVBQVUsQ0FBQyxDQUFDO0FBQzdELENBQUEsS0FBSyxNQUFNO0FBQ1gsQ0FBQTtBQUNBLENBQUEsTUFBTSxJQUFJLFlBQVksR0FBRyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsVUFBVSxDQUFDLENBQUM7QUFDM0QsQ0FBQSxNQUFNLElBQUksWUFBWSxHQUFHO0FBQ3pCLENBQUEsUUFBUSxVQUFVLEVBQUUsRUFBRTtBQUN0QixDQUFBLE9BQU8sQ0FBQzs7QUFFUixDQUFBLE1BQU0sSUFBSSxZQUFZLEVBQUU7QUFDeEIsQ0FBQSxRQUFRLFlBQVksQ0FBQyxZQUFZLEdBQUcsWUFBWSxDQUFDO0FBQ2pELENBQUEsT0FBTztBQUNQLENBQUEsTUFBTSxJQUFJLFVBQVUsQ0FBQyxJQUFJLEtBQUssbUJBQW1CLElBQUksVUFBVSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEtBQUssU0FBUyxFQUFFO0FBQ2hHLENBQUEsUUFBUSxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsVUFBVSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUU7QUFDN0QsQ0FBQSxVQUFVLElBQUksVUFBVSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEtBQUssU0FBUyxFQUFFO0FBQ3pELENBQUE7QUFDQSxDQUFBLFlBQVksWUFBWSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUNDLGdCQUFJLENBQUMsZUFBZSxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3JGLENBQUEsV0FBVyxNQUFNO0FBQ2pCLENBQUE7QUFDQSxDQUFBLFlBQVksWUFBWSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsRUFBRSxRQUFRLEVBQUVBLGdCQUFJLENBQUMsZUFBZSxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0FBQzVHLENBQUEsV0FBVztBQUNYLENBQUEsU0FBUztBQUNULENBQUEsT0FBTyxNQUFNO0FBQ2IsQ0FBQSxRQUFRLFlBQVksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsVUFBVSxFQUFFLElBQUksQ0FBQyxZQUFZLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2hGLENBQUEsT0FBTztBQUNQLENBQUEsTUFBTSxJQUFJLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxHQUFHLFlBQVksQ0FBQztBQUM1QyxDQUFBLEtBQUs7QUFDTCxDQUFBLEdBQUc7O0FBRUgsQ0FBQTtBQUNBLENBQUEsRUFBRSxjQUFjLEVBQUUsVUFBVSxTQUFTLEVBQUU7QUFDdkMsQ0FBQSxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsV0FBVyxHQUFHLFNBQVMsQ0FBQztBQUN4QyxDQUFBLEdBQUc7O0FBRUgsQ0FBQTtBQUNBLENBQUEsRUFBRSxrQkFBa0IsRUFBRSxVQUFVLFNBQVMsRUFBRSxVQUFVLEVBQUU7QUFDdkQsQ0FBQSxJQUFJLElBQUksQ0FBQyxZQUFZLENBQUMsU0FBUyxDQUFDLEdBQUcsVUFBVSxDQUFDO0FBQzlDLENBQUEsR0FBRzs7QUFFSCxDQUFBO0FBQ0EsQ0FBQSxFQUFFLFlBQVksRUFBRSxVQUFVLFFBQVEsRUFBRTtBQUNwQyxDQUFBO0FBQ0EsQ0FBQSxJQUFJLElBQUksUUFBUSxZQUFZLENBQUMsQ0FBQyxZQUFZLEVBQUU7QUFDNUMsQ0FBQSxNQUFNLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0FBQ2xELENBQUEsS0FBSzs7QUFFTCxDQUFBO0FBQ0EsQ0FBQSxJQUFJLElBQUksUUFBUSxDQUFDLFNBQVMsRUFBRTtBQUM1QixDQUFBLE1BQU0sUUFBUSxHQUFHLFFBQVEsQ0FBQyxTQUFTLEVBQUUsQ0FBQztBQUN0QyxDQUFBLEtBQUs7O0FBRUwsQ0FBQTtBQUNBLENBQUEsSUFBSSxJQUFJLFFBQVEsWUFBWSxDQUFDLENBQUMsTUFBTSxFQUFFO0FBQ3RDLENBQUEsTUFBTSxRQUFRLEdBQUc7QUFDakIsQ0FBQSxRQUFRLElBQUksRUFBRSxPQUFPO0FBQ3JCLENBQUEsUUFBUSxXQUFXLEVBQUUsQ0FBQyxRQUFRLENBQUMsR0FBRyxFQUFFLFFBQVEsQ0FBQyxHQUFHLENBQUM7QUFDakQsQ0FBQSxPQUFPLENBQUM7QUFDUixDQUFBLEtBQUs7O0FBRUwsQ0FBQTtBQUNBLENBQUEsSUFBSSxJQUFJLFFBQVEsWUFBWSxDQUFDLENBQUMsT0FBTyxFQUFFO0FBQ3ZDLENBQUE7QUFDQSxDQUFBLE1BQU0sUUFBUSxHQUFHLFFBQVEsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDO0FBQzFELENBQUE7QUFDQSxDQUFBLE1BQU0sT0FBT0EsZ0JBQUksQ0FBQyxlQUFlLENBQUMsUUFBUSxDQUFDLENBQUM7QUFDNUMsQ0FBQSxLQUFLOztBQUVMLENBQUE7QUFDQSxDQUFBLElBQUksSUFBSSxRQUFRLENBQUMsU0FBUyxFQUFFO0FBQzVCLENBQUEsTUFBTSxRQUFRLEdBQUcsUUFBUSxDQUFDLFNBQVMsRUFBRSxDQUFDO0FBQ3RDLENBQUEsS0FBSzs7QUFFTCxDQUFBO0FBQ0EsQ0FBQSxJQUFJLElBQUksUUFBUSxDQUFDLElBQUksS0FBSyxTQUFTLEVBQUU7QUFDckMsQ0FBQTtBQUNBLENBQUEsTUFBTSxRQUFRLEdBQUcsUUFBUSxDQUFDLFFBQVEsQ0FBQztBQUNuQyxDQUFBLEtBQUs7O0FBRUwsQ0FBQTtBQUNBLENBQUEsSUFBSSxJQUFJLFFBQVEsQ0FBQyxJQUFJLEtBQUssT0FBTyxJQUFJLFFBQVEsQ0FBQyxJQUFJLEtBQUssWUFBWSxJQUFJLFFBQVEsQ0FBQyxJQUFJLEtBQUssU0FBUyxFQUFFO0FBQ3BHLENBQUEsTUFBTSxPQUFPQSxnQkFBSSxDQUFDLGVBQWUsQ0FBQyxRQUFRLENBQUMsQ0FBQztBQUM1QyxDQUFBO0FBQ0EsQ0FBQSxLQUFLLE1BQU07QUFDWCxDQUFBLE1BQU1BLGdCQUFJLENBQUMsSUFBSSxDQUFDLDhIQUE4SCxDQUFDLENBQUM7QUFDaEosQ0FBQSxLQUFLO0FBQ0wsQ0FBQSxHQUFHOztBQUVILENBQUEsRUFBRSxnQkFBZ0IsRUFBRSxVQUFVLFFBQVEsRUFBRTtBQUN4QyxDQUFBLElBQUksSUFBSSxRQUFRLFlBQVksQ0FBQyxDQUFDLFlBQVksRUFBRTtBQUM1QyxDQUFBLE1BQU0sT0FBTyxzQkFBc0IsQ0FBQztBQUNwQyxDQUFBLEtBQUs7O0FBRUwsQ0FBQTtBQUNBLENBQUEsSUFBSSxJQUFJLFFBQVEsQ0FBQyxTQUFTLElBQUksUUFBUSxZQUFZLENBQUMsQ0FBQyxNQUFNLEVBQUU7QUFDNUQsQ0FBQSxNQUFNLE9BQU8sbUJBQW1CLENBQUM7QUFDakMsQ0FBQSxLQUFLOztBQUVMLENBQUE7QUFDQSxDQUFBLElBQUksSUFBSSxRQUFRLFlBQVksQ0FBQyxDQUFDLE9BQU8sRUFBRTtBQUN2QyxDQUFBLE1BQU0sUUFBUSxHQUFHLFFBQVEsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDO0FBQzFELENBQUEsTUFBTSxPQUFPQSxnQkFBSSxDQUFDLG1CQUFtQixDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUNyRCxDQUFBLEtBQUs7O0FBRUwsQ0FBQTtBQUNBLENBQUEsSUFBSSxJQUFJLFFBQVEsQ0FBQyxTQUFTLEVBQUU7QUFDNUIsQ0FBQSxNQUFNLFFBQVEsR0FBRyxRQUFRLENBQUMsU0FBUyxFQUFFLENBQUM7QUFDdEMsQ0FBQSxLQUFLOztBQUVMLENBQUE7QUFDQSxDQUFBLElBQUksSUFBSSxRQUFRLENBQUMsSUFBSSxLQUFLLFNBQVMsRUFBRTtBQUNyQyxDQUFBO0FBQ0EsQ0FBQSxNQUFNLFFBQVEsR0FBRyxRQUFRLENBQUMsUUFBUSxDQUFDO0FBQ25DLENBQUEsS0FBSzs7QUFFTCxDQUFBO0FBQ0EsQ0FBQSxJQUFJLElBQUksUUFBUSxDQUFDLElBQUksS0FBSyxPQUFPLElBQUksUUFBUSxDQUFDLElBQUksS0FBSyxZQUFZLElBQUksUUFBUSxDQUFDLElBQUksS0FBSyxTQUFTLEVBQUU7QUFDcEcsQ0FBQSxNQUFNLE9BQU9BLGdCQUFJLENBQUMsbUJBQW1CLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDO0FBQ3JELENBQUEsS0FBSyxNQUFNLElBQUksUUFBUSxDQUFDLElBQUksS0FBSyxtQkFBbUIsRUFBRTtBQUN0RCxDQUFBLE1BQU0sT0FBT0EsZ0JBQUksQ0FBQyxtQkFBbUIsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDO0FBQ2pFLENBQUEsS0FBSyxNQUFNO0FBQ1gsQ0FBQSxNQUFNLE9BQU8sSUFBSSxDQUFDO0FBQ2xCLENBQUEsS0FBSztBQUNMLENBQUEsR0FBRzs7QUFFSCxDQUFBLEVBQUUsR0FBRyxFQUFFLFVBQVUsUUFBUSxFQUFFLE9BQU8sRUFBRTtBQUNwQyxDQUFBLElBQUksSUFBSSxDQUFDLEtBQUssR0FBRyxLQUFLLENBQUM7O0FBRXZCLENBQUEsSUFBSSxJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxLQUFLLElBQUksRUFBRTtBQUNyQyxDQUFBO0FBQ0EsQ0FBQSxNQUFNLElBQUksQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxNQUFNLEVBQUUsVUFBVSxLQUFLLEVBQUUsUUFBUSxFQUFFO0FBQ3ZGLENBQUEsUUFBUSxJQUFJLENBQUMsYUFBYSxHQUFHLFFBQVEsQ0FBQyxLQUFLLENBQUM7QUFDNUMsQ0FBQSxRQUFRLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLGFBQWEsRUFBRSxRQUFRLEVBQUUsT0FBTyxDQUFDLENBQUM7QUFDN0QsQ0FBQSxPQUFPLEVBQUUsSUFBSSxDQUFDLENBQUM7QUFDZixDQUFBO0FBQ0EsQ0FBQSxLQUFLLE1BQU07QUFDWCxDQUFBLE1BQU0sT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsTUFBTSxFQUFFLFVBQVUsS0FBSyxFQUFFLFFBQVEsRUFBRTtBQUM5RixDQUFBLFFBQVEsSUFBSSxDQUFDLEtBQUssRUFBRTtBQUNwQixDQUFBLFVBQVUsSUFBSSxRQUFRLENBQUMsT0FBTyxFQUFFO0FBQ2hDLENBQUEsWUFBWSxRQUFRLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxLQUFLLEVBQUUsQ0FBQyxRQUFRLElBQUksSUFBSSxDQUFDLGdCQUFnQixDQUFDLFFBQVEsQ0FBQyxDQUFDLEVBQUUsUUFBUSxDQUFDLENBQUM7QUFDbkcsQ0FBQSxXQUFXLE1BQU0sSUFBSSxRQUFRLENBQUMsVUFBVSxFQUFFO0FBQzFDLENBQUEsWUFBWSxRQUFRLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxLQUFLLEVBQUUsUUFBUSxFQUFFLFFBQVEsQ0FBQyxDQUFDO0FBQzlELENBQUEsV0FBVyxNQUFNLElBQUksUUFBUSxDQUFDLE1BQU0sRUFBRTtBQUN0QyxDQUFBLFlBQVksUUFBUSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsS0FBSyxFQUFFLENBQUMsUUFBUSxJQUFJLElBQUksQ0FBQyw0QkFBNEIsQ0FBQyxRQUFRLENBQUMsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxDQUFDO0FBQy9HLENBQUEsV0FBVztBQUNYLENBQUEsU0FBUyxNQUFNO0FBQ2YsQ0FBQSxVQUFVLFFBQVEsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7QUFDcEQsQ0FBQSxTQUFTO0FBQ1QsQ0FBQSxPQUFPLEVBQUUsSUFBSSxDQUFDLENBQUM7QUFDZixDQUFBLEtBQUs7QUFDTCxDQUFBLEdBQUc7O0FBRUgsQ0FBQSxFQUFFLFFBQVEsRUFBRSxVQUFVLEtBQUssRUFBRSxRQUFRLEVBQUUsT0FBTyxFQUFFO0FBQ2hELENBQUEsSUFBSSxJQUFJLE9BQU8sR0FBRyxZQUFZO0FBQzlCLENBQUE7QUFDQSxDQUFBLE1BQU0sSUFBSSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsT0FBTyxHQUFHLEtBQUssRUFBRSxFQUFFLEVBQUUsU0FBUyxTQUFTLEVBQUUsS0FBSyxFQUFFLFFBQVEsRUFBRTtBQUN0RixDQUFBLFFBQVEsSUFBSSxRQUFRLENBQUMsU0FBUyxLQUFLLGtCQUFrQixFQUFFO0FBQ3ZELENBQUEsVUFBVSxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRTtBQUMzQixDQUFBLFlBQVksSUFBSSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUM7QUFDOUIsQ0FBQTtBQUNBLENBQUE7QUFDQSxDQUFBLFlBQVksSUFBSSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsT0FBTyxHQUFHLEtBQUssR0FBRyxXQUFXLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxXQUFXLEVBQUUsSUFBSSxDQUFDLFlBQVksRUFBRSxTQUFTLGdCQUFnQixFQUFFLEtBQUssRUFBRSxRQUFRLEVBQUU7QUFDMUosQ0FBQSxjQUFjLFFBQVEsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLEtBQUssRUFBRSxDQUFDLFFBQVEsSUFBSSxJQUFJLENBQUMsbUJBQW1CLENBQUMsUUFBUSxDQUFDLENBQUMsRUFBRSxRQUFRLENBQUMsQ0FBQztBQUN4RyxDQUFBLGFBQWEsRUFBRSxJQUFJLENBQUMsQ0FBQztBQUNyQixDQUFBLFdBQVc7QUFDWCxDQUFBLFVBQVUsTUFBTSxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUMsQ0FBQztBQUN4QyxDQUFBLFNBQVMsTUFBTSxJQUFJLFFBQVEsQ0FBQyxTQUFTLEtBQUssZUFBZSxFQUFFO0FBQzNELENBQUEsVUFBVSxRQUFRLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxZQUFZLEVBQUUsSUFBSSxDQUFDLENBQUM7QUFDckQsQ0FBQSxVQUFVLE1BQU0sQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLENBQUM7QUFDeEMsQ0FBQSxTQUFTO0FBQ1QsQ0FBQSxPQUFPLEVBQUUsSUFBSSxDQUFDLENBQUM7QUFDZixDQUFBO0FBQ0EsQ0FBQSxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDOztBQUVqQixDQUFBLElBQUksSUFBSSxPQUFPLEdBQUcsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsYUFBYSxHQUFHLElBQUksQ0FBQyxDQUFDO0FBQzFGLENBQUEsR0FBRzs7QUFFSCxDQUFBLEVBQUUsZ0JBQWdCLEVBQUUsVUFBVSxRQUFRLEVBQUU7QUFDeEMsQ0FBQSxJQUFJLElBQUksaUJBQWlCLEdBQUcsRUFBRSxDQUFDOztBQUUvQixDQUFBLElBQUksSUFBSSxPQUFPLEdBQUcsUUFBUSxDQUFDLE9BQU8sQ0FBQztBQUNuQyxDQUFBO0FBQ0EsQ0FBQSxJQUFJLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLEtBQUssS0FBSyxFQUFFO0FBQ3RDLENBQUE7QUFDQSxDQUFBLE1BQU0sS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLE9BQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUU7QUFDL0MsQ0FBQTtBQUNBLENBQUEsUUFBUSxpQkFBaUIsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUM7QUFDaEQsQ0FBQTtBQUNBLENBQUEsUUFBUSxJQUFJLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLEtBQUsseUJBQXlCLEVBQUU7QUFDL0QsQ0FBQSxVQUFVLElBQUksaUJBQWlCLEdBQUdBLGdCQUFJLENBQUMsMkJBQTJCLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDO0FBQ3JGLENBQUEsVUFBVSxpQkFBaUIsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLEdBQUcsaUJBQWlCLENBQUM7QUFDdEUsQ0FBQSxTQUFTLE1BQU07QUFDZixDQUFBLFVBQVUsaUJBQWlCLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxHQUFHLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUM7QUFDckUsQ0FBQSxTQUFTO0FBQ1QsQ0FBQSxPQUFPO0FBQ1AsQ0FBQSxLQUFLLE1BQU07QUFDWCxDQUFBLE1BQU0saUJBQWlCLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUM7QUFDbkQsQ0FBQTtBQUNBLENBQUEsS0FBSzs7QUFFTCxDQUFBO0FBQ0EsQ0FBQSxJQUFJLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLEtBQUssSUFBSSxJQUFJLFFBQVEsQ0FBQyxRQUFRLEtBQUssbUJBQW1CLEVBQUU7QUFDbEYsQ0FBQSxNQUFNLElBQUksT0FBTyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDO0FBQ3JDLENBQUEsTUFBTSxJQUFJLENBQUMsR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxDQUFDO0FBQzFDLENBQUEsTUFBTSxJQUFJLFVBQVUsR0FBRyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBRyxZQUFZLENBQUM7QUFDMUQsQ0FBQSxNQUFNLGlCQUFpQixDQUFDLGdCQUFnQixHQUFHLFVBQVUsR0FBRyxPQUFPLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQztBQUNyRixDQUFBLEtBQUs7O0FBRUwsQ0FBQSxJQUFJLE9BQU8saUJBQWlCLENBQUM7QUFDN0IsQ0FBQSxHQUFHOztBQUVILENBQUEsRUFBRSw0QkFBNEIsRUFBRSxVQUFVLFFBQVEsRUFBRTtBQUNwRCxDQUFBLElBQUksSUFBSSxpQkFBaUIsR0FBRyxFQUFFLENBQUM7O0FBRS9CLENBQUEsSUFBSSxJQUFJLFFBQVEsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUU7QUFDN0MsQ0FBQSxNQUFNLElBQUksaUJBQWlCLEdBQUdBLGdCQUFJLENBQUMsMkJBQTJCLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBQ2hGLENBQUEsTUFBTSxpQkFBaUIsQ0FBQyxNQUFNLEdBQUcsaUJBQWlCLENBQUM7QUFDbkQsQ0FBQSxLQUFLOztBQUVMLENBQUEsSUFBSSxPQUFPLGlCQUFpQixDQUFDO0FBQzdCLENBQUEsR0FBRzs7QUFFSCxDQUFBLEVBQUUsbUJBQW1CLEVBQUUsVUFBVSxRQUFRLEVBQUU7QUFDM0MsQ0FBQSxJQUFJLElBQUksaUJBQWlCLEdBQUcsRUFBRSxDQUFDO0FBQy9CLENBQUEsSUFBSSxpQkFBaUIsQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQzs7QUFFakQsQ0FBQTtBQUNBLENBQUEsSUFBSSxJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxLQUFLLElBQUksSUFBSSxRQUFRLENBQUMsUUFBUSxLQUFLLG1CQUFtQixFQUFFO0FBQ2xGLENBQUEsTUFBTSxJQUFJLE9BQU8sR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQztBQUNyQyxDQUFBLE1BQU0sSUFBSSxDQUFDLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQztBQUMxQyxDQUFBLE1BQU0sSUFBSSxVQUFVLEdBQUcsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsWUFBWSxDQUFDO0FBQzFELENBQUEsTUFBTSxpQkFBaUIsQ0FBQyxnQkFBZ0IsR0FBRyxVQUFVLEdBQUcsT0FBTyxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUM7QUFDckYsQ0FBQSxLQUFLOztBQUVMLENBQUE7QUFDQSxDQUFBLElBQUksSUFBSSxRQUFRLENBQUMsUUFBUSxLQUFLLHlCQUF5QixFQUFFO0FBQ3pELENBQUEsTUFBTSxJQUFJLGlCQUFpQixHQUFHQSxnQkFBSSxDQUFDLDJCQUEyQixDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQztBQUMvRSxDQUFBLE1BQU0saUJBQWlCLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxHQUFHLGlCQUFpQixDQUFDO0FBQ2hFLENBQUEsS0FBSyxNQUFNO0FBQ1gsQ0FBQSxNQUFNLGlCQUFpQixDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsR0FBRyxRQUFRLENBQUMsS0FBSyxDQUFDO0FBQzdELENBQUEsS0FBSzs7QUFFTCxDQUFBLElBQUksT0FBTyxpQkFBaUIsQ0FBQztBQUM3QixDQUFBLEdBQUc7O0FBRUgsQ0FBQSxDQUFDLENBQUMsQ0FBQzs7QUFFSCxDQUFPLFNBQVMsSUFBSSxFQUFFLE9BQU8sRUFBRTtBQUMvQixDQUFBLEVBQUUsT0FBTyxJQUFJRixNQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7QUFDM0IsQ0FBQSxDQUFDOztDQ3RUTSxJQUFJRyxTQUFPLEdBQUdDLG1CQUFXLENBQUMsTUFBTSxDQUFDO0FBQ3hDLENBQUEsRUFBRSxPQUFPLEVBQUU7QUFDWCxDQUFBLElBQUksYUFBYSxFQUFFLENBQUM7QUFDcEIsQ0FBQSxHQUFHOztBQUVILENBQUEsRUFBRSxVQUFVLEVBQUUsWUFBWTtBQUMxQixDQUFBLElBQUksT0FBTyxJQUFJSixNQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztBQUN4QyxDQUFBLEdBQUc7O0FBRUgsQ0FBQSxDQUFDLENBQUMsQ0FBQzs7QUFFSCxDQUFPLFNBQVMsT0FBTyxFQUFFLE9BQU8sRUFBRTtBQUNsQyxDQUFBLEVBQUUsT0FBTyxJQUFJRyxTQUFPLENBQUMsT0FBTyxDQUFDLENBQUM7QUFDOUIsQ0FBQSxDQUFDOzs7Ozs7OzsifQ==