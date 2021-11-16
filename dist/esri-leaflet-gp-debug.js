/* esri-leaflet-gp - v3.0.0 - Tue Nov 16 2021 09:30:52 GMT-0800 (Pacific Standard Time)
 * Copyright (c) 2021 Environmental Systems Research Institute, Inc.
 * Apache-2.0 */
(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('leaflet'), require('esri-leaflet')) :
  typeof define === 'function' && define.amd ? define(['exports', 'leaflet', 'esri-leaflet'], factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory((global.L = global.L || {}, global.L.esri = global.L.esri || {}, global.L.esri.GP = {}), global.L, global.L.esri));
})(this, (function (exports, L, esriLeaflet) { 'use strict';

  function _interopDefaultLegacy (e) { return e && typeof e === 'object' && 'default' in e ? e : { 'default': e }; }

  var L__default = /*#__PURE__*/_interopDefaultLegacy(L);

  var version = "3.0.0";

  /*
  to do:
  setParam([])
  */

  const Task = esriLeaflet.Task.extend({

    includes: L__default["default"].Evented.prototype,

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
      } else if (typeof paramValue === 'object' && paramValue.units) {
        // pass through GPLinearUnit params unmolested also
        this.params[paramName] = paramValue;
      } else if (paramName === 'geometry') {
        // convert raw geojson geometries to esri geometries
        this.params[paramName] = this._setGeometry(paramValue);
      } else {
        // otherwise assume its latlng, marker, bounds or geojson and package up an array of esri features
        const geometryType = this._setGeometryType(paramValue);
        const esriFeatures = {
          features: []
        };

        if (geometryType) {
          esriFeatures.geometryType = geometryType;
        }
        if (paramValue.type === 'FeatureCollection' && paramValue.features[0].type === 'Feature') {
          for (let i = 0; i < paramValue.features.length; i++) {
            if (paramValue.features[i].type === 'Feature') {
              // pass through feature attributes and geometries
              esriFeatures.features.push(esriLeaflet.Util.geojsonToArcGIS(paramValue.features[i]));
            } else {
              // otherwise assume the array only contains geometries
              esriFeatures.features.push({ geometry: esriLeaflet.Util.geojsonToArcGIS(paramValue.features[i].geometry) });
            }
          }
        } else {
          esriFeatures.features.push({ geometry: this._setGeometry(paramValue) });
        }
        this.params[paramName] = esriFeatures;
      }
    },

    // give developer opportunity to point out where the output is going to be available
    setOutputParam: function (paramName) {
      this.params.outputParam = paramName;
    },

    /* async elevation services need resultParams in order to return Zs (unnecessarily confusing) */
    gpAsyncResultParam: function (paramName, paramValue) {
      this.resultParams[paramName] = paramValue;
    },

    // we currently expect a single geometry or feature (ported from: Tasks.Query._setGeometry)
    _setGeometry: function (geometry) {
      // convert bounds to extent and finish
      if (geometry instanceof L__default["default"].LatLngBounds) {
        return L__default["default"].esri.Util.boundsToExtent(geometry);
      }

      // convert L.Marker > L.LatLng
      if (geometry.getLatLng) {
        geometry = geometry.getLatLng();
      }

      // convert L.LatLng to a geojson point and continue;
      if (geometry instanceof L__default["default"].LatLng) {
        geometry = {
          type: 'Point',
          coordinates: [geometry.lng, geometry.lat]
        };
      }

      // handle L.GeoJSON, pull out the first geometry
      if (geometry instanceof L__default["default"].GeoJSON) {
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
      if (geometry instanceof L__default["default"].LatLngBounds) {
        return 'esriGeometryEnvelope';
      }

      // convert L.Marker > L.LatLng
      if (geometry.getLatLng || geometry instanceof L__default["default"].LatLng) {
        return 'esriGeometryPoint';
      }

      // handle L.GeoJSON, pull out the first geometry
      if (geometry instanceof L__default["default"].GeoJSON) {
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

    getResult: function (jobId, output, callback, context) {
      this._service.request(
        'jobs/' + jobId + '/results/' + output,
        this.resultParams,
        function processJobResult (error, response) {
          let result = null;
          const out = (response && this._processAsyncOutput(response));

          if (output in out) {
            result = out[output];
          }

          callback.call(
            context,
            error,
            result,
            response
          );
        }, this);
    },

    checkJob: function (jobId, callback, context) {
      const pollJob = function () {
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

      const counter = window.setInterval(pollJob, this._service.options.asyncInterval * 1000);
    },

    _processGPOutput: function (response) {
      const processedResponse = {};

      const results = response.results;
      // grab syncronous results
      if (this.options.async === false) {
        // loop through results and pass back, parsing esri json
        for (let i = 0; i < results.length; i++) {
          if (results[i].dataType === 'GPFeatureRecordSetLayer') {
            const featureCollection = esriLeaflet.Util.responseToFeatureCollection(results[i].value);
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
        const baseURL = this.options.url;
        const n = baseURL.indexOf('GPServer');
        const serviceURL = baseURL.slice(0, n) + 'MapServer/';
        processedResponse.outputMapService = serviceURL + 'jobs/' + this._currentJobId;
      }

      return processedResponse;
    },

    _processNetworkAnalystOutput: function (response) {
      const processedResponse = {};

      if (response.routes.features.length > 0) {
        const featureCollection = esriLeaflet.Util.responseToFeatureCollection(response.routes);
        processedResponse.routes = featureCollection;
      }

      return processedResponse;
    },

    _processAsyncOutput: function (response) {
      const processedResponse = {};
      processedResponse.jobId = this._currentJobId;

      // if output is a raster layer, we also need to stub out a MapService url using jobid
      if (this.options.async === true && response.dataType === 'GPRasterDataLayer') {
        const baseURL = this.options.url;
        const n = baseURL.indexOf('GPServer');
        const serviceURL = baseURL.slice(0, n) + 'MapServer/';
        processedResponse.outputMapService = serviceURL + 'jobs/' + this._currentJobId;
      }

      // if output is GPFeatureRecordSetLayer, convert to GeoJSON
      if (response.dataType === 'GPFeatureRecordSetLayer') {
        const featureCollection = esriLeaflet.Util.responseToFeatureCollection(response.value);
        processedResponse[response.paramName] = featureCollection;
      } else {
        processedResponse[response.paramName] = response.value;
      }

      return processedResponse;
    }

  });

  function task (options) {
    return new Task(options);
  }

  const Service = esriLeaflet.Service.extend({
    options: {
      asyncInterval: 1
    },

    createTask: function () {
      return new Task(this, this.options);
    }

  });

  function service (options) {
    return new Service(options);
  }

  exports.Service = Service;
  exports.Task = Task;
  exports.VERSION = version;
  exports.service = service;
  exports.task = task;

  Object.defineProperty(exports, '__esModule', { value: true });

}));
//# sourceMappingURL=esri-leaflet-gp-debug.js.map
