# `@bayerjs/core`

Core server abstract library. Start the server with `Bayer.listen` or get a callback function with `Bayer.callback`.

## Usage

### Initialize a server object

#### HTTP Server

```typescript
import Bayer from "@bayerjs/core";

const app = new Bayer();

app.listen(); // Will listen on port 80 and 404 every request made to it
```

### Add middleware

```typescript
import { tap } from "rxjs/operators";

app.use(tap(({ req, res, extra }) => {
  res.status(200, "OK").send("Hello world!");
}));
```

To pass data to middlewares further down, write into the `extra` object:

```typescript
import { map } from "rxjs/operators";
// The number as second parameter is the priority. See the reference doc.
server.use(tap(({ req, extra }) => {
  // Push custom headers into the extra object
  Object.keys(req.headers).filter(v => v.startsWith("x-")).forEach(v => {
    extra[v] = req.headers[v];
  });
}), 1);
```
