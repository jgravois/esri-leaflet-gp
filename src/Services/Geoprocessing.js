EsriLeafletGP.Services.Geoprocessing = Esri.Services.Service.extend({
  options: {},

  createTask: function(){
    this.fire('load',{foo:"bar"});
    return new EsriLeafletGP.Tasks.Geoprocessing(this, this.options);
  }
});

EsriLeafletGP.Services.geoprocessing = function(options) {
  return new EsriLeafletGP.Services.Geoprocessing(options);
};