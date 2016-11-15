import Form from "../../../src/form"

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

  it("should skip previous validation if it isn't completed before next input arrives", () => {
    FakeAsync(tick => {
      const INPUT_TIMEOUT = 100
      const VALIDATOR_TIMEOUT = 150

      const validator = x => new Promise(res => {
        setTimeout(res, VALIDATOR_TIMEOUT, x % 2 === 0 ? null : `${x} is invalid`)
      })

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

      assert.equal(spy.callCount, 1, "Validator is called multiple times")
      assert.deepEqual(spy.lastCall.args[0].errors, { value: "3 is invalid" })
    })
  })
})
