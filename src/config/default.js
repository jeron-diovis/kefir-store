export default {
  getEmptyObject: () => ({}),
  getValuesList: obj => Object.keys(obj).map(key => obj[key]),

  getter: prop => state => state[prop],
  reducer: prop => (state, value) => Object.assign({}, state, { [prop]: value }),

  isNotValidationError: x => x == null,
}
