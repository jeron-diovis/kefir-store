import Kefir from "kefir"
import { Class as Stream } from "../Stream"
import Parser from "./Parser"
import * as F from "../lib/func_utils"

// ---

class Model extends Stream {

  _getParser() {
    return Parser
  }

  /**
   * @param {Array<Observable<*>, Observable.<Function>>} fields
   * @param {Object.<String, Function>} handlers
   * @return {{stream: Observable.<*>, handlers: Object.<String, Function>}}
   * @private
   */
  _build({ fields, handlers }) {
    return {
      stream: super._build(fields),
      handlers,
    }
  }
}

// ---

/**
 * @callback KefirStore_Model
 * @return {Observable}
 */

/**
 * @callback KefirStore_Model.toStream
 * @return {Observable}
 */

/**
 * @callback KefirStore_Model.asStream
 * @return {Observable}
 */

/**
 * @type KefirStore_Model
 */
const of = Model.of.bind(Model)

of.toStream = model => {
  if (F.isStream(model)) {
    return model
  }

  const { stream, handlers } = model
  return Kefir.combine(
    [ stream, Kefir.constant(handlers) ],
    (state, handlers) => ({ state, handlers })
  ).toProperty()
}

of.asStream = F.flow(of, of.toStream)

// ---

export const Class = Model
export default of
