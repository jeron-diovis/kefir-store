import * as F from "../../../lib/func_utils"
import CONFIG from "../../../config"

const getValueProp = F.prop("value")
const getErrorProp = F.prop("error")

const isValidInput = x => CONFIG.isNotValidationError(getErrorProp(x))
isValidInput.not = x => !isValidInput(x)

/**
 * @param valid Bool
 * @param $ Observable<{value, error}>
 */
export default (valid, $) => $.filter(valid ? isValidInput : isValidInput.not).map(getValueProp)
