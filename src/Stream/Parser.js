import * as F from "../lib/func_utils"
import CONFIG from "../config"

const hasItems = x => x.length > 0

export default class StreamParser {
  constructor() {
    this.parseField = this.parseField.bind(this)
  }

  parse(config = []) {
    return config.filter(hasItems).map(this.parseField)
  }

  parseField([ input, reducer ]) {
    return [
      this.parseInput(input),
      this.parseReducer(reducer),
    ]
  }

  parseInput(x) {
    if (F.isStream(x)) {
      return { stream: x, init: F.id }
    }

    if (Array.isArray(x)) {
      return this.parseArrayInput(x)
    }

    throw new Error(`[kefir-store] Invalid input.
      Input must be either Observable or [ Observable, function ].
      Current: ${JSON.stringify(x)}
    `)
  }

  parseArrayInput([ stream, init ]) {
    if (!F.isStream(stream)) {
      throw new Error(`[kefir-store] Invalid input.
        When input defined as array, first value must be an Observable.
        Current: ${JSON.stringify(stream)}
      `)
    }

    if (!F.isFunction(init)) {
      throw new Error(`[kefir-store] Invalid input.
        When input defined as array, second value must be a function Observable -> Observable.
        Current: ${JSON.stringify(init)}
      `)
    }

    return { stream, init }
  }

  parseReducer(x) {
    if (F.isString(x)) {
      return CONFIG.reducer(x)
    }

    if (F.isFunction(x)) {
      return x
    }

    throw new Error(`[kefir-store] Invalid reducer
      Must be either string, or function state -> patch -> new_state.
      Current: ${JSON.stringify(x)}
    `)
  }
}

StreamParser.parse = function(cfg) {
  return new this().parse(cfg)
}
