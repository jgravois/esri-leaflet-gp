# Esri Leaflet GP

Esri Leaflet GP is an API helper for interacting with geoprocessing services published with ArcGIS Server and the analysis services hosted in ArcGIS Online.

**Currently Esri Leaflet GP is in development and should be thought of as a beta or preview**

Esri Leaflet GP relies on the minimal Esri Leaflet Core which handles abstraction for requests and authentication when neccessary. You can find out more about the Esri Leaflet Core on the [Esri Leaflet downloads page](http://esri.github.com/esri-leaflet/downloads).

## Example
Note that the latest version of this plugin requires a minimum of esri-leaflet [1.0.0 RC5](https://github.com/Esri/esri-leaflet/releases/tag/v1.0.0-rc.5).

Take a look at this [calculate drivetime demo](http://esri.github.io/esri-leaflet/examples/gp-plugin.html) or this [elevation profile demo](https://jgravois.github.io/esri-leaflet-gp/elevation-profile.html) to see it in action.

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset=utf-8 />
  <title>gp drivetime</title>
  <meta name='viewport' content='initial-scale=1,maximum-scale=1,user-scalable=no' />

  <!-- Load Leaflet from CDN-->
  <link rel="stylesheet" href="http://cdn.leafletjs.com/leaflet-0.7.3/leaflet.css" />
  <script src="http://cdn.leafletjs.com/leaflet-0.7.3/leaflet.js"></script>

  <!-- Esri Leaflet Core -->
  <script src="http://cdn.jsdelivr.net/leaflet.esri/1.0.0-rc.8/esri-leaflet.js"></script>

  <!-- Esri Leaflet GP -->
  <script src="//cdn-geoweb.s3.amazonaws.com/esri-leaflet-gp/0.0.1-beta.1/esri-leaflet-gp.js"></script>


  <style>
    body {
      margin:0;
      padding:0;
    }

    #map {
      position: absolute;
      top:0;
      bottom:0;
      right:0;left:0;
    }

    #info-pane {
      position: absolute;
      top: 10px;
      right: 10px;
      z-index: 10;
      padding: 1em;
      background: white;
    }
  </style>
</head>
<body>

<div id="map"></div>
<div id="info-pane" class="leaflet-bar">
</div>

<script>
  document.getElementById('info-pane').innerHTML = 'click on the map to calculate 5 and 10 minute drivetimes';

  var map = L.map('map').setView([40, -74.2], 12);

  L.esri.basemapLayer('NationalGeographic').addTo(map);

  var gpService = new L.esri.GP.Services.Geoprocessing({
    url: "http://sampleserver1.arcgisonline.com/ArcGIS/rest/services/Network/ESRI_DriveTime_US/GPServer/CreateDriveTimePolygons",
    useCors:false
  });
  var gpTask = gpService.createTask();

  gpTask.setParam("Drive_Times", "5 10");

  var driveTimes = new L.FeatureGroup();
  map.addLayer(driveTimes);

  map.on('click', function(evt){
    driveTimes.clearLayers();
    gpTask.setParam("Input_Location", evt.latlng)
    gpTask.run(driveTimeCallback);
  });

  function driveTimeCallback(error, response, raw){
    driveTimes.addLayer(L.geoJson(response));
  }

</script>

</body>
</html>
```
## L.esri.GP.Services.Geoprocessing

### Constructor

**Extends** [`L.esri.Services.Service`](http://esri.github.io/esri-leaflet/api-reference/tasks/task.html)

Constructor | Options | Description
--- | --- | ---
`new L.esri.GP.Services.Geoprocessing(options)` | [`<GeoprocessingOptions>`](#options) | Creates a new Geoprocessing Service.

### Options

Option | Type | Default | Description
--- | --- | --- | ---
`url` | `String` | `` | The URL of the geoprocessing service you'd like to leverage.
`path` | `String` | `execute` | (Optional) The class is able to sniff out execute/submitJob operations from typical [Geoprocessing](http://server.arcgis.com/en/server/latest/publish-services/windows/a-quick-tour-of-authoring-geoprocessing-services.htm) services, but setting 'path' can be helpful for [SOEs](http://resources.arcgis.com/en/help/main/10.2/index.html#//0154000004s5000000) and Network Analyst Services with custom operation names.
`async` | `Boolean` | `false` | (Optional) Set 'async' to indicate whether a GP service with a custom operation name is synchronous or asynchronous.
`asyncInterval` | `Integer` | `1` | (Optional) How often the application should check on jobs in progress.

Note: By default, the plugin assumes services are synchronous and that 'execute' is the appropriate path.

If you are working with an asynchronous service or one with a custom operation name and don't supply this information in the constructor, you'll have to leave enough time to make a roundtrip to the server and gather the information before calling GP.Tasks.Geoprocessing.run().

The 'initialized' event is intended to help with this.

```
var myService = new L.esri.GP.Services.Geoprocessing({
    url: "http://elevation.arcgis.com/arcgis/rest/services/Tools/ElevationAsync/GPServer/Profile"
  });
var myTask = myService.createTask();

myTask.on('initialized', function(){
  myTask.setParam("inputFeature", polyline.toGeoJSON());
  myTask.run(function(error, geojson, response){
    ...
  });
})

```

L.esri.GP.Services.Geoprocessing also accepts all L.esri.Services.Service options.

### Methods

Method | Returns | Description
--- | --- | ---
`createTask()` | `L.esri.GP.Tasks.Geoprocessing` | Returns a Geoprocessing task.


## L.esri.GP.Tasks.Geoprocessing

### Constructor

**Extends** [`L.esri.Tasks.Task`](http://esri.github.io/esri-leaflet/api-reference/tasks/task.html)

Constructor | Options | Description
--- | --- | ---
`GeoprocessingService.createTask()`<br>`L.esri.Tasks.Tasks(options)` | [`<GeoprocessingOptions>`](#options) | Creates a new Geoprocessing Task.

### Options

L.esri.GP.Tasks.Geoprocessing accepts all L.esri.Tasks.Task options.

### Methods

Method | Returns | Description
--- | --- | ---
`setParam(<String> inputParamName, <String||Boolean||Number||Geometry> value)` | `this` | Sets an input parameter.  L.LatLng, L.Marker, L.LatLngBounds, and L.GeoJSON (both Features and Geometries) will be converted to [GeoServices](http://resources.arcgis.com/en/help/arcgis-rest-api/index.html#/Geometry_objects/02r3000000n1000000/) JSON automatically.
`setOutputParam(<String> outputParamName)` | `this` | Only applicable for asynchronous services.  Nofifies the plugin of the parameter name so that it knows where to retrieve output.
`run(<Function> callback)` | `this` | Calls the corresponding Geoprocessing service, passing the previously supplied input parameters.
`gpAsyncResultParam(<String> resultParamName, <Object> value)` | `this` | Sets a result parameter for Asynchronous geoprocessing services that require it.

#### Result Object

A single result from the geoprocessing service. You should not rely on all these properties being present in every result object.

Property | Type | Description
--- | --- | ---
`jobId` | [`<String>`] | ID of processed job (only applicable for asynchronous services).
`features` | [`L.GeoJSON`] | An array of GeoJSON features.
`result` | `<Object>`| A result object typically containing a link to the url of an output file written to disk on the server.

#### GP Results

Geoprocessing results conform to the following format

```json
[
  {
    "features": ['L.GeoJSON'],
    "result":{
      "paramName": "Output_File",
      "dataType": "GPDataFile",
      "value": {
        "url": "http://server/arcgis/rest/directories/arcgisoutput/./_ags_856aed6eb_.png"
      }
    }
  }
]
```

## Development Instructions

1. [Fork and clone Esri Leaflet GP](https://help.github.com/articles/fork-a-repo)
2. `cd` into the `esri-leaflet-gp` folder
5. Install the dependencies with `npm install`
5. The 'elevation-profile.html' example should 'just work'
6. Make your changes and create a [pull request](https://help.github.com/articles/creating-a-pull-request)

## Dependencies

Esri Leaflet GP relies on the minimal Esri Leaflet Core which handles abstraction for requests and authentication when necessary. You can find out more about Esri Leaflet from the [Esri Leaflet Quickstart](http://esri.github.io/esri-leaflet/examples/).

## Resources

* [Geoprocessing Services Documentation](http://resources.arcgis.com/en/help/arcgis-rest-api/index.html#/GP_Service/02r3000000rq000000/)
* [ArcGIS for Developers](http://developers.arcgis.com)
* [ArcGIS REST Services](http://resources.arcgis.com/en/help/arcgis-rest-api/)
* [twitter@esri](http://twitter.com/esri)

## Issues

Find a bug or want to request a new feature?  Please let us know by submitting an issue.

## Contributing

Esri welcomes contributions from anyone and everyone. Please see our [guidelines for contributing](https://github.com/esri/contributing).

## Terms and Conditions

Signup for an [ArcGIS for Developers account](https://developers.arcgis.com/en/plans) or purchase an [ArcGIS Online Organizational Subscription](http://www.arcgis.com/features/plans/pricing.html).

1. Once you have an account you are good to go. Thats it!
2. If you use this library in a revenue generating application or for goverment use you must upgrade to a paid account. You are not allowed to generate revenue while on a free plan.

This information is from the [ArcGIS for Developers Terms of Use FAQ](https://developers.arcgis.com/en/terms/faq/)

## Licensing
Copyright 2015 Esri

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

> http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

A copy of the license is available in the repository's [license.txt]( https://raw.github.com/Esri/esri-leaflet-geocoder/master/license.txt) file.

[](Esri Tags: ArcGIS Web Mapping Leaflet Geocoding)
[](Esri Language: JavaScript)
