import Kefir from "kefir"
import Stream from "../Stream"
import Parser from "./Parser"
import * as F from "../lib/func_utils"

// ---

// TODO: remove this all when Form parser will be ready
const tmp_parser = new Parser
export const parseInput = tmp_parser.parseInput.bind(tmp_parser)

export const getStreamFromParsedInput = input => input.subject.stream

export const replaceStreamInParsedInput = (input, replace) => {
  return [ input.name, { ...input.subject, stream: replace } ]
}

// ---

export default function Model(cfg = [], ...args) {
  const { rows, handlers } = Parser.parse(cfg)
  return {
    stream: Stream(rows, ...args),
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
