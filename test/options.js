import { Stream, Subject } from "../src"

describe("options", () => {
  describe("init", () => {
    it("should accept created stream and return transformed stream", () => {
      const subj = Subject()
      const spyInit = sinon.spy($ => $.map(state => {
        state.foo = state.foo * 2
        return state
      }))
      const spyState = sinon.spy()

      const stream = Stream([
        [ subj.stream, "foo" ]
      ], { foo: 0 }, { init: spyInit })

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
})