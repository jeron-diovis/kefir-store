import Kefir from "kefir"
import * as F from "./func_utils"

export const withLatestFrom = (a, b, combinator) => Kefir.combine([ a ], [].concat(b), combinator)

export const of = Kefir.constant

export const ap = F.curry((fn$, x$) => withLatestFrom(x$, fn$, (x, fn) => fn(x)))

export const initInputStream = (input, state$) => {
  let stream, init = F.id

  if (F.isStream(input)) {
    stream = input
  } else {
    ({ stream, init } = input)
  }

  // State stream MUST be passive,
  // to make sure that if you somehow combine input with state,
  // you'll never fall into infinite loop, when updated state triggers new updates.
  const passiveState$ = state$.sampledBy(stream)

  const modifiedInput$ = init(stream, passiveState$)

  // allow for initializer to don't return value
  // (if it's used to add some side-effects)
  return (modifiedInput$ || stream)
    // Always omit any current value.
    // Because input represents *stream of changes*, not state.
    .changes()
}
