# Model

#### Inherits: [Stream](/docs/Stream.md)

As you may notice, `Stream` doesn't care about where input values come from. It only combines them.

All streams have start somewhere. Sometimes you may need to not create stream from some event emitter but push events to it imperatively. For this purpose there is a thing called [Subject](http://xgrommx.github.io/rx-book/content/getting_started_with_rxjs/subjects.html).
 
As we deal with multiple streams, we may have multiple subjects to combine. And so we'll need to give some personal name to each of them. As result, we'll get a set of "setters" and a stream of their combined results.
 
This is what `Model` actually is: `Stream` + handlers to push updates into it.

## API

> for types not described here see [Stream API](/docs/Stream.md#api)

#### `Model(config: Array.<ModelField> [, Seed, Options]): ModelObject`

#### `Model.asStream(config: Array.<ModelField> [, Seed]): ModelStream`

#### `Model.toStream(ModelObject): ModelStream`

---

#### ModelObject :: { stream: Observable.<State>, handlers: Handlers }

#### ModelStream :: Observable.<ModelStreamObject>

#### ModelStreamObject :: { state: State, handlers: Handlers }

#### Handlers :: Object.<String, Function>

#### ModelField :: Array.<ModelInput, Reducer>

#### ModelInput :: ModelInputSource | Array.<ModelInputSource, InputInitializer> | Array.<String, Subject, ?InputInitializer>

#### ModelInputSource :: String | Observable.<Any>

## Short example

```js
const model = Model([
  [ foo$, "foo" ],
  [ "setBar", "bar" ],
  [ 
    [ "setBaz", $ => $.skipDuplicates() ], "baz"
  ]
], { 
  foo: 0, bar: 0, baz: 0 
})

// ---

model.stream.observe(x => console.log(x))

model.handlers.setBar(42) // => { foo: 0, bar: 42, baz: 0 }

// ---

Model.toStream(model).observe(x => console.log(x))

// { 
//  state: { foo: 0, bar: 42, baz: 0 }, 
//  handlers: { setBar: function, setBaz: function } 
// }
```

## Some details

In addition to `Stream` features, `Model` allows to pass a string in place of Observable as input. 

In that case, [Subject](/docs/Subject.md) will created internally and used as input stream. And that string will be used as name for subject's handler.

You can modify created stream using `InputInitializer` function.

Obviously, it is not allowed to duplicate handler names in config.
 
### Model.asStream

Sometimes you may need to pass model's handlers together with it's state somewhere further, to be used there. 

For example, it is ideal to use with React (especially in combination with [`recompose`](https://github.com/acdlite/recompose/blob/master/docs/API.md#mappropsstream)): you just pass state and set of event handlers to component. Component does not know anything about Observables, does not need to setup lifecycle hooks and directly use DOM nodes to subscribe on their events.  

```js
import { Model } from "kefir-store"
import { mapPropsStream } from "recompose"

const decorate = mapPropsStream(props$ => {
  const model$ = Model.asStream([
    [ "setEmail", "email" ],
    
    [ 
      [ "setAgreement", $ => $.map(e => e.target.checked) ], 
      "agreement" 
    ],
    
    [ 
      [ 
        "submit",
        (event$, state$) => {
          event$.observe(e => e.preventDefault())
    
          return state$.flatMap(state => Kefir.fromPromise(
            fetch("...", { method: "post", body: JSON.stringify(state) })  
          ))
        }
      ],
      
      (state, response) => ({ ...state, ...response })
    ]
  ], {
    email: "",
    agreement: false,
  })
  
  return props$.combine(model$, (props, model) => ({ ...props, ...model }))
})

decorate(({ state, handlers }) => (
  <form onSubmit={handlers.submit}>
    <input type="text" value={state.email} onChange={handlers.setEmail} />
    <input type="checkbox" checked={state.agreement} onChange={handlers.setAgreement} />
  </form>
))
```

### Model.toStream

Just handy helper to "pack" already created model into Observable.

### Subject as input

Sometimes there is a need to make one model input to depend from another one. For this you have to define that "shared" input outside of model. But then you'll have to manually add handler to handlers set, like this:
```js
const sharedInput = Subject()

const model = Model([
  [ [ "setFoo", $ => $.merge(sharedInput.stream) ], "foo" ],
  [ sharedInput.stream, "bar" ],
])
model.handlers.setBar = sharedInput.handler
```
This is not convenient and breaks the general declarative approach.

To solve this issue, it's allowed to pass subject directly to input config like this:
```js
const sharedInput = Subject()

const model = Model([
  [ [ "setFoo", $ => $.merge(sharedInput.stream) ], "foo" ],
  [ [ "setBar", sharedInput ], "bar" ],
], {
  foo: 0, bar: 0,
})

model.handlers.setBar(1) // { foo: 1, bar: 1 }
sharedInput.handler(2) // { foo: 2, bar: 2 }
model.handlers.setFoo(3) // { foo: 3, bar: 2 }
``` 

Stream initializer still can be passed, as third param in array: `[ "setBar", sharedInput, $ => $.map(...) ]`

## Further docs
* [Form](/docs/Form.md)
