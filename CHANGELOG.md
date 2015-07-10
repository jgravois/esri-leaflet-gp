# Changelog

## [1.0.0]

This is expected to be the last (and only) stable release of Esri Leaflet GP compatible with Leaflet 0.7.3. All future 1.0.X releases will be compatible with Leaflet 0.7.3 and contain only bug fixes. New features will only be added in Esri Leaflet GP 2.0.0 (which will require Leaflet 1.0.0).

### Changed
- Added support for temporary map service output (async services only).

## [Beta 1]
### Changed
- fixed two bugs that caused errors when calling asynchronous services
- made the interval at which the plugin checks for async gp output configurable
- added `jobId` to parsed async responses
- fixed an edge case where async results could be passed to the client app more than once

## [Alpha 3]
### Breaking Changes
- modified Services.Geoprocessing constructor to account for changes in esri leaflet core at [Release Candidate 5](https://github.com/Esri/esri-leaflet/blob/master/CHANGELOG.md#release-candidate-5)
- added a generic setParam() method to replace previous setters

### Changed
- in addition to L.GeoJSON geometries, L.LatLng, L.LatLngBounds, and L.Marker are now considered valid GP inputs

## [Alpha 2]

### Breaking Changes
- reorganized logic of GP to inherit from services (to introduce better support for secure resources)

### Changed
- added ability to set custom paths (which will allow for use with Network Analyst services and SOEs)
- refactored code to follow pattern established by [esri-leaflet-geocoder](https://github.com/Esri/esri-leaflet-geocoder)
- introduced ability to check properties of GP services that don't support CORS
