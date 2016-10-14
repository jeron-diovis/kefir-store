import Stream from "../src/stream"

describe("basic stream", () => {
  it("should create a property stream with empty object by default", () => {
    const store = Stream()
    const spy = sinon.spy()
    store.onValue(spy)

    assert(spy.calledOnce)
    assert.deepEqual(spy.getCall(0).args[0], {})
  })

  describe("reducers", () => {
    it("as function: should update state in custom way", () => {
      const subject = Subject()
      const store = Stream([
        [ subject.stream, (state, value) => ({ ...state, value }) ]
      ])

      const spy = sinon.spy()
      store.onValue(spy)

      subject.handler("value")

      assert.equal(spy.callCount, 2, "Store does not react on input stream")
      assert.deepEqual(spy.lastCall.args[0], { value: "value" })
    })

    it("as string: should set prop with that name in state", () => {
      const subject = Subject()
      const store = Stream([
        [ subject.stream, "value" ]
      ])

      const spy = sinon.spy()
      store.onValue(spy)

      subject.handler("value")

      assert.deepEqual(spy.lastCall.args[0], { value: "value" }, "Reducer as string does not update corresponding property in state")
      assert.notDeepEqual(spy.lastCall.args[0], spy.firstCall.args[0], "Default prop update is not immutable")
    })

    describe("as stream:", () => {
      it("normally should create a stream of new states", () => {
        const subject = Subject()
        const store = Stream([
          [ subject.stream, Kefir.constant($ => $.map(([ state, value ]) => ({ ...state, value: value * 2 }))) ]
        ])

        const spy = sinon.spy()
        store.onValue(spy)

        subject.handler(2)

        assert.deepEqual(spy.lastCall.args[0], { value: 4 })
      })

      it("if never emits, should leave state unchanged", () => {
        const subject = Subject()
        const store = Stream([
          [ subject.stream, Kefir.never() ]
        ])

        const spy = sinon.spy()
        store.onValue(spy)

        subject.handler(2)

        assert.equal(spy.callCount, 1)
      })
    })

    it("otherwise: should throw", () => {
      const subject = Subject()
      const setup = () => Stream([
        [ subject.stream, {} ]
      ])
      assert.throws(setup, /\[kefir-store\] Invalid reducer/)
    })
  })
})
