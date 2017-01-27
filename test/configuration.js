import { Stream } from "../src"
import Immutable from "immutable"
import { setConfig } from "../src/config"
import defaultConfig from "../src/config/default"

const immutableConfig = {
  getEmptyObject: () => Immutable.OrderedMap(),
  reducer: prop => (state, value) => state.setIn(prop.split("."), value),
  getter: prop => state => state.get(prop),
}

describe("configuration", () => {

  before(() => setConfig(immutableConfig))

  after(() => setConfig(defaultConfig))

  describe("ImmutableJS", () => {
    it("default state", () => {
      const store = Stream()
      const spy = sinon.spy()
      store.onValue(spy)

      const state = spy.lastCall.args[0]
      assert(Immutable.OrderedMap.isOrderedMap(state))
      assert.deepEqual(state.toJS(), {})
    })

    it("default update named prop", () => {
      const subject = Subject()
      const store = Stream([
        [ subject.stream, "deep.nested.value" ]
      ])

      const spy = sinon.spy()
      store.onValue(spy)

      subject.handler("value")

      const state = spy.lastCall.args[0]
      assert.deepEqual(state.toJS(), { deep: { nested: { value: "value" }}})
    })
  })
})
