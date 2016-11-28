import Kefir from "kefir"
import { isStream } from "../../lib/func_utils"

export default form => {
  if (isStream(form)) {
    return form
  }

  const { stream, handlers } = form
  return stream.combine(Kefir.constant({ handlers }), Object.assign).toProperty()
}
