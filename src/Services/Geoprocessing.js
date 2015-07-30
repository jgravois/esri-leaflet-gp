import { Service } from 'esri-leaflet';
import { TaskGP } from '../Tasks/Geoprocessing';

export var ServiceGP = Service.extend({
  options: {
    asyncInterval: 1
  },

  createTask: function(){
    return new TaskGP(this, this.options);
  }

});

export function serviceGP (options) {
  return new ServiceGP(options);
}

export default serviceGP;