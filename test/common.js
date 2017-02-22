import { Stream, Model, Form, Subject } from "../src"

it("should skip current value of any input stream", () => {
  const test = (create, label) => {
    const sub = Subject($ => $.toProperty(() => "some"))

    const stream = create([
      [ sub.stream, "foo" ],
    ])

    const spy = sinon.spy()

    stream.changes().onValue(spy)

    sub.handler(1)
    sub.handler(0)

    assert.equal(spy.callCount, 2, `${label}: not called 2 times`)
    assert.deepEqual(spy.getCall(0).args[0], { foo: 1 }, `${label}: wrong state at 1st time`)
    assert.deepEqual(spy.getCall(1).args[0], { foo: 0 }, `${label}: wrong state at 2nd time`)
  }

  const createState = fn => (...args) => fn(...args).map(x => x.state)

  test(Stream, "Stream");
  test(createState(Model.asStream), "Model");
  test(createState(Form.asStream), "Form");
})