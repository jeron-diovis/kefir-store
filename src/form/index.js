import Kefir from "kefir"
import Stream from "../stream"
import Model from "../model"
import Subject from "../lib/Subject"
import * as F from "../lib/func_utils"
import * as S from "../lib/stream_utils"
import * as helpers from "./helpers"
import { getConfig } from "../config"

import parseRow from "./parsers/row"
import createValidationRow from "./createValidationRow"

// ---

// TODO: "validating" prop to indicate that async validation process is active
// TODO: or map of validating states for each row?

// TODO: add option "validateInitial: Bool" ?

// TODO: helper for combining multiple forms

export default function Form(
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

// ---

Form.toStream = helpers.toStream
Form.validatedBy = helpers.validatedBy

Form.asStream = F.flow(Form, Form.toStream)
