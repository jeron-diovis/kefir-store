import Kefir from "kefir"
import Subject from "../../lib/Subject"
import * as F from "../../lib/func_utils"
import toStream from "./toStream"

const pluck = F.curry((key, $) => $.map(F.prop(key)))
const isUndefined = x => x === undefined
const isTrue = x => x === true

const FORM_FIELDS = [ "state", "errors", "handlers", "status" ]
const SPECIAL_HANDLERS = [ "validate", "reset" ]
const SPECIAL_STATUSES = [ "isValidated", "isResetted" ]

const combine = F.curry((keys, values) => {
  const form = FORM_FIELDS.reduce(
    (memo, field) => {
      memo[field] = keys.reduce(
        (memo, form, idx) => {
          memo[form] = values[idx][field]
          return memo
        },
        {}
      )
      return memo
    },
    {}
  )

  const statuses = pluck("status", values)
  const isValid = pluck("isValid", statuses)
  Object.assign(form.status, {
    isValid: isValid.every(isUndefined) ? undefined : isValid.every(isTrue),
    // For now just gather values from all forms.
    // They will be combined differently in different scenarios.
    isValidated: pluck("isValidated", statuses),
    isResetted: pluck("isResetted", statuses),
  })

  return form
})

export default function combineForms(cfg) {
  const [ keys, forms ] = F.zip(...F.entries(cfg))
  const combo$ = Kefir.combine(forms.map(toStream)).toProperty()

  const $flag = Subject($ => $.map(F.constant(false)).toProperty(F.constant(true)))

  const combinedHandlers$ = combo$.take(1).map(pluck("handlers")).map(handlers =>
    SPECIAL_HANDLERS.reduce(
      (memo, key) => {
        memo[key] = F.flow(
          $flag.handler, // whenever special handler is called, set filtration flag to false
          ...pluck(key, handlers)
        )
        return memo
      },
      {}
    )
  )

  const forms$ = combo$.map(combine(keys))
    .combine(
      combinedHandlers$,
      (form, handlers) => {
        Object.assign(form.handlers, handlers)
        return form
      }
    ).toProperty()

  const aggregated$ = (
    $flag.stream.changes().flatMapLatest(() =>
      forms$.changes()
        .bufferWithCount(keys.length)
        .map(x => x.pop())
        .map(x => {
          SPECIAL_STATUSES.forEach(key => {
            // When special handler is called,
            // combine statuses from all forms
            x.status[key] = x.status[key].every(isTrue)
          })
          return x
        })
    )
  )

  /* Normally, combined form emits whenever emits any of it's parts.
   * But when combined form is resetted or validated,
   * we know that all parts will emit, and we're interested in atomic update – one for all of them.
   *
   * So, when combined reset/validate handler is called,
   * we block main stream,
   * wait while each part will emit it's update,
   * take the last one (combination of all of them),
   * and then unlock main stream again */
  return (
    forms$
      .filterBy($flag.stream.merge(
        // when all forms has emitted value, unlock main stream
        aggregated$.map(F.constant(true)))
      )
      .map(x => {
        SPECIAL_STATUSES.forEach(key => {
          // special status can only be true when corresponding special handler is called
          // in main stream it's always false
          x.status[key] = false
        })
        return x
      })
      .merge(aggregated$)
      .toProperty()
  )
}