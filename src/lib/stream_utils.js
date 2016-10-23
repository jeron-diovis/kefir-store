import Kefir from "kefir"

export const withLatestFrom = (a, b, combinator) => Kefir.combine([ a ], [].concat(b), combinator)

export const withSampler = (a, b, combinator) => Kefir.merge([ a, a.sampledBy(b, combinator) ])

export const async = $ => $.flatMap(x => (
  (x && x.then) ? Kefir.fromPromise(x) : Kefir.constant(x))
)
