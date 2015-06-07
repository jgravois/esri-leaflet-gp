/*
to do:
setParam([])
*/

EsriLeafletGP.Tasks.Geoprocessing = Esri.Tasks.Task.extend({

  includes: L.Mixin.Events,

  //setters: {}, we don't use these because we don't know the ParamName OR value of custom GP services
  params: {},
  resultParams: {},

  initialize: function(options) {
    //don't replace parent initialize
    L.esri.Tasks.Task.prototype.initialize.call(this, options);

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
    var jobId;
    this._done = false;

    if (this.options.async === true) {
      this._service.request(this.options.path, this.params, function(error, response) {
        jobId = response.jobId;
        this.checkJob(jobId, callback, context);
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
            this._service.request('jobs/' + jobId + '/results/' + this.params.outputParam, this.resultParams, function processJobResult(error, response) {
              callback.call(context, error, (response && this.processGPOutput(response)), response);
            }, this);
          }
          window.clearInterval(counter);
        } else if (response.jobStatus === 'esriJobFailed') {
          callback.call(context, 'Job Failed', null);
          window.clearInterval(counter);
        }
      }, this);
    }.bind(this);

    var counter = window.setInterval(pollJob, 1000);

  },

  processGPOutput: function(response) {
    var processedResponse = {};
    var responseValue;

    if (this.options.async === false) {
      responseValue = response.results[0].value;
    } else {
      responseValue = response.value;
    }

    if (responseValue.features) {
      var featureCollection = L.esri.Util.responseToFeatureCollection(responseValue);
      processedResponse.features = featureCollection.features;
    } else if (response.results[0].dataType === 'GPDataFile') {
      processedResponse.result = response.results[0];
    }
    //do we need to be able to pass back output booleans? strings? numbers?
    return processedResponse;
  }

});

EsriLeafletGP.Tasks.geoprocessing = function(params) {
  return new EsriLeafletGP.Tasks.Geoprocessing(params);
};
