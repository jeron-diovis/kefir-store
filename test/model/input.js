import { Model } from "../../src"

describe("model :: input", () => {
  it("as stream: should work just as regular store", () => {
    const subject = Subject()
    const model = Model([
      [ subject.stream, "value" ]
    ])

    const spy = sinon.spy()
    model.stream.onValue(spy)

    subject.handler("value")

    assert.deepEqual(spy.lastCall.args[0], { value: "value" })
  })

  it("as string: should create input stream and add handler with that name", () => {
    const model = Model([
      [ "setValue", "value" ]
    ])

    assert.isFunction(model.handlers.setValue, "Handler is not created")

    const spy = sinon.spy()
    model.stream.onValue(spy)

    model.handlers.setValue("value")

    assert.deepEqual(spy.lastCall.args[0], { value: "value" }, "Input stream does not work")
  })


  describe("as array:", () => {
    it("should allow string as first parameter", () => {
      let model

      const setup = () => {
        model = Model([
          [ [ "some", noop ], "value" ]
        ])
      }

      assert.doesNotThrow(setup, /\[kefir-store :: model\] Invalid input/)

      assert.isFunction(model.handlers.some)
    })

    describe("should allow subjects:", () => {
      it("[ name, subject ]", () => {
        let model

        const setup = () => {
          model = Model([
            [ [ "some", Subject() ], "value"],
          ])
        }

        assert.doesNotThrow(setup, /\[kefir-store :: model\] Invalid input/)

        assert.isFunction(model.handlers.some)
      })

      it("[ name, subject, init ]", () => {
        let model, subj
        const spy = sinon.spy()

        const setup = () => {
          subj = Subject()
          model = Model([
            [ [ "some", subj, spy ], "value"],
          ])
        }

        assert.doesNotThrow(setup, /\[kefir-store :: model\] Invalid input/)

        assert.isFunction(model.handlers.some)
        assert.equal(spy.callCount, 1)
        assert.equal(spy.getCall(0).args[0], subj.stream)
      })

      it("should not allow [ stream, subject ]", () => {
        const setup = () => {
          const subj = Subject()
          Model([
            [ [ subj.stream, subj ], "value"],
          ])
        }

        assert.throws(setup, /\[kefir-store :: model\] Invalid input/)
      })

      it("should install handler from subject to model's handlers", () => {
        const subj = Subject()
        const model = Model([
          [ [ "some", subj ], "value" ],
        ])

        const spy = sinon.spy()

        model.stream.changes().observe(spy)

        model.handlers.some(1)
        assert.equal(spy.callCount, 1)
        assert.deepEqual(spy.getCall(0).args[0].value, 1)

        subj.handler(2)
        assert.equal(spy.callCount, 2)
        assert.deepEqual(spy.getCall(1).args[0].value, 2)
      })
    })
  })

  it("should not allow duplicating handler names", () => {
    const setup = () => Model([
      [ "setValue", "value" ],
      [ [ "setValue", noop ], "value" ]
    ])
    assert.throws(setup, /Handler 'setValue' already exists/)
  })

})
