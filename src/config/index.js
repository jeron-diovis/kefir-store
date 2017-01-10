import defaultConfig from "./default"

const current = { ...defaultConfig }

export const setConfig = cfg => {
  Object.assign(current, cfg)
}

export default [
  "getEmptyObject",
  "isEmptyObject",
  "defaultGetter",
  "defaultSetter",
  "getValuesList",
  "isNotValidationError",
].reduce(
  (memo, key) => {
    memo[key] = (...args) => current[key](...args)
    return memo
  },
  {}
)
