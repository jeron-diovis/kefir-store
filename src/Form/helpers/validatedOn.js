import * as F from "../../lib/func_utils"
import { ap } from "../../lib/stream_utils"
import toStream from "./toStream"

const getIsValid = F.flow(F.prop("status"), F.prop("isValid"))
const getIsValidated = F.flow(F.prop("status"), F.prop("isValidated"))
const getValidator = F.flow(F.prop("handlers"), F.prop("validate"))
const getState = F.prop("state")


export const validatedOn = F.curry((form, event$) => {
  const form$ = toStream(form)
  const isValidated$ = form$.changes().filter(getIsValidated)
  return (
    event$
      .flatMapLatest(() => isValidated$.take(1))
      .zip(ap(form$.map(getValidator), event$), F.id)
  )
})


export const validOn = F.curry((form, event$) => {
  return validatedOn(form, event$).filter(getIsValid).map(getState).toProperty()
})
