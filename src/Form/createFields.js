import * as F from "../lib/func_utils"
import * as S from "../lib/stream_utils"
import CONFIG from "../config"

const getValueProp = F.prop("value")
const getErrorProp = F.prop("error")

const indexed = $ => (
  $.scan(
    (state, value) => {
      // only for internal usage, so mutable state is ok
      state.value = value
      ++state.idx
      return state
    },
    { idx: 0 }
  )
  .changes()
)

// Observable.<{ value, error? }> -> [ Observable.<value>, Observable.<value> ]
const splitByValidity = F.flow(
  F.partition(F.flow(getErrorProp, CONFIG.isNotValidationError)),
  F.map(F.map(getValueProp))
)

// TODO: this probably should be done directly in validator parser
const toReducer = F.branch(F.isFunction, F.compose(S.of, F.map, F.spread))

// ---

export const createFields = F.curry((state$, [ input$, reducer$, validator ]) => {
  // Each input value is validated.
  // Each value should be emitted synchronously with validation result for it.
  // But validator can be async.
  // And if new value arrives before validation for previous one is completed,
  // then we are no more interested in neither prev value nor it's validation result.
  const validated$ = (
    S.withLatestFrom(
      indexed(validator.ap(S.withLatestFrom(input$, state$))),
      indexed(input$)
    )
    .filter(([ error, input ]) => error.idx === input.idx)
    .map(([ error, input ]) => ({ error: error.value, value: input.value }))
    .toProperty()
  )

  return [
    // If input value is invalid, reducer for it should not be executed
    // (cause it can lead to errors),
    // but there still should be a possibility to somehow save a new value in state.
    // It can be important for controlled inputs in React, for example.
    F.zip(
      splitByValidity(validated$),
      [ reducer$, toReducer(validator.setInvalid) ]
    ),

    // validation of particular input when it changes:
    [
      validated$.map(getErrorProp),
      toReducer(validator.setError),
    ],
  ]
})

/**
 * TODO: remove this
 * @param {Observable} state$
 * @param {Array} config
 * @return {{state, errors}}
 */
export default (state$, config) => {
  const [
    stateFieldPairs = [],
    errorFields = [],
  ] = F.zip(...config.map(createFields(state$)))

  return {
    state: F.flatten(stateFieldPairs),
    errors: errorFields,
  }
}
