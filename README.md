# kefir-store

> ### Observable store with handy declarative syntax

Built on top of [`Kefir`](https://rpominov.github.io/kefir/) library. 

## install

```bash
npm i -S kefir-store
```

## Motivation

We all know that observables are great. Indeed, they are.  Reading about them, you'll probably find that rapturous articles about "how simple everything is with them". Need to deal with DOM events? Just do `.fromEvent(myNode, "click")`. Need some state and incremental updates? Just use `.scan`, and you're done!  Validation? `.filter(isEmail)`. And so on.
 
But hey. How about something more realistic than examples of particular operators?
What if there are several sources which should update the same state in different ways?
What if validator needs not just a value but also some fields from entire current state?
What if you need to perform async update in `.scan`? 
What if you're using React – do you really each time will fall to lifecycle hooks, to call `.fromEvent` on DOM node in `DidMount`, and dispose stream in `WillUnmount`?
Etc., etc., etc.

I'm sure all this can be solved (and is solved by someone) relatively easy. But so far I didn't found any **system** solution. Each time it's up to you, and you end up with a lot of boilerplate.
So I tried to create such solution myself. 

## tl;dr

What this lib actually does is takes this pattern:

```js
Kefir.merge([
  a$.map(x => ({ type: "A", value: x })),
  b$.map(x => ({ type: "B", value: x })),
  c$.map(x => ({ type: "C", value: x })),
  ...
]).scan((state, patch) => {
  if (patch.type === "A") {
    return updateA(state, patch.value)
  }
  
  if (patch.type === "B") {
    ...
  }
  
  ...
}, seed)
```

and turns it into this:

```js
import { Stream } from "kefir-store"

Stream([
  [ a$, updateA ],
  [ b$, updateB ],
  ...
], seed)
```

, also providing a lot of extra advantages.

## API

Package exports following functions:

* [Stream](/docs/Stream.md) – basic entity. **Start reading here.**
* [Model](/docs/Model.md) – Stream + ability to push to it imperatively. 
* [Form](/docs/Form.md) – Model + validation. 
* [Subject](/docs/Subject.md) – tiny wrapper around [kefir-bus](https://www.npmjs.com/package/kefir-bus). 
* [listReducer](/docs/listReducer.md) – helper to deal with collections in state.
* [setConfig](/docs/configuration.md) – allows to override some parts of global behaviour.

## How big is it?

```bash
$ cd node_modules/kefir-store
$ npm run measure

PATH                      SIZE     %
../kefir-store.js         66.7 kB  59%
../kefir-store.js.gz      11.8 kB  10%
../kefir-store.min.js     28.7 kB  25%
../kefir-store.min.js.gz  6.45 kB  6%
```

> of course, .gz files aren't included in package. They are generated here just to show what will be really sent over network.

## Why Kefir, why not ${my_favourite_FRP_lib}?

I found it very easy to use and to do what I actually want. It's written to be used by people, not to just be ideologically perfect.

I would be happy to make `kefir-store` able to use different FRP-libs as background (like amazing [`recompose`](https://github.com/acdlite/recompose/blob/master/docs/API.md#setobservableconfig) does), but I'm definitely not able to do it myself, at least for now. If you feel such power inside you, any help is welcome.

## License

MIT