import Kefir from "kefir"
import * as F from "../../lib/func_utils"
import { ap } from "../../lib/stream_utils"
import toStream from "./toStream"

const getIsValid = F.flow(F.prop("status"), F.prop("isValid"))
const getValidator = F.flow(F.prop("handlers"), F.prop("validate"))
const getState = F.prop("state")


export const validatedOn = F.curry((form, event$) => {
  return ap(toStream(form).map(getValidator), event$).flatMap(Kefir.fromPromise).spy()
})


export const validOn = F.curry((form, event$) => {
  return validatedOn(form, event$).filter(getIsValid).map(getState).toProperty()
})
