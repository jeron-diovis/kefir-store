import Kefir from "kefir"
import * as S from "../../lib/stream_utils"

export default form => {
  if (S.isStream(form)) {
    return form
  }

  const { stream, handlers } = form
  return stream.combine(Kefir.constant({ handlers }), Object.assign).toProperty()
}
