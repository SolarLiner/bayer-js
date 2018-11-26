# `@bayerjs/core`

Core server abstract library. Features an HTTP and an HTTPS server, as well as
exposing the base class powering the two of them to implement other protocols on
top.

## Usage

### Initialize a server object

#### HTTP Server

```typescript
import { HTTPServer } from "@bayerjs/core";

// Port is defined on instanciation
const server = new HTTPServer(3000);
// Run server (will 404 on every request with this configuration)
server.run();
```

## HTTPS Server

```typescript
import { HTTPSServer } from "@bayerjs/core";
import { readFileSync } from "fs";
import { join } from "path";
// HTTPS cryptographic keys
const key = readFileSync(join(__dirname, "key.pem"));
const cert = readFileSync(join(__dirname, "cert.pem"));

const server = new HTTPSServer(3000, { key, cert });
```

### Add middleware

```typescript
import { tap } from "rxjs/operators";
// With either the HTTP or HTTPS server
server.use(tap(({ req, res, extra }) => {
  res.writeHead(200, "OK");
  res.write("Hello, world!");
  res.end();
}));
```

To pass data to middleware further down, write into the `extra` object:

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
