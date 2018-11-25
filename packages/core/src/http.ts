import { Server } from "http";
import { Observable } from "rxjs";
import { IServerRequest } from ".";
import { BaseServer } from "./base";
import { ServerOptions, createServer } from "https";
export class HTTPServer extends BaseServer {
  private obs: Observable<IServerRequest>;

  constructor(port: number) {
    super();
    this.obs = new Observable<IServerRequest>(sub => {
      const server = new Server((req, res) => {
        sub.next({ req, res, extra: {} });
      });
      server.on("close", () => sub.complete());
      server.listen(port);
    });
  }

  public get observer() {
    return this.obs;
  }
}

export class HTTPSServer extends BaseServer {
  private obs: Observable<IServerRequest>;

  constructor(port: number, options: ServerOptions) {
    super();
    this.obs = new Observable<IServerRequest>(sub => {
      const server = createServer(options || {}, (req, res) => {
        sub.next({ req, res, extra: {} });
      })
      server.on("close", () => sub.complete());
      server.listen(port);
    });
  }

  public get observer() {
    return this.obs;
  }
}
