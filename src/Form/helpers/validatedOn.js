import { prop, flow, curry } from "../../lib/func_utils"
import { ap } from "../../lib/stream_utils"
import toStream from "./toStream"

const getIsValid = flow(prop("status"), prop("isValid"))
const getValidator = flow(prop("handlers"), prop("validate"))
const getState = prop("state")

export default curry((form, event$) => {
  const form$ = toStream(form)
  const validatorCall$ = ap(form$.map(getValidator), event$)
  const validatedState$ = form$.map(getIsValid).sampledBy(validatorCall$)
  const validEvent$ = event$.changes().filterBy(validatedState$)
  return form$.sampledBy(validEvent$).map(getState)
})
