import Form from "../../src/form"

describe("form :: validation :: validate all", () => {
  const toValidator = (test, msg) => (value, state) => test(value, state) ? null : msg

  it("should validate current form's state", () => {
    const form = Form([
      [ "setFoo", "foo", toValidator(x => x > 0, "foo_error") ],
      [ "setBar", "bar", toValidator(x => x > 0, "bar_error") ],
    ], {
      foo: 0,
      bar: 1,
    })

    const spyState = sinon.spy()
    const spyValid = sinon.spy()
    form.state$.changes().onValue(spyState)
    form.validity$.changes().onValue(spyValid)

    form.handlers.validate()

    assert.equal(spyState.callCount, 0, "State has been updated after validation")
    assert.equal(spyValid.callCount, 1, "Validity isn't updated after validation")
    const result = spyValid.lastCall.args[0];
    assert.deepEqual(result.errors, {
      foo: "foo_error",
      bar: null,
    })
    assert.isFalse(result.isValid, "Form's validity isn't updated properly")
  })

  it("should work for Form.asStream", () => {
    let validate

    const form$ = Form.asStream([
      [ "setFoo", "foo", toValidator(x => x > 0, "foo_error") ],
      [ "setBar", "bar", toValidator(x => x > 0, "bar_error") ],
    ], {
      foo: 0,
      bar: 1,
    })

    const spy = sinon.spy()

    form$.take(1).onValue(({ handlers }) => {
      validate = handlers.validate
    })

    form$.changes().onValue(spy)

    validate()

    assert.equal(spy.callCount, 1, "Form isn't updated after validation")
    const result = spy.lastCall.args[0];
    assert.deepEqual(result.errors, {
      foo: "foo_error",
      bar: null,
    })
    assert.isFalse(result.isValid, "Form's validity isn't updated properly")
  })
})
