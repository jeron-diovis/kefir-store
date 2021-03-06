import { Form } from "../../../src"

describe("form :: validation:", () => {
  let validator

  beforeEach(() => {
    validator = toValidator(x => x > 0, ERROR_MSG)
  })

  afterEach(() => {
    validator = null
  })

  it("validator should receive value and current state", () => {
    validator = sinon.spy(validator)
    const form = Form([
      [ "setValue", "value", validator ]
    ], {
      value: 0
    })

    form.stream.onValue(noop) // activate
    form.handlers.setValue(42)

    assert.equal(validator.callCount, 1, "Validator is not called once")
    assert.deepEqual(
      validator.lastCall.args,
      [ 42, { value: 0 } ],
      "validator does not receive proper arguments"
    )
  })


  describe("should emit atomic updates", () => {
    it("for validated inputs", () => {
      const form = Form([
        [ "setValue", "value", validator ]
      ])

      const spy = sinon.spy()

      form.stream.changes().onValue(spy)

      form.handlers.setValue(0)
      form.handlers.setValue(1)

      assert.equal(spy.callCount, 2, "Form isn't updated twice")

      const args = x => spy.getCall(x).args[0]

      assert.deepEqual(args(0).state, { value: 0 }, "Set invalid value: State is wrong")
      assert.deepEqual(args(0).errors, { value: ERROR_MSG }, "Set invalid value: Errors are wrong")
      assert.isFalse(args(0).status.isValid, "Set invalid value: 'isValid' status is wrong")

      assert.deepEqual(args(1).state, { value: 1 }, "Set valid value: State is wrong")
      assert.deepEqual(args(1).errors, { value: null }, "Set valid value: Errors are wrong")
      assert.isTrue(args(1).status.isValid, "Set valid value: 'isValid' status is wrong")
    })

    it("for non-validated inputs", () => {
      const form = Form([
        [ "setValue", "value" ]
      ])

      const spy = sinon.spy()

      form.stream.changes().onValue(spy)

      form.handlers.setValue(0)

      assert.equal(spy.callCount, 1)

      const args = x => spy.getCall(x).args[0]

      assert.deepEqual(args(0).state, { value: 0 }, "State is wrong")
      assert.deepEqual(args(0).errors, {}, "Errors are wrong")
      assert.isTrue(args(0).status.isValid, "'isValid' status is wrong")
    })
  })


  describe("when value is invalid", () => {
    it("state still should be updated", () => {
      const form = Form([
        [ "setValue", "value", validator ],
      ])

      const spy = sinon.spy()
      form.stream.changes().onValue(spy)
      form.handlers.setValue(0)
      form.handlers.setValue(-1)

      assert.equal(spy.callCount, 2)

      const args = x => spy.getCall(x).args[0]

      assert.deepEqual(args(0).state, { value: 0 })
      assert.deepEqual(args(1).state, { value: -1 })
    })

    it("reducer should not be called", () => {
      const reducer = sinon.spy((state, value) => ({
        ...state,
        value,
        result: 1 / value,
      }))

      const form = Form([
        [ "setValue", reducer, [
          toValidator(x => x > 0, "Division by zero"),
          "value"
        ]],
      ], {
        value: 1,
        result: 1,
      })

      const spy = sinon.spy()
      form.stream.onValue(spy)
      assert.doesNotThrow(() => form.handlers.setValue(0))
      assert.isFalse(reducer.called)
    })
  })
})
