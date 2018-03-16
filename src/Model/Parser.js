import * as F from "../lib/func_utils"
import Subject from "../lib/Subject"
import StreamParser from "../Stream/Parser"

// ---

const NONAME = Object.create(null)
const noop = () => {}

const handlersReducer = (handlers, { name, handler }) => {
  if (handlers.hasOwnProperty(name)) {
    throw new Error(`[kefir-store :: model] Handler '${name}' already exists`)
  }

  handlers[name] = handler
  return handlers
}

// ---

export default class ModelParser extends StreamParser {

  parseInput(x) {
    if (F.isStream(x)) {
      return {
        init: F.id,
        name: NONAME,
        stream: x,
        handler: noop,
      }
    }

    if (F.isString(x)) {
      return {
        init: F.id,
        name: x,
        ...Subject(),
      }
    }

    if (Array.isArray(x)) {
      return this.parseArrayInput(x)
    }

    throw new Error(`[kefir-store :: model] Invalid input.
      Input must be either Observable, or String, 
      or array of following format: [ String|Observable, Function ]
      Current: ${JSON.stringify(x)}
    `)
  }

  parseArrayInput(array) {
    const [ first, second, third ] = array

    if (F.isString(first)) {
      let stream, handler, init

      if (Subject.is(second)) {
        ({ stream, handler } = second)
        init = third || F.id
      } else {
        ({ stream, handler } = Subject())
        init = second
      }

      return {
        name: first,
        handler,
        ...super.parseArrayInput([ stream, init ])
      }
    }

    if (F.isStream(first)) {
      if (Subject.is(second)) {
        throw new Error(`[kefir-store :: model] Invalid input.
          If input is an array with first value observable, passing subject is not allowed.
        `)
      }

      return {
        name: NONAME,
        ...super.parseArrayInput([ first, second ])
      }
    }

    throw new Error(`[kefir-store :: model] Invalid input.
      If input is an array, it should have following format:
      [ String|Observable, Function ] or [ String, Subject, ?Function ]
      Current:  ${JSON.stringify(array)}
    `)
  }

  parse(...args) {
    const [ inputs = [], reducers = [], ...rest ] = F.zip(...super.parse(...args))
    return {
      fields: F.zip(inputs, reducers, ...rest),
      handlers: inputs.filter(({ name }) => name !== NONAME).reduce(handlersReducer, {}),
    }
  }
}
