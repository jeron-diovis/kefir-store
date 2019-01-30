import Kefir from "kefir"
import CONFIG from "../config"

import Parser from "./Parser"
import { Class as Model } from "../Model"

import Subject from "../lib/Subject"

import * as F from "../lib/func_utils"
import * as S from "../lib/stream_utils"
import * as helpers from "./helpers"

import createValidatedFields from "./createValidatedFields"
import createFullValidationField from "./createFullValidationField"

// ---

const resetMetaStatuses = F.flow(
  F.update("isResetted", F.returnFalse),
  F.update("isValidated", F.returnFalse)
)

// ---

class Form extends Model {

  _getParser() {
    return Parser
  }

  _initInitialState(...args) {
    return super._initInitialState(...args).map(state => ({
      state,
      errors: CONFIG.getEmptyObject(),
      status: {
        // Initially form is neither valid nor invalid.
        // It *isn't validated at all*.
        isValid: undefined,
        isValidated: false,
        isResetted: false,
      },
    }))
    .map(helpers.mark)
  }

  _init(...args) {
    this.$validate = Subject()
    this.$reset = Subject()

    super._init(...args)
  }

  zipFormParts(state$, errors$, status$) {
    return Kefir.zip(
      [
        state$,
        errors$,
        status$.sampledBy(
          errors$
            .map(CONFIG.getValuesList)
            .map(xs => xs.every(CONFIG.isNotValidationError)),
          CONFIG.reducer("isValid")
        ),
      ],
      (state, errors, status) => ({ state, errors, status })
    )
      .map(helpers.mark)
  }

  _createInputStream(current, cfg) {
    const [ inputFields, errorField ] = createValidatedFields(current.state$, cfg)

    return [
      Kefir.merge(inputFields.map(
        x => super._createInputStream(current.state$, x)
      )),

      super._createInputStream(current.errors$, errorField),
    ]
  }

  _createMainStream(current, fields) {
    const { mapErrors = F.id } = this.options

    const [ state = [], errors = [] ] = F.zip(...super._createStreams(current, fields))

    return this.zipFormParts(
      Kefir.merge(state),
      Kefir.merge(errors).map(mapErrors),
      current.status$.map(resetMetaStatuses)
    )
  }

  _createFullValidationStream(current, fields) {
    const { mapErrors = F.id } = this.options

    const state$ = current.state$.sampledBy(this.$validate.stream)

    const errors$ = (
      super._createInputStream(
        current.errors$,
        createFullValidationField(
          state$,
          F.pluck("validator", fields)
        )
      )
    ).map(mapErrors)

    const status$ = current.status$.map(
      F.update("isValidated", F.returnTrue)
    )

    return this.zipFormParts(state$, errors$, status$)
  }

  _createExternalErrorsStream(current) {
    const { externalErrors } = this.options
    if (!externalErrors) {
      return Kefir.never()
    }

    let stream, combine
    if (Array.isArray(externalErrors)) {
      ([ stream, combine ] = externalErrors)
    } else {
      stream = externalErrors
      combine = (a, b) => ({ ...a, ...b })
    }

    const errors$ = current.errors$.sampledBy(stream, combine)

    return this.zipFormParts(
      current.state$.sampledBy(stream),
      errors$,
      current.status$.sampledBy(errors$).map(resetMetaStatuses)
    )
  }

  _createResetStream({ state$ }) {
    const { resetWith = Kefir.never() } = this.options

    let stream, combine
    if (Array.isArray(resetWith)) {
      ([ stream, combine ] = resetWith)
    } else {
      stream = resetWith
      combine = F.id
    }

    return Kefir.merge([
      this.initialState$.sampledBy(this.$reset.stream),

      S.withLatestFrom(
        stream,
        [ state$, this.initialState$ ],
        (new_state, current_state, initial_form) => ({
          ...initial_form,
          state: combine(new_state, current_state, initial_form.state)
        })
      )
    ])
      .map(F.update("status.isResetted", F.returnTrue))
  }

  _createStreams(current$, fields) {
    const parts = {
      state$: current$.map(F.prop("state")),
      errors$: current$.map(F.prop("errors")),
      status$: current$.map(F.prop("status")),
    }

    return [
      this._createMainStream(parts, fields),

      this._createFullValidationStream(parts, fields),

      this._createExternalErrorsStream(parts, fields),

      this._createResetStream(parts),
    ]
  }

  _build(...args) {
    const { stream, handlers } = super._build(...args)

    return {
      stream,

      handlers: Object.assign(handlers, {
        validate: this._makeStatusHandler({
          stream,
          propName: "_validationPromise",
          checkStatus: x => x.isValidated,
          handler: this.$validate.handler,
        }),

        reset: this._makeStatusHandler({
          stream,
          propName: "_resetPromise",
          checkStatus: x => x.isResetted,
          handler: this.$reset.handler,
        }),
      }),
    }
  }

  _makeStatusHandler({ stream, propName, checkStatus, handler }) {
    return () => {
      if (!this[propName]) {
        let inProcess = false

        this[propName] = stream.changes()
          .map(x => {
            // reset if state has changed when process is executing
            if (inProcess) {
              this[propName] = null
            }
            return x
          })
          .filter(x => checkStatus(x.status)).take(1)
          .toPromise()
          .catch(x => x)
          .then(x => {
            this[propName] = null
            return x
          })

        handler()

        inProcess = true
      }

      return this[propName]
    }
  }
}

// ---

/**
 * @callback KefirStore_Form
 * @return {Observable}
 */

/**
 * @callback KefirStore_Form.toStream
 * @return {Observable}
 */

/**
 * @callback KefirStore_Form.asStream
 * @return {Observable}
 */

/**
 * @callback KefirStore_Form.validatedOn
 * @return {Observable}
 */

/**
 * @callback KefirStore_Form.validOn
 * @return {Observable}
 */

/**
 * @callback KefirStore_Form.is
 * @return {Boolean}
 */

/**
 * @type KefirStore_Form
 */
const of = Form.of.bind(Form)

const PUBLIC_HELPERS = [
  "validOn", "validatedOn",
  "combine",
  "toStream",
]

PUBLIC_HELPERS.forEach(k => { of[k] = helpers[k] })

of.asStream = F.flow(of, of.toStream)

// ---

export const Class = Form
export default of
