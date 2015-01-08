EsriLeafletGP.Services.Geoprocessing = Esri.Services.Service.extend({
  options: {},

  createTask: function(){
    return new EsriLeafletGP.Tasks.Geoprocessing(this, this.options);
  }
});

EsriLeafletGP.Services.geoprocessing = function(options) {
  return new EsriLeafletGP.Services.Geoprocessing(options);
};