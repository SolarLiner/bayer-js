# `@bayerjs/mount`

Mount Bayer.js middlewares into subdirectories.

## Usage

```typescript
import Bayer from "@bayerjs/core";
import mount from "@bayerjs/mount";
import staticFiles from "@bayerjs/static";
const server = new Bayer();
server.use(mount("/static", staticFiles(STATIC_DIR)), 1); // Here we use the static middleware as an example

server.listen(3000);
```

In the snippet above, the server will respond to requests with a 404 error (the default behavior), but will delegate
requests made to `/static` to the static middleware.

### Mounting Bayer applications

Ther `Bayer` server class exposes a `middleware()` function that returns a server middleware; you can use this to mount
sub-application into subdirectories, and essentially turn them into modules.
