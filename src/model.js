import Kefir from "kefir"
import Stream from "./stream"
import Bus from "kefir-bus"
import * as F from "./lib/func_utils"

// ---

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

// ---

const setFirst = fn => ([ first, ...rest ]) => [ fn(first), ...rest ]
const setLast = fn => list => list.slice(0, -1).concat(fn(list[list.length - 1]))

// ---

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
    Current: array second value: ${JSON.stringify(arg)}
  `)
})

export const parseInput = arg => {
  // standard format
  if (F.isStream(arg)) {
    return arg
  }

  if (typeof arg === "string") {
    return [ arg, Subject() ]
  }

  if (Array.isArray(arg)) {
    const [ key, subject ] = parseCompositeInput(arg)

    if (typeof key !== "string") {
      throw new Error(`[kefir-store :: model] Invalid input.
        If input is an array, it should have following format:
        [ String, Function|Observable|Subject ]
        Current: array first value: ${key}
      `)
    }

    return [ key, subject ]
  }

  throw new Error(`[kefir-store :: model] Invalid input.
    Input must be either Observable, or String, or array of following format:
    [ String, Function|Observable|Subject ]
    Current: ${JSON.stringify(arg)}
  `)
}

// ---

export const getStreamFromParsedInput = input => {
  if (F.isStream(input)) {
    return input
  }

  return input[input.length - 1].stream
}

export const replaceStreamInParsedInput = (input, replace) => {
  if (F.isStream(input)) {
    return replace
  }

  input = input.slice()
  const subject = input.pop()
  return input.concat({ ...subject, stream: replace })
}

// ---

export default function Model(cfg = [], ...args) {
  const handlers = {}

  const config = cfg.filter(F.isNotEmptyList).map(setFirst(parseInput)).map(([ parsed, ...rest ]) => {
    if (F.isStream(parsed)) {
      return [ parsed, ...rest ]
    }

    const [ key, subject ] = parsed
    if (handlers.hasOwnProperty(key)) {
      throw new Error(`[kefir-store :: model] Handler '${key}' already exists`)
    }
    handlers[key] = subject.handler
    return [ subject.stream, ...rest ]
  })

  return {
    state$: Stream(config, ...args),
    handlers,
  }
}

// ---

Model.asStream = (...args) => {
  const { state$, handlers } = Model(...args)
  return state$.map(state => ({ state })).combine(Kefir.constant({ handlers }), Object.assign)
}