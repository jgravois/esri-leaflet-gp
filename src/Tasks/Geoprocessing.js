/*
to do:
setParam([])
*/
import L from 'leaflet';
import { Task, Util } from 'esri-leaflet';

export var TaskGP = Task.extend({

  includes: L.Mixin.Events,

  //setters: {}, we don't use these because we don't know the ParamName OR value of custom GP services
  params: {},
  resultParams: {},

  initialize: function(options) {
    //don't replace parent initialize
    Task.prototype.initialize.call(this, options);

    //if path isn't supplied in options, try and determine if its sync or async to set automatically
    if (!this.options.path) {
      //assume initially, that service is synchronous
      this.options.async = false;
      this.options.path = 'execute';

      //the parameters below seem wonky to me, but work for both CORS and JSONP requests
      this._service.metadata(function(error, results) {
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
          //if check fails, hopefully its synchronous
          this.options.async = false;
          this.options.path = 'execute';
          return;
        }
      }, this);
    }
    else {
      //if path is custom, hopefully its synchronous
      if (this.options.async !== true && this.options.path !=='submitJob') {
        this.options.async = false;
      }
    }
  },

  //doc for various GPInput types can be found here
  //http://resources.arcgis.com/en/help/arcgis-rest-api/index.html#/GP_Result/02r3000000q7000000/

  //set booleans, numbers, strings
  setParam: function(paramName, paramValue) {
    if (typeof paramValue === 'boolean') {
      this.params[paramName] = paramValue;
      return;
    }
    //strings, numbers
    else if (typeof paramValue !== 'object') {
      this.params[paramName] = paramValue;
      return;
    }
    else {
      //otherwise assume its latlng, marker, bounds or geojson
      this._setGeometry(paramName, paramValue);
    }
  },

  // not sure how best to handle passing more than one parameter at once
  // setParams: function(inputArray) {
  //   if (L.Util.isArray(inputArray)) {
  //     for (var i = 0; i < inputArray.length; i++) {
  //       this.setParam(inputArray[i]);
  //     }
  //   }
  // },

  // give developer opportunity to point out where the output is going to be available
  setOutputParam: function(paramName) {
    this.params.outputParam = paramName;
  },

  /* necessary because of the design requirement that resultParams be specified
  for async elevation services in order to get Zs (unnecessarily confusing)*/
  gpAsyncResultParam: function(paramName, paramValue) {
    this.resultParams[paramName] = paramValue;
  },

  // we currently expect a single geometry or feature (ported from: Tasks.Query._setGeometry)
  _setGeometry: function(paramName, geometry) {
    var processedInput = {
      'geometryType': '',
      'features': []
    };

    // convert bounds to extent and finish
    if ( geometry instanceof L.LatLngBounds ) {
      // set geometry + type
      processedInput.features.push({'geometry': L.esri.Util.boundsToExtent(geometry)});
      processedInput.geometryType = L.esri.Util.geojsonTypeToArcGIS(geometry.type);
    }

    // convert L.Marker > L.LatLng
    if(geometry.getLatLng){
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
    if ( geometry instanceof L.GeoJSON ) {
      //reassign geometry to the GeoJSON value  (we are assuming that only one feature is present)
      geometry = geometry.getLayers()[0].feature.geometry;
      processedInput.features.push({'geometry': L.esri.Util.geojsonToArcGIS(geometry)});
      processedInput.geometryType = L.esri.Util.geojsonTypeToArcGIS(geometry.type);
    }

    // Handle L.Polyline and L.Polygon
    if (geometry.toGeoJSON) {
      geometry = geometry.toGeoJSON();
    }

    // handle GeoJSON feature by pulling out the geometry
    if ( geometry.type === 'Feature' ) {
      // get the geometry of the geojson feature
      geometry = geometry.geometry;
    }

    // confirm that our GeoJSON is a point, line or polygon
    if ( geometry.type === 'Point' ||  geometry.type === 'LineString' || geometry.type === 'Polygon') {
      processedInput.features.push({'geometry': L.esri.Util.geojsonToArcGIS(geometry)});
      processedInput.geometryType = L.esri.Util.geojsonTypeToArcGIS(geometry.type);
    }

    else {
      if(console && console.warn) {
        console.warn('invalid geometry passed as GP input. Should be an L.LatLng, L.LatLngBounds, L.Marker or GeoJSON Point Line or Polygon object');
      }
    }

    this.params[paramName] = processedInput;
    return;
  },

  run: function(callback, context) {
    this._done = false;

    if (this.options.async === true) {
      this._service.request(this.options.path, this.params, function(error, response) {
        this._currentJobId = response.jobId;
        this.checkJob(this._currentJobId, callback, context);
      }, this);
    } else {
      return this._service.request(this.options.path, this.params, function(error, response) {
        callback.call(context, error, (response && this.processGPOutput(response)), response);
      }, this);
    }
  },

  checkJob: function(jobId, callback, context) {
    var pollJob = function() {
      this._service.request('jobs/' + jobId, {}, function polledJob(error, response) {
        if (response.jobStatus === 'esriJobSucceeded') {
          if (!this._done){
            this._done = true;
            // to do:
            // refactor to make an array of async requests for output
            this._service.request('jobs/' + jobId + '/results/' + this.params.outputParam, this.resultParams, function processJobResult(error, response) {
              callback.call(context, error, (response && this.processAsyncOutput(response)), response);
            }, this);
          }
          window.clearInterval(counter);
        } else if (response.jobStatus === 'esriJobFailed') {
          callback.call(context, 'Job Failed', null);
          window.clearInterval(counter);
        }
      }, this);
    }.bind(this);

    var counter = window.setInterval(pollJob, this._service.options.asyncInterval*1000);

  },

  processGPOutput: function(response) {
    var processedResponse = {};
    var responseValue;

  	// grab syncronous results
  	if (this.options.async === false) {
  	  // loop through results and pass back, parsing esri json
      for (var i=0;i<response.results.length;i++){
        /* jshint ignore:start */
        processedResponse[response.results[i].paramName];
        /* jshint ignore:end */
        if (response.results[i].dataType === 'GPFeatureRecordSetLayer') {
          var featureCollection = Util.responseToFeatureCollection(response.results[i].value);
          processedResponse[response.results[i].paramName] = featureCollection;
        }
        else {
          processedResponse[response.results[i].paramName] = response.results[i].value;
        }
      }
  	}

  	//grab async results slightly differently
  	else {
  		processedResponse.jobId = this._currentJobId;
  	  responseValue = response.value;
  	}

  	// if output is a raster layer, we also need to stub out a MapService url using jobid
  	if (this.options.async === true && response.dataType === 'GPRasterDataLayer') {
  		var baseURL = this.options.url;
  		var n = baseURL.indexOf('GPServer');
  		var serviceURL = baseURL.slice(0,n)+'MapServer/';
  		processedResponse.outputMapService = serviceURL+'jobs/'+this._currentJobId;
  	}

    return processedResponse;
  },

  processAsyncOutput: function(response) {
    var processedResponse = {};
    processedResponse.jobId = this._currentJobId;

    // if output is a raster layer, we also need to stub out a MapService url using jobid
    if (this.options.async === true && response.dataType === 'GPRasterDataLayer') {
      var baseURL = this.options.url;
      var n = baseURL.indexOf('GPServer');
      var serviceURL = baseURL.slice(0,n)+'MapServer/';
      processedResponse.outputMapService = serviceURL+'jobs/'+this._currentJobId;
    }

    // if output is GPFeatureRecordSetLayer, convert to GeoJSON
    if (response.dataType === 'GPFeatureRecordSetLayer' ) {
      var featureCollection = Util.responseToFeatureCollection(response.value);
      processedResponse[response.paramName] = featureCollection;
    }

    else {
      processedResponse[response.paramName] = response.value;
    }

    return processedResponse;
  }

});

export function taskGP (options) {
  return new TaskGP(options);
}

export default taskGP;
