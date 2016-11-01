import Model from "../../src/model"

describe("model :: base", () => {
  it("should be an object { state$, handlers }", () => {
    const model = Model()

    assert.isObject(model)
    assert.instanceOf(model.state$, Kefir.Observable)
    assert.deepEqual(model.handlers, {})
  })

  // ---

  const testModelStream = model$ => {
    assert.instanceOf(model$, Kefir.Observable, "Stream model is not a stream")
    const spy = sinon.spy()
    model$.onValue(spy)
    const data = spy.lastCall.args[0]
    assert.property(data, "state")
    assert.deepEqual(data.state, { value: "initial value" })
    assert.deepProperty(data, "handlers.setValue")
    assert.isFunction(data.handlers.setValue)
  }

  describe("asStream", () => {
    it("should be an Observable<{ state, handlers }>", () => {
      assert.isFunction(Model.asStream)

      const model = Model.asStream(
        [ [ "setValue", "value" ] ],
        { value: "initial value" }
      )

      testModelStream(model)
    })
  })

  describe("toStream", () => {
    it("should convert model object into Observable", () => {
      assert.isFunction(Model.toStream)

      const model = Model.toStream(Model(
        [ [ "setValue", "value" ] ],
        { value: "initial value" }
      ))

      testModelStream(model)
    })
  })
})
