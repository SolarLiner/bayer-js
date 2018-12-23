import { createServer, IncomingMessage, ServerResponse } from "http";

import { Observable, OperatorFunction } from "rxjs";

import { Request } from "./request";
import { Response } from "./response";

export interface IBayerCallback<T extends { [x: string]: any }> {
  req: Request;
  res: Response;
  extra: T;
}

export type ServerMiddleware<T = any, U = any> = OperatorFunction<
  IBayerCallback<T>,
  IBayerCallback<U>
>;

export class Bayer {
  private middlewares: Array<{ middleware: ServerMiddleware; priority: number }>;

  constructor() {
    this.middlewares = new Array();
  }

  public use<T = any, U = any>(
    middleware: ServerMiddleware<T, U>,
    priority = 0
  ) {
    this.middlewares.push({ middleware, priority });
    this.sortMiddlewares();
  }

  public async listen(port = 80) {
    // tslint:disable-next-line:variable-name
    return new Promise<ThisType<Bayer>>((resolve, _reject) => {
      const server = createServer(this.callback());
      server.listen(port, () => resolve(this));
    });
  }

  public callback() {
    return (request: IncomingMessage, response: ServerResponse) => {
      const req = Request.fromMessage(request);
      const res = new Response(response);

      let obs = new Observable<IBayerCallback<any>>(sub => {
        sub.next({ req, res, extra: {} });
        setTimeout(sub.complete, 0);
      });
      this.middlewares.forEach(m => (obs = obs.pipe(m.middleware)));
    };
  }

  private sortMiddlewares() {
    if (this.middlewares.length > 1) {
      this.middlewares.sort((a, b) => b.priority - a.priority);
    }
  }
}
