import Kefir from "kefir"
import * as F from "./func_utils"

export const withLatestFrom = (a, b, combinator) => Kefir.combine([ a ], [].concat(b), combinator)

export const of = Kefir.constant

export const ap = F.curry((fn$, x$) => withLatestFrom(x$, fn$, (x, fn) => fn(x)))
