import Model from "../../src/model"

describe("model :: base", () => {
  it("should be an object { state$, handlers }", () => {
    const model = Model()

    assert.isObject(model)
    assert.instanceOf(model.state$, Kefir.Observable)
    assert.deepEqual(model.handlers, {})
  })

  describe("asStream", () => {
    it("should be an Observable<{ state, handlers }>", () => {
      assert.isFunction(Model.asStream)
      const model = Model.asStream(
        [ [ "setValue", "value" ] ],
        { value: "initial value" }
      )
      assert.instanceOf(model, Kefir.Observable, "Compact model is not a stream")
      const spy = sinon.spy()
      model.onValue(spy)
      const data = spy.lastCall.args[0]
      assert.property(data, "state")
      assert.deepEqual(data.state, { value: "initial value" })
      assert.deepProperty(data, "handlers.setValue")
      assert.isFunction(data.handlers.setValue)
    })
  })
})
