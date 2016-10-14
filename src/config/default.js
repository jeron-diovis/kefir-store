export default {
  getDefaultState: () => ({}),
  defaultSetter: prop => (state, value) => ({ ...state, [prop]: value }),
}
