# Bayer

Reactive server abstractions library for Node.js.

```typescript
import Bayer from "@bayerjs/core";
import { staticFiles } from "@bayerjs/middleware";
import Router from "@bayerjs/router";

const app = new Bayer();
const router = new Router();

router.route("GET", "/", ({ res }) => {
  res.status(403, "Unauthorized").json({ error: "You are not authorized" });
});

// Use middleware
app.use(staticFiles(join(__dirname, "../public")));
app.use(router.middleware(), 1); // Optional priority (here to set it higher than the static files to override routes);
// Run the app
app.run().then(() => console.log("Listening on http://localhost:3000"));
```

## What it is

Bayer is a reactive library that abstracts away the difficulty of setting up a
Node.js server with common-case features. It uses `rxjs` handle data-flow, as it
is basically the textbook use-case of reactive programming.

### Modular

As its smallest, Bayer provides you with an Observable, providing
`Request` and `Response` parameter objects, which are based on Node.js's `IncomingMessage` and `ServerResponse` objects.
library.

Bayer can easily be extended through the use of Middlewares, they're
`OperatorFunction`s that get piped to the main request Observable.
They can be as simple or as complex, and benefit from all the power of the RxJS
Operators.

### Easy

While being introduced to Reactive programming will make your life easier, the
project aims to make writing feature-complete servers as easy and as quick as
possible. If you need a "quickstart template" that's more than 50 lines of code
when creating a new project, then this project's purpose has been defeated.

## What it isn't

Bayer isn't batteries included; it won't do _everything_ for you. However, the
project tries to strike a balance between minimalism and availability of
features.

Note that because Bayer has been designed with modularity in mind, functionality
can easily be added through the use of middlewares.

## Why the name "Bayer"?

Because I was listening to Andrew Bayer's album when initially building the
project, and that it's a cool name, and because the JavaScript community needs
some [beautiful music](https://www.youtube.com/watch?v=vfiL-tyMHyI).

<sup>But if you ask me,
[this version](https://www.youtube.com/watch?v=J_VN-xwN72A) is much better
😝</sup>
