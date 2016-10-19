import Model from "../../src/model"

describe("model :: input", () => {
  it("as stream: should work just as regular store", () => {
    const subject = Subject()
    const model = Model([
      [ subject.stream, "value" ]
    ])

    const spy = sinon.spy()
    model.state$.onValue(spy)

    subject.handler("value")

    assert.deepEqual(spy.lastCall.args[0], { value: "value" })
  })

  it("as string: should create input stream and add handler with that name", () => {
    const model = Model([
      [ "setValue", "value" ]
    ])

    assert.isFunction(model.handlers.setValue, "Handler is not created")

    const spy = sinon.spy()
    model.state$.onValue(spy)

    model.handlers.setValue("value")

    assert.deepEqual(spy.lastCall.args[0], { value: "value" }, "Input stream does not work")
  })


  describe("as array", () => {
    it("should require string as first parameter", () => {
      const setup = () => Model([
        [ [ 42, () => {} ], "value" ]
      ])
      assert.throws(setup, /\[kefir-store :: model\] Invalid input/)
    })

    it("with subject: should just use that subject", () => {
      const subject = Subject()
      const model = Model([
        [ [ "setValue", subject ], "value" ]
      ])

      assert.isFunction(model.handlers.setValue, "Handler is not created")

      const spy = sinon.spy()
      model.state$.onValue(spy)

      model.handlers.setValue("value")

      assert.deepEqual(spy.lastCall.args[0], { value: "value" })
    })

    it("with stream: should create subject and merge it with that stream", () => {
      const subject = Subject()

      const model = Model([
        [ [ "setValue", subject.stream ], "value" ]
      ])

      const spy = sinon.spy()
      model.state$.onValue(spy)

      subject.handler("value_1")
      model.handlers.setValue("value_2")

      assert.equal(spy.callCount, 3)
      assert.deepEqual(spy.getCall(1).args[0], { value: "value_1" })
      assert.deepEqual(spy.getCall(2).args[0], { value: "value_2" })
    })

    it("with function: should create subject and init it with that function", () => {
      const model = Model([
        [ [ "setValue", $ => $.map(x => x * 2) ], "value" ]
      ])

      const spy = sinon.spy()
      model.state$.onValue(spy)

      model.handlers.setValue(2)

      assert.deepEqual(spy.lastCall.args[0], { value: 4 })
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