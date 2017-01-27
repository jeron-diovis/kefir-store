import Kefir from "kefir"
import * as F from "./func_utils"

export const withLatestFrom = (a, b, combinator) => Kefir.combine([ a ], [].concat(b), combinator)

export const of = Kefir.constant

// Observable.<F> -> Observable.<x> -> Observable.<F(x)>
export const ap = F.curry((fn$, x$) => withLatestFrom(x$, fn$, (x, fn) => fn(x)))

export const async = $ => $.flatMap(x => (
  (x && x.then) ? Kefir.fromPromise(x) : of(x)
))

// Observable.<F> -> Observable.<x> -> Observable.<F(Observable.<x>)>
export const withTransform = F.curry((fn$, x$) => ap(fn$, of(x$)).flatMapLatest())

export const toReducer = x => F.isFunction(x) ? of(F.map(F.spread(x))) : x
