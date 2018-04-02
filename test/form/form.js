import { Form } from "../../src"

describe("form :: base:", () => {
  it("should be an object { stream: Observable, handlers: Object }", () => {
    const form = Form()

    assert.isObject(form)
    assert.instanceOf(form.stream, Kefir.Observable)
    assert.isObject(form.handlers)
  })


  describe("built-in handlers:", () => {
    it("should have built-in handlers 'validate' and 'reset'", () => {
      const form = Form()

      assert.isFunction(form.handlers.reset)
      assert.isFunction(form.handlers.validate)
    })

    it("should not allow to create handler with name 'validate'", () => {
      const setup = () => Form([
        [ "validate", "some" ]
      ])

      assert.throws(setup, /Handler name 'validate' is reserved/)
    })

    it("should not allow to create handler with name 'reset'", () => {
      const setup = () => Form([
        [ "reset", "some" ]
      ])

      assert.throws(setup, /Handler name 'reset' is reserved/)
    })

    describe("validate:", () => {
      it("should return promise, resolving after validation completed", () => {
        const form = Form()
        const result = form.handlers.validate()
        assert.instanceOf(result, Promise)
      })

      describe("returned promise should resolve with form data after validation completed:", () => {
        it("basic:", () => FakeAsync(tick => {
          const VALIDATION_DELAY = 100
          const form = Form([
            [ "setValue", "value", asyncify(toValidator(x => x > 0, ERROR_MSG), VALIDATION_DELAY) ]
          ], {
            value: 0
          })

          const spy = sinon.spy()
          const promiseSpy = sinon.spy()

          form.stream.changes().observe(spy)

          const promise = form.handlers.validate()
          promise.then(promiseSpy)

          assert.equal(promiseSpy.callCount, 0, "promise resolved before validation completed")

          tick(VALIDATION_DELAY)

          assert.equal(spy.callCount, 1, "form does not emit after validation")
          assert.equal(promiseSpy.callCount, 1, "promise is not resolved after validation completed")
          assert.deepEqual(
            promiseSpy.getCall(0).args[0],
            {
              state: { value: 0 },
              errors: { value: ERROR_MSG },
              status: { isValid: false, isValidated: true, isResetted: false },
            },
            "promise is not resolved with a form data"
          )
        }))

        it("should apply transformations from 'init' option", () => FakeAsync(tick => {
          const VALIDATION_DELAY = 100

          const form = Form([
            [ "setValue", "value", asyncify(toValidator(x => x < 3, ERROR_MSG), VALIDATION_DELAY) ]
          ], {
            value: 2,
          }, {
            init: $ => $.map(form => ({
              ...form,
              state: {
                ...form.state,
                value: form.state.value * 2,
              },
            })),
          })

          form.stream.observe()
          const promiseSpy = sinon.spy()

          const promise = form.handlers.validate()
          promise.then(promiseSpy)

          tick(VALIDATION_DELAY)

          assert.deepEqual(
            promiseSpy.getCall(0).args[0],
            {
              state: { value: 4 },
              errors: { value: null },
              status: { isValid: true, isValidated: true, isResetted: false },
            }
          )
        }))
      })

      it("should skip successive calls while validation is in process", () => FakeAsync(tick => {
        const VALIDATION_DELAY = 100

        const form = Form([
          [ "setValue", "value", asyncify(toValidator(x => x > 0), VALIDATION_DELAY) ]
        ])

        const spy = sinon.spy()

        form.stream.changes().observe(spy)

        form.handlers.validate()
        tick(VALIDATION_DELAY / 2)
        form.handlers.validate()
        tick(VALIDATION_DELAY * 2)

        assert.equal(spy.callCount, 1, "form emitted several times")

        form.handlers.validate()
        tick(VALIDATION_DELAY)
        form.handlers.validate()
        tick(VALIDATION_DELAY)

        assert.equal(spy.callCount, 3, "independent successive validation calls does not work")
      }))

      it("if state changed during validation, successive validation call should return new promise", () => FakeAsync(tick => {
        const VALIDATION_DELAY = 100

        const form = Form([
          [ "setValidatedValue", "validatedValue", asyncify(toValidator(x => x > 0), VALIDATION_DELAY) ],
          [ "setNotValidatedValue", "notValidatedValue" ],
        ])

        const spy = sinon.spy()

        form.stream.changes().observe(spy)

        const promise1 = form.handlers.validate()
        tick(VALIDATION_DELAY / 2)
        form.handlers.setNotValidatedValue("")
        const promise2 = form.handlers.validate()

        assert.equal(spy.callCount, 1, "form didn't emit only once after just updating state")

        assert.notEqual(promise1, promise2, "new validation promises is not created after state changed")

        tick(VALIDATION_DELAY / 2)

        assert.equal(spy.callCount, 2, "form didn't emit after first validation completed")

        tick(VALIDATION_DELAY / 2)

        assert.equal(spy.callCount, 3, "form didn't emit after second validation completed")
      }))

      describe("should apply validation to origin stream, created by constructor, ignoring further transformations:", () => {
        it("via operators on stream", () => FakeAsync(tick => {
          const form = Form([
            [ "setFoo", "foo", toValidator(x => x < 3) ]
          ], { foo: 2 })

          const s$ = form.stream.map(form => ({
            ...form,
            state: {
              ...form.state,
              foo: form.state.foo * 2,
            }
          }))

          const spy = sinon.spy()
          s$.changes().observe(spy)

          form.handlers.validate()
          tick()

          assert.deepEqual(spy.getCall(0).args[0], {
            state: { foo: 4 },
            errors: { foo: null },
            status: {
              isValid: true,
              isValidated: true,
              isResetted: false,
            },
          })
        }))

        it("via 'init' option", () => FakeAsync(tick => {
          const form = Form(
            [
              [ "setFoo", "foo", toValidator(x => x < 3) ]
            ],
            { foo: 2 },
            {
              init: $ => $.map(form => ({
                ...form,
                state: {
                  ...form.state,
                  foo: form.state.foo * 2,
                }
              }))
            }
          )

          const spy = sinon.spy()
          form.stream.changes().observe(spy)

          form.handlers.validate()
          tick()

          assert.deepEqual(spy.getCall(0).args[0], {
            state: { foo: 4 },
            errors: { foo: null },
            status: {
              isValid: true,
              isValidated: true,
              isResetted: false,
            },
          })
        }))
      })

    })
  })


  describe("initial state", () => {
    it("'state': should be an empty object", () => {
      const form = Form()
      const spy = sinon.spy()

      form.stream.onValue(spy)

      assert.equal(spy.callCount, 1, "Initial state does not emit once")

      const result = spy.getCall(0).args[0]
      assert.deepEqual(result.state, {})
    })

    it("'errors': should be na empty object", () => {
      const form = Form()
      const spy = sinon.spy()

      form.stream.onValue(spy)

      assert.equal(spy.callCount, 1, "Initial state does not emit once")

      const result = spy.getCall(0).args[0]
      assert.deepEqual(result.errors, {})
    })

    it("'status': should be an object { isValid: undefined, isValidated: false, isResetted: false }", () => {
      const form = Form()
      const spy = sinon.spy()

      form.stream.onValue(spy)

      assert.equal(spy.callCount, 1, "Initial state does not emit once")

      const result = spy.getCall(0).args[0]
      assert.isObject(result.status, "Form has no status object")

      assert.isUndefined(result.status.isValid, "Initial 'isValid' status is not undefined")
      assert.isFalse(result.status.isValidated, "Initial 'isValidated' status is not false")
      assert.isFalse(result.status.isResetted, "Initial 'isResetted' status is not false")
    })
  })

  // ---

  describe("static helpers", () => {
    const testFormStream = form$ => {
      assert.instanceOf(form$, Kefir.Observable, "Form is not an Observable")

      const spy = sinon.spy()
      form$.onValue(spy)

      const result = spy.lastCall.args[0]
      assert.deepEqual(result.state, { value: "initial value" })
      assert.deepEqual(result.errors, {})
      assert.deepEqual(result.status, {
        isValid: undefined,
        isValidated: false,
        isResetted: false,
      })
      assert.isFunction(result.handlers.validate)
      assert.isFunction(result.handlers.reset)
    }

    it("asStream: should create an Observable<{ handlers, state, errors, status }>", () => {
      assert.isFunction(Form.asStream)

      testFormStream(Form.asStream(
        [ [ "setValue", "value" ] ],
        { value: "initial value" }
      ))
    })

    it("toStream: should convert form object into Observable", () => {
      assert.isFunction(Form.toStream)

      const form = Form.toStream(Form(
        [ [ "setValue", "value" ] ],
        { value: "initial value" }
      ))

      testFormStream(form)
    })
  })

  describe("should allow for stream-reducer to emit multiple updates", () => {
    it("for validated input", () => {
      const form = Form([
        [
          [ "setValue", $ => $.flatten(x => [ x, x ]) ],
          "value",
          toValidator(x => x > 0, "ERROR"),
        ],
      ])

      const spy = sinon.spy()

      form.stream.changes().onValue(spy)

      form.handlers.setValue(0)
      form.handlers.setValue(1)

      assert.equal(spy.callCount, 4)

      const getState = x => spy.getCall(x).args[0].state

      assert.deepEqual(getState(0), { value: 0 })
      assert.deepEqual(getState(1), { value: 0 })
      assert.deepEqual(getState(2), { value: 1 })
      assert.deepEqual(getState(3), { value: 1 })
    })

    it("for non-validated input", () => {
      const form = Form([
        [
          [ "setValue", $ => $.flatten(x => [ x, x ]) ],
          "value"
        ],
      ])

      const spy = sinon.spy()

      form.stream.changes().onValue(spy)

      form.handlers.setValue(0)
      form.handlers.setValue(1)

      assert.equal(spy.callCount, 4)

      const getState = x => spy.getCall(x).args[0].state

      assert.deepEqual(getState(0), { value: 0 })
      assert.deepEqual(getState(1), { value: 0 })
      assert.deepEqual(getState(2), { value: 1 })
      assert.deepEqual(getState(3), { value: 1 })
    })
  })

  // ---


  describe("reset:", () => {
    it("should return state, errors and validity to initial state", () => {
      const reducer = sinon.spy((state, value) => ({ ...state, value }))

      const form = Form([
        [
          "setValue",
          reducer,
          [
            toValidator(x => x > 0, "ERROR"),
            "value"
          ]
        ]
      ])

      const spy = sinon.spy()
      form.stream.changes().onValue(spy)

      form.handlers.setValue(0)
      form.handlers.reset()
      form.handlers.setValue(1)

      assert.equal(reducer.callCount, 1, "Reducer isn't called once")
      assert.equal(reducer.getCall(0).args[1], 1, "Reducer is called with wrong value")
      assert.deepEqual(reducer.getCall(0).args[0], {}, "Form state is not empty after reset")

      assert.equal(spy.callCount, 3, "Spy isn't called 3 times")

      assert.deepEqual(spy.getCall(0).args[0], {
        state: { value: 0 },
        errors: { value: "ERROR" },
        status: {
          isValid: false,
          isValidated: false,
          isResetted: false,
        }
      }, "Form is wrong after setting invalid value");

      assert.deepEqual(spy.getCall(1).args[0], {
        state: {},
        errors: {},
        status: {
          isValid: undefined,
          isValidated: false,
          isResetted: true,
        },
      }, "Form is wrong after resetting")

      assert.isFalse(spy.getCall(2).args[0].status.isResetted, "'isResetted' isn't false after regular store update")
    })
  })
})
