import chalk from "chalk";
import _debug from "debug";
import { createServer, IncomingMessage, Server, ServerResponse } from "http";
import { Observable, of, OperatorFunction, pipe } from "rxjs";
import { catchError, mergeMap, tap } from "rxjs/operators";

import { Request } from "./request";
import { Response } from "./response";

type RequestFunction = (req: IncomingMessage, res: ServerResponse) => void;

const debug = _debug("@bayerjs/core");

/**
 * Callback object type used in the Server middlewares.
 */
export interface IBayerCallback<T extends { [x: string]: any }> {
  /** Request object. */
  req: Request;
  /** Response object. */
  res: Response;
  /** Extra data to be used by middlewares (to add or to use). */
  extra: T;
}

/** Server middleware type. Every middleware is a RxJS operator (pipe included) to which is passed a Callback object and
 * is expected to return one as well.
 */
export type ServerMiddleware<T = any, U = any> = OperatorFunction<IBayerCallback<T>, IBayerCallback<U>>;

/**
 * Bayer.js server class. This is the main application and the entrypoint to every Bayer.js server applications.
 */
export default class Bayer<T = any> {
  private middlewares: Array<{
    middleware: ServerMiddleware;
    priority: number;
  }>;

  private obs: Observable<IBayerCallback<T>>;
  private reqFunc!: RequestFunction;

  /**
   * Initializes a new Bayer server.
   */
  constructor() {
    this.middlewares = new Array();
    this.obs = new Observable<IBayerCallback<T>>(sub => {
      this.reqFunc = (req, res) => {
        debug("Request: %s %s", req.url, req.url);
        const callbackObj = this.convertServerParams(req, res);
        sub.next(callbackObj);
      };
    });
  }

  /**
   * Add a middleware function to be used by the server.
   * @param middleware Middleware to be added to the pipeline
   * @param [priority=0] Optional priority given to the middleware.
   */
  public use<U = T>(middleware: ServerMiddleware<T, U>, priority = 0) {
    debug("Add middleware %s", middleware.toString().substring(0, 15));
    this.middlewares.push({ middleware, priority });
  }

  /**
   * Listens into a port for new requests.
   *
   * Note: This is a convinience wrapper for the `Bayer.callback` function. This is equivalent to:
   *
   * ```javascript
   * http.createServer(port, app.callback()); // assuming app is the Bayer server object
   * ```
   * @param port Port to listen for new requests.
   * @retuns A promise resolving to the http server created.
   */
  public async listen(port = 80) {
    // tslint:disable-next-line:variable-name
    return new Promise<Server>((resolve, _reject) => {
      const cb = this.callback();
      const server = createServer(cb);
      debug("Listening on :%d", port);
      server.listen(port, () => resolve(server));
    });
  }

  /**
   * Callback function. Main entrypoint for requests.
   *
   * This was designed to be passed into the `http.createServer` function to get server requests. It was also designed
   * for serverless environments where functions are called on http requests.
   *
   * @returns A function that accepts Node.js's IncomingMessage and ServerResponse objects.
   */
  public callback() {
    debug("Prepare server listening");
    this.sortMiddlewares();
    let start: number; // TODO: Make start/stop timer concurrency-safe.
    const obs = this.obs.pipe(
      tap(() => {
        start = Date.now();
      }),
      this.middleware(),
      tap(params => this.terminateRequest(params, start))
    );
    obs.subscribe();
    return this.reqFunc;
  }

  /**
   * Return the app as a middleware. Useful to plug applications together.
   */
  public middleware(): ServerMiddleware {
    return pipe(
      mergeMap(v => {
        const middleware$ = this.middlewares.reduce((req, m) => req.pipe(m.middleware), of(v));
        return middleware$.pipe(
          catchError(err => {
            this.handleRequestError(err, v);
            return of(v);
          })
        );
      })
    );
  }

  private sortMiddlewares() {
    if (this.middlewares.length > 1) {
      this.middlewares.sort((a, b) => b.priority - a.priority);
    }
  }

  private convertServerParams(request: IncomingMessage, response: ServerResponse): IBayerCallback<T> {
    const req = new Request(request);
    const res = new Response(response);

    return { req, res, extra: {} as T };
  }

  private terminateRequest({ req, res }: IBayerCallback<T>, start: number) {
    if (!res.done) {
      debug("%s %s not done", req.route.method, req.route.path);
      res.status(404).send(`Cannot ${req.route.method || "GET"} ${req.route.path}`);
    }
    const ms = Date.now() - start;
    this.log(req, res, ms);
  }

  private log(req: Request, res: Response, ms: number) {
    const { method } = req.route;
    const path = req.fullPath;
    const { statusCode: handleRequestError, statusMessage } = res;
    const { blue, green, greenBright } = chalk;
    const chalkResult = handleRequestError === 200 ? green : chalk.red;
    process.stdout.write(
      `${chalk.grey(new Date().toLocaleString())} ${blue("Request")} ${green(method)} ${greenBright(
        path
      )} ${ms} ms - ${chalkResult(`${handleRequestError} ${statusMessage}`)}\n`
    );
  }

  private handleRequestError(err: any, { res }: IBayerCallback<T>) {
    debug("Handle error %O", err);
    if (typeof err === "number") {
      res.status(err).end();
    } else if (err instanceof HttpError) {
      const ress = res.status(err.code);
      if (err.reason) return ress.send(err.reason);
      ress.end();
    } else {
      const ress = res.status(500, "Internal server error");
      if (err instanceof Error) return ress.send(`${err.name} : ${err.message}`);
      ress.end();
    }
  }
}

/**
 * Custom error class to handle flow-breaking response (such as HTTP errors).
 *
 * @example throw new HttpError(403, "Unauthorized").
 */
export class HttpError extends Error {
  public code: number;
  public reason?: string;

  /**
   * Initializes a new HttpError object.
   * @param statusCode Status code to be send with the response
   * @param statusMessage Status message to be sent with the status code, and as response body.
   */
  constructor(statusCode: number, statusMessage?: string) {
    super(`${statusCode} ${statusMessage}`);
    this.name = "HttpError";
    this.code = statusCode;
    this.reason = statusMessage;

    // HACK: Set prototype manually: https://github.com/Microsoft/TypeScript-wiki/blob/master/Breaking-Changes.md#extending-built-ins-like-error-array-and-map-may-no-longer-work
    Object.setPrototypeOf(this, HttpError.prototype);

    Error.captureStackTrace(this, this.constructor);
  }
}

export * from "./request";
export * from "./response";
