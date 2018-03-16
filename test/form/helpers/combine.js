import { Form, Model, Stream } from "../../../src"
import _ from "lodash"

describe("form :: helpers :: combine:", () => {
  it("should be a static function", () => {
    assert.isFunction(Form.combine)
  })

  it("should accept mapping object and create stream with each form field combined", () => {
    const combo$ = Form.combine({
      f1: Form.asStream(),
      f2: Form.asStream(),
      f3: Form.asStream(),
    })

    assert.instanceOf(combo$, Kefir.Observable, "Combined form is not a stream")

    const spy = sinon.spy()
    combo$.onValue(spy)

    assert.equal(spy.callCount, 1, "Combined form does not emit initial state")

    const result = spy.getCall(0).args[0]

    const KEYS = [ "state", "errors", "handlers", "status" ]
    const FORMS = [ "f1", "f2", "f3" ]

    assert.deepEqual(Object.keys(result), KEYS, "Incomplete form fields list")

    FORMS.forEach(key => {
      assert.deepEqual(result.state[key], {}, `No state for form '${key}'`)
    })

    FORMS.forEach(key => {
      assert.deepEqual(result.errors[key], {}, `No errors for form '${key}'`)
    })

    FORMS.forEach(key => {
      assert.isObject(result.handlers[key], `No handlers for form '${key}'`)
      assert.isFunction(result.handlers[key].reset, `No 'reset' handler for form '${key}'`)
      assert.isFunction(result.handlers[key].validate, `No 'validate' handler for form '${key}'`)
    })

    FORMS.forEach(key => {
      assert.deepEqual(result.status[key], {
        isValid: undefined,
        isValidated: false,
        isResetted: false
      }, `Wrong status for form '${key}'`)
    })

  })

  it("should create own reset/validate handlers and own status values for combined form", () => {
    const combo$ = Form.combine({
      f1: Form.asStream(),
      f2: Form.asStream(),
      f3: Form.asStream(),
    })

    assert.instanceOf(combo$, Kefir.Observable, "Combined form is not a stream")

    const spy = sinon.spy()
    combo$.onValue(spy)

    const result = spy.getCall(0).args[0]

    assert.isFunction(result.handlers.reset, "No combined 'reset' handler")
    assert.isFunction(result.handlers.validate, "No combined 'validate' handler")

    assert.property(result.status, "isValid", "No 'isValid' status for combined form")
    assert.equal(result.status.isValid, undefined, "Wrong combined 'isValid' status")
    assert.equal(result.status.isValidated, false, "Wrong combined 'isValidated' status")
    assert.equal(result.status.isResetted, false, "Wrong combined 'isResetted' status")
  })

  it("should emit atomic updates on validation or resetting", () => {
    const combo$ = Form.combine({
      f1: Form.asStream(),
      f2: Form.asStream(),
      f3: Form.asStream(),
    })

    let validate
    let reset

    combo$.onValue(({ handlers }) => {
      validate = handlers.validate
      reset = handlers.reset
    })

    const spy = sinon.spy()
    combo$.changes().onValue(spy)

    validate()

    assert.equal(spy.callCount, 1, "Combined form does not emit once on validation")
    assert.equal(spy.getCall(0).args[0].status.isValid, true, "'isValid' status is wrong")
    assert.equal(spy.getCall(0).args[0].status.isValidated, true, "'isValidated' status is wrong")

    reset()

    assert.equal(spy.callCount, 2, "Combined form does not emit once on resetting")
    assert.equal(spy.getCall(1).args[0].status.isValid, undefined, "'isValid' status is wrong")
    assert.equal(spy.getCall(1).args[0].status.isValidated, false, "'isValidated' status is wrong")
    assert.equal(spy.getCall(1).args[0].status.isResetted, true, "'isResetted' status is wrong")
  })

  describe("status:", () => {
    it("isValid: should be true/undefined only when it's true/undefined for all parts", () => {
      let form

      const combo$ = Form.combine({
        f1: Form.asStream(),
        f2: Form.asStream(),
        f3: Form.asStream(),
      })

      combo$.onValue(x => {
        form = x
      })

      const spy = sinon.spy()
      combo$.onValue(spy)

      assert.isUndefined(spy.getCall(0).args[0].status.isValid)

      form.handlers.f1.validate()
      assert.isFalse(spy.getCall(1).args[0].status.isValid)

      form.handlers.f2.validate()
      assert.isFalse(spy.getCall(2).args[0].status.isValid)

      form.handlers.f3.validate()
      assert.isTrue(spy.getCall(3).args[0].status.isValid)
    })

    it("isValidated: should only be true when entire form is validated", () => FakeAsync(tick => {
      let form

      const combo$ = Form.combine({
        f1: Form.asStream(),
        f2: Form.asStream(),
        f3: Form.asStream(),
      })

      combo$.onValue(x => {
        form = x
      })

      const spy = sinon.spy()
      combo$.changes().onValue(spy)

      form.handlers.f1.validate()
      form.handlers.f2.validate()
      form.handlers.f3.validate()
      tick()

      assert.equal(spy.callCount, 3, "combo form didn't emit after validating each particular form")
      assert.isFalse(spy.getCall(2).args[0].status.isValidated, "isValidated isn't false after running validators on particular forms")

      form.handlers.validate()
      tick()

      assert.equal(spy.callCount, 4, "combo form didn't emit after full validation")
      assert.isTrue(spy.getCall(3).args[0].status.isValidated, "isValidated isn't true after running validation on entire form")
    }))

    it("isResetted: should only be true when entire form is resetted", () => FakeAsync(tick => {
      let form

      const combo$ = Form.combine({
        f1: Form.asStream(),
        f2: Form.asStream(),
        f3: Form.asStream(),
      })

      combo$.onValue(x => {
        form = x
      })

      const spy = sinon.spy()
      combo$.changes().onValue(spy)

      form.handlers.f1.reset()
      form.handlers.f2.reset()
      form.handlers.f3.reset()
      tick()

      assert.equal(spy.callCount, 3, "combo form didn't emit after resetting each particular form")
      assert.isFalse(spy.getCall(2).args[0].status.isResetted, "isResetted isn't false after running reset on particular forms")

      form.handlers.reset()
      tick()

      assert.equal(spy.callCount, 4, "combo form didn't emit after full reset")
      assert.isTrue(spy.getCall(3).args[0].status.isResetted, "isResetted isn't false after full reset")
    }))

    it("should terminate stream of aggregated values after it emits once", () => {
      let form

      const combo$ = Form.combine({
        f1: Form.asStream([
          [ "setFoo", "foo" ]
        ]),
        f2: Form.asStream(),
      })

      combo$.onValue(x => {
        form = x
      })

      const spy = sinon.spy()
      combo$.changes().onValue(spy)

      assert.doesNotThrow(
        () => {
          // internally, new stream, buffered by 2 (2 combined forms),
          // is generated and has emitted
          form.handlers.validate()

          // Now, if it wasn't terminated,
          // after next two updates it will emit again,
          // and God knows what can happen then.
          //
          // In current implementation, form status is mutated
          // (as it's totally internal at this stage, so it's acceptable),
          // and so handler of aggregated stream gets the result of main stream
          form.handlers.f1.setFoo()
          form.handlers.f1.setFoo()
        },
        /\.every is not a function/
      )

      assert.equal(spy.callCount, 3, "form isn't updated 3 times")
    })
  })

  it("hybrid form", () => {
    const combo$ = Form.combine({
      form: Form.asStream(),
      model: Model.asStream([
        [ "setValue", "value" ]
      ]),
      stream: Stream(),
    })

    const spy = sinon.spy()
    combo$.onValue(spy)

    assert.equal(spy.callCount, 1, "Combined form does not emit initial state")

    // ---

    const result = spy.getCall(0).args[0]

    const KEYS = [ "state", "errors", "handlers", "status" ]
    const FORMS = [ "form", "model", "stream" ]

    // ---

    assert.deepEqual(Object.keys(result), KEYS, "Incomplete form fields list")

    // ---
    // Common fields

    FORMS.forEach(key => {
      assert.deepEqual(result.state[key], {}, `No state for '${key}'`)
    })

    FORMS.forEach(key => {
      assert.deepEqual(result.errors[key], {}, `No errors for '${key}'`)
    })

    FORMS.forEach(key => {
      assert.isObject(result.handlers[key], `No handlers for '${key}'`)
      assert.isObject(result.status[key], `No status for '${key}'`)
    })

    // ---
    // Handlers

    assert.isFunction(result.handlers.form.reset, "No 'reset' handler for 'form'")
    assert.isFunction(result.handlers.form.validate, "No 'validate' handler for 'form'")

    assert.isFunction(result.handlers.model.setValue, "No 'setValue' handler for 'model'")

    assert.deepEqual(result.handlers.stream, {}, "Wrong handlers 'stream'")

    // ---
    // Status

    assert.deepEqual(
      result.status.form,
      {
        isValid: undefined,
        isValidated: false,
        isResetted: false,
      },
      "wrong status for 'form'"
    )

    assert.deepEqual(
      result.status.model,
      {
        isValid: true,
        isValidated: false,
        isResetted: false,
      },
      "wrong status for 'model'"
    )

    assert.deepEqual(
      result.status.stream,
      {
        isValid: true,
        isValidated: false,
        isResetted: false,
      },
      "wrong status for 'stream'"
    )


    // ---
    // Do update

    result.handlers.model.setValue(42)

    assert.equal(spy.callCount, 2, "Combined form does not emit on update")
    assert.deepEqual(
      spy.getCall(1).args[0].state,
      {
        form: {},
        model: { value: 42 },
        stream: {},
      },
      "wrong combined status after validation"
    )

    // ---

    result.handlers.validate()

    assert.equal(spy.callCount, 3, "Combined form does not emit on validation")
    assert.deepEqual(
      _.pick(
        spy.getCall(2).args[0].status,
        [
          "isValid", "isValidated", "isResetted"
        ]
      ),
      {
        isValid: true,
        isValidated: true,
        isResetted: false,
      },
      "wrong combined status after validation"
    )
  })
})
