import { Server } from "./server";
import { requestLogger, expressWrapper, bodyParser } from "./middleware";
import { tap } from "rxjs/operators";
import expressBodyParser = require("body-parser");

const server = new Server(3000);
server.use(expressWrapper(expressBodyParser.json()), 1);
server.use(bodyParser(), 1);
server.use(requestLogger());
server.use(tap(({ res, extra }) => {
  res.statusCode = 200;
  res.write(JSON.stringify(extra));
  res.end();
}));

server.run().then(() => {
  console.log("Listening on http://localhost:3000");
});
