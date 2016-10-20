var chai = require("chai")
var sinon = require("sinon")
var Bus = require("kefir-bus")
var Kefir = require("kefir")

// ---

var SinonAsPromised = require("sinon-as-promised")
var MockPromises = require("mock-promises")

// @link https://github.com/charleshansen/mock-promises#promise-resolution-policy
// Lib does not provide API for executing just ALL that can be executed.
// I need a manual control over resolving/rejecting promises,
// but don't need to exec callbacks manually one-by-one.
MockPromises.getPendingPromisesCount = function() {
  return this.contracts.filter(x => !x._executed).length
}

MockPromises.run = function() {
  let prev, curr
  do {
    prev = this.getPendingPromisesCount()
    this.contracts.executeForResolvedPromises()
    curr = this.getPendingPromisesCount()
  } while (prev !== curr)
}

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
      MockPromises.run()
    })
  } finally {
    MockPromises.reset()
    global.Promise = MockPromises.getOriginalPromise()
    SinonAsPromised(global.Promise)
    clock.restore()
  }
}
