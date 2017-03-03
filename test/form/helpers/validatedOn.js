import { Form } from "../../../src"

describe("form :: helpers:", () => {

  describe("validatedOn:", () => {
    it("should be a static function", () => {
      assert.isFunction(Form.validatedOn)
    })

    it("should run validation and emit validated form", () => {
      FakeAsync(tick => {
        const VALIDATOR_TIMEOUT = 50

        const validator = asyncify(toValidator(x => x > 0))

        const form = Form([
          [ "setValue", "value", validator ]
        ], {
          value: 1
        })

        const $validationTriggerEvent = Subject()

        const spyForm = sinon.spy()
        const spyValidated = sinon.spy()

        form.stream.changes().onValue(spyForm)
        Form.validatedOn(form, $validationTriggerEvent.stream).onValue(spyValidated)

        // ---

        assert.equal(spyValidated.callCount, 0, "streams emits before any event")

        // ---

        $validationTriggerEvent.handler()
        tick(VALIDATOR_TIMEOUT)

        assert.equal(spyForm.callCount, 1, "form isn't updated after initial validation")
        assert.equal(spyValidated.callCount, 1, "valid state isn't updated after initial validation")

        assert.deepEqual(
          spyValidated.getCall(0).args[0].state, { value: 1 },
          "wrong valid state after first validation"
        )

        // ---

        form.handlers.setValue(0)
        tick(VALIDATOR_TIMEOUT)

        $validationTriggerEvent.handler()
        tick(VALIDATOR_TIMEOUT)

        assert.equal(spyForm.callCount, 3, "form isn't updated 3 times")
        assert.equal(spyValidated.callCount, 2, "validated state isn't updated 2 times")

        assert.deepEqual(
          spyValidated.getCall(1).args[0].state, { value: 0 },
          "wrong valid state after second validation"
        )
      })
    })

    describe("concurrency:", () => {
      it("should not be interrupted by input", () => {
        FakeAsync(tick => {
          const VALIDATOR_TIMEOUT = 100

          const validator = toValidator(x => x > 0, ERROR_MSG)

          const form = Form([
            [ "setFoo", "foo", asyncify(validator) ],
            [ "setBar", "bar", validator ]
          ])

          const $validationTriggerEvent = Subject()

          const spyForm = sinon.spy()
          const spyValidated = sinon.spy()

          form.stream.changes().onValue(spyForm)

          Form.validatedOn(form, $validationTriggerEvent.stream).onValue(spyValidated)

          // ---

          $validationTriggerEvent.handler()

          form.handlers.setBar(1)

          assert.equal(spyForm.callCount, 1)
          assert.equal(spyValidated.callCount, 0, "validated state updated before validation completed")

          // ---

          tick(VALIDATOR_TIMEOUT)

          assert.equal(spyForm.callCount, 2)
          assert.deepEqual(
            spyForm.getCall(0).args[0].errors,
            {
              bar: null,
            },
            "wrong valid state after setting value"
          )

          assert.equal(spyValidated.callCount, 1, "validated state isn't updated after validation completed")

          /* `bar` is invalid, because it was invalid when validation started,
           * and later update was not applied to validated state.
           * Have no idea whether it's possible to solve this problem automatically.
           * So far this behaviour is "by spec". */
          assert.deepEqual(
            spyValidated.getCall(0).args[0].errors,
            {
              foo: ERROR_MSG,
              bar: ERROR_MSG,
            },
            "wrong valid state after validation"
          )
        })
      })
    })
  })


  describe("validOn:", () => {
    it("should be a static function", () => {
      assert.isFunction(Form.validOn)
    })

    describe("should run validation and emit form state if it is valid", () => {
      it("when initial state is valid", () => {
        FakeAsync(tick => {
          const VALIDATOR_TIMEOUT = 50

          const validator = asyncify(toValidator(x => x > 0))

          const form = Form([
            [ "setValue", "value", validator ]
          ], {
            value: 1
          })

          const $validationTriggerEvent = Subject()

          const spyForm = sinon.spy()
          const spyValidState = sinon.spy()

          form.stream.changes().onValue(spyForm)
          Form.validOn(form, $validationTriggerEvent.stream).onValue(spyValidState)

          assert.equal(spyValidState.callCount, 0, "streams emits before any event")

          $validationTriggerEvent.handler()
          tick(VALIDATOR_TIMEOUT)

          assert.equal(spyForm.callCount, 1, "form isn't updated after initial validation")
          assert.equal(spyValidState.callCount, 1, "valid state isn't updated after initial validation")

          assert.deepEqual(
            spyValidState.getCall(0).args[0], { value: 1 },
            "wrong valid state after first validation"
          )

          form.handlers.setValue(0)
          tick(VALIDATOR_TIMEOUT)

          $validationTriggerEvent.handler()
          tick(VALIDATOR_TIMEOUT)

          assert.equal(spyForm.callCount, 3, "form isn't updated 3 times")
          assert.equal(spyValidState.callCount, 1, "valid state is updated after setting wrong value")
        })
      })

      it("when initial state is invalid", () => {
        const form = Form([
          [ "setValue", "value", toValidator(x => x > 0, "ERROR") ]
        ], {
          value: 0
        })

        const $validate = Subject()

        const spyForm = sinon.spy()
        const spyValidState = sinon.spy()

        form.stream.changes().onValue(spyForm)
        Form.validOn(form, $validate.stream).onValue(spyValidState)

        assert.equal(spyValidState.callCount, 0)

        $validate.handler()

        assert.equal(spyForm.callCount, 1)
        assert.equal(spyValidState.callCount, 0)

        form.handlers.setValue(1)
        $validate.handler()

        assert.equal(spyForm.callCount, 3)

        assert.equal(spyValidState.callCount, 1, "valid state isn't updated after setting correct value")
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
        Form.validOn(form, $validate.stream).onValue(spyValidState)

        assert.equal(spyValidState.callCount, 0, "Validated state emits before validation event")

        $validate.handler()

        assert.equal(spyForm.callCount, 1, "Form isn't updated after validation")

        assert.equal(spyValidState.callCount, 1, "Validated state is not updated")
        assert.deepEqual(spyValidState.getCall(0).args[0], { value: 0 })
      })


      it("when form has no fields at all", () => {
        const form = Form([], { value: 0 })

        const $validate = Subject()

        const spyForm = sinon.spy()
        const spyValidState = sinon.spy()

        form.stream.changes().onValue(spyForm)
        Form.validOn(form, $validate.stream).onValue(spyValidState)

        assert.equal(spyValidState.callCount, 0, "Validated state emits before validation event")

        $validate.handler()

        assert.equal(spyForm.callCount, 1, "Form isn't updated after validation")

        assert.equal(spyValidState.callCount, 1, "Validated state is not updated")
        assert.deepEqual(spyValidState.getCall(0).args[0], { value: 0 })
      })
    })


    it("should accept form as stream", () => {
      const form$ = Form.asStream([
        [ "setValue", "value", toValidator(x => x > 0, "ERROR") ]
      ], {
        value: 1
      })

      const subj = Subject()

      const spyForm = sinon.spy()
      const spyValidState = sinon.spy()
      form$.changes().onValue(spyForm)

      Form.validOn(form$, subj.stream).onValue(spyValidState)

      subj.handler()

      assert.equal(spyForm.callCount, 1)

      assert.equal(spyValidState.callCount, 1)
      assert.deepEqual(spyValidState.lastCall.args[0], { value: 1 })
    })
  })
})
