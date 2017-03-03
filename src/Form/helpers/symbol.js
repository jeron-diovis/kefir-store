import Symbol from "es6-symbol"

const SYMBOL_KEY = Symbol("@@kefir-store/form")
const SYMBOL_VALUE = true

export const mark = obj => {
  obj[SYMBOL_KEY] = SYMBOL_VALUE
  return obj
}

export const is = x => x[SYMBOL_KEY] === SYMBOL_VALUE
