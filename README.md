# Esri Leaflet GP

> an Esri Leaflet plugin for interacting with geoprocessing services published with ArcGIS Server and the analysis services hosted in ArcGIS Online.

Esri Leaflet GP relies on the minimal [Esri Leaflet](https://github.com/Esri/esri-leaflet) Core which handles abstraction for requests and authentication when necessary.

## Demos
Note that the latest version of this plugin requires a minimum of esri-leaflet [2.0.0](https://github.com/Esri/esri-leaflet/releases/tag/v2.0.0).

Take a look at this [calculate drivetime demo](http://esri.github.io/esri-leaflet/examples/gp-plugin.html) or this [elevation profile demo](https://jgravois.github.io/esri-leaflet-gp/elevation.html) to see it in action.

## Example

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset=utf-8 />
  <title>gp drivetime</title>
  <meta name='viewport' content='initial-scale=1,maximum-scale=1,user-scalable=no' />

  <!-- Load Leaflet from CDN-->
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.0.3/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.0.3"></script>

  <!-- Load Esri Leaflet from CDN -->
  <script src="https://unpkg.com/esri-leaflet@2.0.8"></script>

  <!-- Esri Leaflet GP -->
  <script src="https://unpkg.com/esri-leaflet-gp@2.0.2"></script>

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

  var gpService = L.esri.GP.service({
    url: "https://sampleserver1.arcgisonline.com/ArcGIS/rest/services/Network/ESRI_DriveTime_US/GPServer/CreateDriveTimePolygons",
    useCors:false
  });
  var gpTask = gpService.createTask();

  gpTask.setParam("Drive_Times", "1 2");

  var driveTimes = L.featureGroup();
  map.addLayer(driveTimes);

  map.on('click', function(evt){
    driveTimes.clearLayers();
    gpTask.setParam("Input_Location", evt.latlng)
    gpTask.run(driveTimeCallback);
  });

  function driveTimeCallback(error, response, raw){
    driveTimes.addLayer(L.geoJson(response.Output_Drive_Time_Polygons));
  }

</script>

</body>
</html>
```
## API Reference

### [`L.esri.GP.Service`](http://esri.github.io/esri-leaflet/api-reference/services/gp-service.html)
### [`L.esri.GP.Task`](http://esri.github.io/esri-leaflet/api-reference/tasks/gp-task.html)

## Development Instructions

1. [Fork and clone Esri Leaflet GP](https://help.github.com/articles/fork-a-repo)
2. `cd` into the `esri-leaflet-gp` folder and install the dependencies with `npm install`
3. Run `npm start` from the command line. This will compile minified source in a brand new `dist` directory, launch a tiny webserver and begin watching the raw source for changes.
4. The example at `debug/sample.html` *should* 'just work'
5. Make your changes and create a [pull request](https://help.github.com/articles/creating-a-pull-request)

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

Esri welcomes contributions from anyone and everyone. Please see our [guidelines for contributing](https://github.com/Esri/esri-leaflet/blob/master/CONTRIBUTING.md).

## Terms and Conditions

Signup for an [ArcGIS for Developers account](https://developers.arcgis.com/en/plans) or purchase an [ArcGIS Online Organizational Subscription](http://www.arcgis.com/features/plans/pricing.html).

1. Once you have an account you are good to go. Thats it!
2. If you use this library in a revenue generating application or for government use you must upgrade to a paid account. You are not allowed to generate revenue while on a free plan.

This information is from the [ArcGIS for Developers Terms of Use FAQ](https://developers.arcgis.com/en/terms/faq/)

## Licensing
Copyright 2017 Esri

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
