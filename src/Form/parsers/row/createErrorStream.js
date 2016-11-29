import Kefir from "kefir"
import { isStream } from "../../../lib/func_utils"
import * as S from "../../../lib/stream_utils"

export default (input$, state$, validator) => (
  S.async(
    !isStream(validator)
      ? S.withLatestFrom(input$, state$, validator)
      : S.withTransform(validator, S.withLatestFrom(input$, state$))
  )
  // If validator has thrown and it was not handled, pass exception text directly to form
  .mapErrors(String).flatMapErrors(Kefir.constant)
)