import { Stream } from "../src"
import * as F from "../src/lib/func_utils"

describe("basic stream:", () => {
  it("should create a property stream with empty object by default", () => {
    const store = Stream()
    const spy = sinon.spy()
    store.onValue(spy)

    assert.equal(spy.callCount, 1, "Observable isn't a Property")
    assert.deepEqual(spy.getCall(0).args[0], {}, "Initial state isn't empty")
  })


  describe("input:", () => {
    it("by default, should be an Observable", () => {
      assert.throws(
        () => Stream([
          [ 42 ]
        ]),
        /\[kefir-store\] Invalid input/
      )

      assert.doesNotThrow(
        () => Stream([
          [ Kefir.constant() ]
        ]),
        /\[kefir-store\] Invalid input/
      )
    })

    describe("as array:", () => {
      it("should require array [ Observable, Function ]", () => {
        const test = (throws, input, label) => {
          assert[throws ? "throws" : "doesNotThrow"](
            () => Stream([
              [ input, noop ]
            ]),
            Error,
            /\[kefir-store\] Invalid input/,
            label
          )
        }

        test(true, [ 42 ], "not observable")
        test(true, [ Subject().stream ], "observable without function")
        test(false, [ Subject().stream, x => x ], "valid config")
      })

      describe("initializer function:", () => {
        it("should receive input stream and state stream", () => {
          const initializer = sinon.spy()
          const subj = Subject()
          const reducer = (state, value) => ({ ...state, value })

          const stream = Stream([
            [
              [ subj.stream, initializer ],
              reducer
            ]
          ], {
            value: "initial value"
          })

          assert.equal(initializer.callCount, 1, "Initializer isn't called")

          const args = initializer.getCall(0).args
          assert.equal(args[0], subj.stream, "First args isn't input stream")

          assert.isTrue(F.isStream(args[1]), "Second args isn't a stream")


          // ---

          stream.onValue(noop)

          const state$ = args[1]
          const spy = sinon.spy()

          state$.onValue(spy)

          subj.handler("new value")

          assert.equal(spy.callCount, 1, "State stream is not updated properly")

          assert.deepEqual(
            spy.getCall(0).args[0],
            { value: "new value" },
            "Second arg is not the state stream"
          )
        })

        it("should intercept input stream", () => {
          const subj = Subject()
          const reducer = (state, value) => ({ ...state, value })

          const stream = Stream([
            [
              [
                subj.stream,
                (input$, state$) => Kefir.combine(
                  // note that both streams combined as active,
                  // but values from state$ do not cause infinite loop
                  [ input$, state$ ],
                  (x, { value }) => x + value
                )
              ],
              reducer
            ]
          ], {
            value: 1
          })

          const spy = sinon.spy()

          stream.changes().onValue(spy)

          subj.handler(2)

          assert.deepEqual(
            spy.getCall(0).args[0],
            { value: 3 }
          )
        })
      })
    })
  })


  describe("reducers:", () => {
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

    it("otherwise: should throw", () => {
      const subject = Subject()
      const setup = () => Stream([
        [ subject.stream, {} ]
      ])
      assert.throws(setup, /\[kefir-store\] Invalid reducer/)
    })

    it("should always receive the latest state", () => {
      FakeAsync(tick => {
        const $foo = Subject()
        const $bar = Subject()

        const FOO_TIMEOUT = 50

        const fooReducer = sinon.spy((state, value) => ({ ...state, foo: value }))
        const barReducer = sinon.spy((state, value) => ({ ...state, bar: value }))

        const stream = Stream([
          [
            [ $foo.stream, $ => $.delay(FOO_TIMEOUT) ],
            fooReducer
          ],
          [ $bar.stream, barReducer ],
        ], {
          foo: 0,
          bar: 0,
        })

        const stateSpy = sinon.spy()
        stream.changes().onValue(stateSpy)

        $foo.handler(1)
        $bar.handler(1)

        assert.deepEqual(
          stateSpy.getCall(0).args[0],
          { foo: 0, bar: 1 }
        )

        tick(FOO_TIMEOUT)

        assert.deepEqual(
          fooReducer.getCall(0).args[0],
          { foo: 0, bar: 1 }
        )
      })
    })
  })


  it("should accept initial state as second param", () => {
    const initialState = { value: "initial value" }
    const subj = Subject()
    const store = Stream(
      [
        [ subj.stream, "value" ]
      ],
      initialState
    )

    const spy = sinon.spy()
    store.onValue(spy)

    subj.handler("new value")

    assert.equal(spy.callCount, 2, "spy is not called once")
    assert.deepEqual(spy.getCall(0).args[0], { value: "initial value" }, "initial state is invalid")
    assert.deepEqual(initialState, { value: "initial value" }, "initial state is mutated!")
  })


  it("should allow initial state as a stream", () => {
    const store = Stream([], Kefir.constant({ value: "initial value" }).flatten(x => [ x, { value: "second value" } ]))
    const spy = sinon.spy()
    store.onValue(spy)

    assert.equal(spy.callCount, 1, "spy is not called once")
    assert.deepEqual(spy.getCall(0).args[0], { value: "initial value" }, "initial state is invalid")
  })
})
