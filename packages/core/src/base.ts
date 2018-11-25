import { Observable, of } from "rxjs";
import { catchError, first, mergeMap, tap } from "rxjs/operators";
import { InternalMiddleware, IServerRequest, ServerMiddleware } from "./index";
import { addToPipe } from "./utils";

/**
 * TODO: Change the reference documentation
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
export abstract class BaseServer {
  private middleware: InternalMiddleware[];
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
  constructor() {
    this.middleware = new Array();
  }

  public abstract get observer(): Observable<IServerRequest>;

  /**
   *
   * @param middleware Server middleware to plug into the server.
   * @param [priority=0] Middleware priority. Higher priority middleware will
   * run before lower priority ones. Default value is 0.
   */
  public use(middleware: ServerMiddleware, priority?: number) {
    priority = priority || 0;
    this.middleware.push({ priority, middleware });
    if (this.middleware.length > 1) {
      this.middleware.sort((a, b) => b.priority - a.priority);
    }
  }
  /**
   * Run the server.
   */
  public run() {
    return new Promise<BaseServer>(resolve => {
      const obs = this.observer.pipe(mergeMap(v => {
        let req = of(v);
        for (const { middleware } of this.middleware) {
          req = addToPipe(req, middleware);
        }
        return req.pipe(this.errorMiddleware(), this.fallbackMiddleware());
      }));
      obs.subscribe();
      resolve(this);
    });
  }
  private errorMiddleware(): ServerMiddleware {
    return catchError((err, caught) => {
      // tslint:disable-next-line:no-console
      console.error("ERROR: ", err);
      caught.pipe(first(), tap(({ req, res }) => {
        if (!res.headersSent) {
          res.writeHead(500, "Server error", {
            "Content-Type": "text/plain"
          });
          res.write(`Error ${req.method}ing ${req.url}\n`);
          res.write(err);
          res.write("\n");
        }
        res.end();
      }));
      return caught;
    });
  }
  private fallbackMiddleware(): ServerMiddleware {
    return tap(({ req, res }) => {
      if (!res.finished) {
        if (!res.headersSent) {
          res.writeHead(404, "Content not found", {
            "Content-Type": "text/plain"
          });
          res.write(`Cannot ${req.method} ${req.url}\n`);
        }
        res.end();
      }
    });
  }
}
