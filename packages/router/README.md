# `@bayerjs/router`

Package containing a router middleware for the Bayer.js server library.

```typescript
const server = new HTTPServer(3000);
const router = new Router();
router.addRoute("/profile/:name").use(
  map(({ params }) => {
    console.log(params);
    return {
      content: `Hello, ${params[0]}`,
      statusCode: 200
    };
  })
);

server.use(router.asMiddleware(), 1);
server.use(requestLogger(), -1);
// tslint:disable-next-line:no-console
server.run().then(() => console.log("Listening on http://localhost:3000"));
```

The router makes it easier to create practical web servers. Instead of directly exposing the Request and Response objects, the Router middleware will expose extracted data directly, tucking the `req`/`res` objects behind the `request` object.

## Usage

### Add routes

The following code snippets are equivalent:

```typescript
const router = new Router();
router.addRoute("/path/to/route", "GET").use(
  map(props => {
    return {
      content: "Hello, World",
      statusCode: 200
    };
  })
);
```

```typescript
function routerFunc(props) {
  return {
    content: "Hello, World",
    statusCode: 200
  };
}
```

Routes can have parameters, prefixed by a colon character:

```typescript
@router.route("/users/:user", "GET")
function userDetail({ params }) {
  const { firstname, lastname, email } = getUserFromSlug(params[0]);
  return {
    content: JSON.stringify({ firstname, lastname, email }),
    statusCode: 200
  };
}
```

The `params` array contains the parsed values of the parameters. Optional parameters can be suffixed with a question mark.

```typescript
@router.route("/posts/:post?", "GET")
function postDetail(props) { /* ... */}

router.addRoute("/posts/:post?", "GET").use(/* ...*/);
```

Specifying the method is optional, and if left out, the route will match **all methods**.

## Middlewares

Router can have their own middlewares. They will be applied before any route.
To add more data through the middleware, use the `extra` object, which is the same as the `extra` object of the Server Middleware.

```typescript
router.use(tap({ path, extra }) => {
  if(path.startsWith("/admin")) {
    if(!checkUserIsAdmin(extra.user.id)) {
      throw new Error403("You are not authorized to access the administration dashboard.");
    }
  }
});
```
