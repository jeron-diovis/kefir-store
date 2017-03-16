# setConfig

In general, this feature was intended to allow integration of this lib with `ImmutableJS`. But it is suspended for now. I have no real practical experience with `ImmutableJS`, and so don't know how to better implement this. For `Stream` it's quite simple, but `Model` and `Form` has it's own metadata, and I can't decide which parts of them must be immutable structures and which should not. Advices are welcome.
 
So far, you can use `setConfig` to configure following options:

---

`reducer: Function String -> (state, patch) -> new_state` – describes how to create a reducer function from a string. 

See [Stream details](/docs/Stream.md#reducer).

By default a FP version of [`_.set`](https://lodash.com/docs/4.17.4#set) helper is used.

---

`isNotValidationError: Function Any -> Bool` – describes which values, returned from Form validators, are considered "valid". 

See [Form details](/docs/Form.md#validator-function).

By default it is `x => x == null`.

---

## Example

```js
import { setConfig } from "kefir-store"

// use mutable approach everywhere by default:
setConfig({
  reducer: k => (o, v) => {
    o[k] = v;
    return o;
  }
})
```
