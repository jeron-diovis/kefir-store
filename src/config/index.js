import defaultConfig from "./default"
let config = defaultConfig

export const getConfig = () => config
export const setConfig = cfg => {
  config = Object.assign({}, defaultConfig, cfg)
}
