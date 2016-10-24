import Kefir from "kefir"
import * as F from "../lib/func_utils"

/**
 * @param validate$ Observable
 * @param config [ [Observable, function], ... ]
 * @returns {[Observable, function]}
 */
export default (validate$, config) => {
  const [ streams, reducers ] = F.zip(...config)
  const reducer = (state, [ error, setter ]) => setter(state, error)
  const input = validate$.flatMapLatest(() => Kefir.zip(streams, (...args) => F.zip(args, reducers)))
  return [ input, (state, list) => list.reduce(reducer, state) ]
}
