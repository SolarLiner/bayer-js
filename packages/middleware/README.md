# `@bayerjs/middleware`

Middleware functions to be used with the Bayer.js server library.

## Static files

Handle static files simply by plugging the `staticFiles` middleware into your server.

```typescript
import { staticFiles } from "@bayerjs/middleware";

// Will serve the "public" folder that's alongside this script file
app.use(staticFiles(join(__dirname, "public"), "/"))

app.listen();
```

By default, this middleware will check if the route points to a folder, and if it does, try to send the `index.html`
file in that folder if found. To disable this, set `useIndexFile` to false. To change the extension of the index file,
set `indexExtension` to the extension of your choice.

```typescript
app.use(staticFiles(join(__dirname, "public"), "/", /*useIndexFile*/ true, /*indexExtension*/ "json"));
```

The middleware will check whether the file exists and is readable before streaming it to the client. The appropriate
response codes will be used otherwise.
