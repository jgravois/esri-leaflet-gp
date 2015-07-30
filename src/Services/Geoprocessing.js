import { Service as BaseService } from 'esri-leaflet';
import { Task } from '../Tasks/Geoprocessing';

// var BaseService = Service;

export var Service = BaseService.extend({
  options: {
    asyncInterval: 1
  },

  createTask: function(){
    return new Task(this, this.options);
  }

});

export function service (options) {
  return new Service(options);
}

export default service;