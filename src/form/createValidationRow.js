import Kefir from "kefir"
import * as F from "../lib/func_utils"

const errorsReducer = (state, [ error, setter ]) => setter(state, error)
const validationReducer = (state, list) => list.reduce(errorsReducer, state)

/**
 * @param validate$ Observable
 * @param config [ [Observable, function], ... ]
 * @returns {[Observable, function]}
 */
export default (validate$, config) => {
  const [ streams, reducers ] = F.zip(...config)
  const input = validate$.flatMapLatest(() => Kefir.zip(streams, (...args) => F.zip(args, reducers)))
  return [ input, validationReducer ]
}
