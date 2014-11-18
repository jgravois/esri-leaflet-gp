EsriLeafletGP.Services.Geoprocessing = Esri.Services.Service.extend({
  options: {},

  createTask: function(){
    return new EsriLeafletGP.Tasks.Geoprocessing(this, this.options);
  }
});

EsriLeafletGP.Services.geoprocessing = function(url, options) {
  return new EsriLeafletGP.Services.Geoprocessing(url, options);
};