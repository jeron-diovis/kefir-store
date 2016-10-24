import Kefir from "kefir"
import * as S from "../../../lib/stream_utils"

export default (input$, state$, validator) => (
  S.async(
    !S.isStream(validator)
      ? S.withLatestFrom(input$, state$, validator)
      : S.withTransform(S.withLatestFrom(input$, state$), validator)
  )
  // If validator has thrown and it was not handled, pass exception text directly to form
  .mapErrors(String).flatMapErrors(Kefir.constant)
)
