import Kefir from "kefir"
import * as F from "../lib/func_utils"

const setError = (state, [ setter, error ]) => setter(state, error)

const errorsReducer = (state, list) => list.reduce(setError, state)
const noopReducer = F.id

const applyValidator = F.curry((state$, validator) =>
  validator.ap(state$.map(x => [ validator.getFromState(x), x ])))

export default (state$, validators) => {
  // even if form has no validators at all,
  // it still should emit it's current state
  // in response on `validate` call
  if (validators.length === 0) {
    return [ state$, noopReducer ]
  }

  // A field emitting an atomic update
  // with merged results of all available validators
  return [
    Kefir
      .zip(validators.map(applyValidator(state$)))
      // Array.<Function> -> Array.<*> -> Array.<Array.<Function, *>>
      .map(F.zip.bind(null, F.pluck("setError", validators))),

    errorsReducer,
  ]
}
