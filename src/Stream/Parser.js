import Kefir from "kefir"
import * as F from "../lib/func_utils"
import { getConfig } from "../config"

const isNotEmptyList = x => x.length > 0

export default class StreamParser {
  constructor() {
    this.parseRow = this.parseRow.bind(this)
  }

  parse(config = []) {
    return config.filter(isNotEmptyList).map(this.parseRow)
  }

  parseRow([ input, reducer ]) {
    return [
      this.parseInput(input),
      this.parseReducer(reducer),
    ]
  }

  parseInput(x) {
    if (F.isStream(x)) {
      return x
    }

    throw new Error("[kefir-store] Input must be an Observable")
  }

  parseReducer(x) {
    if (F.isString(x)) {
      x = getConfig().defaultSetter(x)
    }

    if (F.isFunction(x)) {
      return Kefir.constant(F.map(F.spread(x)))
    }

    if (F.isStream(x)) {
      return x
    }

    throw new Error(`[kefir-store] Invalid reducer
      Must be either string, or function(state, patch) -> newState,
      or Observable<function(Observable<[state, patch]>) -> Observable<newState>>
    `)
  }
}

StreamParser.parse = function(cfg) {
  return new this().parse(cfg)
}
