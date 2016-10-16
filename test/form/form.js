import Form from "../../src/form"

describe("form :: base: ", () => {
  it("should be an object { state$, validity$, handlers }", () => {
    const form = Form()

    assert.isObject(form)
    assert.instanceOf(form.state$, Kefir.Observable)
    assert.instanceOf(form.validity$, Kefir.Observable)
    assert.deepEqual(form.handlers, {})
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
    assert.deepEqual(spyValidity.getCall(0).args[0], { errors: {}, isValid: undefined }, "Initial validation state is not default")
  })


  describe("asStream:", () => {
    it("should be an Observable<{ state, handlers, errors, isValid }>", () => {
      assert.isFunction(Form.asStream)

      const form$ = Form.asStream()
      assert.instanceOf(form$, Kefir.Observable, "Form is not an Observable")

      const spy = sinon.spy()
      form$.onValue(spy)
      assert.deepEqual(spy.lastCall.args[0], {
        state: {},
        errors: {},
        handlers: {},
        isValid: undefined,
      })
    })

    it("should emit atomic updates", () => {
      FakeAsync(tick => { // because stream-form emits asynchronously
        const subj = Subject()
        const form$ = Form.asStream([
          [ [ "setValue", subj ], "value", x => x > 0 ? null : "ERROR" ]
        ])

        const spy = sinon.spy()

        form$.changes().onValue(spy)

        subj.handler(0)

        tick()

        assert.equal(spy.callCount, 1)
        const result = spy.lastCall.args[0]
        assert.deepEqual(result.state, { value: 0 })
        assert.deepEqual(result.errors, { value: "ERROR" })
        assert.deepEqual(result.isValid, false)
      })
    })
  })
})
