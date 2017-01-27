import { Observable } from "kefir"

import curry from "lodash/curry"
import prop from "lodash/property"

export { curry, prop }
export { default as isPlainObject } from "lodash/isPlainObject"
export { default as zip } from "lodash/zip"
export { default as flow } from "lodash/flow"
export { default as compose } from "lodash/flowRight"
export { default as update } from "lodash/fp/update"

export const id = x => x
export const constant = x => () => x
export const spread = fn => args => fn(...args)
export const entries = Object.entries || (o => Object.keys(o).map(k => [ k, o[k] ]))

export const isStream = x => x instanceof Observable
export const isString = x => typeof x === "string"
export const isFunction = x => typeof x === "function"

export const map = curry((fn, $) => $.map(fn))
export const pluck = curry((key, $) => map(prop(key), $))

export const returnTrue = constant(true)
export const returnFalse = constant(false)
