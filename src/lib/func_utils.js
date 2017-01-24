import Kefir from "kefir"

import curry from "lodash/curry"
import prop from "lodash/property"
import negate from "lodash/negate"
import id from "lodash/identity"

export { id, curry, prop, negate }
export { default as constant } from "lodash/constant"
export { default as isPlainObject } from "lodash/isPlainObject"
export { default as zip } from "lodash/zip"
export { default as equals } from "lodash/isEqual"
export { default as flatten } from "lodash/flatten"
export { default as flow } from "lodash/flow"
export { default as compose } from "lodash/flowRight"
export { default as spread } from "lodash/spread"
export { default as entries } from "lodash/toPairs"
export { default as update } from "lodash/fp/update"

export const isStream = x => x instanceof Kefir.Observable
export const isString = x => typeof x === "string"
export const isFunction = x => typeof x === "function"
export const isNotEmptyList = x => x.length > 0
export const map = curry((fn, $) => $.map(fn))
export const pluck = curry((key, $) => map(prop(key), $))

export const branch = (
  (predicate, left, right = id) =>
    (...args) => predicate(...args) ? left(...args) : right(...args)
)

export const partition = curry((predicate, $) => [
  $.filter(predicate),
  $.filter(negate(predicate))
])
