import Kefir from "kefir"
import Stream from "./stream"
import Model, * as InputAPI from "./model"
import * as F from "./lib/func_utils"
import * as S from "./lib/stream_utils"
import { getConfig } from "./config"

const createValidatorOptionsFromProp = prop => ({
  get: getConfig().defaultGetter(prop),
  set: getConfig().defaultSetter(prop),
  key: prop,
})

const transformWith = ($, fn) => fn($)

// ---

const parseValidator = (reducer, validator) => {
  if (validator === undefined) {
    return []
  }

  let opts

  if (typeof reducer === "string") {
    opts = createValidatorOptionsFromProp(reducer)
  }

  if (Array.isArray(validator)) {
    if (opts !== undefined) {
      throw new Error(`[kefir-store :: form] Validation config.
        When reducer is defined as a string, you should only define validation function.
        Options will be created automatically.
        Current: ${JSON.stringify(opts)}
      `)
    }

    [ validator, opts ] = validator

    if (typeof opts === "string") {
      opts = createValidatorOptionsFromProp(opts)
    }
  }

  if (!(typeof validator === "function" || F.isStream(validator))) {
    throw new Error(`[kefir-store :: form] Validation config.
      Validator must be a function or an Observable.
      Current: ${JSON.stringify(validator)}
    `)
  }

  if (!(
    opts != null
    && typeof opts.get === "function"
    && typeof opts.set === "function"
    && typeof opts.key === "string"
  )) {
    throw new Error(`[kefir-store :: form] Incomplete validation config.
      Unless reducer defined as a string, you should define validator with options:
      [ validatorFn, {
        get: function(state) -> value },
        set: function(state, patch) -> newState,
        key: String,
      } ]
      Current: ${JSON.stringify(opts)}
    `)
  }

  return [ validator, opts ]
}

// ---

const getValueProp = F.prop("value")
const getErrorProp = F.prop("error")

const isValidInput = x => getConfig().isNotValidationError(getErrorProp(x))
isValidInput.not = x => !isValidInput(x)
const validatedValue = (valid, $) => $.filter(valid ? isValidInput : isValidInput.not).map(getValueProp)

const parseConfigRow = state$ => ([ input, reducer, _validator ]) => {
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
      .map(input$ => {
        const error$ = (
          S.async(
            !F.isStream(validator)
              ? S.withLatestFrom(input$, state$, validator)
              : S.withLatestFrom(
                  Kefir.constant(S.withLatestFrom(input$, state$)),
                  validator,
                  transformWith
                ).flatMap()
          )
          // If validator has thrown and it was not handled, pass exception text directly to form
          .mapErrors(String).flatMapErrors(Kefir.constant)
        )

        return Kefir.zip([ input$, error$ ], (value, error) => ({ value, error })).toProperty()
      })
      .flatMapLatest().toProperty()
  )

  return [
    [
      [ InputAPI.replaceStreamInParsedInput(parsedInput, validatedValue(true, validatedInput$)), reducer ],
      // If value is invalid, reducer for it should not be executed (cause it can lead to errors),
      // but in general value still should be somehow saved in state
      // (important for React's controlled inputs, for example)
      [ validatedValue(false, validatedInput$), validatorOptions.set ],
    ],
    [ validatedInput$.map(getErrorProp).skipDuplicates(F.equals), getConfig().defaultSetter(validatorOptions.key) ],
  ]
}

// ---

// TODO: "validating" prop to indicate that async validation process is active
// TODO: or map of validating states for each row?

// TODO: accept external validation-trigger stream, or create own one by default
// TODO: reserve "validate" handler name

// TODO: allow to reset form: set initial state and empty errors
// TODO: reserve "reset" handler name

// TODO: add option "validateInitial: Bool" ?

export default function Form(
  config = [],
  initialState = getConfig().getEmptyObject()
) {
  const CONFIG = getConfig()

  const pool$ = Kefir.pool()
  const state$ = pool$.toProperty(F.constant(initialState))

  const [ stateConfig, errorsConfig ] = F.zip(...config.filter(F.isNotEmptyList).map(parseConfigRow(state$)))

  const stateModel = Model(F.flatten(stateConfig), initialState)
  pool$.plug(stateModel.state$)

  // Note that errors aren't mapped from state, it's a completely separate stream.
  // Because incoming values are validated, not entire state.
  const errors$ = Stream(errorsConfig, CONFIG.getEmptyObject())

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
  }
}

Form.asStream = (...args) => {
  const { state$, validity$, handlers } = Form(...args)

  // As developer has no access to error streams and can't modify them in some crazy way,
  // we can be sure that for each incoming value error will be updated synchronously.
  // It will be either emitted or not, but never will arrive with timeout or smth like this.
  // So, we can safely .zip these two streams and get reliable atomic updates of entire form.
  return Kefir.zip([
    state$,
    validity$,
  ]).combine(
    Kefir.constant(handlers),
    ([ state, validity ], handlers) => Object.assign({ state, handlers }, validity)
  ).toProperty()
}
