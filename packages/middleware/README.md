# `@bayerjs/middleware`

Package containing useful middleware for the Bayer.js server library.

## Usage

### Body parser middleware

```typescript
import { HTTPServer } from "@bayerjs/core";
import { bodyParser } from "@bayerjs/middleware";

const server = new HTTPServer(3000);
server.use(bodyParser(), 1);
```

The body parser middleware will attempt to parse the body of a request,
detecting the format and exposing it in the `body` property of the `extra`
object. If the format isn't supported, the payload is simply transformed into a
string and passed to the `extra` object in a `payload` property.

```typescript
// Example middleware depending on the `bodyParser()` middleware
server.use(
  tap(({ extra }) => {
    const { name, email, passwordHash } = extra.body;
  })
);
```

Example `extra` object:

```json
{
  "body": {
    "files": {
      "File": {
        "filepath": "/tmp/file-gitflow-installer.sh",
        "filename": "gitflow-installer.sh",
        "mimetype": "application/x-sh"
      }
    },
    "data": {
      "Name": "Gitflow Installer"
    }
  }
}
```

### Request logger

```typescript
import { HTTPServer } from "@bayerjs/core";
import { requestLogger } from "@bayerjs/middleware";

const server = new HTTPServer(3000);
server.use(requestLogger(), -1);
````

The request logger essentially writes to stdout about requests as they come in.
If run below a middleware that issues a response, it will also print the status
code.

Example output:

```bash
Request POST 200 / { body: { files: {}, data: { Hello: 'Internet' } } }
Request POST 200 /upload { body:
   { files: { File: [Object] },
     data: { Name: 'Gitflow Installer' } } }

```

### Express wrapper

```typescript
import { HTTPServer } from "@bayerjs/core";
import { expressWrapper } from "@bayerjs/middleware";
import cors from "cors";

const server = new HTTPServer(3000);
server.use(expressWrapper(cors() as any), 1);
```

The Express wrapper is a simple wrapper to Express middleware. It doesn't recreate all Express function attached to the Request and Response objects, but
allows middleware to interface with Bayer.js. Additions to the Request and Response objects are proxied and added to the `extra` object instead.
