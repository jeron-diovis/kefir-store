import Kefir from "kefir"
import * as S from "../lib/stream_utils"
import * as F from "../lib/func_utils"
import CONFIG from "../config"
import Parser from "./Parser"

// ---

class Stream {
  constructor(config, initialState = CONFIG.getEmptyObject()) {
    this._createInputStream = F.curry(this._createInputStream).bind(this)
    this._createStreams = this._createStreams.bind(this)

    this._init(this._initInitialState(initialState))
    return this._build(this._getParser().parse(config))
  }

  _getParser() {
    return Parser
  }

  _init(initialState$) {
    const pool$ = Kefir.pool()
    const state$ = pool$.merge(initialState$)

    this.initialState$ = initialState$
    this.state$ = state$
    this.pool$ = pool$
  }

  _initInitialState(x) {
    return F.isStream(x) ? x.take(1).toProperty() : S.of(x)
  }

  _createInputStream(state$, [ input$, reducer$ ]) {
    return S.withTransform(reducer$, state$.sampledBy(input$, Array.of))
  }

  _createStreams(state$, fields) {
    const { _createInputStream } = this

    return fields.map(_createInputStream(state$))
  }

  _build(fields) {
    const { _createStreams, state$, pool$ } = this

    pool$.plug(Kefir.merge(_createStreams(state$, fields)))
    return state$.toProperty()
  }
}

// ---

Stream.of = function(...args) {
  return new this(...args)
}

// ---

export const Class = Stream
export default Stream.of.bind(Stream)
