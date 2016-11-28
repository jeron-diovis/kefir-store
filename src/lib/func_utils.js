import Kefir from "kefir"

export const isStream = x => x instanceof Kefir.Observable
export const isString = x => typeof x === "string"
export const isFunction = x => typeof x === "function"
export const isNotEmptyList = x => x.length > 0

export { default as constant } from "lodash/constant"
export { default as id } from "lodash/identity"
export { default as isPlainObject } from "lodash/isPlainObject"
export { default as prop } from "lodash/property"
export { default as zip } from "lodash/zip"
export { default as equals } from "lodash/isEqual"
export { default as flatten } from "lodash/flatten"
export { default as flow } from "lodash/flow"
export { default as curry } from "lodash/curry"
export { default as entries } from "lodash/toPairs"
