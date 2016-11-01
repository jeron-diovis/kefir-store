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
    assert.deepEqual(validator.lastCall.args, [ 1, { value: 0 } ], "validator does not receive proper arguments")
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
      form.validity$.changes().onValue(spy)
      form.handlers.setValue(5)
      form.handlers.setValue(1)

      assert.equal(spy.callCount, 2)

      const args = x => spy.getCall(x).args[0]

      assert.deepEqual(args(0).errors, { value: ERROR_MSG })
      assert.equal(args(0).isValid, false)

      assert.deepEqual(args(1).errors, { value: null })
      assert.equal(args(1).isValid, true)
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

    it("should skip previous validation if it isn't completed before next input arrives", () => {
      FakeAsync(tick => {
        const INPUT_TIMEOUT = 100
        const VALIDATOR_TIMEOUT = 150

        validator = x => new Promise(res => {
          setTimeout(res, VALIDATOR_TIMEOUT, x % 2 === 0 ? null : `${x} is invalid`)
        })

        const input$ = Kefir.sequentially(INPUT_TIMEOUT, [ 1, 2, 3 ])

        const form = Form([
          [ input$, "value", validator ]
        ])

        const spy = sinon.spy()

        form.validity$.changes().onValue(spy)

        tick(INPUT_TIMEOUT)
        tick(INPUT_TIMEOUT)
        tick(INPUT_TIMEOUT)
        tick(VALIDATOR_TIMEOUT)

        assert.equal(spy.callCount, 1, "Validator is called multiple times")
        assert.deepEqual(spy.lastCall.args[0].errors, { value: "3 is invalid" })
      })
    })
  })
})
