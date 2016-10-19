import Kefir from "kefir"
import * as F from "./lib/func_utils"
import * as S from "./lib/stream_utils"
import { getConfig } from "./config"

const transformWith = ($, fn) => fn($)

const createInputStream = state$ => ([ input$, reducer ]) => {
  if (!F.isStream(input$)) {
    throw new Error("[kefir-store] Input must be an Observable")
  }

  if (typeof reducer === "string") {
    reducer = getConfig().defaultSetter(reducer)
  }

  if (typeof reducer === "function") {
    return state$.sampledBy(input$, reducer)
  }

  if (F.isStream(reducer)) {
    return S.withLatestFrom(
      Kefir.constant(state$.sampledBy(input$, Array.of)),
      reducer,
      transformWith
    ).flatMap()
  }

  throw new Error(`[kefir-store] Invalid reducer
    Must be either string, or function(state, patch) -> newState,
    or Observable<function(Observable<[state, patch]>) -> Observable<newState>>
  `)
}

export default function Stream(config = [], initialState = getConfig().getEmptyObject()) {
  const pool$ = Kefir.pool()
  const state$ = !F.isStream(initialState)
    ? pool$.toProperty(F.constant(initialState))
    : pool$.merge(initialState.take(1)).toProperty()
  pool$.plug(Kefir.merge(config.filter(F.isNotEmptyList).map(createInputStream(state$))))
  return state$
}
