# `@bayerjs/static`

Static middleware for `Bayer.js`.

## Note of caution

This is a pretty naive implementation, without proper MIME handling, or security concerns. It is mainly provided as a
convinience function.

## Usage

```typescript
import Bayer from "@bayerjs/core";
import staticFiles from "@bayerjs/static";

const server = new Bayer();
server.use(staticFiles({ localPath: "../public" }));
```

The options object has the following structure:
```typescript
/**
 * Options interface for the Bayer.js static middleware.
 */
export interface IBayerStaticOptions {
  /** Local path to the directory containing the */
  localPath: string;
  /** Whether to use the index file on directory hits */
  useIndexFile?: boolean; // default: true
  /** File to serve on directory hits, relative to the hit directory */
  indexFile?: string; // default: "index.html"
  /** Whether to enable SPA mode, which serves a file relative to localPath on 404 errors */
  spaMode?: boolean; // default: false
  /** File to serve on 404 errors */
  spaFile?: string; // default: "index.html"
}
```
