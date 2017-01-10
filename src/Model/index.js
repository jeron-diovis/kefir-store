import Kefir from "kefir"
import Stream from "../Stream"
import Parser from "./Parser"
import * as F from "../lib/func_utils"

// ---

export default function Model(config, ...args) {
  const { fields, handlers } = Parser.parse(config)
  return {
    stream: Stream(fields, ...args),
    handlers,
  }
}

// ---

Model.toStream = model => {
  if (F.isStream(model)) {
    return model
  }

  const { stream, handlers } = model
  return stream.combine(Kefir.constant(handlers), (state, handlers) => ({ state, handlers })).toProperty()
}

Model.asStream = F.flow(Model, Model.toStream)
