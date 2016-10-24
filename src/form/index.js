import Kefir from "kefir"
import Stream from "../stream"
import Model from "../model"
import Subject from "../lib/Subject"
import * as F from "../lib/func_utils"
import * as S from "../lib/stream_utils"
import { getConfig } from "../config"

import parseRow from "./parsers/row"
import createValidationRow from "./createValidationRow"

// ---

// TODO: "validating" prop to indicate that async validation process is active
// TODO: or map of validating states for each row?

// TODO: "isValidated" prop to indicate whether current update is caused by calling "validate" handler

// TODO: allow to reset form: set initial state and empty errors
// TODO: reserve "reset" handler name

// TODO: add option "validateInitial: Bool" ?

// TODO: helper for combining multiple forms

// TODO: helper for creating stream, validated in response on external event

function _Form(
  config = [],
  initialState = getConfig().getEmptyObject()
) {
  const CONFIG = getConfig()

  const pool$ = Kefir.pool()
  const state$ = S.withInitialState(pool$, initialState)

  const $validate = Subject()

  const [
    stateConfig = [],
    errorsConfig = [],
    validatedConfig = []
  ] = F.zip(...config.filter(F.isNotEmptyList).map(parseRow(state$, $validate.stream)))

  const stateModel = Model(F.flatten(stateConfig), initialState)
  pool$.plug(stateModel.state$)

  // ---

  if ("validate" in stateModel.handlers) {
    throw new Error("[kefir-store :: form] Handler name 'validate' is reserved")
  }
  stateModel.handlers.validate = $validate.handler

  // ---

  // Note that errors aren't mapped from state, it's a completely separate stream.
  // Because incoming values are validated, not entire state.
  const errors$ = Stream(
    errorsConfig.concat([ createValidationRow($validate.stream, validatedConfig) ]),
    CONFIG.getEmptyObject()
  )

  // "isValid" initially should be undefined.
  // Until some input arrives, form is neither valid nor invalid – it's not validated at all.
  const validity$ = errors$.slidingWindow(2).map(([ prev, errors ]) => ({
    errors: errors || prev,
    isValid: !errors ? undefined : CONFIG.getValuesList(errors).every(CONFIG.isNotValidationError),
  })).toProperty()

  return {
    handlers: stateModel.handlers,
    state$,
    validity$,
    validate$: $validate.stream,
  }
}

export default function Form(...args) {
  const form = _Form(...args)
  delete form.validate$
  return form
}

Form.asStream = (...args) => {
  const { state$, validity$, validate$, handlers } = _Form(...args)
  const ret = {}

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
    ([ state, validity ], handlers) => Object.assign(ret, { state, handlers }, validity)
  ).toProperty()
}