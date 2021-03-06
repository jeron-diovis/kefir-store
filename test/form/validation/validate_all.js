import { Form } from "../../../src"

describe("form :: validation :: validate all", () => {
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

    // ---

    form.handlers.validate()

    assert.equal(spy.callCount, 1, "Form isn't updated after validation")

    // ---

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
      [
        [ "setValue", $ => $.merge(subj.stream) ],
        "value",
        toValidator(x => x > 0)
      ],
    ])

    let validate
    form$.take(1).onValue(({ handlers }) => {
      validate = handlers.validate
    })

    const spy = sinon.spy()
    form$.changes().onValue(spy)

    validate()
    subj.handler(1)

    assert.equal(spy.callCount, 2, "Form isn't updated twice")

    assert.isTrue(
      spy.getCall(0).args[0].status.isValidated,
      "'isValidated' isn't true after calling validate"
    )

    assert.isFalse(
      spy.getCall(1).args[0].status.isValidated,
      "'isValidated' isn't false after regular store update"
    )
  })
})
