import Kefir from "kefir"
import * as S from "../lib/stream_utils"
import { getConfig } from "../config"
import Parser from "./Parser"

const createInputStream = state$ => ([ input$, reducer$ ]) => (
  S.withTransform(reducer$, state$.sampledBy(input$, Array.of))
)

export default function Stream(config, initialState = getConfig().getEmptyObject()) {
  const pool$ = Kefir.pool()
  const state$ = S.withInitialState(pool$, initialState)
  pool$.plug(Kefir.merge(Parser.parse(config).map(createInputStream(state$))))
  return state$.toProperty()
}
