import { Model } from "../../src"

describe("model :: input", () => {
  it("as stream: should work just as regular store", () => {
    const subject = Subject()
    const model = Model([
      [ subject.stream, "value" ]
    ])

    const spy = sinon.spy()
    model.stream.onValue(spy)

    subject.handler("value")

    assert.deepEqual(spy.lastCall.args[0], { value: "value" })
  })

  it("as string: should create input stream and add handler with that name", () => {
    const model = Model([
      [ "setValue", "value" ]
    ])

    assert.isFunction(model.handlers.setValue, "Handler is not created")

    const spy = sinon.spy()
    model.stream.onValue(spy)

    model.handlers.setValue("value")

    assert.deepEqual(spy.lastCall.args[0], { value: "value" }, "Input stream does not work")
  })


  describe("as array:", () => {
    it("should allow string as first parameter", () => {
      let model

      const setup = () => {
        model = Model([
          [ [ "some", () => {} ], "value" ]
        ])
      }

      assert.doesNotThrow(setup, /\[kefir-store :: model\] Invalid input/)

      assert.isFunction(model.handlers.some)
    })
  })

  it("should not allow duplicating handler names", () => {
    const setup = () => Model([
      [ "setValue", "value" ],
      [ [ "setValue", () => {} ], "value" ]
    ])
    assert.throws(setup, /Handler 'setValue' already exists/)
  })

})
