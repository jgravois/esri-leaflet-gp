describe('GeoprocessingTask', function () {
  describe("should be able to talk to geoprocessing services", function () {
    var anything;

    beforeEach(function () {
      //variables
    });

    it("should do its thing", function () {
      var gpTask = L.esri.GP.Tasks.Geoprocessing();
      expect(1).to.be.eq(1);
    });

  });
});