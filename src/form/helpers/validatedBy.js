import { curry } from "../../lib/func_utils"
import toStream from "./toStream"
import { getConfig } from "../../config"

export default curry((form, event$) => {
  const prop = getConfig().defaultGetter
  const form$ = toStream(form)
  const isValid$ = form$.map(prop("isValid"))
  const validator$ = form$.map(prop("handlers")).map(prop("validate"))
  const validatorCall$ = validator$.sampledBy(event$, fn => fn())
  const validatedState$ = isValid$.sampledBy(validatorCall$)
  const validEvent$ = event$.changes().filterBy(validatedState$)
  return form$.sampledBy(validEvent$).map(prop("state"))
})
