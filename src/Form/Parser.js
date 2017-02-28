import Kefir from "kefir"
import ModelParser from "../Model/Parser"

import * as F from "../lib/func_utils"
import * as S from "../lib/stream_utils"
import CONFIG from "../config"

// ---

const toReducerStream = x => F.isFunction(x) ? S.of(F.map(F.spread(x))) : x

// Observable.<F> -> Observable.<x> -> Observable.<F(x)>
const toErrorStream = F.flow(
  F.curry((fn$, x$) => S.ap(fn$, S.of(x$)).flatMapLatest()),

  F.compose.bind(null,
    // If validator throws an exception and it was not handled,
    // pass it's text directly to form
    $ => $.mapErrors(String).flatMapErrors(S.of),

    // automatically handle promises,
    // allowing to easily use both sync and async validator function
    $ => $.flatMap(x => (
      (x && x.then) ? Kefir.fromPromise(x) : S.of(x)
    ))
  )
)

// ---

const createValidatorOptionsFromProp = prop => ({
  get: CONFIG.getter(prop),
  set: CONFIG.reducer(prop),
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
 * @return {{ ap: Function, opts: Object }}
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

  validator = toReducerStream(validator)

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
        set: state -> patch -> new_state,
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
    setError: CONFIG.reducer(opts.key),
  }
}

// ---

// only and only for better readability in further code
const fieldToDict = (
  ([ input, reducer, validator ]) => ({
    input, reducer, validator
  })
)

// ---

export default class FormParser extends ModelParser {

  parse(...args) {
    const { fields, handlers } = super.parse(...args)

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
