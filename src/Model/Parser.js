import * as F from "../lib/func_utils"
import Subject from "../lib/Subject"
import StreamParser from "../Stream/Parser"

// ---

const EMPTY_KEY = Object.create(null)
const noop = () => {}

const handlersReducer = (handlers, { name, subject: { handler } }) => {
  if (handlers.hasOwnProperty(name)) {
    throw new Error(`[kefir-store :: model] Handler '${name}' already exists`)
  }

  handlers[name] = handler
  return handlers
}

const pluckStreams = F.map(F.flow(F.prop("subject"), F.prop("stream")))

// ---

const parseKey = x => {
  if (F.isString(x)) {
    return x
  }

  if (x === EMPTY_KEY) {
    return x
  }

  throw new Error(`[kefir-store :: model] Invalid input.
    If input is an array, it should have following format:
    [ String, Function|Observable|Subject ]
    Current: array first value: ${JSON.stringify(x)}
  `)
}

const parseSubject = x => {
  if (Subject.is(x)) {
    return { ...x }
  }

  if (F.isStream(x)) {
    return Subject($ => $.merge(x))
  }

  if (F.isFunction(x)) {
    return Subject(x)
  }

  throw new Error(`[kefir-store :: model] Invalid input.
    If input is an array, it should have following format:
    [ String, Function|Observable|Subject ]
    Current: array second value: ${JSON.stringify(x)}
  `)
}

// ---

export default class ModelParser extends StreamParser {

  parseInput(x) {
    if (F.isStream(x)) {
      return { name: EMPTY_KEY, subject: { stream: x, handler: noop } }
    }

    if (F.isString(x)) {
      return { name: x, subject: Subject() }
    }

    if (Array.isArray(x)) {
      return { name: parseKey(x[0]), subject: parseSubject(x[1]) }
    }

    throw new Error(`[kefir-store :: model] Invalid input.
      Input must be either Observable, or String, or array of following format:
      [ String, Function|Observable|Subject ]
      Current: ${JSON.stringify(x)}
    `)
  }

  parse(...args) {
    const [ inputs = [], reducers = [] ] = F.zip(...super.parse(...args))
    return {
      rows: F.zip(pluckStreams(inputs), reducers),
      handlers: inputs.filter(({ name }) => name !== EMPTY_KEY).reduce(handlersReducer, {}),
    }
  }

}

ModelParser.EMPTY_KEY = EMPTY_KEY
