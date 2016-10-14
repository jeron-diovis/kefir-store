import Kefir from "kefir"
import stream from "./stream"
import Bus from "kefir-bus"
import * as F from "./lib/func_utils"

const Subject = (init = F.id) => {
  const bus = Bus()
  return {
    stream: init(bus.changes()), // use .changes to create new observable, without emit/plug/etc methods
    handler: bus.emit,
  }
}

Subject.is = obj => (
  F.isPlainObject(obj)
  && F.isStream(obj.stream)
  && typeof obj.handler === "function"
)

const setFirst = fn => ([ first, ...rest ]) => [ fn(first), ...rest ]
const setLast = fn => list => list.concat(fn(list.pop()))

const addHandler = (handlers, key, value) => {
  if (handlers.hasOwnProperty(key)) {
    throw new Error(`[kefir-store :: model] Handler '${key}' already exists`)
  }
  handlers[key] = value
}

const parseCompositeInput = setLast(arg => {
  if (Subject.is(arg)) {
    return arg
  }

  if (F.isStream(arg)) {
    return Subject($ => $.merge(arg))
  }

  if (typeof arg === "function") {
    return Subject(arg)
  }

  throw new Error(`[kefir-store :: model] Invalid input.
    If input is an array, it should have following format:
    [ String, Function|Observable|Subject ]
  `)
})

export default function Model(cfg = [], ...args) {
  const handlers = {}

  const config = cfg.map(setFirst(arg => {
    // standard format
    if (F.isStream(arg)) {
      return arg
    }

    if (typeof arg === "string") {
      const subject = Subject()
      addHandler(handlers, arg, subject.handler)
      return subject.stream
    }

    if (Array.isArray(arg)) {
      const [ key, subject ] = parseCompositeInput(arg)

      if (typeof key !== "string") {
        throw new Error(`[kefir-store :: model] Invalid input.
          If input is an array, it should have following format:
          [ String, Function|Observable|Subject ]
        `)
      }

      addHandler(handlers, key, subject.handler)
      return subject.stream
    }

    throw new Error(`[kefir-store :: model] Invalid input.
      Input must be either Observable, or String, or array of following format:
      [ String, Function|Observable|Subject ]
    `)
  }))

  return {
    stream: stream(config, ...args),
    handlers,
  }
}

Model.compact = (...args) => {
  const { stream, handlers } = Model(...args)
  return stream.map(state => ({ state })).combine(Kefir.constant({ handlers }), Object.assign)
}
