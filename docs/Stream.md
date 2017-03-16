# Stream

Stream is a basic entity, implementing the core concept of this lib: 
* combine multiple observable sources
* each source updates a shared state in it's own manner
* result of each such update becomes the current state for next update

In fact, it's a kind of "multi-scan".

---

**A bit about terminology**.

Here and further in docs:
* "Observable" means [Kefir.Observable](https://rpominov.github.io/kefir/#about-observables)
* variable like "foo$" means variable, containing an Observable

## API

#### `Stream(config: Array.<Field> [, Seed]): Observable.<State>`

---

#### State :: Any

#### Seed :: Observable.\<Any\> | Any = {}

#### Field :: Array.<Input, Reducer>

#### Reducer :: String | Function (state, patch) -> new_state

#### Input :: Observable.\<Any\> | Array.<Observable.\<Any\>, InputInitializer>

#### InputInitializer :: Function (patch$, state$) -> modified_patch$

## Short example
```js
Stream([
  [ name$, (state, name) => ({ ...state, name })  ],
  [ email$, "email" ], // same as above
  [
    [
      loadUserById$,
      
      (userId$, state$) => (
        userId$.zip(state$, (id, state) => ({ id, state }))
          .filter(({ id, state }) => id !== state.id)
          .flatMap(({ id }) => Kefir.fromPromise(
            fetch(`/api/users/${id}`).then(r => r.json())
          ))
      )
    ],
    (state, user) => ({ ...state, ...user })
  ]
], {
  id: 42,
})
```

## Some details

### Seed

Seed can be defined as Observable. If it is, the first value will be taken from it and used as seed.

Because in most cases speaking about store we mean a state object with some data fields, by default seed will be set to empty object.
 
### Reducer

Reducer is just what you might expect: a pure (and sync) function, which takes current state and patch for it, and returns new state with patch applied.

Because very often we need to just update a single field in state, there is a shortcut for this: use a string in place of reducer, and it will be used as name of field to update. Reducer function will be created from string, using a FP version of [`_.set`](https://lodash.com/docs/4.17.4#set) helper. 

"FP version" means that it will do immutable updates. 
Also, thanks to Lodash, as bonus we get ability to easily update nested fields: `[ input$, "foo.bar.baz" ]`.  
If you don't like this (or just don't like how `_.set` does it), you can change this globally using [library config](/docs/configuration.md). 

Also, there is a [helper](/docs/listReducer.md) to create reducers, which update certain items in collection.

### Input

In Kefir, there are [two types of Observables](https://rpominov.github.io/kefir/#current-in-streams): "Streams" (basic) and "Properties" (able to remember their "current value").

Observables, which you use as inputs, will **always** be explicitly converted to a "Stream" observable, loosing any current value it has. This is intentional, and logical: each input represents a *stream of changes*, it should not have any kind of "current state".  
  
### InputInitializer
  
Sometimes updates must somehow take into account a current state. In general, this can be done in reducer function. But sometimes we need some more complex logic: like do something async, or produce several updates on single input (activate loader, wait for async result, deactivate loader), etc. Also, some routine operations can be performed much easier using operators on stream: like modifying update by [comparing current value with previous one](https://rpominov.github.io/kefir/#diff).

This is what `InputInitializer` is for. Getting stream of patches and stream of current state, you may combine them as you wish and implement any logic, using full power of stream operators – like in example above.
 
> N.B.: current state stream here is **passive** – it will emit [only and only when new input value arrives](https://rpominov.github.io/kefir/#obs-sampled-by). 
This means, you can be sure that you'll never fall into infinite loop when updating state causes new updates.

> **[!]** [Learn how to properly combine input and state streams](/docs/caveats.md#combining-streams-in-inputinitializer) 

---

## Further docs
* [Model](/docs/Model.md) 
* [Form](/docs/Form.md)
