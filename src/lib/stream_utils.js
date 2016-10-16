import Kefir from "kefir"

export const withLatestFrom = (a, b, combinator) => Kefir.combine([ a ], [].concat(b), combinator)
export const async = $ => $.flatMap(x => (
  (x && x.then) ? Kefir.fromPromise(x) : Kefir.constant(x))
)
