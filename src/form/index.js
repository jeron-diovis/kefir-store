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

const initStatusStream = (input$, form$) => (
  // activate manually, so in this stream values
  // are guaranteed to appear before form$
  input$
    .changes().onAny(() => {})
    .bufferBy(form$).map(F.isNotEmptyList)
    .toProperty(F.constant(false))
)

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

  // ---

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
  pool$.plug(stateModel.stream)

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

  const form$ = Kefir.zip(
    [ // Validation does not update state (which is reasonable),
      // but to keep state and errors in sync, need to emulate such update
      S.withSampler(state$, $validate.stream),
      errors$,
    ],
    (state, errors) => ({ state, errors })
  ).toProperty()

  // ---

  const isValidated$ = initStatusStream($validate.stream, form$)
  const isResetted$ = initStatusStream($reset.stream, form$)
  const isValid$ = errors$
    // Until some interaction happens (any field updated or form validated),
    // form is neither valid nor invalid – it's not validated at all, so "isValid" is undefined.
    .changes()
    .map(errors => CONFIG.getValuesList(errors).every(CONFIG.isNotValidationError))
    .toProperty(F.constant(undefined))
    // Reset also returns status to initial undefined state
    .zip(isResetted$, (isValid, isResetted) => isResetted ? undefined : isValid)

  const status$ = Kefir.zip(
    [ isValidated$, isResetted$, isValid$ ],
    (isValidated, isResetted, isValid) => ({ isValidated, isResetted, isValid })
  )

  // ---

  return {
    stream: (
      Kefir.zip(
        [ form$, status$ ],
        (form, status) => Object.assign(form, { status })
      ).toProperty()
    ),
    handlers: stateModel.handlers,
  }
}

// ---

Form.toStream = helpers.toStream
Form.asStream = F.flow(Form, Form.toStream)

Form.validatedOn = helpers.validatedOn
