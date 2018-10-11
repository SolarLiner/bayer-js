import { Server as OriginalServer, IncomingMessage, ServerResponse } from "http";
import { Observable, OperatorFunction } from "rxjs";
import { ServerMiddleware } from "./middleware";
import { retry, catchError } from "rxjs/operators";

export interface IServerRequest {
  req: IncomingMessage;
  res: ServerResponse;
  extra: {
    [x: string]: any;
  };
}

interface InternalMiddleware {
  middleware: ServerMiddleware;
  priority: number;
}

function observableServer(port: number, cb?: () => void) {
  return new Observable<IServerRequest>(sub => {
    const server = new OriginalServer((req, res) => {
      sub.next({ req, res, extra: {} });
      if (!res.writable) {
        res.write("\n");
        res.statusCode = 500;
        res.end();
      }
    });
    server.on("close", sub.complete);
    server.listen(port, cb);
  });
}

function addToPipe<T, R>(obs: Observable<T>, func: OperatorFunction<T, R>) {
  return obs.pipe(func);
}

export class Server {
  private _obs: Observable<IServerRequest>;
  private _mdw: InternalMiddleware[];
  constructor(port: number) {
    this._obs = observableServer(port);
    this._mdw = new Array();
  }
  public use(middleware: ServerMiddleware, priority?: number) {
    priority = priority || 0;
    this._mdw.push({ priority, middleware });
    if (this._mdw.length > 1) {
      this._mdw.sort((a, b) => b.priority - a.priority);
    }
  }
  public run() {
    let obs = this._obs.pipe(retry());
    for (let { middleware } of this._mdw) {
      obs = addToPipe(obs, middleware);
    }
    obs.subscribe();
    return Promise.resolve(this);
  }

  private errorMiddleware(): ServerMiddleware {
    return catchError((err, caught) => {
      console.error(err);
      caught.toPromise().then(({ req, res }) => {
        res.writeHead(500, "Server error", { "Content-Type": "text/plain" });
        res.write(`Cannot ${req.method} ${req.url}\n`);
        res.write(err);
        res.end();
      });
      return caught;
    });
  }
}
