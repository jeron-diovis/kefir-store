import { Stream, listReducer } from "../src"

describe("collection reducer:", () => {
  it("should provide 'listReducer' helper", () => {
    assert.isFunction(listReducer);
  })

  it("helper should accept a function or string, and create a function", () => {
    assert.isFunction(listReducer("prop"), "does not accept string");
    assert.isFunction(listReducer(() => {}), "does not accept function");

    assert.throws(
      () => listReducer(null),
      /Argument must be a function or a string/,
      "does not throw otherwise"
    );
  })

  it("should expect functor as state by default", () => {
    const reducer = listReducer("smth");
    const payload = { query: {}, data: undefined }
    assert.throws(
      () => reducer({}, payload),
      /Expected state to have 'map' method/
    );

    assert.doesNotThrow(
      () => reducer([], payload),
    );
  })

  it("should expect a plain object '{ query: Any, data: Any }' as a value", () => {
    const reducer = listReducer("smth");
    assert.throws(
      () => reducer([], "value"),
    );

    assert.doesNotThrow(
      () => reducer([], { query: {}, data: undefined }),
    );
  })

  it("should apply logic of reducer to each item in collection", () => {
    const subject = Subject()

    const reducer = sinon.spy((state, value) => ({
      ...state,
      value: state.value + value
    }));

    const filterer = sinon.spy(x => x.value !== 2);

    const STATE = [
      { value: 1 },
      { value: 2 },
      { value: 3 },
    ]

    const store = Stream(
      [
        [
          subject.stream,
          listReducer(reducer),
        ]
      ],

      STATE
    )

    const spy = sinon.spy()
    store.changes().onValue(spy)

    subject.handler({
      query: filterer,
      data: 2,
    })

    // ---

    assert.equal(spy.callCount, 1, "state is not updated once")
    assert.equal(reducer.callCount, 2, "reducer is not called twice")
    assert.equal(filterer.callCount, 3, "filterer is not called 3 times")

    // ---

    assert.deepEqual(
      reducer.getCall(0).args,
      [ { value: 1 }, 2, STATE ],
      "reducer does not receive proper args"
    )

    assert.deepEqual(
      reducer.getCall(1).args,
      [ { value: 3 }, 2, STATE ],
      "reducer does not receive proper args"
    )

    // ---

    assert.deepEqual(
      filterer.getCall(0).args,
      [ { value: 1 }, STATE, 0 ],
      "filterer does not receive proper args"
    )

    assert.deepEqual(
      filterer.getCall(1).args,
      [ { value: 2 }, STATE, 1 ],
      "filterer does not receive proper args"
    )

    assert.deepEqual(
      filterer.getCall(2).args,
      [ { value: 3 }, STATE, 2 ],
      "filterer does not receive proper args"
    )

    // ---

    assert.deepEqual(
      spy.lastCall.args[0],
      [ { value: 3 }, { value: 2 }, { value: 5 }, ],
      "Final state is wrong"
    )
  })

  it("should allow custom mapper function", () => {
    const subject = Subject()

    const filterer = x => x.value !== 2;

    const reducer = (state, value) => {
      state.value = value
      return value
    };

    const mapper = sinon.spy((fn, xs) => {
      xs.forEach(fn);
      return xs;
    })

    const store = Stream(
      [
        [
          subject.stream,
          listReducer(reducer, mapper),
        ]
      ],

      [
        { value: 1 },
        { value: 2 },
      ]
    )

    const spy = sinon.spy()
    store.onValue(spy)

    subject.handler({
      query: filterer,
      data: 42,
    })

    assert.equal(mapper.callCount, 1, "mapper isn't called once")

    assert.deepEqual(
      spy.getCall(1).args[0],
      [
        { value: 42 },
        { value: 2 },
      ],
      "final state is wrong"
    )

    assert.deepEqual(
      spy.getCall(0).args[0],
      spy.getCall(1).args[0],
      "state isn't updated in mutable way"
    )
  })
})
