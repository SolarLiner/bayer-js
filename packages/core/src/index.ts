import { createServer, IncomingMessage, Server, ServerResponse } from "http";

import chalk from "chalk";
import { Observable, of, OperatorFunction } from "rxjs";
import { mergeMap } from "rxjs/operators";

import { Request } from "./request";
import { Response } from "./response";

type RequestFunction = (req: IncomingMessage, res: ServerResponse) => void;

export interface IBayerCallback<T extends { [x: string]: any }> {
  req: Request;
  res: Response;
  extra: T;
}

export type ServerMiddleware<T = any, U = any> = OperatorFunction<IBayerCallback<T>, IBayerCallback<U>>;

export default class Bayer<T = any> {
  private middlewares: Array<{
    middleware: ServerMiddleware;
    priority: number;
  }>;

  private obs: Observable<IBayerCallback<T>>;
  private reqFunc!: RequestFunction;

  constructor() {
    this.middlewares = new Array();
    this.obs = new Observable<IBayerCallback<T>>(sub => {
      this.reqFunc = (req, res) => {
        const callbackObj = this.convertServerParams(req, res);
        sub.next(callbackObj);
        this.terminateRequest(callbackObj);
      };
    });
  }

  public use<U = T>(middleware: ServerMiddleware<T, U>, priority = 0) {
    this.middlewares.push({ middleware, priority });
  }

  public async listen(port = 80) {
    // tslint:disable-next-line:variable-name
    return new Promise<Server>((resolve, _reject) => {
      const cb = this.callback();
      const server = createServer(cb);
      server.listen(port, () => resolve(server));
    });
  }

  public callback() {
    this.sortMiddlewares();
    const obs = this.obs.pipe(
      mergeMap(v => {
        return this.middlewares.reduce((req, m) => req.pipe(m.middleware), of(v));
      })
    );
    obs.subscribe();
    return this.reqFunc;
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

  private terminateRequest({ req, res }: IBayerCallback<T>) {
    const start = Date.now();
    setTimeout(() => {
      if (!res.done) {
        res.status(404).send(`Cannot ${req.route.method || "GET"} ${req.route.path}`);
      }
      const ms = Date.now() - start;
      this.log(req, res, ms);
    }, 0);
  }

  private log(req: Request, res: Response, ms: number) {
    const { method, path } = req.route;
    const { statusCode, statusMessage } = res;
    const { blue, green, greenBright } = chalk;
    const chalkResult = statusCode === 200 ? green : chalk.red;
    process.stdout.write(
      `${chalk.grey(new Date().toLocaleString())} ${blue("Request")} ${green(method)} ${greenBright(
        path
      )} ${ms} ms - ${chalkResult(`${statusCode} ${statusMessage}`)}\n`
    );
  }
}

export * from "./request";
export * from "./response";
