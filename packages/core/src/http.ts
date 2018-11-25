import { Server } from "http";
import { Observable } from "rxjs";
import { IServerRequest } from ".";
import { BaseServer } from "./base";
export class HTTPServer extends BaseServer {
  protected _obs: Observable<IServerRequest>;

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
