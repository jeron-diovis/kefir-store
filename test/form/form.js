import Form from "../../src/form"

describe("form :: base: ", () => {
  it("should be an object { state$, validity$, handlers }", () => {
    const form = Form()

    assert.isObject(form)
    assert.instanceOf(form.state$, Kefir.Observable, "Form does not 'state$' stream")
    assert.instanceOf(form.validity$, Kefir.Observable, "Form does not have 'validity$' stream")
    assert.isObject(form.handlers, "Form does not have handlers")
    assert.isFunction(form.handlers.validate, "form.handlers.validate is not a function")
    assert.isFunction(form.handlers.reset, "form.handlers.reset is not a function")
  })

  it("should not allow handler with name 'validate'", () => {
    const setup = () => Form([
      [ "validate", "some" ]
    ])

    assert.throws(setup, /Handler name 'validate' is reserved/)
  })

  it("should not allow handler with name 'reset'", () => {
    const setup = () => Form([
      [ "reset", "some" ]
    ])

    assert.throws(setup, /Handler name 'reset' is reserved/)
  })

  it("should be initially valid", () => {
    const form = Form()
    const spyState = sinon.spy()
    const spyValidity = sinon.spy()

    form.state$.onValue(spyState)
    form.validity$.onValue(spyValidity)

    assert.equal(spyState.callCount, 1, "Initial state emits more that once")
    assert.equal(spyValidity.callCount, 1, "Initial validity emits more that once")
    assert.deepEqual(spyState.getCall(0).args[0], {}, "Initial state is not empty")
    assert.deepEqual(spyValidity.getCall(0).args[0].errors, {})
    assert.equal(spyValidity.getCall(0).args[0].isValid, undefined)
  })


  describe("asStream:", () => {
    it("should be an Observable<{ state, handlers, errors, isValid }>", () => {
      assert.isFunction(Form.asStream)

      const form$ = Form.asStream()
      assert.instanceOf(form$, Kefir.Observable, "Form is not an Observable")

      const spy = sinon.spy()
      form$.onValue(spy)

      const state = spy.lastCall.args[0]
      assert.deepEqual(state.state, {})
      assert.deepEqual(state.errors, {})
      assert.isUndefined(state.isValid)
      assert.isObject(state.handlers)
      assert.isFunction(state.handlers.validate)
    })

    it("should emit atomic updates", () => {
      const subj = Subject()
      const form$ = Form.asStream([
        [ [ "setValue", subj ], "value", x => x > 0 ? null : "ERROR" ]
      ])

      const spy = sinon.spy()

      form$.changes().onValue(spy)

      subj.handler(0)

      assert.equal(spy.callCount, 1)
      const result = spy.lastCall.args[0]
      assert.deepEqual(result.state, { value: 0 })
      assert.deepEqual(result.errors, { value: "ERROR" })
      assert.deepEqual(result.isValid, false)
    })
  })


  describe("reset:", () => {
    it("should return state, errors and validity to initial state", () => {
      const form = Form([
        [ "setValue", "value", x => x > 0 ? null : "ERROR" ]
      ]);

      const spyState = sinon.spy();
      const spyValidity = sinon.spy();
      form.state$.changes().onValue(spyState);
      form.validity$.changes().onValue(spyValidity);

      form.handlers.setValue(0);
      form.handlers.reset();

      assert.equal(spyState.callCount, 2);
      assert.equal(spyValidity.callCount, 2);

      assert.deepEqual(spyState.lastCall.args[0], {});
      assert.deepEqual(spyValidity.lastCall.args[0], {
        errors: {},
        isValid: undefined,
        isValidated: false,
      });
    })
  })
})
