import * as F from "./func_utils"
import CONFIG from "../config"

import iteratee from "lodash/iteratee"

function parseReducer(x) {
  if (F.isString(x)) {
    return CONFIG.reducer(x)
  }

  if (F.isFunction(x)) {
    return x
  }

  throw new Error(`[kefir-store :: collectionReducer]
    Argument must be a function or a string.
    Current: ${JSON.stringify(x)}
  `)
}

function ensureValidInput(x) {
  if (!(
    F.isPlainObject(x)
    && x.hasOwnProperty("query")
    && x.hasOwnProperty("data")
  )) {
    throw new Error(`[kefir-store :: collectionReducer]
      Expected to get from stream a plain object with props "query" and "data".
      Current: ${JSON.stringify(x)}
    `)
  }
}

function ensureValidState(x) {
  if (!F.isFunction(x.map)) {
    throw new Error(`[kefir-store :: collectionReducer]
      Expected state to have 'map' method. 
    `)
  }
}

export default (x) => {
  const reducer = parseReducer(x)

  return (state, arg) => {
    ensureValidState(state)
    ensureValidInput(arg)
    const matches = iteratee(arg.query)
    return state.map((x, i) => !matches(x, state, i) ? x : reducer(x, arg.data))
  }
}
