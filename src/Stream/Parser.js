import * as F from "../lib/func_utils"
import { toReducer } from "../lib/stream_utils"
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
      return x
    }

    throw new Error("[kefir-store] Input must be an Observable")
  }

  parseReducer(x) {
    if (F.isString(x)) {
      x = CONFIG.reducer(x)
    }

    x = toReducer(x)

    if (!F.isStream(x)) {
      throw new Error(`[kefir-store] Invalid reducer
        Must be either string, or (state, patch) -> newState,
        or Observable.<(Observable.<Array.<state, patch>> -> Observable.<new_state>)>
      `)
    }

    return x
  }
}

StreamParser.parse = function(cfg) {
  return new this().parse(cfg)
}
