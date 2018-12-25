import { createServer, IncomingMessage, Server, ServerResponse } from "http";

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

export class Bayer<T = any> {
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
        const start = Date.now();
        const callbackObj = this.convertServerParams(req, res);
        sub.next(callbackObj);
        setTimeout(() => {
          const ms = Date.now() - start;
          this.log(callbackObj, ms);
        }, 0);
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
      console.log("[Bayer.listen]", this, this.callback, cb);
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
    obs.subscribe(x => console.log("[DEBUG]", "callback observable", x));
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

  private log({ req, res }: IBayerCallback<T>, ms: number) {
    const { method, path } = req.route;
    const { statusCode, statusMessage } = res;
    // tslint:disable-next-line:no-console
    console.log("Request", method, path, statusCode, statusMessage, `- ${Math.round(ms)} ms`);
  }
}
