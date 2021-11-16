# Changelog

## [Unreleased][unreleased]

## [3.0.0]

### Breaking Changes

* Leaflet and Esri Leaflet are now peerDependencies so that consumers can install whichever version they want.

## [2.0.3]

### Added

* support for `GPRecordSet` input parameters (feature collections with properties and no geometry)

## [2.0.2]

### Added

* plugin now supports making GP requests to Image Servers that return histograms
* plugin now supports Network Analyst style GP requests that return routes
* parsed input parameters are now limited to a raw geometry (as opposed to an array of features) when `geometryType` was set previously

### Fixed

* more server errors are now passed back to the developer
* `GPLinearUnit` input parameters can now be passed as JSON object literals

### Changed

* some previously undocumented public methods have been made private

## [2.0.1]

### Fixed

* add `package.json` browser bundle pointing at built library.

### Changed

* Build system refactored to use latest Rollup and Rollup plugins.
* Reworked bundling directives for various modules systems to resolve and simplify various issues
  * WebPack users no longer have to use the Babel loader.
  * Babelify with Babel 6 now works

## [2.0.0]

### Changed

* moving out of beta and into full-blown SemVer.

## [2.0.0-beta.1]

### Breaking
* Requires the 2.0.0-beta.4 release of Esri Leaflet.
* Requires the 1.0.0-beta.1 release of Leaflet.
* Namespaces have changed all exports now sit directly under the `L.esri.GP` namespace. This mean that things like `L.esri.GP.Services.Geoprocessing` can now be accessed like `L.esri.GP.Service`.

### Added

* Better build/test/release automation.
* Support for JSPM in package.json. Now you can `import gpTask from 'esri-leaflet-gp/src/Tasks/Geoprocessing';` for more compact builds but, be aware of [caveats](http://blog.izs.me/post/44149270867/why-no-directories-lib-in-node-the-less-snarky)
* Support for browserify in the package.json. Now you can `var gpTask = require('esri-leaflet-gp/src/Tasks/Geoprocessing');` for more compact builds, but be aware of [caveats](http://blog.izs.me/post/44149270867/why-no-directories-lib-in-node-the-less-snarky)


## [1.0.2]

### Changed
- moved CDN to [jsdelivr](http://www.jsdelivr.com/#!leaflet.esri.gp)


## [1.0.1]

### Changed
- refactored result parsing logic to return **all** output results in callback for synchronous services instead of just the first.

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

## Alpha 2

### Breaking Changes
- reorganized logic of GP to inherit from services (to introduce better support for secure resources)

### Changed
- added ability to set custom paths (which will allow for use with Network Analyst services and SOEs)
- refactored code to follow pattern established by [esri-leaflet-geocoder](https://github.com/Esri/esri-leaflet-geocoder)
- introduced ability to check properties of GP services that don't support CORS

[unreleased]: https://github.com/jgravois/esri-leaflet-gp/compare/v3.0.0...HEAD
[3.0.0]: https://github.com/jgravois/esri-leaflet-gp/compare/v2.0.3...v3.0.0
[2.0.3]: https://github.com/jgravois/esri-leaflet-gp/compare/v2.0.2...v2.0.3
[2.0.2]: https://github.com/jgravois/esri-leaflet-gp/compare/v2.0.1...v2.0.2
[2.0.1]: https://github.com/jgravois/esri-leaflet-gp/compare/v2.0.0...v2.0.1
[2.0.0]: https://github.com/jgravois/esri-leaflet-gp/compare/v2.0.0-beta.1...v2.0.0
[2.0.0-beta.1]: https://github.com/jgravois/esri-leaflet-gp/compare/v1.0.2...v2.0.0-beta.1
[1.0.2]: https://github.com/jgravois/esri-leaflet-gp/compare/v1.0.1...v1.0.2
[1.0.1]: https://github.com/jgravois/esri-leaflet-gp/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/jgravois/esri-leaflet-gp/compare/v0.0.1-beta.1...v1.0.0
[Beta 1]: https://github.com/jgravois/esri-leaflet-gp/compare/v0.0.1-alpha.3...v0.0.1-beta.1
[Alpha 3]: https://github.com/jgravois/esri-leaflet-gp/compare/v0.0.1-alpha.3...v0.0.1-alpha.2
