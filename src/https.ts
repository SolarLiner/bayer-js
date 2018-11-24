import { Observable } from "rxjs";
import { IServerRequest, BaseServer } from "./index";
import { createServer, ServerOptions } from "https";

export class HTTPSServer extends BaseServer {
  _obs: Observable<IServerRequest>;
  constructor(port: number, options?: ServerOptions) {
    super();
    this._obs = new Observable<IServerRequest>(sub => {
      const server = createServer(options || {}, (req, res) => {
        sub.next({ req, res, extra: {} });
      })
      server.on("close", () => sub.complete());
      server.listen(port);
    });
  }
}
