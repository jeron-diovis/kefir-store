import Kefir from "kefir"
import { Class as Stream } from "../Stream"
import Parser from "./Parser"
import * as F from "../lib/func_utils"

// ---

class Model extends Stream {

  _getParser() {
    return Parser
  }

  _build({ fields, handlers }) {
    return {
      stream: super._build(fields),
      handlers,
    }
  }
}

// ---

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
