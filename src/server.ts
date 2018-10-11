import {
  Server as OriginalServer,
  IncomingMessage,
  ServerResponse
} from "http";
import { Observable, OperatorFunction } from "rxjs";
import { ServerMiddleware } from "./middleware";
import { retry, catchError } from "rxjs/operators";

/**
 * Encapsulated Request and Response objects. The extra object can contain
 * anything, and is mostly there for middleware that manipulate data.
 */
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

/**
 * The server. Encapsulates Node's `http.Server` by binding Observable
 * subscriber methods to its events.
 *
 * Contrary to other popular server libraries, the port is passed on the
 * constructor rather than when listening - this is an implementation detail,
 * but all Observable work is done within the constructor. Calling the `run`
 * method will subscribe to the encapsulating Observable, calling the setup
 * functions and starting the server.
 *
 * Put it another way, while the port is asked for in the constructor, the
 * server will actually only start when `run` is called, due to the lazy-
 * evaluating properties of Observables.
 */
export class Server {
  private _obs: Observable<IServerRequest>;
  private _mdw: InternalMiddleware[];

  /**
   * Initializes a new Server instance.
   * Contrary to other popular server libraries, the port is passed on the
   * constructor rather than when listening - this is an implementation detail,
   * but all Observable work is done within the constructor. Calling the `run`
   * method will subscribe to the encapsulating Observable, calling the setup
   * functions and starting the server.
   *
   * Put it another way, while the port is asked for in the constructor, the
   * server will actually only start when `run` is called, due to the lazy-
   * evaluating properties of Observables.
   * @param port Port to bind the server to.
   */
  constructor(port: number) {
    this._obs = observableServer(port);
    this._mdw = new Array();
  }

  /**
   *
   * @param middleware Server middleware to plug into the server.
   * @param [priority=0] Middleware priority. Higher priority middleware will
   * run before lower priority ones. Default value is 0.
   */
  public use(middleware: ServerMiddleware, priority?: number) {
    priority = priority || 0;
    this._mdw.push({ priority, middleware });
    if (this._mdw.length > 1) {
      this._mdw.sort((a, b) => b.priority - a.priority);
    }
  }

  /**
   * Run the server.
   */
  public run() {
    this.use(this.errorMiddleware(), Number.MIN_SAFE_INTEGER);
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
