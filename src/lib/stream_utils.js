import Kefir from "kefir"
import * as F from "./func_utils"

export const withSampler = (a, b, combinator) => Kefir.merge([ a, a.sampledBy(b, combinator) ])

export const withLatestFrom = (a, b, combinator) => Kefir.combine([ a ], [].concat(b), combinator)

export const of = Kefir.constant
export const ap = F.curry((fn$, x$) => withLatestFrom(x$, fn$, (x, fn) => fn(x)))

export const ensure = x => F.isStream(x) ? x : of(x)

export const async = $ => $.flatMap(x => (
  (x && x.then) ? Kefir.fromPromise(x) : of(x)
))

export const withInitialState = (stream$, initialState) => (
  !isStream(initialState)
    ? stream$.toProperty(() => initialState)
    : stream$.merge(initialState.take(1).toProperty())
)

export const withTransform = F.curry((fn$, x$) => ap(fn$, of(x$)).flatMapLatest())

export const toReducer = F.branch(F.isFunction, F.compose(of, F.map, F.spread), F.id)