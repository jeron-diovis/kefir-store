# listReducer

This is helper to create reducers which update collections.

To update a collection, we must know 2 things: which items should be updated, and how they should be updated. So, `listReducer` always requires an input stream to provide an object with following fields:

* `query`: describes which items should be updated.

* `data`: data to be applied to each item matching `query`.

## API

#### `listReducer(ItemReducer [, map = DefaultMapper]): ListReducer`

---

#### DefaultMapper :: Function (updateItem, xs) -> xs.map(updateItem)

#### ItemReducer :: Function (item, patch, collection, index) -> updated_item

#### ListReducer :: Function (collection, CollectionInput) -> updated_collection

#### CollectionInput :: { data: Any, query: Any }

## Short example

```js
import { Model, listReducer } from "kefir-store"

const model = Model([
  [ 
    "setValue",
    listReducer("value")
  ]
], [
  { id: 1 }, 
  { id: 2 },
  { id: 3, is_something: true },
  { id: 4 },
])

model.stream.observe(x => console.log(x))

model.handlers.setValue({
  data: 42,
  query: x => x.id % 2 === 0,
})

/*
[
  { id: 1 },
  { id: 2, value: 42 },
  { id: 3, is_something: true },
  { id: 4, value: 42 },
]
 */

model.handlers.setValue({
  data: 100,
  query: "is_something",
})

/*
[
  { id: 1 },
  { id: 2, value: 42 },
  { id: 3, is_something: true, value: 100 },
  { id: 4, value: 42 },
]
 */
```

## Some details

### CollectionInput

Input **must** have `data` and `query` properties. They can be undefined, but must be present in object.

### ItemReducer

In difference from standard reducers, ItemReducer receives 2 more arguments: the entire collection and item index. Maybe this can be useful in some complex cases. 

### Query

Predicate function is created from `query` param using [_.iteratee](https://lodash.com/docs/4.17.4#iteratee) helper, providing a high flexibility in building queries.

### A `map` parameter

By default `listReducer` assumes that your collection is something that has `map` method, and uses it to iterate over – which is reasonable default for most cases.
 
If you need something more specific, define your custom mapper. For example, here is how you can implement mutable updates:

```js
listReducer(
  (item, value) => {
    item.foo = value;
    return item;
  },

  (updateItem, items) => {
    // Note that `updateItem` is applied to each item in collection.
    // If item does not match query, it will be just returned as-is.
    items.forEach(updateItem);
    return items;
  }
)
```
