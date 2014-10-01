/*
to do:
figure out how to get things working with non cors enabled servers
*/
(function(L){
L.esri.Tasks.Geoprocessing = L.esri.Tasks.Task.extend({
  setters: {
    //none
  },
  params: {
    //no hardcoded parameters
  },
  resultParams: {
    //no hardcoded parameters
  },
  
  initialize: function (url, options) {
    //don't replace parent initialize
    L.esri.Tasks.Task.prototype.initialize.call(this, url, options);
      //this.synchronous = undefined;
      this.request(function(error, results, response){
        if (undefined === error){
          if (results.executionType === "esriExecutionTypeSynchronous") {
            this.CORS = true;
            this.synchronous = true;
            this.path = "execute";
          }
          else {
            this.CORS = true;
            this.synchronous = false;
            this.path = "submitJob";
          }
        }
        else {
          //assuming GP service on non CORS enabled servers are synchronous (not safe)
          this.CORS = false;
          //L.esri.get = L.esri.Request.get.JSONP;
          this.synchronous = true;
          this.path = "execute";
          return
        }
        //we could support SOE's too if we bypassed testing for synchronicity and just let people pass a raw url
    }, this);
    
  },
  //doc for various GPInput types can be found here
  //http://resources.arcgis.com/en/help/arcgis-rest-api/index.html#/GP_Result/02r3000000q7000000/

  gpString: function (paramName, paramValue){
    if (typeof paramValue === "string")
    this.params[paramName] = paramValue;
  },

  gpNumber: function (paramName, paramValue){
    if (typeof paramValue === "number")
      this.params[paramName] = paramValue;
  },

  gpBoolean: function (paramName, bool){
    if (typeof bool === "boolean")
      this.params[paramName] = bool;
  },

  //the design requirement that resultParams be specified for async elevation services in order to get Zs seems unnecessarily confusing
  gpAsyncResultParam: function(paramName, paramValue){
    this.resultParams[paramName] = paramValue
  },

  //would be nice to be able to accept LatLng, Bounds, Polygons etc. as well
  gpGeoJson: function (paramName, geoJson){
    var processedInput = {"geometryType":"", "features": []};

    //confirmed we handle raw GeoJSON geometries appropriately too, but what about 'feature' type objects outside of FeatureCollections or 'GeometryCollections'?
    
    if (geoJson.type === "FeatureCollection") {
      processedInput.geometryType = this.geoJsonTypeToArcGIS(geoJson.features[0].geometry.type);
      processedInput.features = L.esri.Util.geojsonToArcGIS(geoJson);
    }
    else if (geoJson.type === "Feature") {
      processedInput.geometryType = this.geoJsonTypeToArcGIS(geoJson.geometry.type);
      processedInput.features.push(L.esri.Util.geojsonToArcGIS(geoJson));
    }
    else {
      processedInput.geometryType = this.geoJsonTypeToArcGIS(geoJson.type);
      processedInput.features.push({"geometry": L.esri.Util.geojsonToArcGIS(geoJson)});
    }    
    this.params[paramName] = processedInput;    
  },

  geoJsonTypeToArcGIS: function (geoJsonType) {
    var arcgisGeometryType;
    switch (geoJsonType) {
    case "Point":
      arcgisGeometryType = "esriGeometryPoint";
      break;
    case "LineString":
      arcgisGeometryType = "esriGeometryPolyline";
      break;
    case "Polygon":
      arcgisGeometryType = "esriGeometryPolygon";
      break;
    default:
      console.error("unable to map geoJson geometry type to an arcgis geometry type");
    }
    return arcgisGeometryType;
  },

  run: function (callback, context){
    var jobId;
    if (this.synchronous === false) {
      this.request(this.path, this.params, function(error, response){
        jobId = response.jobId;
        this.checkJob(jobId, callback, context);               
      }, this);
    }
    else {
    return this.request(function(error, response){
      callback.call(error, (response && this.processGPOutput(response)), response);
    }, this);
    }
  },

  checkJob: function(jobId, callback, context){
    var pollJob = function () {
      this.request("/jobs/" + jobId, {}, function polledJob(error, response){
          if (response.jobStatus === "esriJobSucceeded"){
            this.request("/jobs/" + jobId + "/results/OutputProfile", this.resultParams, function processJobResult(error, response){
              callback.call(context, error, (response && this.processGPOutput(response)), response);
              
            }, this);
            window.clearInterval(counter);
          } else if (response.jobStatus === "esriJobFailed"){
            callback.call(context, "Job Failed", null);
            window.clearInterval(counter);
          }
          //?
        }, this); 
    }.bind(this);

    var counter = window.setInterval(pollJob, 1000);
    
  },

  processGPOutput: function(response) {
    var processedResponse = {};
    var responseValue;

    if (this.synchronous === true){
      responseValue = response.results[0].value;
    }

    else {
      responseValue = response.value;
    }

    if (responseValue.features) {
      featureCollection = L.esri.Util.responseToFeatureCollection(responseValue);
      processedResponse.features = featureCollection.features;
    }

    else if (response.results[0].dataType === "GPDataFile"){
      processedResponse.result = response.results[0];
    }
    /*
    do we ever see output booleans? strings? numbers?
    */
    return processedResponse;
  }

});

L.esri.Tasks.geoprocessing = function(url, params){
  return new L.esri.Tasks.Geoprocessing(url, params);
};

})(L);