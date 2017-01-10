// TODO: remove this file
import * as S from "../../../lib/stream_utils"
export default (input$, state$, validator) => validator.ap(S.withLatestFrom(input$, state$))
