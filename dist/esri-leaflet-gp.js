/* esri-leaflet-gp - v3.0.0 - Tue Nov 16 2021 09:30:52 GMT-0800 (Pacific Standard Time)
 * Copyright (c) 2021 Environmental Systems Research Institute, Inc.
 * Apache-2.0 */
!function(e,t){"object"==typeof exports&&"undefined"!=typeof module?t(exports,require("leaflet"),require("esri-leaflet")):"function"==typeof define&&define.amd?define(["exports","leaflet","esri-leaflet"],t):t(((e="undefined"!=typeof globalThis?globalThis:e||self).L=e.L||{},e.L.esri=e.L.esri||{},e.L.esri.GP={}),e.L,e.L.esri)}(this,function(e,t,n){"use strict";function s(e){return e&&"object"==typeof e&&"default"in e?e:{default:e}}var o=s(t);const i=n.Task.extend({includes:o.default.Evented.prototype,params:{},resultParams:{},initialize:function(e){n.Task.prototype.initialize.call(this,e),this.options.path||void 0!==this.options.async?(this.options.async&&(this.options.path=this.options.path||"submitJob"),this.options.async||(this.options.path=this.options.path||"execute")):(this.options.async=!1,this.options.path="execute",this._service.metadata(function(e,t){e||("esriExecutionTypeSynchronous"===t.executionType?(this.options.async=!1,this.options.path="execute"):(this.options.async=!0,this.options.path="submitJob"),this.fire("initialized"))},this))},setParam:function(e,t){if("boolean"==typeof t||"object"!=typeof t)this.params[e]=t;else if("object"==typeof t&&t.units)this.params[e]=t;else if("geometry"===e)this.params[e]=this._setGeometry(t);else{var s=this._setGeometryType(t);const o={features:[]};if(s&&(o.geometryType=s),"FeatureCollection"===t.type&&"Feature"===t.features[0].type)for(let e=0;e<t.features.length;e++)"Feature"===t.features[e].type?o.features.push(n.Util.geojsonToArcGIS(t.features[e])):o.features.push({geometry:n.Util.geojsonToArcGIS(t.features[e].geometry)});else o.features.push({geometry:this._setGeometry(t)});this.params[e]=o}},setOutputParam:function(e){this.params.outputParam=e},gpAsyncResultParam:function(e,t){this.resultParams[e]=t},_setGeometry:function(e){return e instanceof o.default.LatLngBounds?o.default.esri.Util.boundsToExtent(e):(e=(e=e.getLatLng?e.getLatLng():e)instanceof o.default.LatLng?{type:"Point",coordinates:[e.lng,e.lat]}:e)instanceof o.default.GeoJSON?(e=e.getLayers()[0].feature.geometry,n.Util.geojsonToArcGIS(e)):"Point"===(e="Feature"===(e=e.toGeoJSON?e.toGeoJSON():e).type?e.geometry:e).type||"LineString"===e.type||"Polygon"===e.type?n.Util.geojsonToArcGIS(e):void n.Util.warn("invalid geometry passed as GP input. Should be an L.LatLng, L.LatLngBounds, L.Marker or GeoJSON Point Line or Polygon object")},_setGeometryType:function(e){return e instanceof o.default.LatLngBounds?"esriGeometryEnvelope":e.getLatLng||e instanceof o.default.LatLng?"esriGeometryPoint":e instanceof o.default.GeoJSON?(e=e.getLayers()[0].feature.geometry,n.Util.geojsonTypeToArcGIS(e.type)):"Point"===(e="Feature"===(e=e.toGeoJSON?e.toGeoJSON():e).type?e.geometry:e).type||"LineString"===e.type||"Polygon"===e.type?n.Util.geojsonTypeToArcGIS(e.type):"FeatureCollection"===e.type?n.Util.geojsonTypeToArcGIS(e.features[0].type):null},run:function(s,o){if(!(this._done=!1)!==this.options.async)return this._service.request(this.options.path,this.params,function(e,t){e?s.call(o,e,null,null):t.results?s.call(o,e,t&&this._processGPOutput(t),t):t.histograms?s.call(o,e,t,t):t.routes&&s.call(o,e,t&&this._processNetworkAnalystOutput(t),t)},this);this._service.request(this.options.path,this.params,function(e,t){this._currentJobId=t.jobId,this.checkJob(this._currentJobId,s,o)},this)},getResult:function(e,i,n,r){this._service.request("jobs/"+e+"/results/"+i,this.resultParams,function(e,t){let s=null;var o=t&&this._processAsyncOutput(t);i in o&&(s=o[i]),n.call(r,e,s,t)},this)},checkJob:function(s,o,i){var e=function(){this._service.request("jobs/"+s,{},function(e,t){"esriJobSucceeded"===t.jobStatus?(this._done||(this._done=!0,this._service.request("jobs/"+s+"/results/"+this.params.outputParam,this.resultParams,function(e,t){o.call(i,e,t&&this._processAsyncOutput(t),t)},this)),window.clearInterval(n)):"esriJobFailed"===t.jobStatus&&(o.call(i,"Job Failed",null),window.clearInterval(n))},this)}.bind(this);const n=window.setInterval(e,1e3*this._service.options.asyncInterval)},_processGPOutput:function(e){const t={};var s,o=e.results;if(!1===this.options.async)for(let e=0;e<o.length;e++)"GPFeatureRecordSetLayer"===o[e].dataType?(s=n.Util.responseToFeatureCollection(o[e].value),t[o[e].paramName]=s):t[o[e].paramName]=o[e].value;else t.jobId=this._currentJobId;if(!0===this.options.async&&"GPRasterDataLayer"===e.dataType){const i=this.options.url;e=i.indexOf("GPServer"),e=i.slice(0,e)+"MapServer/";t.outputMapService=e+"jobs/"+this._currentJobId}return t},_processNetworkAnalystOutput:function(e){const t={};return 0<e.routes.features.length&&(e=n.Util.responseToFeatureCollection(e.routes),t.routes=e),t},_processAsyncOutput:function(e){const t={};if(t.jobId=this._currentJobId,!0===this.options.async&&"GPRasterDataLayer"===e.dataType){const o=this.options.url;var s=o.indexOf("GPServer"),s=o.slice(0,s)+"MapServer/";t.outputMapService=s+"jobs/"+this._currentJobId}return"GPFeatureRecordSetLayer"===e.dataType?(s=n.Util.responseToFeatureCollection(e.value),t[e.paramName]=s):t[e.paramName]=e.value,t}});const r=n.Service.extend({options:{asyncInterval:1},createTask:function(){return new i(this,this.options)}});e.Service=r,e.Task=i,e.VERSION="3.0.0",e.service=function(e){return new r(e)},e.task=function(e){return new i(e)},Object.defineProperty(e,"__esModule",{value:!0})});
//# sourceMappingURL=esri-leaflet-gp.js.map