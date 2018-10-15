/**
 * Server class definitions for the Bayer.JS project.
 * 
 * TODO: Write getting started page
 * 
 * Copyright 2018 Nathan "SolarLiner" Graule

 * Permission is hereby granted, free of charge, to any person obtaining a copy 
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
import {
  Server as OriginalServer,
  IncomingMessage,
  ServerResponse
} from "http";
import { Observable, of } from "rxjs";
import { ServerMiddleware } from "./middleware";
import { catchError, switchMap, tap, first, mergeMap } from "rxjs/operators";
import { addToPipe } from "./utils";

/**
 * Encapsulated Request and Response objects. The extra object can contain
 * anything, and is mostly there for middleware that manipulate data.
 */
export interface IServerRequest {
  /**
   * Incoming request. Copied from Node.js's HTTP server module.
   */
  req: IncomingMessage;
  /**
   * Server response. Copied from Node.js's HTTP server module.
   */
  res: ServerResponse;

  /**
   * Extra data that middleware can add to the request object.
   * 
   * NOTE: Express middleware that add data to the request/response object are
   * redirected here instead, through Proxying.
   */
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
    });
    server.on("close", () => sub.complete());
    server.listen(port, cb);
  });
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
    return new Promise<Server>(resolve => {
      const obs = this._obs.pipe(
        mergeMap(v => {
          let req = of(v);
          for (const { middleware } of this._mdw) {
            req = addToPipe(req, middleware);
          }
          return req.pipe(
            this.errorMiddleware(),
            this.fallbackMiddleware()
          );
        })
      );
      obs.subscribe();

      resolve(this);
    });
  }

  private errorMiddleware(): ServerMiddleware {
    return catchError((err, caught) => {
      console.error("ERROR: ", err);
      caught.pipe(
        first(),
        tap(({ req, res }) => {
          if (!res.headersSent) {
            res.writeHead(500, "Server error", {
              "Content-Type": "text/plain"
            });
            res.write(`Cannot ${req.method} ${req.url}\n`);
            res.write(err);
          }
          res.end();
        })
      );
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
          res.write(`Cannot ${req.method} ${req.url}`);
        }
        res.end();
      }
    });
  }
}
