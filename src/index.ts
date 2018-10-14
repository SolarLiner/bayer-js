import { Server } from "./server";
import { requestLogger, bodyParser } from "./middleware";
import { map } from "rxjs/operators";
import { Router } from "./router";

const server = new Server(3000);
server.use(bodyParser(), 2);
server.use(requestLogger());

const router = new Router();
router
  .addRoute(":user")
  .use(
    map(({ path, params }) => {
      console.log("From route", path, params);
      return {
        statusCode: 200,
        content: `Params for ${path}: ${(params || []).join(", ")}\n`
      };
    })
  )
  .addRoute("")
  .use(
    map(() => {
      return {
        statusCode: 200,
        content: "Hello from the index!"
      };
    })
  );
server.use(router.asMiddleware(), 1);

server.run().then(() => {
  console.log("Listening on http://localhost:3000");
});
