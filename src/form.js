import Kefir from "kefir"
import Stream from "./stream"
import Model, * as InputAPI from "./model"
import Subject from "./lib/Subject"
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

const createErrorStream = (input$, state$, validator) => (
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

const parseConfigRow = (state$, validate$) => ([ input, reducer, _validator ]) => {
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


const createValidationRow = (validate$, config) => {
  const [ streams, reducers ] = F.zip(...config)
  const reducer = (state, [ error, setter ]) => setter(state, error)
  const input = validate$.flatMapLatest(() => Kefir.zip(streams, (...args) => F.zip(args, reducers)))
  return [ input, (state, list) => list.reduce(reducer, state) ]
}

// ---

// TODO: Form does not support initial value as stream. Create a reusable helper for this

// TODO: "validating" prop to indicate that async validation process is active
// TODO: or map of validating states for each row?

// TODO: allow to reset form: set initial state and empty errors
// TODO: reserve "reset" handler name

// TODO: add option "validateInitial: Bool" ?

// TODO: helper for combining multiple forms

// TODO: helper for creating stream, validated in response on external event

function _Form(
  config = [],
  initialState = getConfig().getEmptyObject()
) {
  const CONFIG = getConfig()

  const pool$ = Kefir.pool()
  const state$ = pool$.toProperty(F.constant(initialState))

  const $validate = Subject()

  const [
    stateConfig = [],
    errorsConfig = [],
    validatedConfig = []
  ] = F.zip(...config.filter(F.isNotEmptyList).map(parseConfigRow(state$, $validate.stream)))

  const stateModel = Model(F.flatten(stateConfig), initialState)
  pool$.plug(stateModel.state$)

  // ---

  if ("validate" in stateModel.handlers) {
    throw new Error("[kefir-store :: form] Handler name 'validate' is reserved")
  }
  stateModel.handlers.validate = $validate.handler

  // ---

  // Note that errors aren't mapped from state, it's a completely separate stream.
  // Because incoming values are validated, not entire state.
  const errors$ = Stream(
    errorsConfig.concat([ createValidationRow($validate.stream, validatedConfig) ]),
    CONFIG.getEmptyObject()
  )

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
    validate$: $validate.stream,
  }
}

export default function Form(...args) {
  const form = _Form(...args)
  delete form.validate$
  return form
}

Form.asStream = (...args) => {
  const { state$, validity$, validate$, handlers } = _Form(...args)
  const ret = {}

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
    ([ state, validity ], handlers) => Object.assign(ret, { state, handlers }, validity)
  ).toProperty()
}
