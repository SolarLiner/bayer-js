import { Server } from "./server";
import { requestLogger, bodyParser } from "./middleware";
import { tap } from "rxjs/operators";

const server = new Server(3000);
server.use(bodyParser(), 100);
server.use(requestLogger());
server.use(tap(({ res, extra }) => {
  res.statusCode = 200;
  res.write(JSON.stringify(extra));
  res.end();
}));

server.run().then(() => {
  console.log("Listening on http://localhost:3000");
});
