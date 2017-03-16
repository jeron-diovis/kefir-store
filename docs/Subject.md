# Subject

`Subject` is a tiny wrapper around [kefir-bus](https://www.npmjs.com/package/kefir-bus) package.
 
It removes ability to `plug` new streams to created bus, and adds handy ability to initialize it.
 
## API

#### `Subject([ init = x => x ]): { stream: Observable.<Any>, handler: Function }`

## Short example

```js
import { Subject } from "kefir-store"

const { stream, handler } = Subject($ => $.map(x => `new value: ${x + 1}`))

stream.observe(x => console.log(x))

handler(1)

// => logs "new value: 2"
```
