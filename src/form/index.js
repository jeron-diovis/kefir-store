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

// TODO: add option "validateInitial: Bool" ?

// TODO: helper for combining multiple forms

// TODO: helper for creating stream, validated in response on external event

function _Form(
  config = [],
  initialState = getConfig().getEmptyObject()
) {
  const CONFIG = getConfig()

  const pool$ = Kefir.pool()
  const state$ = pool$.toProperty()

  const $validate = Subject()
  const $reset = Subject()

  const [
    stateConfig = [],
    errorsConfig = [],
    validatedConfig = []
  ] = F.zip(...config.filter(F.isNotEmptyList).map(parseRow(state$, $validate.stream)))

  const stateModel = Model(
    F.flatten(stateConfig).concat([
      [
        S.withInitialState(Kefir.never(), initialState).sampledBy($reset.stream),
        (currentState, initialState) => initialState,
      ]
    ]),
    initialState
  )
  pool$.plug(stateModel.state$)

  // ---

  // reserved handlers
  if ("validate" in stateModel.handlers) {
    throw new Error("[kefir-store :: form] Handler name 'validate' is reserved")
  }
  if ("reset" in stateModel.handlers) {
    throw new Error("[kefir-store :: form] Handler name 'reset' is reserved")
  }
  stateModel.handlers.validate = $validate.handler
  stateModel.handlers.reset = $reset.handler

  // ---

  // Note that errors aren't mapped from state, it's a completely separate stream.
  // Because incoming values are validated, not entire state.
  const errors$ = Stream(
    errorsConfig.concat([
      createValidationRow($validate.stream, validatedConfig),
      [ $reset.stream, () => CONFIG.getEmptyObject() ]
    ]),
    CONFIG.getEmptyObject()
  )

  const isValidated$ = $validate.stream
    // activate manually, so in this stream values appears BEFORE errors$ stream, sampled by validate$.
    .changes().onValue(() => {})
    // Whenever errors$ updated, check whether there is a preceding validation event.
    // If it is, it means that entire form was validated.
    .bufferBy(errors$).map(F.isNotEmptyList)
    .toProperty(F.constant(false))

  // "isValid" initially should be undefined.
  // Until some input arrives, form is neither valid nor invalid – it's not validated at all.
  const validity$ = errors$.map(errors => ({
    errors,
    isValid: CONFIG.isEmptyObject(errors) ? undefined : CONFIG.getValuesList(errors).every(CONFIG.isNotValidationError),
  }))

  return {
    handlers: stateModel.handlers,
    state$,
    validity$: S.withLatestFrom(validity$, isValidated$, CONFIG.defaultSetter("isValidated")).toProperty(),
    validate$: $validate.stream.changes(),
  }
}

export default function Form(...args) {
  const form = _Form(...args)
  delete form.validate$
  return form
}

Form.asStream = (...args) => {
  const { state$, validity$, validate$, handlers } = _Form(...args)

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
