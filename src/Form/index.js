import Kefir from "kefir"

import Parser from "./Parser"
import Stream from "../Stream"

import Subject from "../lib/Subject"

import * as F from "../lib/func_utils"
import * as S from "../lib/stream_utils"
import * as helpers from "./helpers"

import CONFIG from "../config"

import createFields from "./createFields"
import createFullValidationField from "./createFullValidationField"

// ---

const initStatusStream = (input$, form$) => (
  // activate manually, so in this stream values
  // are guaranteed to appear before form$
  input$
    .changes().onAny(() => {})
    .bufferBy(form$).map(F.isNotEmptyList)
    .toProperty(F.constant(false))
)

const id2 = (_, x) => x

// ---

export default function Form(
  config = [],
  initialState = CONFIG.getEmptyObject()
) {
  const $validate = Subject()
  const $reset = Subject()

  const pool$ = Kefir.pool()
  const state$ = S.withInitialState(pool$, initialState)

  // ---

  const cfg = Parser.parse(config)
  const fields = createFields(state$, cfg.fields)

  // ---

  pool$.plug(Stream(
    [ ...fields.state,

      [
        $reset.stream.flatMap(F.constant(S.ensure(initialState))),
        id2
      ]
    ],

    initialState
  ))

  // ---

  // Note that errors aren't mapped from state, it's a completely separate stream.
  // Because incoming values are validated, not entire state.
  const errors$ = Stream(
    [ ...fields.errors,

      createFullValidationField(
        state$.sampledBy($validate.stream),
        F.pluck(2, cfg.fields)
      ),

      [ $reset.stream, CONFIG.getEmptyObject ],
    ],

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

    handlers: {
      ...cfg.handlers,
      reset: $reset.handler,
      validate: $validate.handler,
    },
  }
}

// ---

Form.toStream = helpers.toStream
Form.asStream = F.flow(Form, Form.toStream)

Form.validatedOn = helpers.validatedOn
Form.combine = helpers.combine
