import { Form } from "../../../src"

describe("form :: validation :: async validators:", () => {
  it("should support promises", () => {
    FakeAsync(tick => {
      const validator = sinon.stub().resolves("ERROR")

      const form = Form([
        [ "setValue", "value", validator ]
      ])

      const spy = sinon.spy()

      form.stream.changes().onValue(spy)
      form.handlers.setValue(0)

      tick()

      assert.deepEqual(spy.lastCall.args[0].errors, { value: "ERROR" })
    })
  })

  it("should process uncaught promise errors", () => {
    FakeAsync(tick => {
      const validator = sinon.stub().rejects(new Error("failed_promise"))

      const form = Form([
        ["setValue", "value", validator]
      ])

      const spy = sinon.spy()

      form.stream.changes().onValue(spy)
      form.handlers.setValue(0)

      tick()

      assert.deepEqual(spy.lastCall.args[0].errors, { value: "Error: failed_promise" })
    })
  })

  describe("should skip previous validation if it isn't completed before next input arrives", () => {
    it("for all async validators", () => {
      FakeAsync(tick => {
        const INPUT_TIMEOUT = 50
        const VALIDATOR_TIMEOUT = 100

        const validator = asyncify(toValidator(
          x => x % 2 === 0,
          x => `${x} is invalid`
        ), VALIDATOR_TIMEOUT)

        const input$ = Kefir.sequentially(INPUT_TIMEOUT, [ 1, 2, 3 ])

        const form = Form([
          [ input$, "value", validator ]
        ])

        const spy = sinon.spy()

        form.stream.changes().onValue(spy)

        tick(INPUT_TIMEOUT)
        tick(INPUT_TIMEOUT)
        tick(INPUT_TIMEOUT)
        tick(VALIDATOR_TIMEOUT)

        assert.equal(spy.callCount, 1, "Validator ran more than once")
        assert.deepEqual(spy.lastCall.args[0].errors, { value: "3 is invalid" }, "Emitted validation result for not the last input")
      })
    })

    it("for sync and async validators", () => {
      FakeAsync(tick => {
        const VALIDATOR_TIMEOUT = 50

        const subj = Subject()

        const asyncValidator = asyncify(toValidator(
          () => false,
          () => "async error"
        ), VALIDATOR_TIMEOUT)

        const syncValidator = toValidator(
          () => false,
          () => "sync error"
        )

        const form = Form([
          [
            subj.stream, "value",
            x => x === "async value" ? asyncValidator(x) : syncValidator(x)
          ],
        ])

        const spy = sinon.spy()

        form.stream.changes().onValue(spy)

        subj.handler("async value")
        tick(VALIDATOR_TIMEOUT / 2)
        subj.handler("sync value")
        tick(VALIDATOR_TIMEOUT / 2)

        assert.equal(spy.callCount, 1, "Validation ran more than once")
        assert.deepEqual(spy.lastCall.args[0].errors, { value: "sync error" }, "Emitted validation result for not the last input")
      })
    })
  })
})
