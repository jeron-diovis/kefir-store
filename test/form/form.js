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

  describe("asStream:", () => {
    it("should be an Observable<{ handlers, state, errors, status }>", () => {
      assert.isFunction(Form.asStream)

      testFormStream(Form.asStream(
        [ [ "setValue", "value" ] ],
        { value: "initial value" }
      ))
    })
  })

  describe("toStream:", () => {
    it("should convert form object into Observable", () => {
      assert.isFunction(Form.toStream)

      const form = Form.toStream(Form(
        [ [ "setValue", "value" ] ],
        { value: "initial value" }
      ))

      testFormStream(form)
    })
  })


  // ---


  describe("reset:", () => {
    it("should return state, errors and validity to initial state", () => {
      const form = Form([
        [ "setValue", "value", x => x > 0 ? null : "ERROR" ]
      ])

      const spy = sinon.spy()
      form.stream.changes().onValue(spy)

      form.handlers.setValue(0)
      form.handlers.reset()

      assert.equal(spy.callCount, 2)

      assert.deepEqual(spy.getCall(0).args[0], {
        state: { value: 0 },
        errors: { value: "ERROR" },
        status: {
          isValid: false,
          isValidated: false,
          isResetted: false,
        }
      });

      assert.deepEqual(spy.getCall(1).args[0], {
        state: {},
        errors: {},
        status: {
          isValid: undefined,
          isValidated: false,
          isResetted: true,
        },
      })
    })
  })
})
