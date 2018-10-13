import { Server } from "./server";
import { requestLogger, expressWrapper, bodyParser } from "./middleware";
import { tap, map } from "rxjs/operators";
import expressBodyParser = require("body-parser");
import { Router } from "./router";

const server = new Server(3000);
server.use(bodyParser(), 2);
server.use(requestLogger());

const router = new Router();
router.addRoute(/foo\/^(.*)$/).use(
  map(({ path, params }) => {
    return {
      statusCode: 404,
      content: `Params for ${path}: ${(params || []).join(", ")}\n`
    };
  })
);
server.use(router.asMiddleware(), 1);

server.run().then(() => {
  console.log("Listening on http://localhost:3000");
});
