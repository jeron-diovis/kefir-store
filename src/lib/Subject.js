import * as F from "./func_utils"
import * as S from "./stream_utils"
import Bus from "kefir-bus"

const Subject = (init = F.id) => {
  const bus = Bus()
  return {
    stream: init(bus.changes()), // use .changes to create new observable, without emit/plug/etc methods
    handler: bus.emit,
  }
}

Subject.is = obj => (
  F.isPlainObject(obj)
  && F.isStream(obj.stream)
  && typeof obj.handler === "function"
)

export default Subject
