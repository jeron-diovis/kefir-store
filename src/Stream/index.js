import Kefir from "kefir"
import Subject from "../lib/Subject"
import * as S from "../lib/stream_utils"
import * as F from "../lib/func_utils"
import CONFIG from "../config"
import Parser from "./Parser"

// ---

const tap = f => x => (f(x), x)

// ---

class Stream {
  constructor(config, initialState = CONFIG.getEmptyObject(), options = {}) {
    this._init(this._initInitialState(initialState), options)
    return this._build(this._getParser().parse(config))
  }

  _getParser() {
    return Parser
  }

  /**
   * @param {Observable.<*>} initialState$
   * @param {Object} options
   * @protected
   */
  _init(initialState$, options = {}) {
    this.initialState$ = initialState$
    this.options = options
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
   * @param {Observable|{ stream: Observable, init: Function }} input
   * @param {Observable.<Function>} reducer
   * @returns {Observable.<*>}
   * @protected
   */
  _createInputStream(state$, [ input, reducer ]) {
    return state$.sampledBy(
      S.initInputStream(input, state$),
      reducer
    )
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
    const { initialState$, options } = this

    /**
     * The core concept is to merge several streams
     * so output of each of them is available for next input of each other one.
     *
     * For a single stream it's a standard operation, performed with `scan` operator.
     * For multiple streams I don't know standard solutions.
     *
     * Specifically in Kefir there is a `pool` operator
     * @link https://rpominov.github.io/kefir/#pool
     * and technically it's possible to plug pool to itself,
     * creating a loop we need here.
     * It works, but it causes small but important problem
     * with Kefir's activation/deactivation system:
     * such looped pool somehow remains active even when there are no listeners on it,
     * so it won't emit output, but reducers on input streams still will be executed,
     * which can be very undesired.
     *
     * So, to achieve our goal,
     * we'll create our merged state stream, take it's output, and push it to itself.
     * As state is a passive stream, sampled by input fields, it won't fall into infinite loop.
     *
     * It's not a "pure" solution on observables, but it perfectly does what we need.
     */
    const {
      stream: currentState$,
      handler: setCurrentState,
    } = Subject($ => $.merge(initialState$).toProperty())

    const fields$ = Kefir.merge(this._createStreams(currentState$, fields))
    const state$ = initialState$.merge(fields$.map(tap(setCurrentState)))

    const { init } = options
    const initialized$ = !init ? state$ : init(state$)
    if (init && !F.isStream(initialized$)) {
      throw new Error("[kefir-store] Option 'init' must return a stream")
    }
    return initialized$.toProperty()
  }
}

// ---

Stream.of = function(...args) {
  return new this(...args)
}

// ---

export const Class = Stream

/**
 * @callback KefirStore_Stream
 * @return {Observable}
 */

/**
 * @type KefirStore_Stream
 */
const of = Stream.of.bind(Stream)

export default of
