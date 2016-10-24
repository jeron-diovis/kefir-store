import Kefir from "kefir"
import * as F from "./lib/func_utils"
import * as S from "./lib/stream_utils"
import { getConfig } from "./config"

const createInputStream = state$ => ([ input$, reducer ]) => {
  if (!S.isStream(input$)) {
    throw new Error("[kefir-store] Input must be an Observable")
  }

  if (typeof reducer === "string") {
    reducer = getConfig().defaultSetter(reducer)
  }

  if (typeof reducer === "function") {
    return state$.sampledBy(input$, reducer)
  }

  if (S.isStream(reducer)) {
    return S.withTransform(state$.sampledBy(input$, Array.of), reducer)
  }

  throw new Error(`[kefir-store] Invalid reducer
    Must be either string, or function(state, patch) -> newState,
    or Observable<function(Observable<[state, patch]>) -> Observable<newState>>
  `)
}

export default function Stream(config = [], initialState = getConfig().getEmptyObject()) {
  const pool$ = Kefir.pool()
  const state$ = S.withInitialState(pool$, initialState)
  pool$.plug(Kefir.merge(config.filter(F.isNotEmptyList).map(createInputStream(state$))))
  return state$
}
