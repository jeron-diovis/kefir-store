export default {
  getEmptyObject: () => ({}),
  defaultGetter: prop => state => state[prop],
  defaultSetter: prop => (state, value) => Object.assign({}, state, { [prop]: value }),
  getValuesList: obj => Object.keys(obj).map(key => obj[key]),

  isNotValidationError: x => x == null,
}
