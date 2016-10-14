import Kefir from "kefir"

export { default as constant } from "lodash/constant"
export { default as id } from "lodash/identity"

export const isStream = x => x instanceof Kefir.Observable