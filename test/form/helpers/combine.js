import { Form } from "../../../src"

describe("form :: helpers :: combine:", () => {
  it("should be a static function", () => {
    assert.isFunction(Form.combine)
  })

  it("should accept mapping object and create stream with each form field combined", () => {
    const combo$ = Form.combine({
      f1: Form(),
      f2: Form(),
      f3: Form(),
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
      f1: Form(),
      f2: Form(),
      f3: Form(),
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
      f1: Form(),
      f2: Form(),
      f3: Form(),
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

    assert.equal(spy.callCount, 1, "Combined form emits multiple times on validation")
    assert.equal(spy.getCall(0).args[0].status.isValid, true, "'isValid' status is wrong")
    assert.equal(spy.getCall(0).args[0].status.isValidated, true, "'isValidated' status is wrong")

    reset()

    assert.equal(spy.callCount, 2, "Combined form emits multiple times on resetting")
    assert.equal(spy.getCall(1).args[0].status.isValid, undefined, "'isValid' status is wrong")
    assert.equal(spy.getCall(1).args[0].status.isValidated, false, "'isValidated' status is wrong")
    assert.equal(spy.getCall(1).args[0].status.isResetted, true, "'isResetted' status is wrong")
  })

  describe("status:", () => {
    it("isValid: should be true/undefined only when it's true/undefined for all parts", () => {
      let form

      const combo$ = Form.combine({
        f1: Form(),
        f2: Form(),
        f3: Form(),
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

    it("isValidated: should only be true when entire form is validated", () => {
      let form

      const combo$ = Form.combine({
        f1: Form(),
        f2: Form(),
        f3: Form(),
      })

      combo$.onValue(x => {
        form = x
      })

      const spy = sinon.spy()
      combo$.onValue(spy)

      form.handlers.f1.validate()
      form.handlers.f2.validate()
      form.handlers.f3.validate()

      assert.isFalse(spy.getCall(3).args[0].status.isValidated)

      form.handlers.validate()

      assert.isTrue(spy.getCall(4).args[0].status.isValidated)
    })

    it("isResetted: should only be true when entire form is resetted", () => {
      let form

      const combo$ = Form.combine({
        f1: Form(),
        f2: Form(),
        f3: Form(),
      })

      combo$.onValue(x => {
        form = x
      })

      const spy = sinon.spy()
      combo$.onValue(spy)

      form.handlers.f1.reset()
      form.handlers.f2.reset()
      form.handlers.f3.reset()

      assert.isFalse(spy.getCall(3).args[0].status.isResetted)

      form.handlers.reset()

      assert.isTrue(spy.getCall(4).args[0].status.isResetted)
    })
  })
})
