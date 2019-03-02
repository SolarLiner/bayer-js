# `@bayerjs/router`

Package containing a router middleware for the Bayer.js server library.

```typescript
const server = new Bayer();
const router = new Router();
router.route("/profile/:name", function(params) {
  console.log(params);
  return `Hello, ${params[0]}!`;
});

server.use(router.middleware(), 1);
// tslint:disable-next-line:no-console
server.listen(3000).then(() => console.log("Listening on http://localhost:3000"));
```

The router makes it easier to create practical web servers. Instead of directly exposing the Request and Response
objects, the Router middleware will expose extracted data directly, tucking the `req`/`res` objects behind the `request`
object.

## Usage

### Add routes

The following code snippets are equivalent:

```typescript
const router = new Router();
router.route("GET", "/path/to/route", function() {
    return "Hello World!";
});
```

Routes can have parameters, prefixed by a colon character:

```typescript
router.route("GET", "/users/:user", userDetail);

function userDetail({ params }) {
  const { firstname, lastname, email } = getUserFromSlug(params[0]);
  return {
    content: JSON.stringify({ firstname, lastname, email }),
    statusCode: 200
  };
}
```

The `params` array contains the parsed values of the parameters. Optional parameters can be suffixed with a question
mark.

```typescript
router.route("GET", "/posts/:post?", postDetail)
function postDetail(props) { /* ... */ }
```

## Middlewares (To be implemented)

Router can have their own middlewares. They will be applied before any route.
To add more data through the middleware, use the `extra` object, which is the same as the `extra` object of the Server
Middleware.

```typescript
router.use(tap({ path, extra }) => {
  if(path.startsWith("/admin")) {
    if(!checkUserIsAdmin(extra.user.id)) {
      throw new HttpError(403, "Unauthorized", "You are not authorized to access the administration dashboard.");
    }
  }
});
```
