import Kefir from "kefir"
import CONFIG from "../config"

import Parser from "./Parser"
import { Class as Model } from "../Model"

import Subject from "../lib/Subject"

import * as F from "../lib/func_utils"
import * as helpers from "./helpers"

import createValidatedFields from "./createValidatedFields"
import createFullValidationField from "./createFullValidationField"

// ---

const resetMetaStatuses = F.flow(
  F.update("isResetted", F.returnFalse),
  F.update("isValidated", F.returnFalse)
)

const zipFormParts = (state$, errors$, status$) => (
  Kefir.zip(
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
  }

  _init(...args) {
    this.$validate = Subject()
    this.$reset = Subject()

    super._init(...args)
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
    const [ state = [], errors = [] ] = F.zip(...super._createStreams(current, fields))

    return zipFormParts(
      Kefir.merge(state),
      Kefir.merge(errors),
      current.status$.map(resetMetaStatuses)
    )
  }

  _createFullValidationStream(current, fields) {
    const state$ = current.state$.sampledBy(this.$validate.stream)

    const errors$ = (
      super._createInputStream(
        current.errors$,
        createFullValidationField(
          state$,
          F.pluck("validator", fields)
        )
      )
    )

    const status$ = current.status$.map(
      F.update("isValidated", F.returnTrue)
    )

    return zipFormParts(state$, errors$, status$)
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

      this.initialState$
        .map(F.update("status.isResetted", F.returnTrue))
        .sampledBy(this.$reset.stream),
    ]
  }

  _build(...args) {
    const { stream, handlers } = super._build(...args)

    return {
      stream,

      handlers: Object.assign(handlers, {
        validate: this.$validate.handler,
        reset: this.$reset.handler,
      }),
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
 * @type KefirStore_Form
 */
const of = Form.of.bind(Form)

Object.assign(of, helpers)
of.asStream = F.flow(of, of.toStream)

// ---

export const Class = Form
export default of
