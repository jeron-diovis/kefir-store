import Kefir from "kefir"
import Stream from "./stream"
import Subject from "./lib/Subject"
import * as F from "./lib/func_utils"
import * as S from "./lib/stream_utils"

// ---

const setFirst = fn => ([ first, ...rest ]) => [ fn(first), ...rest ]
const setLast = fn => list => list.slice(0, -1).concat(fn(list[list.length - 1]))

// ---

const parseCompositeInput = setLast(arg => {
  if (Subject.is(arg)) {
    return arg
  }

  if (S.isStream(arg)) {
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
  if (S.isStream(arg)) {
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
  if (S.isStream(input)) {
    return input
  }

  return input[input.length - 1].stream
}

export const replaceStreamInParsedInput = (input, replace) => {
  if (S.isStream(input)) {
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
    if (S.isStream(parsed)) {
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

Model.toStream = model => {
  if (S.isStream(model)) {
    return model
  }

  const { state$, handlers } = model
  return state$.map(state => ({ state })).combine(Kefir.constant({ handlers }), Object.assign).toProperty()
}

Model.asStream = F.flow(Model, Model.toStream)
