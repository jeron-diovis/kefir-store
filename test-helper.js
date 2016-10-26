var chai = require("chai")
var sinon = require("sinon")
var Bus = require("kefir-bus")
var Kefir = require("kefir")

// ---

var SinonAsPromised = require("sinon-as-promised")
var MockPromises = require("mock-promises")

// ---

global.assert = chai.assert
global.sinon = sinon
global.Kefir = Kefir

global.Subject = function (init = x => x) {
  var bus = Bus()
  return {
    stream: init(bus.changes()),
    handler: bus.emit,
  }
}

// Gain full control over timers and promises.
// Provide "tick" func to callback, allowing to manually shift time forward.
// After each timeshift, all promises, resolved for that moment, will be executed.
global.FakeAsync = cb => {
  var clock = sinon.useFakeTimers()
  global.Promise = MockPromises.getMockPromise(Promise)
  SinonAsPromised(global.Promise)
  try {
    cb(ms => {
      clock.tick(ms)
      MockPromises.tickAllTheWay()
    })
  } finally {
    MockPromises.reset()
    global.Promise = MockPromises.getOriginalPromise()
    SinonAsPromised(global.Promise)
    clock.restore()
  }
}
