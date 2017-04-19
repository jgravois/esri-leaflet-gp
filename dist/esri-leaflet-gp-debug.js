/* esri-leaflet-gp - v2.0.2 - Wed Apr 19 2017 16:31:50 GMT-0700 (PDT)
 * Copyright (c) 2017 Environmental Systems Research Institute, Inc.
 * Apache-2.0 */
(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('leaflet'), require('esri-leaflet')) :
	typeof define === 'function' && define.amd ? define(['exports', 'leaflet', 'esri-leaflet'], factory) :
	(factory((global.L = global.L || {}, global.L.esri = global.L.esri || {}, global.L.esri.GP = global.L.esri.GP || {}),global.L,global.L.esri));
}(this, function (exports,L,esriLeaflet) { 'use strict';

	L = 'default' in L ? L['default'] : L;

	var version = "2.0.2";

	var Task$1 = esriLeaflet.Task.extend({

	  includes: L.Evented.prototype,

	  // setters: {}, we don't use these because we don't know the ParamName OR value of custom GP services
	  params: {},
	  resultParams: {},

	  initialize: function (options) {
	    // don't replace parent initialize
	    esriLeaflet.Task.prototype.initialize.call(this, options);

	    // if path isn't supplied in options, try and determine if its sync or async to set automatically
	    if (!this.options.path) {
	      // assume initially, that service is synchronous
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
	          // if check fails, hopefully its synchronous
	          this.options.async = false;
	          this.options.path = 'execute';
	          return;
	        }
	      }, this);
	    } else {
	      // if path is custom, hopefully its synchronous
	      if (this.options.async !== true && this.options.path !== 'submitJob') {
	        this.options.async = false;
	      }
	    }
	  },

	  // doc for various GPInput types can be found here
	  // http://resources.arcgis.com/en/help/arcgis-rest-api/index.html#/GP_Result/02r3000000q7000000/

	  // set booleans, numbers, strings
	  setParam: function (paramName, paramValue) {
	    if (typeof paramValue === 'boolean') {
	      this.params[paramName] = paramValue;
	      return;
	    } else if (typeof paramValue !== 'object') { // strings, numbers
	      this.params[paramName] = paramValue;
	      return;
	    } else if (typeof paramValue === 'object' && paramValue.units) {
	      // pass through GPLinearUnit params unmolested
	      this.params[paramName] = paramValue;
	      return;
	    } else {
	      // otherwise assume its latlng, marker, bounds or geojson
	      if (paramName === 'geometry') {
	        this.params[paramName] = this._setGeometry(paramValue);
	      } else { // package up an array of esri features if the parameter name is anything other than geometry
	        var esriFeatures = {
	          'geometryType': this._setGeometryType(paramValue),
	          'features': []
	        };

	        if (paramValue.type === 'FeatureCollection') {
	          for (var i = 0; i < paramValue.features.length; i++) {
	            esriFeatures.features.push({'geometry': esriLeaflet.Util.geojsonToArcGIS(paramValue.features[i].geometry)});
	          }
	        } else {
	          esriFeatures.features.push({'geometry': this._setGeometry(paramValue)});
	        }

	        this.params[paramName] = esriFeatures;
	      }
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXNyaS1sZWFmbGV0LWdwLWRlYnVnLmpzIiwic291cmNlcyI6WyIuLi9wYWNrYWdlLmpzb24iLCIuLi9zcmMvVGFza3MvR2VvcHJvY2Vzc2luZy5qcyIsIi4uL3NyYy9TZXJ2aWNlcy9HZW9wcm9jZXNzaW5nLmpzIl0sInNvdXJjZXNDb250ZW50IjpbIntcbiAgXCJuYW1lXCI6IFwiZXNyaS1sZWFmbGV0LWdwXCIsXG4gIFwiZGVzY3JpcHRpb25cIjogXCJBIExlYWZsZXQgcGx1Z2luIGZvciBpbnRlcmFjdGluZyB3aXRoIEFyY0dJUyBnZW9wcm9jZXNzaW5nIHNlcnZpY2VzLlwiLFxuICBcInZlcnNpb25cIjogXCIyLjAuMlwiLFxuICBcImF1dGhvclwiOiBcIkpvaG4gR3Jhdm9pcyA8amdyYXZvaXNAZXNyaS5jb20+IChodHRwOi8vam9obmdyYXZvaXMuY29tKVwiLFxuICBcImJyb3dzZXJcIjogXCJkaXN0L2VzcmktbGVhZmxldC1ncC1kZWJ1Zy5qc1wiLFxuICBcImJ1Z3NcIjoge1xuICAgIFwidXJsXCI6IFwiaHR0cHM6Ly9naXRodWIuY29tL2pncmF2b2lzL2VzcmktbGVhZmxldC1ncC9pc3N1ZXNcIlxuICB9LFxuICBcImNvbnRyaWJ1dG9yc1wiOiBbXG4gICAgXCJKb2huIEdyYXZvaXMgPGpncmF2b2lzQGVzcmkuY29tPiAoaHR0cDovL2pvaG5ncmF2b2lzLmNvbSlcIixcbiAgICBcIk5pY2hvbGFzIEZ1cm5lc3MgPG5mdXJuZXNzQGVzcmkuY29tPiAoaHR0cDovL25peHRhLmdpdGh1Yi5pby8pXCIsXG4gICAgXCJQYXRyaWNrIEFybHQgPHBhcmx0QGVzcmkuY29tPiAoaHR0cDovL3BhdHJpY2thcmx0LmNvbSlcIixcbiAgICBcIlJvd2FuIFdpbnNlbWl1c1wiXG4gIF0sXG4gIFwiZGVwZW5kZW5jaWVzXCI6IHtcbiAgICBcImxlYWZsZXRcIjogXCJeMS4wLjBcIixcbiAgICBcImVzcmktbGVhZmxldFwiOiBcIl4yLjAuMFwiXG4gIH0sXG4gIFwiZGV2RGVwZW5kZW5jaWVzXCI6IHtcbiAgICBcImNoYWlcIjogXCIyLjMuMFwiLFxuICAgIFwiZ2gtcmVsZWFzZVwiOiBcIl4yLjAuMFwiLFxuICAgIFwiaGlnaGxpZ2h0LmpzXCI6IFwiXjguMC4wXCIsXG4gICAgXCJodHRwLXNlcnZlclwiOiBcIl4wLjguNVwiLFxuICAgIFwiaXNwYXJ0YVwiOiBcIl4zLjAuM1wiLFxuICAgIFwiaXN0YW5idWxcIjogXCJeMC40LjJcIixcbiAgICBcImthcm1hXCI6IFwiXjAuMTIuMjRcIixcbiAgICBcImthcm1hLWNoYWktc2lub25cIjogXCJeMC4xLjNcIixcbiAgICBcImthcm1hLWNvdmVyYWdlXCI6IFwiXjAuNS4zXCIsXG4gICAgXCJrYXJtYS1tb2NoYVwiOiBcIl4wLjEuMFwiLFxuICAgIFwia2FybWEtbW9jaGEtcmVwb3J0ZXJcIjogXCJeMC4yLjVcIixcbiAgICBcImthcm1hLXBoYW50b21qcy1sYXVuY2hlclwiOiBcIl4wLjIuMFwiLFxuICAgIFwia2FybWEtc291cmNlbWFwLWxvYWRlclwiOiBcIl4wLjMuNVwiLFxuICAgIFwibWtkaXJwXCI6IFwiXjAuNS4xXCIsXG4gICAgXCJwaGFudG9tanNcIjogXCJeMS45LjE3XCIsXG4gICAgXCJyb2xsdXBcIjogXCJeMC4yNS40XCIsXG4gICAgXCJyb2xsdXAtcGx1Z2luLWpzb25cIjogXCJeMi4wLjBcIixcbiAgICBcInJvbGx1cC1wbHVnaW4tbm9kZS1yZXNvbHZlXCI6IFwiXjEuNC4wXCIsXG4gICAgXCJyb2xsdXAtcGx1Z2luLXVnbGlmeVwiOiBcIl4wLjEuMFwiLFxuICAgIFwic2VtaXN0YW5kYXJkXCI6IFwiXjcuMC41XCIsXG4gICAgXCJzaW5vblwiOiBcIl4xLjExLjFcIixcbiAgICBcInNpbm9uLWNoYWlcIjogXCIyLjcuMFwiLFxuICAgIFwic25henp5XCI6IFwiXjIuMC4xXCIsXG4gICAgXCJ1Z2xpZnktanNcIjogXCJeMi42LjFcIixcbiAgICBcIndhdGNoXCI6IFwiXjAuMTcuMVwiXG4gIH0sXG4gIFwiaG9tZXBhZ2VcIjogXCJodHRwczovL2dpdGh1Yi5jb20vamdyYXZvaXMvZXNyaS1sZWFmbGV0LWdwXCIsXG4gIFwianNuZXh0Om1haW5cIjogXCJzcmMvRXNyaUxlYWZsZXRHUC5qc1wiLFxuICBcImpzcG1cIjoge1xuICAgIFwicmVnaXN0cnlcIjogXCJucG1cIixcbiAgICBcImZvcm1hdFwiOiBcImVzNlwiLFxuICAgIFwibWFpblwiOiBcInNyYy9Fc3JpTGVhZmxldEdQLmpzXCJcbiAgfSxcbiAgXCJsaWNlbnNlXCI6IFwiQXBhY2hlLTIuMFwiLFxuICBcIm1haW5cIjogXCJkaXN0L2VzcmktbGVhZmxldC1ncC1kZWJ1Zy5qc1wiLFxuICBcInJlYWRtZUZpbGVuYW1lXCI6IFwiUkVBRE1FLm1kXCIsXG4gIFwicmVwb3NpdG9yeVwiOiB7XG4gICAgXCJ0eXBlXCI6IFwiZ2l0XCIsXG4gICAgXCJ1cmxcIjogXCJodHRwczovL2dpdGh1Yi5jb20vamdyYXZvaXMvZXNyaS1sZWFmbGV0LWdwLmdpdFwiXG4gIH0sXG4gIFwic2NyaXB0c1wiOiB7XG4gICAgXCJwcmVidWlsZFwiOiBcIm1rZGlycCBkaXN0XCIsXG4gICAgXCJidWlsZFwiOiBcInJvbGx1cCAtYyBwcm9maWxlcy9kZWJ1Zy5qcyAmIHJvbGx1cCAtYyBwcm9maWxlcy9wcm9kdWN0aW9uLmpzXCIsXG4gICAgXCJsaW50XCI6IFwic2VtaXN0YW5kYXJkIHNyYy8qKi8qLmpzIHwgc25henp5XCIsXG4gICAgXCJwcmVwdWJsaXNoXCI6IFwibnBtIHJ1biBidWlsZFwiLFxuICAgIFwicHJldGVzdFwiOiBcIm5wbSBydW4gYnVpbGRcIixcbiAgICBcInRlc3RcIjogXCJucG0gcnVuIGxpbnQgJiYga2FybWEgc3RhcnRcIixcbiAgICBcInJlbGVhc2VcIjogXCIuL3NjcmlwdHMvcmVsZWFzZS5zaFwiLFxuICAgIFwic3RhcnRcIjogXCJ3YXRjaCAnbnBtIHJ1biBidWlsZCcgc3JjICYgaHR0cC1zZXJ2ZXIgLXAgNTAwMCAtYy0xIC1vXCJcbiAgfVxufVxuIiwiLypcbnRvIGRvOlxuc2V0UGFyYW0oW10pXG4qL1xuXG5pbXBvcnQgTCBmcm9tICdsZWFmbGV0JztcbmltcG9ydCB7IFRhc2sgYXMgQmFzZVRhc2ssIFV0aWwgfSBmcm9tICdlc3JpLWxlYWZsZXQnO1xuXG5leHBvcnQgdmFyIFRhc2sgPSBCYXNlVGFzay5leHRlbmQoe1xuXG4gIGluY2x1ZGVzOiBMLkV2ZW50ZWQucHJvdG90eXBlLFxuXG4gIC8vIHNldHRlcnM6IHt9LCB3ZSBkb24ndCB1c2UgdGhlc2UgYmVjYXVzZSB3ZSBkb24ndCBrbm93IHRoZSBQYXJhbU5hbWUgT1IgdmFsdWUgb2YgY3VzdG9tIEdQIHNlcnZpY2VzXG4gIHBhcmFtczoge30sXG4gIHJlc3VsdFBhcmFtczoge30sXG5cbiAgaW5pdGlhbGl6ZTogZnVuY3Rpb24gKG9wdGlvbnMpIHtcbiAgICAvLyBkb24ndCByZXBsYWNlIHBhcmVudCBpbml0aWFsaXplXG4gICAgQmFzZVRhc2sucHJvdG90eXBlLmluaXRpYWxpemUuY2FsbCh0aGlzLCBvcHRpb25zKTtcblxuICAgIC8vIGlmIHBhdGggaXNuJ3Qgc3VwcGxpZWQgaW4gb3B0aW9ucywgdHJ5IGFuZCBkZXRlcm1pbmUgaWYgaXRzIHN5bmMgb3IgYXN5bmMgdG8gc2V0IGF1dG9tYXRpY2FsbHlcbiAgICBpZiAoIXRoaXMub3B0aW9ucy5wYXRoKSB7XG4gICAgICAvLyBhc3N1bWUgaW5pdGlhbGx5LCB0aGF0IHNlcnZpY2UgaXMgc3luY2hyb25vdXNcbiAgICAgIHRoaXMub3B0aW9ucy5hc3luYyA9IGZhbHNlO1xuICAgICAgdGhpcy5vcHRpb25zLnBhdGggPSAnZXhlY3V0ZSc7XG5cbiAgICAgIC8vIHRoZSBwYXJhbWV0ZXJzIGJlbG93IHNlZW0gd29ua3kgdG8gbWUsIGJ1dCB3b3JrIGZvciBib3RoIENPUlMgYW5kIEpTT05QIHJlcXVlc3RzXG4gICAgICB0aGlzLl9zZXJ2aWNlLm1ldGFkYXRhKGZ1bmN0aW9uIChlcnJvciwgcmVzdWx0cykge1xuICAgICAgICBpZiAoIWVycm9yKSB7XG4gICAgICAgICAgaWYgKHJlc3VsdHMuZXhlY3V0aW9uVHlwZSA9PT0gJ2VzcmlFeGVjdXRpb25UeXBlU3luY2hyb25vdXMnKSB7XG4gICAgICAgICAgICB0aGlzLm9wdGlvbnMuYXN5bmMgPSBmYWxzZTtcbiAgICAgICAgICAgIHRoaXMub3B0aW9ucy5wYXRoID0gJ2V4ZWN1dGUnO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLm9wdGlvbnMuYXN5bmMgPSB0cnVlO1xuICAgICAgICAgICAgdGhpcy5vcHRpb25zLnBhdGggPSAnc3VibWl0Sm9iJztcbiAgICAgICAgICB9XG4gICAgICAgICAgdGhpcy5maXJlKCdpbml0aWFsaXplZCcpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIC8vIGlmIGNoZWNrIGZhaWxzLCBob3BlZnVsbHkgaXRzIHN5bmNocm9ub3VzXG4gICAgICAgICAgdGhpcy5vcHRpb25zLmFzeW5jID0gZmFsc2U7XG4gICAgICAgICAgdGhpcy5vcHRpb25zLnBhdGggPSAnZXhlY3V0ZSc7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICB9LCB0aGlzKTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gaWYgcGF0aCBpcyBjdXN0b20sIGhvcGVmdWxseSBpdHMgc3luY2hyb25vdXNcbiAgICAgIGlmICh0aGlzLm9wdGlvbnMuYXN5bmMgIT09IHRydWUgJiYgdGhpcy5vcHRpb25zLnBhdGggIT09ICdzdWJtaXRKb2InKSB7XG4gICAgICAgIHRoaXMub3B0aW9ucy5hc3luYyA9IGZhbHNlO1xuICAgICAgfVxuICAgIH1cbiAgfSxcblxuICAvLyBkb2MgZm9yIHZhcmlvdXMgR1BJbnB1dCB0eXBlcyBjYW4gYmUgZm91bmQgaGVyZVxuICAvLyBodHRwOi8vcmVzb3VyY2VzLmFyY2dpcy5jb20vZW4vaGVscC9hcmNnaXMtcmVzdC1hcGkvaW5kZXguaHRtbCMvR1BfUmVzdWx0LzAycjMwMDAwMDBxNzAwMDAwMC9cblxuICAvLyBzZXQgYm9vbGVhbnMsIG51bWJlcnMsIHN0cmluZ3NcbiAgc2V0UGFyYW06IGZ1bmN0aW9uIChwYXJhbU5hbWUsIHBhcmFtVmFsdWUpIHtcbiAgICBpZiAodHlwZW9mIHBhcmFtVmFsdWUgPT09ICdib29sZWFuJykge1xuICAgICAgdGhpcy5wYXJhbXNbcGFyYW1OYW1lXSA9IHBhcmFtVmFsdWU7XG4gICAgICByZXR1cm47XG4gICAgfSBlbHNlIGlmICh0eXBlb2YgcGFyYW1WYWx1ZSAhPT0gJ29iamVjdCcpIHsgLy8gc3RyaW5ncywgbnVtYmVyc1xuICAgICAgdGhpcy5wYXJhbXNbcGFyYW1OYW1lXSA9IHBhcmFtVmFsdWU7XG4gICAgICByZXR1cm47XG4gICAgfSBlbHNlIGlmICh0eXBlb2YgcGFyYW1WYWx1ZSA9PT0gJ29iamVjdCcgJiYgcGFyYW1WYWx1ZS51bml0cykge1xuICAgICAgLy8gcGFzcyB0aHJvdWdoIEdQTGluZWFyVW5pdCBwYXJhbXMgdW5tb2xlc3RlZFxuICAgICAgdGhpcy5wYXJhbXNbcGFyYW1OYW1lXSA9IHBhcmFtVmFsdWU7XG4gICAgICByZXR1cm47XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIG90aGVyd2lzZSBhc3N1bWUgaXRzIGxhdGxuZywgbWFya2VyLCBib3VuZHMgb3IgZ2VvanNvblxuICAgICAgaWYgKHBhcmFtTmFtZSA9PT0gJ2dlb21ldHJ5Jykge1xuICAgICAgICB0aGlzLnBhcmFtc1twYXJhbU5hbWVdID0gdGhpcy5fc2V0R2VvbWV0cnkocGFyYW1WYWx1ZSk7XG4gICAgICB9IGVsc2UgeyAvLyBwYWNrYWdlIHVwIGFuIGFycmF5IG9mIGVzcmkgZmVhdHVyZXMgaWYgdGhlIHBhcmFtZXRlciBuYW1lIGlzIGFueXRoaW5nIG90aGVyIHRoYW4gZ2VvbWV0cnlcbiAgICAgICAgdmFyIGVzcmlGZWF0dXJlcyA9IHtcbiAgICAgICAgICAnZ2VvbWV0cnlUeXBlJzogdGhpcy5fc2V0R2VvbWV0cnlUeXBlKHBhcmFtVmFsdWUpLFxuICAgICAgICAgICdmZWF0dXJlcyc6IFtdXG4gICAgICAgIH07XG5cbiAgICAgICAgaWYgKHBhcmFtVmFsdWUudHlwZSA9PT0gJ0ZlYXR1cmVDb2xsZWN0aW9uJykge1xuICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcGFyYW1WYWx1ZS5mZWF0dXJlcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgZXNyaUZlYXR1cmVzLmZlYXR1cmVzLnB1c2goeydnZW9tZXRyeSc6IFV0aWwuZ2VvanNvblRvQXJjR0lTKHBhcmFtVmFsdWUuZmVhdHVyZXNbaV0uZ2VvbWV0cnkpfSk7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGVzcmlGZWF0dXJlcy5mZWF0dXJlcy5wdXNoKHsnZ2VvbWV0cnknOiB0aGlzLl9zZXRHZW9tZXRyeShwYXJhbVZhbHVlKX0pO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5wYXJhbXNbcGFyYW1OYW1lXSA9IGVzcmlGZWF0dXJlcztcbiAgICAgIH1cbiAgICB9XG4gIH0sXG5cbiAgLy8gZ2l2ZSBkZXZlbG9wZXIgb3Bwb3J0dW5pdHkgdG8gcG9pbnQgb3V0IHdoZXJlIHRoZSBvdXRwdXQgaXMgZ29pbmcgdG8gYmUgYXZhaWxhYmxlXG4gIHNldE91dHB1dFBhcmFtOiBmdW5jdGlvbiAocGFyYW1OYW1lKSB7XG4gICAgdGhpcy5wYXJhbXMub3V0cHV0UGFyYW0gPSBwYXJhbU5hbWU7XG4gIH0sXG5cbiAgLyogYXN5bmMgZWxldmF0aW9uIHNlcnZpY2VzIG5lZWQgcmVzdWx0UGFyYW1zIGluIG9yZGVyIHRvIHJldHVybiBacyAodW5uZWNlc3NhcmlseSBjb25mdXNpbmcpKi9cbiAgZ3BBc3luY1Jlc3VsdFBhcmFtOiBmdW5jdGlvbiAocGFyYW1OYW1lLCBwYXJhbVZhbHVlKSB7XG4gICAgdGhpcy5yZXN1bHRQYXJhbXNbcGFyYW1OYW1lXSA9IHBhcmFtVmFsdWU7XG4gIH0sXG5cbiAgLy8gd2UgY3VycmVudGx5IGV4cGVjdCBhIHNpbmdsZSBnZW9tZXRyeSBvciBmZWF0dXJlIChwb3J0ZWQgZnJvbTogVGFza3MuUXVlcnkuX3NldEdlb21ldHJ5KVxuICBfc2V0R2VvbWV0cnk6IGZ1bmN0aW9uIChnZW9tZXRyeSkge1xuICAgIC8vIGNvbnZlcnQgYm91bmRzIHRvIGV4dGVudCBhbmQgZmluaXNoXG4gICAgaWYgKGdlb21ldHJ5IGluc3RhbmNlb2YgTC5MYXRMbmdCb3VuZHMpIHtcbiAgICAgIHJldHVybiBMLmVzcmkuVXRpbC5ib3VuZHNUb0V4dGVudChnZW9tZXRyeSk7XG4gICAgfVxuXG4gICAgLy8gY29udmVydCBMLk1hcmtlciA+IEwuTGF0TG5nXG4gICAgaWYgKGdlb21ldHJ5LmdldExhdExuZykge1xuICAgICAgZ2VvbWV0cnkgPSBnZW9tZXRyeS5nZXRMYXRMbmcoKTtcbiAgICB9XG5cbiAgICAvLyBjb252ZXJ0IEwuTGF0TG5nIHRvIGEgZ2VvanNvbiBwb2ludCBhbmQgY29udGludWU7XG4gICAgaWYgKGdlb21ldHJ5IGluc3RhbmNlb2YgTC5MYXRMbmcpIHtcbiAgICAgIGdlb21ldHJ5ID0ge1xuICAgICAgICB0eXBlOiAnUG9pbnQnLFxuICAgICAgICBjb29yZGluYXRlczogW2dlb21ldHJ5LmxuZywgZ2VvbWV0cnkubGF0XVxuICAgICAgfTtcbiAgICB9XG5cbiAgICAvLyBoYW5kbGUgTC5HZW9KU09OLCBwdWxsIG91dCB0aGUgZmlyc3QgZ2VvbWV0cnlcbiAgICBpZiAoZ2VvbWV0cnkgaW5zdGFuY2VvZiBMLkdlb0pTT04pIHtcbiAgICAgIC8vIHJlYXNzaWduIGdlb21ldHJ5IHRvIHRoZSBHZW9KU09OIHZhbHVlICAod2UgYXNzdW1lIG9uZSBmZWF0dXJlIGlzIHByZXNlbnQpXG4gICAgICBnZW9tZXRyeSA9IGdlb21ldHJ5LmdldExheWVycygpWzBdLmZlYXR1cmUuZ2VvbWV0cnk7XG4gICAgICAvLyBwcm9jZXNzZWRJbnB1dC5nZW9tZXRyeVR5cGUgPSBVdGlsLmdlb2pzb25UeXBlVG9BcmNHSVMoZ2VvbWV0cnkudHlwZSk7XG4gICAgICByZXR1cm4gVXRpbC5nZW9qc29uVG9BcmNHSVMoZ2VvbWV0cnkpO1xuICAgIH1cblxuICAgIC8vIEhhbmRsZSBMLlBvbHlsaW5lIGFuZCBMLlBvbHlnb25cbiAgICBpZiAoZ2VvbWV0cnkudG9HZW9KU09OKSB7XG4gICAgICBnZW9tZXRyeSA9IGdlb21ldHJ5LnRvR2VvSlNPTigpO1xuICAgIH1cblxuICAgIC8vIGhhbmRsZSBHZW9KU09OIGZlYXR1cmUgYnkgcHVsbGluZyBvdXQgdGhlIGdlb21ldHJ5XG4gICAgaWYgKGdlb21ldHJ5LnR5cGUgPT09ICdGZWF0dXJlJykge1xuICAgICAgLy8gZ2V0IHRoZSBnZW9tZXRyeSBvZiB0aGUgZ2VvanNvbiBmZWF0dXJlXG4gICAgICBnZW9tZXRyeSA9IGdlb21ldHJ5Lmdlb21ldHJ5O1xuICAgIH1cblxuICAgIC8vIGNvbmZpcm0gdGhhdCBvdXIgR2VvSlNPTiBpcyBhIHBvaW50LCBsaW5lIG9yIHBvbHlnb25cbiAgICBpZiAoZ2VvbWV0cnkudHlwZSA9PT0gJ1BvaW50JyB8fCBnZW9tZXRyeS50eXBlID09PSAnTGluZVN0cmluZycgfHwgZ2VvbWV0cnkudHlwZSA9PT0gJ1BvbHlnb24nKSB7XG4gICAgICByZXR1cm4gVXRpbC5nZW9qc29uVG9BcmNHSVMoZ2VvbWV0cnkpO1xuICAgICAgLy8gcHJvY2Vzc2VkSW5wdXQuZ2VvbWV0cnlUeXBlID0gVXRpbC5nZW9qc29uVHlwZVRvQXJjR0lTKGdlb21ldHJ5LnR5cGUpO1xuICAgIH0gZWxzZSB7XG4gICAgICBVdGlsLndhcm4oJ2ludmFsaWQgZ2VvbWV0cnkgcGFzc2VkIGFzIEdQIGlucHV0LiBTaG91bGQgYmUgYW4gTC5MYXRMbmcsIEwuTGF0TG5nQm91bmRzLCBMLk1hcmtlciBvciBHZW9KU09OIFBvaW50IExpbmUgb3IgUG9seWdvbiBvYmplY3QnKTtcbiAgICB9XG4gIH0sXG5cbiAgX3NldEdlb21ldHJ5VHlwZTogZnVuY3Rpb24gKGdlb21ldHJ5KSB7XG4gICAgaWYgKGdlb21ldHJ5IGluc3RhbmNlb2YgTC5MYXRMbmdCb3VuZHMpIHtcbiAgICAgIHJldHVybiAnZXNyaUdlb21ldHJ5RW52ZWxvcGUnO1xuICAgIH1cblxuICAgIC8vIGNvbnZlcnQgTC5NYXJrZXIgPiBMLkxhdExuZ1xuICAgIGlmIChnZW9tZXRyeS5nZXRMYXRMbmcgfHwgZ2VvbWV0cnkgaW5zdGFuY2VvZiBMLkxhdExuZykge1xuICAgICAgcmV0dXJuICdlc3JpR2VvbWV0cnlQb2ludCc7XG4gICAgfVxuXG4gICAgLy8gaGFuZGxlIEwuR2VvSlNPTiwgcHVsbCBvdXQgdGhlIGZpcnN0IGdlb21ldHJ5XG4gICAgaWYgKGdlb21ldHJ5IGluc3RhbmNlb2YgTC5HZW9KU09OKSB7XG4gICAgICBnZW9tZXRyeSA9IGdlb21ldHJ5LmdldExheWVycygpWzBdLmZlYXR1cmUuZ2VvbWV0cnk7XG4gICAgICByZXR1cm4gVXRpbC5nZW9qc29uVHlwZVRvQXJjR0lTKGdlb21ldHJ5LnR5cGUpO1xuICAgIH1cblxuICAgIC8vIEhhbmRsZSBMLlBvbHlsaW5lIGFuZCBMLlBvbHlnb25cbiAgICBpZiAoZ2VvbWV0cnkudG9HZW9KU09OKSB7XG4gICAgICBnZW9tZXRyeSA9IGdlb21ldHJ5LnRvR2VvSlNPTigpO1xuICAgIH1cblxuICAgIC8vIGhhbmRsZSBHZW9KU09OIGZlYXR1cmUgYnkgcHVsbGluZyBvdXQgdGhlIGdlb21ldHJ5XG4gICAgaWYgKGdlb21ldHJ5LnR5cGUgPT09ICdGZWF0dXJlJykge1xuICAgICAgLy8gZ2V0IHRoZSBnZW9tZXRyeSBvZiB0aGUgZ2VvanNvbiBmZWF0dXJlXG4gICAgICBnZW9tZXRyeSA9IGdlb21ldHJ5Lmdlb21ldHJ5O1xuICAgIH1cblxuICAgIC8vIGNvbmZpcm0gdGhhdCBvdXIgR2VvSlNPTiBpcyBhIHBvaW50LCBsaW5lIG9yIHBvbHlnb25cbiAgICBpZiAoZ2VvbWV0cnkudHlwZSA9PT0gJ1BvaW50JyB8fCBnZW9tZXRyeS50eXBlID09PSAnTGluZVN0cmluZycgfHwgZ2VvbWV0cnkudHlwZSA9PT0gJ1BvbHlnb24nKSB7XG4gICAgICByZXR1cm4gVXRpbC5nZW9qc29uVHlwZVRvQXJjR0lTKGdlb21ldHJ5LnR5cGUpO1xuICAgIH0gZWxzZSBpZiAoZ2VvbWV0cnkudHlwZSA9PT0gJ0ZlYXR1cmVDb2xsZWN0aW9uJykge1xuICAgICAgcmV0dXJuIFV0aWwuZ2VvanNvblR5cGVUb0FyY0dJUyhnZW9tZXRyeS5mZWF0dXJlc1swXS50eXBlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICB9LFxuXG4gIHJ1bjogZnVuY3Rpb24gKGNhbGxiYWNrLCBjb250ZXh0KSB7XG4gICAgdGhpcy5fZG9uZSA9IGZhbHNlO1xuXG4gICAgaWYgKHRoaXMub3B0aW9ucy5hc3luYyA9PT0gdHJ1ZSkge1xuICAgICAgLyogZXNsaW50LWRpc2FibGUgKi9cbiAgICAgIHRoaXMuX3NlcnZpY2UucmVxdWVzdCh0aGlzLm9wdGlvbnMucGF0aCwgdGhpcy5wYXJhbXMsIGZ1bmN0aW9uIChlcnJvciwgcmVzcG9uc2UpIHtcbiAgICAgICAgdGhpcy5fY3VycmVudEpvYklkID0gcmVzcG9uc2Uuam9iSWQ7XG4gICAgICAgIHRoaXMuY2hlY2tKb2IodGhpcy5fY3VycmVudEpvYklkLCBjYWxsYmFjaywgY29udGV4dCk7XG4gICAgICB9LCB0aGlzKTtcbiAgICAgIC8qIGVzbGludC1lbmFibGUgKi9cbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHRoaXMuX3NlcnZpY2UucmVxdWVzdCh0aGlzLm9wdGlvbnMucGF0aCwgdGhpcy5wYXJhbXMsIGZ1bmN0aW9uIChlcnJvciwgcmVzcG9uc2UpIHtcbiAgICAgICAgaWYgKCFlcnJvcikge1xuICAgICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHRzKSB7XG4gICAgICAgICAgICBjYWxsYmFjay5jYWxsKGNvbnRleHQsIGVycm9yLCAocmVzcG9uc2UgJiYgdGhpcy5fcHJvY2Vzc0dQT3V0cHV0KHJlc3BvbnNlKSksIHJlc3BvbnNlKTtcbiAgICAgICAgICB9IGVsc2UgaWYgKHJlc3BvbnNlLmhpc3RvZ3JhbXMpIHtcbiAgICAgICAgICAgIGNhbGxiYWNrLmNhbGwoY29udGV4dCwgZXJyb3IsIHJlc3BvbnNlLCByZXNwb25zZSk7XG4gICAgICAgICAgfSBlbHNlIGlmIChyZXNwb25zZS5yb3V0ZXMpIHtcbiAgICAgICAgICAgIGNhbGxiYWNrLmNhbGwoY29udGV4dCwgZXJyb3IsIChyZXNwb25zZSAmJiB0aGlzLl9wcm9jZXNzTmV0d29ya0FuYWx5c3RPdXRwdXQocmVzcG9uc2UpKSwgcmVzcG9uc2UpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBjYWxsYmFjay5jYWxsKGNvbnRleHQsIGVycm9yLCBudWxsLCBudWxsKTtcbiAgICAgICAgfVxuICAgICAgfSwgdGhpcyk7XG4gICAgfVxuICB9LFxuXG4gIGNoZWNrSm9iOiBmdW5jdGlvbiAoam9iSWQsIGNhbGxiYWNrLCBjb250ZXh0KSB7XG4gICAgdmFyIHBvbGxKb2IgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAvKiBlc2xpbnQtZGlzYWJsZSAqL1xuICAgICAgdGhpcy5fc2VydmljZS5yZXF1ZXN0KCdqb2JzLycgKyBqb2JJZCwge30sIGZ1bmN0aW9uIHBvbGxlZEpvYiAoZXJyb3IsIHJlc3BvbnNlKSB7XG4gICAgICAgIGlmIChyZXNwb25zZS5qb2JTdGF0dXMgPT09ICdlc3JpSm9iU3VjY2VlZGVkJykge1xuICAgICAgICAgIGlmICghdGhpcy5fZG9uZSkge1xuICAgICAgICAgICAgdGhpcy5fZG9uZSA9IHRydWU7XG4gICAgICAgICAgICAvLyB0byBkbzpcbiAgICAgICAgICAgIC8vIHJlZmFjdG9yIHRvIG1ha2UgYW4gYXJyYXkgb2YgYXN5bmMgcmVxdWVzdHMgZm9yIG91dHB1dFxuICAgICAgICAgICAgdGhpcy5fc2VydmljZS5yZXF1ZXN0KCdqb2JzLycgKyBqb2JJZCArICcvcmVzdWx0cy8nICsgdGhpcy5wYXJhbXMub3V0cHV0UGFyYW0sIHRoaXMucmVzdWx0UGFyYW1zLCBmdW5jdGlvbiBwcm9jZXNzSm9iUmVzdWx0IChlcnJvciwgcmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgY2FsbGJhY2suY2FsbChjb250ZXh0LCBlcnJvciwgKHJlc3BvbnNlICYmIHRoaXMuX3Byb2Nlc3NBc3luY091dHB1dChyZXNwb25zZSkpLCByZXNwb25zZSk7XG4gICAgICAgICAgICB9LCB0aGlzKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgd2luZG93LmNsZWFySW50ZXJ2YWwoY291bnRlcik7XG4gICAgICAgIH0gZWxzZSBpZiAocmVzcG9uc2Uuam9iU3RhdHVzID09PSAnZXNyaUpvYkZhaWxlZCcpIHtcbiAgICAgICAgICBjYWxsYmFjay5jYWxsKGNvbnRleHQsICdKb2IgRmFpbGVkJywgbnVsbCk7XG4gICAgICAgICAgd2luZG93LmNsZWFySW50ZXJ2YWwoY291bnRlcik7XG4gICAgICAgIH1cbiAgICAgIH0sIHRoaXMpO1xuICAgICAgLyogZXNsaW50LWVuYWJsZSAqL1xuICAgIH0uYmluZCh0aGlzKTtcblxuICAgIHZhciBjb3VudGVyID0gd2luZG93LnNldEludGVydmFsKHBvbGxKb2IsIHRoaXMuX3NlcnZpY2Uub3B0aW9ucy5hc3luY0ludGVydmFsICogMTAwMCk7XG4gIH0sXG5cbiAgX3Byb2Nlc3NHUE91dHB1dDogZnVuY3Rpb24gKHJlc3BvbnNlKSB7XG4gICAgdmFyIHByb2Nlc3NlZFJlc3BvbnNlID0ge307XG5cbiAgICB2YXIgcmVzdWx0cyA9IHJlc3BvbnNlLnJlc3VsdHM7XG4gICAgLy8gZ3JhYiBzeW5jcm9ub3VzIHJlc3VsdHNcbiAgICBpZiAodGhpcy5vcHRpb25zLmFzeW5jID09PSBmYWxzZSkge1xuICAgICAgLy8gbG9vcCB0aHJvdWdoIHJlc3VsdHMgYW5kIHBhc3MgYmFjaywgcGFyc2luZyBlc3JpIGpzb25cbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcmVzdWx0cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAvKiBqc2hpbnQgaWdub3JlOnN0YXJ0ICovXG4gICAgICAgIHByb2Nlc3NlZFJlc3BvbnNlW3Jlc3VsdHNbaV0ucGFyYW1OYW1lXTtcbiAgICAgICAgLyoganNoaW50IGlnbm9yZTplbmQgKi9cbiAgICAgICAgaWYgKHJlc3VsdHNbaV0uZGF0YVR5cGUgPT09ICdHUEZlYXR1cmVSZWNvcmRTZXRMYXllcicpIHtcbiAgICAgICAgICB2YXIgZmVhdHVyZUNvbGxlY3Rpb24gPSBVdGlsLnJlc3BvbnNlVG9GZWF0dXJlQ29sbGVjdGlvbihyZXN1bHRzW2ldLnZhbHVlKTtcbiAgICAgICAgICBwcm9jZXNzZWRSZXNwb25zZVtyZXN1bHRzW2ldLnBhcmFtTmFtZV0gPSBmZWF0dXJlQ29sbGVjdGlvbjtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBwcm9jZXNzZWRSZXNwb25zZVtyZXN1bHRzW2ldLnBhcmFtTmFtZV0gPSByZXN1bHRzW2ldLnZhbHVlO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBlbHNlIHsgLy8gZ3JhYiBhc3luYyByZXN1bHRzIHNsaWdodGx5IGRpZmZlcmVudGx5XG4gICAgICBwcm9jZXNzZWRSZXNwb25zZS5qb2JJZCA9IHRoaXMuX2N1cnJlbnRKb2JJZDtcbiAgICAgIC8vIHZhciByZXNwb25zZVZhbHVlID0gcmVzcG9uc2UudmFsdWU7XG4gICAgfVxuXG4gICAgLy8gaWYgb3V0cHV0IGlzIGEgcmFzdGVyIGxheWVyLCB3ZSBhbHNvIG5lZWQgdG8gc3R1YiBvdXQgYSBNYXBTZXJ2aWNlIHVybCB1c2luZyBqb2JpZFxuICAgIGlmICh0aGlzLm9wdGlvbnMuYXN5bmMgPT09IHRydWUgJiYgcmVzcG9uc2UuZGF0YVR5cGUgPT09ICdHUFJhc3RlckRhdGFMYXllcicpIHtcbiAgICAgIHZhciBiYXNlVVJMID0gdGhpcy5vcHRpb25zLnVybDtcbiAgICAgIHZhciBuID0gYmFzZVVSTC5pbmRleE9mKCdHUFNlcnZlcicpO1xuICAgICAgdmFyIHNlcnZpY2VVUkwgPSBiYXNlVVJMLnNsaWNlKDAsIG4pICsgJ01hcFNlcnZlci8nO1xuICAgICAgcHJvY2Vzc2VkUmVzcG9uc2Uub3V0cHV0TWFwU2VydmljZSA9IHNlcnZpY2VVUkwgKyAnam9icy8nICsgdGhpcy5fY3VycmVudEpvYklkO1xuICAgIH1cblxuICAgIHJldHVybiBwcm9jZXNzZWRSZXNwb25zZTtcbiAgfSxcblxuICBfcHJvY2Vzc05ldHdvcmtBbmFseXN0T3V0cHV0OiBmdW5jdGlvbiAocmVzcG9uc2UpIHtcbiAgICB2YXIgcHJvY2Vzc2VkUmVzcG9uc2UgPSB7fTtcblxuICAgIGlmIChyZXNwb25zZS5yb3V0ZXMuZmVhdHVyZXMubGVuZ3RoID4gMCkge1xuICAgICAgdmFyIGZlYXR1cmVDb2xsZWN0aW9uID0gVXRpbC5yZXNwb25zZVRvRmVhdHVyZUNvbGxlY3Rpb24ocmVzcG9uc2Uucm91dGVzKTtcbiAgICAgIHByb2Nlc3NlZFJlc3BvbnNlLnJvdXRlcyA9IGZlYXR1cmVDb2xsZWN0aW9uO1xuICAgIH1cblxuICAgIHJldHVybiBwcm9jZXNzZWRSZXNwb25zZTtcbiAgfSxcblxuICBfcHJvY2Vzc0FzeW5jT3V0cHV0OiBmdW5jdGlvbiAocmVzcG9uc2UpIHtcbiAgICB2YXIgcHJvY2Vzc2VkUmVzcG9uc2UgPSB7fTtcbiAgICBwcm9jZXNzZWRSZXNwb25zZS5qb2JJZCA9IHRoaXMuX2N1cnJlbnRKb2JJZDtcblxuICAgIC8vIGlmIG91dHB1dCBpcyBhIHJhc3RlciBsYXllciwgd2UgYWxzbyBuZWVkIHRvIHN0dWIgb3V0IGEgTWFwU2VydmljZSB1cmwgdXNpbmcgam9iaWRcbiAgICBpZiAodGhpcy5vcHRpb25zLmFzeW5jID09PSB0cnVlICYmIHJlc3BvbnNlLmRhdGFUeXBlID09PSAnR1BSYXN0ZXJEYXRhTGF5ZXInKSB7XG4gICAgICB2YXIgYmFzZVVSTCA9IHRoaXMub3B0aW9ucy51cmw7XG4gICAgICB2YXIgbiA9IGJhc2VVUkwuaW5kZXhPZignR1BTZXJ2ZXInKTtcbiAgICAgIHZhciBzZXJ2aWNlVVJMID0gYmFzZVVSTC5zbGljZSgwLCBuKSArICdNYXBTZXJ2ZXIvJztcbiAgICAgIHByb2Nlc3NlZFJlc3BvbnNlLm91dHB1dE1hcFNlcnZpY2UgPSBzZXJ2aWNlVVJMICsgJ2pvYnMvJyArIHRoaXMuX2N1cnJlbnRKb2JJZDtcbiAgICB9XG5cbiAgICAvLyBpZiBvdXRwdXQgaXMgR1BGZWF0dXJlUmVjb3JkU2V0TGF5ZXIsIGNvbnZlcnQgdG8gR2VvSlNPTlxuICAgIGlmIChyZXNwb25zZS5kYXRhVHlwZSA9PT0gJ0dQRmVhdHVyZVJlY29yZFNldExheWVyJykge1xuICAgICAgdmFyIGZlYXR1cmVDb2xsZWN0aW9uID0gVXRpbC5yZXNwb25zZVRvRmVhdHVyZUNvbGxlY3Rpb24ocmVzcG9uc2UudmFsdWUpO1xuICAgICAgcHJvY2Vzc2VkUmVzcG9uc2VbcmVzcG9uc2UucGFyYW1OYW1lXSA9IGZlYXR1cmVDb2xsZWN0aW9uO1xuICAgIH0gZWxzZSB7XG4gICAgICBwcm9jZXNzZWRSZXNwb25zZVtyZXNwb25zZS5wYXJhbU5hbWVdID0gcmVzcG9uc2UudmFsdWU7XG4gICAgfVxuXG4gICAgcmV0dXJuIHByb2Nlc3NlZFJlc3BvbnNlO1xuICB9XG5cbn0pO1xuXG5leHBvcnQgZnVuY3Rpb24gdGFzayAob3B0aW9ucykge1xuICByZXR1cm4gbmV3IFRhc2sob3B0aW9ucyk7XG59XG5cbmV4cG9ydCBkZWZhdWx0IHRhc2s7XG4iLCJpbXBvcnQgeyBTZXJ2aWNlIGFzIEJhc2VTZXJ2aWNlIH0gZnJvbSAnZXNyaS1sZWFmbGV0JztcbmltcG9ydCB7IFRhc2sgfSBmcm9tICcuLi9UYXNrcy9HZW9wcm9jZXNzaW5nJztcblxuZXhwb3J0IHZhciBTZXJ2aWNlID0gQmFzZVNlcnZpY2UuZXh0ZW5kKHtcbiAgb3B0aW9uczoge1xuICAgIGFzeW5jSW50ZXJ2YWw6IDFcbiAgfSxcblxuICBjcmVhdGVUYXNrOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIG5ldyBUYXNrKHRoaXMsIHRoaXMub3B0aW9ucyk7XG4gIH1cblxufSk7XG5cbmV4cG9ydCBmdW5jdGlvbiBzZXJ2aWNlIChvcHRpb25zKSB7XG4gIHJldHVybiBuZXcgU2VydmljZShvcHRpb25zKTtcbn1cblxuZXhwb3J0IGRlZmF1bHQgc2VydmljZTtcbiJdLCJuYW1lcyI6WyJUYXNrIiwiQmFzZVRhc2siLCJVdGlsIiwiU2VydmljZSIsIkJhc2VTZXJ2aWNlIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7O0NDUU8sSUFBSUEsTUFBSSxHQUFHQyxnQkFBUSxDQUFDLE1BQU0sQ0FBQzs7QUFFbEMsQ0FBQSxFQUFFLFFBQVEsRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLFNBQVM7O0FBRS9CLENBQUE7QUFDQSxDQUFBLEVBQUUsTUFBTSxFQUFFLEVBQUU7QUFDWixDQUFBLEVBQUUsWUFBWSxFQUFFLEVBQUU7O0FBRWxCLENBQUEsRUFBRSxVQUFVLEVBQUUsVUFBVSxPQUFPLEVBQUU7QUFDakMsQ0FBQTtBQUNBLENBQUEsSUFBSUEsZ0JBQVEsQ0FBQyxTQUFTLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLENBQUM7O0FBRXRELENBQUE7QUFDQSxDQUFBLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFO0FBQzVCLENBQUE7QUFDQSxDQUFBLE1BQU0sSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFDO0FBQ2pDLENBQUEsTUFBTSxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksR0FBRyxTQUFTLENBQUM7O0FBRXBDLENBQUE7QUFDQSxDQUFBLE1BQU0sSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsVUFBVSxLQUFLLEVBQUUsT0FBTyxFQUFFO0FBQ3ZELENBQUEsUUFBUSxJQUFJLENBQUMsS0FBSyxFQUFFO0FBQ3BCLENBQUEsVUFBVSxJQUFJLE9BQU8sQ0FBQyxhQUFhLEtBQUssOEJBQThCLEVBQUU7QUFDeEUsQ0FBQSxZQUFZLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQztBQUN2QyxDQUFBLFlBQVksSUFBSSxDQUFD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