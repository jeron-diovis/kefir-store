import Kefir from "kefir"

export const withLatestFrom = (a, b, combinator) => Kefir.combine([ a ], [].concat(b), combinator)
