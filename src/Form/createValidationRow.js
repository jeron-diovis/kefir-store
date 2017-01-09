import Kefir from "kefir"
import * as F from "../lib/func_utils"

const errorReducer = (state, [ error, setter ]) => setter(state, error)
const reducer = (state, list) => list.reduce(errorReducer, state)

/**
 * @param validate$ Observable
 * @param config [ [Observable, function], ... ]
 * @returns {[Observable, function]}
 */
export default (validate$, config) => {
  const [ streams = [], reducers = [] ] = F.zip(...config)

  const input =
    streams.length > 0
      ? Kefir.zip(streams, (...args) => F.zip(args, reducers))
      // even if form has not fields at all,
      // it still should emit it's current state in response on validation
      : validate$.map(F.constant([]))

  return [ input, reducer ]
}
