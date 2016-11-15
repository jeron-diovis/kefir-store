import Form from "../../../src/form"

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

    const spy = sinon.spy()
    form.stream.changes().onValue(spy)

    form.handlers.validate()

    assert.equal(spy.callCount, 1, "Validity isn't updated after validation")

    const result = spy.lastCall.args[0];

    assert.deepEqual(result.errors, {
      foo: "foo_error",
      bar: null,
    })
    assert.isFalse(result.status.isValid, "Form's validity isn't updated properly")
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
    assert.isFalse(result.status.isValid, "Form's validity isn't updated properly")
  })

  it("should set 'isValidated' prop in validity state", () => {
    const subj = Subject()
    const form$ = Form.asStream([
      [ [ "setValue", subj ], "value", toValidator(x => x > 0, "error") ],
    ])

    let validate
    form$.take(1).onValue(({ handlers }) => {
      validate = handlers.validate
    })

    const spy = sinon.spy()
    form$.changes().onValue(spy)

    validate()
    subj.handler(1)

    assert.isTrue(spy.getCall(0).args[0].status.isValidated, "'isValidated' isn't true after calling validate")
    assert.isFalse(spy.getCall(1).args[0].status.isValidated, "'isValidated' isn't false after regular store update")
  })
})
