import Kefir from "kefir"
import * as F from "../lib/func_utils"

const errorReducer = (state, [ error, setter ]) => setter(state, error)
const reducer = (state, list) => list.reduce(errorReducer, state)

const initErrorStream = $ => (
  $.toProperty(F.constant(undefined))
  // Must activate manually, so it's ready to react to values from validate$ stream.
  // Otherwise it gets first subscriber only AFTER signal from validate$
  // – which means, that signal is actually ignored.
  .onAny(() => {})
)

/**
 * @param validate$ Observable
 * @param config [ [Observable, function], ... ]
 * @returns {[Observable, function]}
 */
export default (validate$, config) => {
  const [ _streams = [], reducers = [] ] = F.zip(...config)
  const streams = _streams.map(initErrorStream)

  const input =
    streams.length > 0
      ? validate$.flatMapLatest(() =>
          Kefir.zip(streams, (...args) => F.zip(args, reducers))
          .take(1)
        )
      // even if form has not fields at all,
      // it still should emit it's current state in response on validation
      : validate$.map(F.constant([]))

  return [ input, reducer ]
}
