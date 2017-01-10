import ModelParser from "../Model/Parser"

import * as F from "../lib/func_utils"
import * as S from "../lib/stream_utils"
import CONFIG from "../config"

// ---

// Observable<validator_func> -> Observable<value> -> Observable<validation_result>
const toErrorStream = F.flow(
  S.withTransform,
  F.compose.bind(null,
    // If validator throws an exception and it was not handled,
    // pass it's text directly to form
    $ => $.mapErrors(String).flatMapErrors(S.of),
    S.async
  )
)

const createValidatorOptionsFromProp = prop => ({
  get: CONFIG.defaultGetter(prop),
  set: CONFIG.defaultSetter(prop),
  key: prop,
})

function ensureHandlersValid(handlers) {
  if ("validate" in handlers) {
    throw new Error("[kefir-store :: form] Handler name 'validate' is reserved")
  }

  if ("reset" in handlers) {
    throw new Error("[kefir-store :: form] Handler name 'reset' is reserved")
  }

  return handlers
}


/**
 * @param {Array|Function|Observable<Function>} x
 * @param {undefined|{ set: Function, get: Function, key: String }} opts
 * @return {undefined|{ ap: Function, opts: Object }}
 */
function parseValidator(x, opts) {
  if (x === undefined) {
    return {
      ap: F.map(F.constant(undefined)),
      getFromState: F.id,
      setError: F.id,
      setInvalid: F.id,
    }
  }

  let validator = x

  // ---

  if (Array.isArray(validator)) {
    if (opts !== undefined) {
      throw new Error(`[kefir-store :: form] Validation config.
        When reducer is defined as a string, you should only define validation function.
        Options will be created automatically.
        Current: ${JSON.stringify(opts)}
      `)
    }

    [ validator, opts ] = validator

    if (F.isString(opts)) {
      opts = createValidatorOptionsFromProp(opts)
    }
  }

  // ---

  if (F.isFunction(validator)) {
    validator = S.of(F.map(F.spread(validator)))
  }

  if (!F.isStream(validator)) {
    throw new Error(`[kefir-store :: form] Validation config.
      Validator must be a function or an Observable.
      Current: ${JSON.stringify(validator)}
    `)
  }

  // ---

  if (!(
    F.isPlainObject(opts)
    && F.isFunction(opts.get)
    && F.isFunction(opts.set)
    && F.isString(opts.key)
  )) {
    throw new Error(`[kefir-store :: form] Incomplete validation config.
      Unless reducer defined as a string, you should define validator with opts:
      [ validatorFn, {
        get: state -> value,
        set: state -> patch -> newState,
        key: String,
      } ]
      Current: ${JSON.stringify(opts)}
    `)
  }

  // ---

  return {
    ap: toErrorStream(validator),
    getFromState: opts.get,
    setInvalid: opts.set,
    setError: CONFIG.defaultSetter(opts.key),
  }
}

// ---

// just for better readability in further code
const fieldToDict = (
  ([ input$, reducer$, validator ]) => ({
    input$, reducer$, validator
  })
)

// ---

export default class FormParser extends ModelParser {

  parse(...args) {
    const { fields, handlers, } = super.parse(...args)
    return {
      fields: fields.map(fieldToDict),
      handlers: ensureHandlersValid(handlers),
    }
  }

  parseField([ input, reducer, validator ]) {
    return [
      ...super.parseField([ input, reducer ]),
      parseValidator(
        validator,
        F.isString(reducer)
          ? createValidatorOptionsFromProp(reducer)
          : undefined
      )
    ]
  }
}
