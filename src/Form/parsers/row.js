import * as F from "../../lib/func_utils"
import * as S from "../../lib/stream_utils"
import CONFIG from "../../config"

const getValueProp = F.prop("value")
const getErrorProp = F.prop("error")

const toIndexedStream = $ => (
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

// Observable<{ value, error? }> -> [ Observable<value>, Observable<value> ]
const splitByValidity = F.flow(
  S.partition(F.flow(getErrorProp, CONFIG.isNotValidationError)),
  F.map(F.map(getValueProp))
)

// ---

export default (state$, validatedState$) => ([ input$, reducer, validator ]) => {
  if (validator === undefined) {
    return [
      // just a regular model field:
      [ [ input$, reducer ] ],
      // Non-validated field should react in the same way as validated one:
      // emit errors when input changed and when entire form is validated.
      // It should change effectively nothing, but value should be emitted.
      [ input$, F.id ],
      [ validatedState$, F.id ],
    ]
  }

  // Each input value is validated.
  // Each value should be emitted synchronously with validation result for it.
  // But validator can be async.
  // And if new value arrives before validation for previous one is completed,
  // then we are no more interested in both prev value and it's validation result.
  const validatedInput$ = (
    S.withLatestFrom(
      toIndexedStream(validator.ap(S.withLatestFrom(input$, state$))),
      toIndexedStream(input$)
    )
    .filter(([ error, input ]) => error.idx === input.idx)
    .map(([ error, input ]) => ({ error: error.value, value: input.value }))
    .toProperty()
  )

  return [
    // state updates
    // If input value is invalid, reducer for it should not be executed (cause it can lead to errors),
    // but still should be a possibility to save in state new value itself.
    // It can be important for controlled inputs in React, for example.
    F.zip(
      splitByValidity(validatedInput$),
      [ reducer, validator.opts.set ]
    ),

    // validation of particular input when it changes:
    [
      validatedInput$.map(getErrorProp),
      CONFIG.defaultSetter(validator.opts.key),
    ],

    // validation of particular input when entire current state validated:
    [
      validator.ap(S.withLatestFrom(
        validatedState$.map(validator.opts.get),
        state$
      )),
      CONFIG.defaultSetter(validator.opts.key),
    ],
  ]
}
