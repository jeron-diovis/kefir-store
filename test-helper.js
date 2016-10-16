var chai = require("chai")
var sinon = require("sinon")
var Bus = require("kefir-bus")
var Kefir = require("kefir")

global.assert = chai.assert
global.sinon = sinon
global.Kefir = Kefir

global.Subject = function () {
  var bus = Bus()
  return {
    stream: bus.changes(),
    handler: bus.emit,
  }
}

global.withFakeTime = cb => {
  var clock = sinon.useFakeTimers()
  cb(ms => clock.tick(ms), clock)
  clock.restore()
}