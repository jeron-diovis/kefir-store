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

  if (typeof validator !== "function") {
    throw new Error(`[kefir-store :: form] Validation config.
      Validator must be a function.
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
const getIsValidProp = F.prop("isError")
getIsValidProp.negate = x => !getIsValidProp(x)
const validatedValueStream = (valid, $) => $.filter(valid ? getIsValidProp : getIsValidProp.negate).map(getValueProp)

const parseConfigRow = state$ => ([ input, reducer, _validator ]) => {
  const CONFIG = getConfig()
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
  const error$ = S.withLatestFrom(input$, state$, validator)
  const value$ = Kefir.zip(
    [ input$, error$.map(CONFIG.isNotValidationError) ],
    (value, isValid) => ({ value, isValid })
  )

  return [
    [
      [ InputAPI.replaceStreamInParsedInput(parsedInput, validatedValueStream(true, value$)), reducer ],
      // If value is invalid, reducer for it should not be executed (cause it can lead to errors),
      // but in general value still should be somehow saved in state
      // (important for React's controlled inputs, for example)
      [ validatedValueStream(false, value$), validatorOptions.set ],
    ],
    [ error$.skipDuplicates(F.equals), CONFIG.defaultSetter(validatorOptions.key) ],
  ]
}

// ---

// TODO: compact mode for Form
// TODO: accept external validation-trigger stream, or create own one by default
// TODO: reserve "validate" handler name
// TODO: allow to reset form: set initial state and empty errors
// TODO: reserve "reset" handler name
// TODO: add option "validateInitial: Bool"

export default function Form(
  config = [],
  initialState = getConfig().getEmptyObject()
) {
  const CONFIG = getConfig()

  const pool$ = Kefir.pool()
  const state$ = pool$.toProperty(F.constant(initialState))

  const [ stateConfig, errorsConfig ] = F.zip(...config.filter(F.isNotEmptyList).map(parseConfigRow(state$)))

  const stateModel = Model(F.flatten(stateConfig), initialState)
  pool$.plug(stateModel.stream$)

  const errors$ = Stream(errorsConfig, CONFIG.getEmptyObject())

  // "isValid" initially should be undefined.
  // Until some input arrives, form is neither valid nor invalid – it's not validated at all.
  const validity$ = errors$.slidingWindow(2).map(([ prev, errors ]) => ({
    errors: errors || prev,
    isValid: !errors ? undefined : CONFIG.getValuesList(errors).every(CONFIG.isNotValidationError),
  }))

  return {
    handlers: stateModel.handlers,
    state$,
    validity$,
  }
}
