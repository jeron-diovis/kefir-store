import Kefir from "kefir"

import Parser from "./Parser"

import { Class as Model } from "../Model"

import Subject from "../lib/Subject"

import * as F from "../lib/func_utils"
import * as S from "../lib/stream_utils"

import CONFIG from "../config"
import * as helpers from "./helpers"

import { createFields } from "./createFields"
import createFullValidationField from "./createFullValidationField"

const INITIAL_IS_VALID = undefined

// ---

// Object -> Bool
const errorsToValidity = F.flow(
  CONFIG.getValuesList,
  xs => xs.every(CONFIG.isNotValidationError)
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
        isValid: INITIAL_IS_VALID,
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
    const [ inputFields, errorField ] = createFields(current.state$, cfg)

    return [
      Kefir.merge(inputFields.map(
        x => super._createInputStream(current.state$, x)
      )),

      super._createInputStream(current.errors$, errorField),
    ]
  }

  _createStreams(current$, fields) {
    const parts = {
      state$: current$.map(F.prop("state")),
      errors$: current$.map(F.prop("errors")),
      status$: current$.map(F.prop("status")),
    }

    const [ stateStreams = [], errorStreams = [] ] = F.zip(...super._createStreams(parts, fields))
    const state$ = Kefir.merge(stateStreams)
    const errors$ = Kefir.merge(errorStreams)
    const status$ = parts.status$.sampledBy(
      errors$.map(errorsToValidity),
      CONFIG.defaultSetter("isValid")
    )

    const output$ = Kefir.zip(
      [ state$, errors$, status$ ],
      (state, errors, status) => ({ state, errors, status })
    )

    return [
      output$
        .merge(
          this.initialState$
            .map(F.update("status.isResetted", F.constant(true)))
            .sampledBy(this.$reset.stream),
        )
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


const of = Form.of.bind(Form)

Object.assign(of, helpers)
of.asStream = F.flow(of, of.toStream)

// ---

export const Class = Form
export default of
