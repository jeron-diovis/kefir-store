import set from "lodash/fp/set"

export default {
  getEmptyObject: () => ({}),
  getValuesList: obj => Object.keys(obj).map(key => obj[key]),

  getter: prop => state => state[prop],
  reducer: prop => (state, value) => set(prop, value, state),

  isNotValidationError: x => x == null,
}
