import Kefir from "kefir"

export const isStream = x => x instanceof Kefir.Observable

export const withLatestFrom = (a, b, combinator) => Kefir.combine([ a ], [].concat(b), combinator)

export const withSampler = (a, b, combinator) => Kefir.merge([ a, a.sampledBy(b, combinator) ])

export const async = $ => $.flatMap(x => (
  (x && x.then) ? Kefir.fromPromise(x) : Kefir.constant(x))
)

export const withInitialState = (stream$, initialState) => (
  !isStream(initialState)
    ? stream$.toProperty(() => initialState)
    : stream$.merge(initialState.take(1)).toProperty()
)

const transformStreamWith = ($, fn) => fn($)
export const withTransform = (stream$, transform$) => (
  withLatestFrom(
    Kefir.constant(stream$),
    transform$,
    transformStreamWith
  ).flatMap()
)
