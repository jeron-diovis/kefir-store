import { isStream } from "../../lib/stream_utils"
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

  if (!(typeof validator === "function" || isStream(validator))) {
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
