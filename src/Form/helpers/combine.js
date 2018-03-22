/* TODO: clean up this module */

import Kefir from "kefir"
import Subject from "../../lib/Subject"
import * as F from "../../lib/func_utils"
import toStream from "./toStream"
import { is as isForm } from "./symbol"

const isUndefined = x => x === undefined
const isTrue = x => x === true

const FORM_FIELDS = [ "state", "errors", "handlers", "status" ]
const META_HANDLERS = [ "validate", "reset" ]
const META_STATUSES = [ "isValidated", "isResetted" ]

const EMPTY_OBJECT = {}

const DEFAULT_STATUS = {
  isResetted: false,
  isValidated: false,
  isValid: true, // not undefined, explicitly valid
}

const combine = F.curry((keys, values) => {
  const form = FORM_FIELDS.reduce(
    (memo, fieldName) => {
      memo[fieldName] = keys.reduce(
        (memo, formName, idx) => {
          const state = values[idx]

          if (state != null && (fieldName in state)) {
            memo[formName] = state[fieldName]
          } else {
            switch (fieldName) {
              case "state":
                memo[formName] = state
                break

              case "status":
                memo[formName] = DEFAULT_STATUS
                break

              default:
                memo[formName] = EMPTY_OBJECT
            }
          }

          return memo
        },
        {}
      )
      return memo
    },
    {}
  )

  const statuses = F.pluck("status", values.filter(isForm))
  const isValid = F.pluck("isValid", statuses)
  Object.assign(form.status, {
    isValid: isValid.every(isUndefined) ? undefined : isValid.every(isTrue),
    // For now just gather values from all forms.
    // They will be combined differently in different scenarios.
    isValidated: F.pluck("isValidated", statuses),
    isResetted: F.pluck("isResetted", statuses),
  })

  return form
})

export default function combineForms(cfg) {
  const [ keys, forms ] = F.zip(...F.entries(cfg))

  if (!forms.every(F.isStream)) {
    throw new Error("[kefir-store :: combine] You should pass only observables to 'combine' helper")
  }

  const formsList$ = Kefir.combine(forms.map(toStream)).toProperty()

  const $flag = Subject($ => $.map(F.returnFalse).toProperty(F.returnTrue))

  const combineByKeys = combine(keys)

  const combinedHandlers$ = formsList$.take(1)
    .map(xs => xs.filter(isForm))
    .map(F.pluck("handlers"))
    .map(handlers =>
      META_HANDLERS.reduce(
        (memo, key) => {
          memo[key] = () => {
            $flag.handler() // whenever special handler is called, set filtration flag to false
            return Promise.all(handlers.map(x => x[key]())).then(combineByKeys)
          }
          return memo
        },
        {}
      )
    )

  const formsCount$ = formsList$.map(xs => xs.filter(isForm).length)

  const combo$ = formsList$.map(combineByKeys)
    .combine(
      combinedHandlers$,
      (form, handlers) => {
        Object.assign(form.handlers, handlers)
        return form
      }
    ).toProperty()

  const aggregated$ = (
    formsCount$.sampledBy($flag.stream.changes()).flatMapLatest(limit =>
      combo$.changes()
        .bufferWithCount(limit)
        .map(x => x.pop())
        .map(x => {
          META_STATUSES.forEach(key => {
            // When special handler is called,
            // combine statuses from all forms
            x.status[key] = x.status[key].every(isTrue)
          })
          return x
        })
        .take(1)
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
    combo$
      .filterBy($flag.stream.merge(
        // when all forms has emitted value, unlock main stream
        aggregated$.map(F.returnTrue))
      )
      .map(x => {
        META_STATUSES.forEach(key => {
          // Special status can only be true when corresponding special handler is called.
          // In main stream it's always false.
          x.status[key] = false
        })
        return x
      })
      .merge(aggregated$)
      .toProperty()
  )
}
