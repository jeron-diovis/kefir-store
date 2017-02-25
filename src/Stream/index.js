import Kefir from "kefir"
import * as S from "../lib/stream_utils"
import * as F from "../lib/func_utils"
import CONFIG from "../config"
import Parser from "./Parser"

// ---

class Stream {
  constructor(config, initialState = CONFIG.getEmptyObject()) {
    this._init(this._initInitialState(initialState))
    return this._build(this._getParser().parse(config))
  }

  _getParser() {
    return Parser
  }

  /**
   * @param {Observable.<*>} initialState$
   * @protected
   */
  _init(initialState$) {
    const pool$ = Kefir.pool()
    const state$ = pool$.merge(initialState$)

    this.initialState$ = initialState$
    this.state$ = state$
    this.pool$ = pool$
  }

  /**
   * @param {*} x
   * @return {Observable}
   * @protected
   */
  _initInitialState(x) {
    return F.isStream(x) ? x.take(1).toProperty() : S.of(x)
  }

  /**
   * @param {Observable.<*>} state$
   * @param {Observable.<*>} input$
   * @param {Observable.<Function>} reducer$
   * @returns {Observable.<*>}
   * @protected
   */
  _createInputStream(state$, [ input$, reducer$ ]) {
    return S.withTransform(reducer$, state$.sampledBy(input$, Array.of))
  }

  /**
   * @param {Observable.<*>} state$
   * @param {Array.<Observable.<*>, Observable.<Function>>} fields
   * @return {Array.<Observable.<*>>}
   * @protected
   */
  _createStreams(state$, fields) {
    return fields.map(x => this._createInputStream(state$, x))
  }

  /**
   * @param {Array.<Observable.<*>, Observable.<Function>>} fields
   * @return {Observable.<*>}
   * @protected
   */
  _build(fields) {
    const { state$, pool$ } = this

    pool$.plug(Kefir.merge(this._createStreams(state$, fields)))
    return state$.toProperty()
  }
}

// ---

Stream.of = function(...args) {
  return new this(...args)
}

// ---

export const Class = Stream

/**
 * @typedef {Function} KefirStore_Stream
 *
 * @type KefirStore_Stream
 */
export default Stream.of.bind(Stream)
