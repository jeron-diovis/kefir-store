import { Form } from "../../../src"

describe("form :: validation :: validator config:", () => {
  it("should be a [ Function, { get: Function, set: Function, key: String } ]", () => {
    const options = {
      get: noop,
      set: noop,
      key: "",
    }

    const setup = options => () => {
      Form([
        [
          "setValue",
          noop,
          [
            noop,
            options,
          ]
        ]
      ])
    }

    assert.doesNotThrow(setup(options))
    Object.keys(options).forEach(key => {
      assert.throws(setup({ ...options, [key]: null }), /Incomplete validation config/)
    })
  })


  it("should support validator as stream", () => {
    FakeAsync(tick => {
      const subj = Subject();

      const form$ = Form.asStream([
        [
          [ "setValue", $ => $.merge(subj.stream) ],
          "value",
          Kefir.constant(
            $ => $.delay().map(([ value, state ]) => (
              value === state.equalTo ? null : "ERROR"
            ))
          )
        ]
      ], {
        value: 1,
        equalTo: 2,
      })

      const spy = sinon.spy()

      form$.changes().onValue(spy)
      subj.handler(0)

      tick()

      assert.equal(spy.callCount, 1, "Validator is not called")
      assert.deepEqual(spy.lastCall.args[0].errors, { value: "ERROR" })
    })
  })

  describe("options:", () => {
    let validator
    const defaultOptions = {
      get: noop,
      set: noop,
      key: "value",
    };
    const cfg = arg => ({ ...defaultOptions, ...arg })

    beforeEach(() => {
      validator = toValidator(x => x > 0, ERROR_MSG)
    })

    afterEach(() => {
      validator = null
    })

    it("'key': should define a prop name in errors map", () => {
      const form = Form([
        [
          "setValue",

          (state, value) => ({ ...state, value }),

          [
            validator,
            cfg({
              key: "my_error"
            }),
          ]
        ]
      ], {
        value: 0
      })

      const spy = sinon.spy()
      form.stream.onValue(spy)
      form.handlers.setValue(-1)
      assert.deepEqual(spy.lastCall.args[0].errors, { my_error: ERROR_MSG })
    })

    it("'set': should describe how to update state when input is invalid", () => {
      const form = Form([
        [
          "setValue",

          (state, value) => ({ ...state, value }),

          [
            validator,
            cfg({
              set: (state, value) => ({ ...state, value: value * 2 })
            }),
          ]
        ]
      ], {
        value: 0
      })

      const spy = sinon.spy()
      form.stream.onValue(spy)
      form.handlers.setValue(-1)
      assert.deepEqual(spy.lastCall.args[0].state, { value: -2 })
    })


    it("'get': should describe how to get current field value from state when entire form is validated", () => {
      const form = Form([
        [
          [ "setValue", $ => $.diff(null, 0) ],

          (state, [ prev_value, value ]) => ({ ...state, value, prev_value }),

          [
            validator,
            cfg({
              get: state => state.prev_value,
            }),
          ]
        ]
      ], {
        value: 1,
        prev_value: 0,
      })

      const spy = sinon.spy()
      form.stream.changes().onValue(spy)

      form.handlers.validate()

      const result = spy.lastCall.args[0]
      assert.deepEqual(result.errors, {
        value: ERROR_MSG,
      })
    })

    describe("as string", () => {
      it("should be used as error key and as prop name for getter/setter", () => {
        const validator = sinon.spy(toValidator(x => x > 0, ERROR_MSG))

        const form = Form([
          [
            "setValue",
            (state, value) => ({ ...state, value }),
            [
              validator,
              "value"
            ]
          ],
        ], {
          value: null
        })

        const spy = sinon.spy()
        form.stream.changes().onValue(spy)

        form.handlers.setValue(0)
        form.handlers.validate()

        assert.equal(spy.callCount, 2, "Form isn't updated twice")
        assert.equal(validator.callCount, 2, "Validator isn't called twice")

        assert.deepEqual(spy.getCall(0).args[0].state, { value: 0 })
        assert.deepEqual(spy.getCall(0).args[0].errors, { value: ERROR_MSG })

        assert.deepEqual(validator.getCall(0).args, [ 0, { value: null } ])
        assert.deepEqual(validator.getCall(1).args, [ 0, { value: 0 } ])
      })
    })
  })
})
