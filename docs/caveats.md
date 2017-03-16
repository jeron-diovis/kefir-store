# Caveats

## Combining streams in InputInitializer

Make sure you don't [`combine`](https://rpominov.github.io/kefir/#combine) input and state streams – it will cause double update, because both of these streams emits value. Moreover, it will cause weird issues with updates order: combined stream first will emit new input an **old** state, then new input and new state.

**Always** use [`.zip`](https://rpominov.github.io/kefir/#zip) operator instead of `combine` here.

## Concurrency

As input stream can be async, it means that (if you use immutable data) state in InputInitializer and state in Reducer can differ:

```js
const stream = Stream([
  [ 
    [ 
      foo$,
      (foo$, state$) => 
        foo$.zip(
          state$, 
          (foo, state) => ({ ...state, foo: foo + state.bar })
        )
        .delay(1000)
    ],
    
    (state, patch) => ({ ...state, ...patch }) 
  ],
  
  [ bar$, "bar" ],
], {
  foo: 0, bar: 0,
})

stream.observe(x => console.log(x))

// emit foo = 1
// wait 500 ms
// emit bar = 2
// => logs { foo: 0, bar: 2 }
// wait 500 ms
// => logs { foo: 1, bar: 0 } 
```

Well, there is nothing to do with this. Just keep this in mind while developing.  
