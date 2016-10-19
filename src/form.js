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

  const error$ = (
    S.async(S.withLatestFrom(input$, state$, validator))
      // If validator has thrown and it was not handled,
      // pass exception text directly to form
      .mapErrors(String).flatMapErrors(Kefir.constant)
  )

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

// TODO: Allow validator as a stream?

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
  }))

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
  //
  // It means, we can buffer validity by state: whenever state changes, validity is either changed or not.
  // Need to add .delay() to state – just a technical requirement, to allow Kefir to process both streams "in parallel".
  // (otherwise first will be processed everything related to state$ – including flushing buffered stream –
  // and only then will be processed errors$ stream)
  //
  // And so, we can safely .zip these two streams and get reliable atomic updates of entire form.
  return Kefir.zip([
    state$,
    validity$.bufferBy(state$.delay()).map(list => list.pop()),
  ]).combine(
    Kefir.constant(handlers),
    ([ state, validity ], handlers) => Object.assign({ state, handlers }, validity)
  )
}