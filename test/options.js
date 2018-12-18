import { Stream, Form, Subject } from "../src"

describe("options", () => {
  describe("init", () => {
    it("should accept created stream and return transformed stream", () => {
      const subj = Subject()
      const spyInit = sinon.spy($ => $.map(state => ({ ...state, foo: state.foo * 2 })))
      const spyState = sinon.spy()

      const stream = Stream([
        [ subj.stream, "foo" ]
      ], { foo: 1 }, { init: spyInit })

      stream.changes().observe(spyState)

      assert.equal(spyInit.callCount, 1, "initializer isn't called")
      assert.instanceOf(spyInit.getCall(0).args[0], Kefir.Observable, "initializer arguments isn't a stream")

      subj.handler(2)
      assert.deepEqual(spyState.getCall(0).args[0], { foo: 4 }, "transform from initializer isn't applied")
    })

    it("should require to return a stream", () => {
      const setup = () => Stream([], undefined, { init: () => ({}) })
      assert.throws(setup, /must return a stream/)
    })
  })

  describe("form: mapErrors", () => {
    it("should map `errors` field before it's passed anywhere else", () => {
      const mapErrors = sinon.spy(x => ({ bar: x.foo }))

      const form = Form([
        [ "setFoo", "foo", toValidator(x => x > 0, "foo error") ],
      ], {
        foo: 0,
      }, {
        mapErrors: mapErrors,
      })

      const spy = sinon.spy()

      form.stream.changes().observe(spy)

      form.handlers.setFoo(0)

      assert.equal(mapErrors.callCount, 1, "`mapErrors` isn't called")

      assert.deepEqual(spy.getCall(0).args[0].errors, {
        bar: "foo error",
      }, "errors aren't transformed")
    })
  })

  describe("form: externalErrors", () => {
    it("should accept a stream, overriding `errors` field", () => {
      const { stream: externalErrors$, handler: setExternalErrors } = Subject()

      const form = Form([
        [ "setFoo", "foo", toValidator(x => x > 0, "foo internal") ],
        [ "setBar", "bar", toValidator(x => x > 0, "bar internal") ],
      ], {
        foo: 0,
        bar: 0,
      }, {
        externalErrors: externalErrors$,
      })

      const spy = sinon.spy()

      form.stream.changes().observe(spy)

      form.handlers.validate()

      setExternalErrors({
        foo: "foo external",
      })

      assert.equal(spy.callCount, 2, "form does not emit after receiving external errors")

      assert.deepEqual(spy.getCall(1).args[0].errors, {
        foo: "foo external",
        bar: "bar internal",
      }, "external errors does not override internal state")

      form.handlers.setBar(1)

      assert.deepEqual(spy.getCall(2).args[0].errors, {
        foo: "foo external",
        bar: null,
      })
    })

    it("`combine`: should allow custom logic for combining internal and external errors", () => {
      const { stream: externalErrors$, handler: setExternalErrors } = Subject()

      const combine = sinon.spy((internal, external) => ({
        foo: `${internal.foo}|${external.foo}`,
      }))

      const form = Form([
        [ "setFoo", "foo", toValidator(x => x > 0, "foo internal") ],
      ], {
        foo: 0,
      }, {
        externalErrors: [
          externalErrors$,
          combine,
        ],
      })

      const spy = sinon.spy()

      form.stream.changes().observe(spy)

      form.handlers.validate()

      setExternalErrors({
        foo: "foo external",
      })

      assert.equal(combine.callCount, 1, "`combine` func is not called")

      assert.deepEqual(spy.getCall(1).args[0].errors, {
        foo: "foo internal|foo external",
      })
    })
  })

  describe("form: resetWith", () => {
    it("should reset errors and status, and replace state", () => {
      const $reset = Subject()

      const form = Form([
        [ "setValue", "value", toValidator(x => x > 0) ],
      ], undefined, {
        resetWith: $reset.stream,
      })

      const spy = sinon.spy()
      form.stream.changes().observe(spy)

      form.handlers.setValue(-1)

      assert.equal(spy.callCount, 1)
      assert.deepEqual(spy.lastCall.args[0].errors, { value: ERROR_MSG })
      assert.deepEqual(spy.lastCall.args[0].status, {
        isValid: false,
        isValidated: false,
        isResetted: false,
      })

      $reset.handler({ foo: "bar" })

      assert.equal(spy.callCount, 2, "reset stream does not update form")

      assert.deepEqual(spy.lastCall.args[0].errors, {}, "errors are not resetted")
      assert.deepEqual(spy.lastCall.args[0].status, {
        isValid: undefined,
        isValidated: false,
        isResetted: true,
      }, "status is not resetted")
    })

    it("as array: should allow custom state combination logic", () => {
      const $reset = Subject()

      const form = Form([
        [ "setValue", "value", toValidator(x => x > 0) ],
      ], undefined, {
        resetWith: [
          $reset.stream,
          (new_state, old_state) => ({ ...old_state, ...new_state })
        ],
      })

      const spy = sinon.spy()
      form.stream.changes().observe(spy)

      form.handlers.setValue(-1)

      $reset.handler({ foo: "bar" })

      assert.equal(spy.callCount, 2, "reset stream does not update form")

      assert.deepEqual(spy.lastCall.args[0].state, { foo: "bar", value: -1 }, "state isn't merged")
      assert.deepEqual(spy.lastCall.args[0].errors, {}, "errors are not resetted")
      assert.deepEqual(spy.lastCall.args[0].status, {
        isValid: undefined,
        isValidated: false,
        isResetted: true,
      }, "status is not resetted")
    })
  })
})