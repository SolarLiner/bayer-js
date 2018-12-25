import pathToRegexp from "path-to-regexp";
import { pipe } from "rxjs";
import { filter, tap } from "rxjs/operators";

import { ServerMiddleware } from "@bayerjs/core";
import { IRoute as IBaseRoute } from "@bayerjs/core";
import { OutgoingHttpHeaders } from "http";
import { Stream } from "stream";

interface IRouterResponse<T=any> {
  /**
   * Status code to return to the client. If not given, will assume 200.
   *
   * Cheatsheet:
   * - 200 indicates an OK response
   * - 404 indicates a page not found
   * - 403 indicates permission denied
   * - 418 indicates that you're actually a teapot.
   */
  statusCode?: number;
  /**
   * A reason to give for the status code.
   */
  statusReason?: string;
  /**
   * Optional headers to send back to the client.
   */
  headers?: OutgoingHttpHeaders;
  /**
   * MIME type of the response. Will overwrite the "Content-Type" header if
   * provided, or be set to "text/plain" otherwise.
   */
  mime?: string;
  /**
   * Content to send to the client. In case of a stream, the content will be
   * piped into the response. It is therefore recommended for larger payloads to
   * use a stream instead.
   */
  content: string | Stream;
}

interface IRoute<T=any> extends IBaseRoute {
  params?: string[];
  extra: T;
}

export type RouterResponse = IRouterResponse | string | Stream | null;

export type ResponseHandler<T=any> = (params: IRoute<T>) => RouterResponse;

interface IRouteInternal {
  method: string;
  route: RegExp;
  ops: ResponseHandler[];
}

export class Router {
  private routes: IRouteInternal[];

  constructor() {
    this.routes = new Array();
  }

  public route(method: string, route: string, op: ResponseHandler, ...ops: ResponseHandler[]) {
    this.routes.push({ route: pathToRegexp(route), ops: [op, ...ops], method: method.toLowerCase() });
  }

  public middleware(): ServerMiddleware {
    return pipe(
      filter(({ req: { route }}) => {
        return this.routes.filter(v => route.method === v.method && v.route.test(route.path)).length > 0;
      }),
      tap((...a) => console.log("[Router] arguments", a))
    );
  }
}
