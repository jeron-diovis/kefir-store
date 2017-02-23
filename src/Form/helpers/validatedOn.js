import * as F from "../../lib/func_utils"
import { ap } from "../../lib/stream_utils"
import toStream from "./toStream"

const getIsValid = F.flow(F.prop("status"), F.prop("isValid"))
const getValidator = F.flow(F.prop("handlers"), F.prop("validate"))
const getState = F.prop("state")

export default F.curry((form, event$) => {
  const form$ = toStream(form)
  const result$ = (
    event$
      .flatMapLatest(() => form$.changes().take(1))
      .zip(ap(form$.map(getValidator), event$), F.id)
  )
  return result$.filter(getIsValid).map(getState).toProperty()
})
