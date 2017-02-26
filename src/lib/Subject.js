import * as F from "./func_utils"
import Bus from "kefir-bus"

/**
 * @param {function(Observable)} init
 * @return {{stream: Observable, handler: function(*=)}}
 */
const Subject = (init = F.id) => {
  const bus = Bus()

  // use .changes to create new observable, without emit/plug/etc methods
  const stream = bus.changes()

  return {
    stream: init(stream) || stream,
    handler(x) {
      bus.emit(x)
    },
  }
}

Subject.is = obj => (
  F.isPlainObject(obj)
  && F.isStream(obj.stream)
  && typeof obj.handler === "function"
)

export default Subject
