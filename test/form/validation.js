import Form from "../../src/form"

describe("form :: validation:", () => {
  let validator
  const ERROR_MSG = "ERROR"

  beforeEach(() => {
    validator = x => x < 3 ? null : ERROR_MSG
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

    form.state$.onValue(() => {}) // activate
    form.handlers.setValue(1)

    assert.equal(validator.callCount, 1, "Validator is not called")
    assert(validator.calledWithMatch(1, { value: 0 }), "validator does not receive proper arguments")
  })


  describe("validity state", () => {
    it("should be an object { errors: Object, isValid: Bool }", () => {
      const form = Form([
        [ "setValue", "value", validator ]
      ])

      const spy = sinon.spy()
      form.validity$.onValue(spy)
      form.handlers.setValue(5)

      const state = spy.lastCall.args[0]
      assert.isObject(state.errors)
      assert.isBoolean(state.isValid)
    })

    it("should update respectively", () => {
      const form = Form([
        [ "setValue", "value", validator ]
      ])

      const spy = sinon.spy()
      form.validity$.onValue(spy)
      form.handlers.setValue(5)
      form.handlers.setValue(1)

      assert.equal(spy.callCount, 3)
      assert.deepEqual(spy.getCall(1).args[0], ({ errors: { value: ERROR_MSG }, isValid: false }))
      assert.deepEqual(spy.getCall(2).args[0], ({ errors: { value: null }, isValid: true }))
    })

    it("should emit only when it changes", () => {
      const form = Form([
        [ "setValue", "value", validator ],
      ])

      const spy = sinon.spy()
      form.validity$.changes().onValue(spy) // skip initial value

      // 1 value when it validated first time and becomes valid
      // then it remains valid, so no emits
      form.handlers.setValue(1)
      form.handlers.setValue(1)
      form.handlers.setValue(2)
      form.handlers.setValue(2)

      // 1 value when it becomes invalid
      form.handlers.setValue(6)
      form.handlers.setValue(6)
      form.handlers.setValue(5)
      form.handlers.setValue(5)

      // 1 value when it again becomes valid
      form.handlers.setValue(1)

      assert.equal(spy.callCount, 3)
    })
  })

  describe("when value is invalid", () => {
    it("state still should be updated", () => {
      const form = Form([
        [ "setValue", "value", validator ],
      ])

      const spy = sinon.spy()
      form.state$.onValue(spy)
      form.handlers.setValue(5)
      form.handlers.setValue(6)

      assert.equal(spy.callCount, 3)
      assert.deepEqual(spy.getCall(1).args[0], { value: 5 })
      assert.deepEqual(spy.getCall(2).args[0], { value: 6 })
    })

    it("reducer should not be called", () => {
      const reducer = sinon.spy((state, value) => ({
        ...state,
        value,
        result: 1 / value,
      }))

      const form = Form([
        [ "setValue", reducer, [
          x => x > 0 ? null : "Division by zero",
          "value"
        ]],
      ], {
        value: 1,
        result: 1,
      })

      const spy = sinon.spy()
      form.state$.onValue(spy)
      assert.doesNotThrow(() => form.handlers.setValue(0))
      assert.isFalse(reducer.called)
    })
  })


  describe("async validators:", () => {
    it("should support promises", () => {
      FakeAsync(tick => {
        validator = sinon.stub().resolves("ERROR")

        const form = Form([
          [ "setValue", "value", validator ]
        ])

        const spy = sinon.spy()
        const changes$ = form.validity$.changes()

        changes$.onValue(spy)
        form.handlers.setValue(0)

        tick()

        assert.deepEqual(spy.lastCall.args[0].errors, { value: "ERROR" })
      })
    })

    it("should process uncaught promise errors", () => {
      FakeAsync(tick => {
        validator = sinon.stub().rejects(new Error("failed_promise"))

        const form = Form([
          ["setValue", "value", validator]
        ])

        const spy = sinon.spy()

        form.validity$.changes().onValue(spy)
        form.handlers.setValue(0)

        tick()

        assert.deepEqual(spy.lastCall.args[0].errors, { value: "Error: failed_promise" })
      })
    })
  })
})
