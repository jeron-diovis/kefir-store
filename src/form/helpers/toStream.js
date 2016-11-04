import * as S from "../../lib/stream_utils"

export default form => {
  if (S.isStream(form)) {
    return form
  }

  const { state$, validity$, validate$, handlers } = form

  // As developer has no access to error streams and can't modify them in some crazy way,
  // we can be sure that for each incoming value error will be updated synchronously.
  // It will be either emitted or not, but never will arrive with timeout or smth like this.
  // So, we can safely .zip these two streams and get reliable atomic updates of entire form.
  return Kefir.zip([
    // state$ isn't updated on validation. It's reasonable when state and validity streams are separated.
    // But here they must emit synchronously, so state must be additionally sampled.
    S.withSampler(state$, validate$),
    validity$,
  ]).combine(
    Kefir.constant(handlers),
    ([ state, validity ], handlers) => Object.assign({}, { state, handlers }, validity)
  ).toProperty()
}