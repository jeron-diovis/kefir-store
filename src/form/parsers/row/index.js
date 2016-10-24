import Kefir from "kefir"
import * as InputAPI from "../../../model"
import * as F from "../../../lib/func_utils"
import { getConfig } from "../../../config"

import parseValidator from "../validator"
import createErrorStream from "./createErrorStream"
import validatedValue from "./createValidatedValueStream"

const getErrorProp = F.prop("error")

// ---

export default (state$, validate$) => ([ input, reducer, _validator ]) => {
  const [ validator, validatorOptions ] = parseValidator(reducer, _validator)

  // nothing to do here, it's just a regular model field
  if (validator === undefined) {
    return [
      [ [ input, reducer ] ],
    ]
  }

  // Intercept input stream and replace it with one filtered by validation results

  const parsedInput = InputAPI.parseInput(input)
  const input$ = InputAPI.getStreamFromParsedInput(parsedInput)

  // Each input value is validated.
  // Each value should be emitted synchronously with validation result for it.
  // But validator can ve async.
  // And if new value arrives before validation for previous one is completed,
  // then we are no more interested in both prev value and it's validation result.
  const validatedInput$ = (
    input$.map(Kefir.constant)
      // TODO: isn't it too much new observables created on each new value?
      // TODO: maybe, require to explicitly mark validators as async,
      // TODO: and create errors stream respectively
      .flatMapLatest(input$ =>
        Kefir.zip(
          [ input$, createErrorStream(input$, state$, validator) ],
          (value, error) => ({ value, error })
        )
      ).toProperty()
  )

  const CONFIG = getConfig()

  return [
    [
      [
        InputAPI.replaceStreamInParsedInput(parsedInput, validatedValue(true, validatedInput$)),
        reducer,
      ],
      // If value is invalid, reducer for it should not be executed (cause it can lead to errors),
      // but new value itself still should be somehow saved in state
      // (important for React's controlled inputs, for example)
      [
        validatedValue(false, validatedInput$),
        validatorOptions.set,
      ],
    ],

    [
      validatedInput$.map(getErrorProp).skipDuplicates(F.equals),
      CONFIG.defaultSetter(validatorOptions.key),
    ],

    [
      createErrorStream(state$.sampledBy(validate$).map(validatorOptions.get), state$, validator).toProperty()
        // Must activate manually, so it's ready to react to values from validate$ stream.
        // Otherwise it gets first subscriber only AFTER signal from validate$ – which means, that signal is actually ignored.
        .onAny(() => {}),
      CONFIG.defaultSetter(validatorOptions.key),
    ],
  ]
}
