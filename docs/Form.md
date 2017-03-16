# Form

#### Inherits: [Model](/docs/Model.md)

`Form` is about validation – meaning not just filtering out wrong values, but gathering validation results for further usage (like displaying to user).

That is, besides state, we have a set of error messages and validity status. This requires to introduce some restrictions: while in `Stream` and `Model` stream could contain just anything, in `Form` data always has following shape:

```js
{
  state: Any,
  errors: Object,
  status: FormStatus, // see type definition below
}
```

`Form` extends `Model` by introducing new component for fields in configuration: a validator config. It is not required, and in case of it's absence field behaves just like fields in `Model`. 

## API

> for types not described here see [Stream API](/docs/Stream.md#API) and [Model API](/docs/Model.md#API)

#### `Form(config: Array.<FormField> [, Seed]): FormObject`

#### `Form.asStream(config: Array.<FormField> [, Seed]): FormStream`

#### `Form.toStream(FormObject): FormStream`

#### `Form.validatedOn(FormObject|FormStream, Observable.<Any>): FormStream`
> (curried)

#### `Form.validOn(FormObject|FormStream, Observable.<Any>): Observable.<State>`
> (curried) 

#### `Form.combine(Object.<String, Observable.<Any>>): FormStream`

---

#### FormObject :: { stream: Observable.\<FormShape\>, handlers: FormHandlers }

#### FormHandlers :: { ...Handlers, reset: Function, validate: Function }

#### FormStream :: Observable.\<FormStreamObject\>

#### FormStreamObject :: { ...FormShape, handlers: FormHandlers }

#### FormShape :: { state: State, errors: Object.<String, Any>, status: FormStatus }

#### FormStatus :: { isValid: Bool|undefined, isResetted: Bool, isValidated: Bool }

#### FormField :: Array.<ModelInput, Reducer [, ValidatorConfig]>

#### ValidatorConfig :: Validator | Array.<Validator, ValidatorOptions>

#### Validator :: Function (value, current_state) -> ValidationResult | Promise.\<ValidationResult\>

#### ValidatorOptions :: String | { get: Function, set: Function, key: String }

#### ValidationResult :: String | null

## Short example

```js
const validateEmail = x => isEmail(x) ? null : "invalid email"

const form = Form([
  [ "setEmail", "email", validateEmail ],
  
  [ "setFoo", "foo", 
    (value, current_state) => {
      if (someCondition(current_state)) {
        return null
      }
      
      return fetch(`/api/some_remote_validation/?q=${encodeURIComponent(value)}`)
    } 
  ],
])

form.stream.observe(x => console.log(x))

form.handlers.setEmail("some_string")

/* => logs following:
{
  state: { email: "some_string" },
  errors: { email: "invalid email" },
  status: { isValid: false, isValidated: false, isResetted: false },
}
*/
```

> Note that invalid value is still saved in state. See "Validator options" section below.

## Some details

### Atomicity

Important feature which `Form` provides is atomic updates. It is guaranteed that for a single input you will get exactly one emitted output, with state, errors and validity status updated respectively.

### `status.isValid`

`isValid` status can be `true`, `false`, or `undefined`. Why `undefined`? Because form can be in **three** states: valid (you may display it as a green check icon), invalid (red error icon), or *not validated at all* (no icons, user just opened form and didn't touch anything yet).

### `status.isResettted`, `status.isValidated`

These statuses will be set to `true` only and only in response to call of corresponding handler (see _**"Reserved handlers"**_ section below). Any other update will reset them to `false`.

### Reserved handlers

`Form` reserves several handler names for some standard purposes. 

#### reset

Returns form to initial state.

I.e., in response to call of this handler form always will emit following:
```js
{
  state: ...seed value from constructor...,
  errors: {},
  status: {
    isValid: undefined,
    isValidated: false,
    isResetted: true, // !
  },
}
```

#### validate

Validates *current state*, i.e. each field which has validator.

> Note the difference: it validates not the *last value from corresponding input*, but value which is currently set in state. 
See _**"Validator options"**_ section below.

```js
const validateNumber = x => x > 0 ? null : "not positive number"
const validateEmail = x => isEmail(x) ? null : "invalid email"

const form = Form([
  [ "setNumber", "number", validateNumber ],
  [ "setEmailValidated", "email", validateEmail ],
  [ "setEmailNotValidated", "email" ],
], {
  number: -1,
})

form.stream.observe(x => console.log(x))

form.handlers.setEmailNotValidated("some_string")

/* =>
{
  state: { 
    number: -1, 
    email: "some_string", 
  },
  errors: {}, // empty – nothing was validated yet
  status: { 
    isValid: undefined, // same as with `errors`
    isResetted: false, 
    isValidated: false, 
  },
}
*/

form.handlers.validate()

/* =>
{
  state: { 
    number: -1,
    email: "some_string",
  },
  errors: { 
    number: "not positive number",
    email: "invalid email", 
  },
  status: { 
    isValid: false, 
    isResetted: false,
    isValidated: true, // ! 
  },
}
*/
```

### Validator options

Validator options are responsible for 3 things:
 
#### `key`: String

Describes how to write validation result to `errors` object.

Setter will be created from string by the same logic as Reducer (see [details about Stream](/docs/Stream.md#some-details)).

#### `set`: Function (state, patch) -> new_state

Describes how to update state if input value is invalid. 

If input value is invalid, reducer **will not be called** – because obviously it can lead to errors:

```js
const form = Form([
  [ 
    "setValue", 
    (state, value) => ({ ...state, value: 1 / value }),
    [
      x => x !== 0 ? null : "Division by zero",
      "value"
    ]
  ],
], {
  value: 1
})

form.stream.observe(x => console.log(x))

form.handlers.setValue(0)

/* =>
{
  state: {
    value: 0,
  },
  errors: {
    value: "Division by zero",
  },
  status: {
    isValid: false,
    isValidated: false,
    isResetted: false,
  },
}
*/
```

So in this case will be used alternative reducer, which must take this into account.
  
#### `get`: Function state -> value

Describes how to get from state a value to be validated when `validate` handler is called.

In general, reducer function can update any fields in state. And so you should explicitly describe what was updated, to validate it.
 
---

In simplest (and, probably, most often) case, state is updated in the same way both for valid and invalid value, and error for field "X" you want to store under key "X".
So there is a shortcut for this case: instead of options object just use a string.
 
These two snippets are equivalent: 
```js
[
  someValidatorFunc,
  "foo"
]
```

```js
[
  someValidatorFunc,
  {
    key: "foo",
    get: state => state.foo,
    set: (state, value) => ({ ...state, foo: value }),
  }
]
```

---

If reducer is defined as string, that string also will be used as options string (as you may see in examples above).

It is allowed to override that defaults, for example:

```js
Form([
  [ 
    "setFoo", "foo", 
    [ 
      validator, 
      { set: x => x } // do not save invalid values in state 
    ]
  ]
])
```
 
### Validator function

Validator is supposed to return an error message. If nothing returned, value is considered valid.

By default, `null` and `undefined` considered as "nothing", and everything else as error. You may change this using [library config](/docs/configuration.md).

### Async validation

Validator function can be either sync or async. Just return a Promise from it, if you need.

Uncaught errors in Promise will be converted to string and used as error message.

> **[!]** If new input arrives before validation for it's previous value is completed, that validation result will be skipped – because it's assumed that you're always interested in validity of *current* data. So form won't emit result for "stale" inputs.  

### Form.asStream, Form.toStream

Exactly the same as in [`Model`](/docs/Model.md#some-details).

### Form.validatedOn, Form.validOn

Helpers to call `validate` handler in response on events from another stream. They are added because one the most common use-cases is validate entire form before submit and prevent submit if it's invalid.

The difference between these two methods is following:
 
* `validatedOn` calls `validate` handler and emits entire form shape when validation completed

* `validOn` calls `validate` handler and emits when validation completed **and** `status.isValid` is true; and it emits only form state – obviously, you don't need `errors` and `status`, if you already know that form is completely valid.

Usage is like this:

```js
import { Form } from "kefir-store"
import { mapPropsStream, createEventHandler } from "recompose"

const decorate = mapPropsStream(props$ => {
  const form$ = Form.asStream(...)  
  const { stream: submit$, handler: onSubmit } = createEventHandler()
  
  submit$.observe(e => e.preventDefault())
  
  Form.validOn(form$, submit$)
    .observe(state => {/* send request, dispatch action, etc. */})
  
  return props$.combine(
    form$, 
    (props, form) => ({ ...props, ...form, onSubmit })
  )
})

decorate(({ onSubmit }) => (
  <form onSubmit={onSubmit}>
    ...
  </form>
))
```

### Form.combine

This helper combines multiple streams into a `FormStream` (see [types definitions above](/docs/Form.md#API)).

It has two main responsibilities:

* maintain a `FormShape` for data in stream (see [types definitions above](/docs/Form.md#API)): whatever you combine, you'll always have an object with `state`, `errors` and `status` fields in resulting stream.

* keep atomicity on resetting / validating: if you combine several forms and call `reset` / `validate` handler on combined stream, it still will emit only once: when all parts emit their values.
 
```js

const multiform = Form.combine({
  the_form: Form(
    [ [ "setFormField", "some_field" ] ], 
    { value: "initial form" }
  ),
  the_model: Model(
    [ [ "setModelField", "some_field" ] ], 
    { value: "initial model" }
  ),
  the_stream: Stream(..., { value: "initial stream" }),
  ...whatever...
})


multiform.observe(x => console.log(x))

/*
{
  state: {
    the_form: {
      value: "initial form",
    },
  
    the_model: {
      value: "initial model",
    },
  
    the_stream: {
      value: "initial stream",
    },
  }, 
  
  errors: {
    the_form: {},
    the_model: {},
    the_stream: {},
  },
  
  status: {
    the_form: {
      isValid: undefined,
      isValidated: false,
      isResetted: false,
    },
     
    the_model: {
      isValid: true, // always explicitly valid – as Model never has validators 
      isValidated: false,
      isResetted: false,
    },
    
    the_stream: {
      isValid: true, // same as Model
      isValidated: false,
      isResetted: false,
    },
    
    // combined status:
    isValid: undefined, // only `true` when it's `true` for each Form in config.
    // only `true` when you call corresponding combined handler (see below)
    isValidated: false, 
    isResetted: false,
  },
  
  handlers: {
    the_form: {
      setFormField: ...,
      // these handlers will update only fields related to `the_form`.
      // I.e., you may have `status.the_form.isValidated` == true and at the same time `status.isValidated` == false. 
      reset: ...,
      validate: ...,
    },
    
    the_model: {
      setModelField: ...,
    },
    
    the_stream: {}, // always empty, as Stream never has handlers
    
    // combined handlers: executes corresponding handlers on each Form in config 
    reset: ...,
    validate: ...,
  },
}
*/


Form.combine({
  multiform: multiform,
  another_form: Form(...),
})

/*
{
  state: {
    multiform: {
      the_form: ...,
      the_model: ...
      ...
    },
    
    another_form: {
      ...
    },
  },
  
  errors: {
    multiform: {
      the_form: ...,
      the_model: ...
      ...
    },
    
    another_form: {
      ...
    },
  },
  
  ...etc...
} 
*/
```
