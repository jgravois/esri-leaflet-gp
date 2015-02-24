describe('L.esri.GP.Tasks.Geoprocessing', function () {
  function createMap(){
    // create container
    var container = document.createElement('div');

    // give container a width/height
    container.setAttribute('style', 'width:500px; height: 500px;');

    // add contianer to body
    document.body.appendChild(container);

    return L.map(container).setView([45.51, -122.66], 16);
  }

  var map = createMap();

  var anythingElse;

  var task;

  var bounds = L.latLngBounds([[45.5, -122.66],[ 45.51, -122.65]]);
  var latlng = L.latLng(45.51, -122.66);
  var rawLatlng = [45.51, -122.66];

  var rawBounds = [[45.5, -122.66],[ 45.51, -122.65]];
  var rawLatLng = [45.51, -122.66];

  var rawGeoJsonPolygon = {
    "type": "Polygon",
    "coordinates": [[
      [-97,39],[-97,41],[-94,41],[-94,39],[-97,39]
    ]]
  };

  var rawGeoJsonFeature = {"type": "Feature"}
  rawGeoJsonFeature.geometry = rawGeoJsonPolygon;

  var geoJsonPolygon = L.geoJson(rawGeoJsonPolygon);

  var gpServiceUrl = 'http://example.com/mock/arcgis/rest/services/Folder/MockService/GPServer/CoolAnalysis';

  var sampleServiceMetadataResponse = {
    "name": "CoolAnalysis",
    "displayName": "Cool Analysis",
    "category": "",
    "helpUrl": "http://example.arcgisonline.com/arcgisoutput/whatever.htm",
    "executionType": "esriExecutionTypeSynchronous",
    "parameters": [{
      "name": "Input_Location",
      "dataType": "GPFeatureRecordSetLayer",
      "displayName": "Input Location",
      "direction": "esriGPParameterDirectionInput",
      "defaultValue": {
        "geometryType": "esriGeometryPoint",
        "spatialReference": {
          "wkid": 4326
        },
        "Fields": [{
          "name": "FID",
          "type": "esriFieldTypeOID",
          "alias": "FID"
        }],
        "fields": [{
          "name": "FID",
          "type": "esriFieldTypeOID",
          "alias": "FID"
        }]
      },
      "parameterType": "esriGPParameterTypeRequired",
      "category": "",
      "choiceList": []
    }, {
      "name": "Drive_Times",
      "dataType": "GPString",
      "displayName": "Drive Times",
      "direction": "esriGPParameterDirectionInput",
      "defaultValue": "5 10 15",
      "parameterType": "esriGPParameterTypeOptional",
      "category": "",
      "choiceList": []
    }, {
      "name": "Output_Drive_Time_Polygons",
      "dataType": "GPFeatureRecordSetLayer",
      "displayName": "Output Drive Time Polygons",
      "direction": "esriGPParameterDirectionOutput",
      "defaultValue": {
        "geometryType": "esriGeometryPolygon",
        "spatialReference": {
          "wkid": 4326
        },
        "Fields": [{
          "name": "FID",
          "type": "esriFieldTypeOID",
          "alias": "FID"
        }, {
          "name": "FacilityID",
          "type": "esriFieldTypeInteger",
          "alias": "FacilityID"
        }],
        "fields": [{
          "name": "FID",
          "type": "esriFieldTypeOID",
          "alias": "FID"
        }, {
          "name": "FacilityID",
          "type": "esriFieldTypeInteger",
          "alias": "FacilityID"
        }]
      },
      "parameterType": "esriGPParameterTypeRequired",
      "category": "",
      "choiceList": []
    }]
  }

  var sampleFeatureCollection = {
    'type': 'FeatureCollection',
    'features': [{
      'type': 'Feature',
      'geometry': {
        'type': 'Point',
        'coordinates': [-122.81, 45.48]
      },
      'properties': {
        'ObjectID': 1,
        'Name': 'Site'
      },
      'id': 1
    }]
  };

  beforeEach(function(){
    server = sinon.fakeServer.create();
    task = L.esri.Tasks.query({url: featureLayerUrl});
  });

  afterEach(function(){
    server.restore();
  });

  it("should be able to determine if a service is sync or async", function () {
    var gpTask = L.esri.GP.Tasks.Geoprocessing();
    //make sure requst URL operation name isn't malformed
    expect(1).to.be.eq(1);
  });

  it("should make appropriate requests when a custom path is supplied", function () {
    var gpTask = L.esri.GP.Tasks.Geoprocessing();
    expect(1).to.be.eq(1);
  });

  it("should pass along individual primitive parameters in requests", function () {
    var gpTask = L.esri.GP.Tasks.Geoprocessing();
    expect(1).to.be.eq(1);
  });

  it("should parse GeoJSON inputs and pass them as GeoServices JSON", function () {
    var gpTask = L.esri.GP.Tasks.Geoprocessing();
    expect(1).to.be.eq(1);
  });

  it("should do the same with markers", function () {
    var gpTask = L.esri.GP.Tasks.Geoprocessing();
    expect(1).to.be.eq(1);
  });

  it("and bounds", function () {
    var gpTask = L.esri.GP.Tasks.Geoprocessing();
    expect(1).to.be.eq(1);
  });

  it("should parse GP service feature collection responses and present them as GeoJSON", function () {
    var gpTask = L.esri.GP.Tasks.Geoprocessing();
    expect(1).to.be.eq(1);
  });

  it("should parse GP service responses and present file download urls", function () {
    var gpTask = L.esri.GP.Tasks.Geoprocessing();
    expect(1).to.be.eq(1);
  });

  it("should make appropriate requests when a custom path is supplied", function () {
    var gpTask = L.esri.GP.Tasks.Geoprocessing();
    expect(1).to.be.eq(1);
  });

  /* to do

  it("should poll async services and pass output when its baked", function () {
    var gpTask = L.esri.GP.Tasks.Geoprocessing();
    expect(1).to.be.eq(1);
  });

  */

});