import * as F from "../../lib/func_utils"
import { getConfig } from "../../config"

const createValidatorOptionsFromProp = prop => ({
  get: getConfig().defaultGetter(prop),
  set: getConfig().defaultSetter(prop),
  key: prop,
})

export default function parseValidator(reducer, validator) {
  if (validator === undefined) {
    return []
  }

  let opts

  if (F.isString(reducer)) {
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

    if (F.isString(opts)) {
      opts = createValidatorOptionsFromProp(opts)
    }
  }

  if (!(F.isFunction(validator) || F.isStream(validator))) {
    throw new Error(`[kefir-store :: form] Validation config.
      Validator must be a function or an Observable.
      Current: ${JSON.stringify(validator)}
    `)
  }

  if (!(
    opts != null
    && F.isFunction(opts.get)
    && F.isFunction(opts.set)
    && F.isString(opts.key)
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
