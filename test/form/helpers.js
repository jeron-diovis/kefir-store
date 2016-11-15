import Form from "../../src/form"

describe("form :: helpers :: validatedOn:", () => {
  it("should be a static function", () => {
    assert.isFunction(Form.validatedOn)
  })

  describe("should run validation and emit form state if it is valid", () => {
    it("when initial state is valid", () => {
      const form = Form([
        [ "setValue", "value", x => x > 0 ? null : "ERROR" ]
      ], {
        value: 1
      })

      const $validate = Subject()

      const spyForm = sinon.spy()
      const spyValidState = sinon.spy()

      form.stream.changes().onValue(spyForm)
      Form.validatedOn(form, $validate.stream).onValue(spyValidState)

      assert.equal(spyValidState.callCount, 0)

      $validate.handler()

      assert.equal(spyForm.callCount, 1)
      assert.isTrue(spyForm.getCall(0).args[0].status.isValid)

      assert.equal(spyValidState.callCount, 1)
      assert.deepEqual(spyValidState.getCall(0).args[0], { value: 1 })

      form.handlers.setValue(0)
      $validate.handler()

      assert.equal(spyForm.callCount, 3)
      assert.isFalse(spyForm.lastCall.args[0].status.isValid)
      assert.equal(spyValidState.callCount, 1)
    })

    it("when initial state is invalid", () => {
      const form = Form([
        [ "setValue", "value", x => x > 0 ? null : "ERROR" ]
      ], {
        value: 0
      })

      const $validate = Subject()

      const spyForm = sinon.spy()
      const spyValidState = sinon.spy()

      form.stream.changes().onValue(spyForm)
      Form.validatedOn(form, $validate.stream).onValue(spyValidState)

      assert.equal(spyValidState.callCount, 0)

      $validate.handler()

      assert.equal(spyForm.callCount, 1)
      assert.isFalse(spyForm.getCall(0).args[0].status.isValid)

      assert.equal(spyValidState.callCount, 0)

      form.handlers.setValue(1)
      $validate.handler()

      assert.equal(spyForm.callCount, 3)
      assert.isTrue(spyForm.lastCall.args[0].status.isValid)

      assert.equal(spyValidState.callCount, 1)
      assert.deepEqual(spyValidState.getCall(0).args[0], { value: 1 })
    })


    it("when form has no validators", () => {
      const form = Form([
        [ "setValue", "value" ]
      ], {
        value: 0
      })

      const $validate = Subject()

      const spyForm = sinon.spy()
      const spyValidState = sinon.spy()

      form.stream.changes().onValue(spyForm)
      Form.validatedOn(form, $validate.stream).onValue(spyValidState)

      assert.equal(spyValidState.callCount, 0, "Validated state emits before validation event")

      $validate.handler()

      assert.equal(spyForm.callCount, 1, "Form isn't updated after validation")
      assert.isTrue(spyForm.getCall(0).args[0].status.isValid)

      assert.equal(spyValidState.callCount, 1, "Validated state is not updated")
      assert.deepEqual(spyValidState.getCall(0).args[0], { value: 0 })
    })


    it("when form has no fields at all", () => {
      const form = Form([], { value: 0 })

      const $validate = Subject()

      const spyForm = sinon.spy()
      const spyValidState = sinon.spy()

      form.stream.changes().onValue(spyForm)
      Form.validatedOn(form, $validate.stream).onValue(spyValidState)

      assert.equal(spyValidState.callCount, 0, "Validated state emits before validation event")

      $validate.handler()

      assert.equal(spyForm.callCount, 1, "Form isn't updated after validation")
      assert.isTrue(spyForm.getCall(0).args[0].status.isValid)

      assert.equal(spyValidState.callCount, 1, "Validated state is not updated")
      assert.deepEqual(spyValidState.getCall(0).args[0], { value: 0 })
    })
  })


  it("should accept form as stream", () => {
    const form$ = Form.asStream([
      [ "setValue", "value", x => x > 0 ? null : "ERROR" ]
    ], {
      value: 1
    })

    const subj = Subject()

    const spyForm = sinon.spy()
    const spyValidState = sinon.spy()
    form$.changes().onValue(spyForm)

    Form.validatedOn(form$, subj.stream).onValue(spyValidState)

    subj.handler()

    assert.equal(spyForm.callCount, 1)
    assert.isTrue(spyForm.lastCall.args[0].status.isValid)

    assert.equal(spyValidState.callCount, 1)
    assert.deepEqual(spyValidState.lastCall.args[0], { value: 1 })
  })
})
