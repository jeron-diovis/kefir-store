import { Model } from "../../src"

describe("model :: base", () => {
  it("should be an object { stream: Observable, handlers: Object }", () => {
    const model = Model()

    assert.isObject(model)
    assert.instanceOf(model.stream, Kefir.Observable)
    assert.deepEqual(model.handlers, {})
  })

  // ---

  describe("helpers: ", () => {
    const testModelStream = model$ => {
      assert.instanceOf(model$, Kefir.Observable, "Stream model is not a stream")

      const spy = sinon.spy()
      model$.onValue(spy)

      const data = spy.lastCall.args[0]

      assert.property(data, "state", "Stream data has no 'state' property")
      assert.deepEqual(data.state, { value: "initial value" }, "State is wrong")

      assert.nestedProperty(data, "handlers.setValue", "Stream data has no handlers")
      assert.isFunction(data.handlers.setValue, "Named handler is not created")
    }

    it("asStream: should be an Observable<{ state, handlers }>", () => {
      assert.isFunction(Model.asStream, "Model.asStream method does not exist")

      const model = Model.asStream(
        [ [ "setValue", "value" ] ],
        { value: "initial value" }
      )

      testModelStream(model)
    })

    it("toStream: should convert model object into Observable", () => {
      assert.isFunction(Model.toStream, "Model.toStream method does not exist")

      const model = Model.toStream(Model(
        [ [ "setValue", "value" ] ],
        { value: "initial value" }
      ))

      testModelStream(model)
    })
  })
})
