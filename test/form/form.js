import Form from "../../src/form"

describe("form :: base", () => {
  it("should be an object { state$, validity$, handlers }", () => {
    const model = Form()

    assert.isObject(model)
    assert.instanceOf(model.state$, Kefir.Observable)
    assert.instanceOf(model.validity$, Kefir.Observable)
    assert.deepEqual(model.handlers, {})
  })

  it("should be initially valid", () => {
    const form = Form()
    const spyState = sinon.spy()
    const spyValidity = sinon.spy()

    form.state$.onValue(spyState)
    form.validity$.onValue(spyValidity)

    assert.equal(spyState.callCount, 1, "Initial state emits more that once")
    assert.equal(spyValidity.callCount, 1, "Initial validity emits more that once")
    assert.deepEqual(spyState.getCall(0).args[0], {}, "Initial state is not empty")
    assert.deepEqual(spyValidity.getCall(0).args[0], { errors: {}, isValid: undefined }, "Initial validation state is not default")
  })
})
