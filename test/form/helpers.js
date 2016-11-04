import Form from "../../src/form"

describe("form :: helpers:", () => {
  describe("validatedBy:", () => {
    it("should be a static function", () => {
      assert.isFunction(Form.validatedBy)
    })

    it("should run validation and emit form state if it is valid", () => {
      const form = Form([
        [ "setValue", "value", x => x > 0 ? null : "ERROR" ]
      ], {
        value: 1
      })

      const subj = Subject()

      const spyState = sinon.spy()
      const spyValid = sinon.spy()
      form.validity$.changes().onValue(spyValid)
      Form.validatedBy(form, subj.stream).onValue(spyState)

      subj.handler()

      assert.equal(spyValid.callCount, 1)
      assert.deepEqual(spyValid.lastCall.args[0].isValid, true)

      assert.equal(spyState.callCount, 1)
      assert.deepEqual(spyState.lastCall.args[0], { value: 1 })

      form.handlers.setValue(0)
      subj.handler()

      assert.equal(spyValid.callCount, 3)
      assert.deepEqual(spyValid.lastCall.args[0].isValid, false)
      assert.equal(spyState.callCount, 1)
    })

    it("should accept form as stream too", () => {
      const form$ = Form.asStream([
        [ "setValue", "value", x => x > 0 ? null : "ERROR" ]
      ], {
        value: 1
      })

      const subj = Subject()

      const spyState = sinon.spy()
      const spyValid = sinon.spy()
      form$.changes().onValue(spyValid)
      Form.validatedBy(form$, subj.stream).onValue(spyState)

      subj.handler()

      assert.equal(spyValid.callCount, 1)
      assert.deepEqual(spyValid.lastCall.args[0].isValid, true)

      assert.equal(spyState.callCount, 1)
      assert.deepEqual(spyState.lastCall.args[0], { value: 1 })
    })
  })
})
