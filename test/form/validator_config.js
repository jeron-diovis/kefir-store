import Form from "../../src/form"

describe("form :: validator config: ", () => {
  it("should be a [ Function, { get: Function, set: Function, key: String } ]", () => {
    const options = {
      get: () => {},
      set: () => {},
      key: "",
    }

    const setup = options => () => {
      Form([
        [ "setValue", () => {}, [
          () => {},
          options
        ] ]
      ])
    }

    assert.doesNotThrow(setup(options))
    Object.keys(options).forEach(key => {
      assert.throws(setup({ ...options, [key]: null }), /Incomplete validation config/)
    })
  })

  it("if reducer is a string, should be only a validator function", () => {
    assert.doesNotThrow(() => Form([
      [ "setValue", "value", () => {} ]
    ]))

    assert.throws(
      () => Form([
        [ "setValue", "value", [ () => {}, {
          get: () => {},
          set: () => {},
          key: "",
        } ] ]
      ]),
      /When reducer is defined as a string, you should only define validation function/
    )
  })



  describe("options: ", () => {
    let validator
    const ERROR_MSG = "ERROR"
    const defaultOptions = {
      get: () => {},
      set: () => {},
      key: "",
    };
    const cfg = arg => ({ ...defaultOptions, ...arg })

    beforeEach(() => {
      validator = x => x > 0 ? null : ERROR_MSG
    })

    afterEach(() => {
      validator = null
    })

    it("'key': should define a prop name in errors map", () => {
      const form = Form([
        [ "setValue", (state, value) => ({ ...state, value }),
          [ validator, cfg({
            key: "my_error"
          }) ]
        ]
      ], {
        value: 0
      })

      const spy = sinon.spy()
      form.validity$.map(x => x.errors).onValue(spy)
      form.handlers.setValue(-1)
      assert.deepEqual(spy.lastCall.args[0], { my_error: ERROR_MSG })
    })

    it("'set': should describe how to update state when input is invalid", () => {
      const form = Form([
        [ "setValue", (state, value) => ({ ...state, value }),
          [ validator, cfg({
            set: (state, value) => ({ ...state, value: value * 2 })
          }) ]
        ]
      ], {
        value: 0
      })

      const spy = sinon.spy()
      form.state$.onValue(spy)
      form.handlers.setValue(-1)
      assert.deepEqual(spy.lastCall.args[0], { value: -2 })
    })

    // TODO: 'get'
  })
})
