import { Observable } from "rxjs";
import { IServerRequest, BaseServer } from "./index";
import { Server } from "http";

export class HTTPServer extends BaseServer {
  _obs: Observable<IServerRequest>;
  constructor(port: number) {
    super();
    this._obs = new Observable<IServerRequest>(sub => {
      const server = new Server((req, res) => {
        sub.next({ req, res, extra: {} });
      });
      server.on("close", () => sub.complete());
      server.listen(port);
    });
  }
}
