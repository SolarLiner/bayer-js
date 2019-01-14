import pathToRegexp from "path-to-regexp";
import { empty, of } from "rxjs";
import { catchError, first, map, mergeMap } from "rxjs/operators";

import { ServerMiddleware } from "@bayerjs/core";
import { IRoute as IBaseRoute } from "@bayerjs/core";
import _debug from "debug";
import { OutgoingHttpHeaders } from "http";
import { Stream } from "stream";

const debug = _debug("@bayerjs/router");

/**
 * Router response object to be returned by routes.
 */
interface IRouterResponse {
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

interface IRoute<T = any> extends IBaseRoute {
  params: string[];
  extra: T;
}

/**
 * Router response object type.
 */
export type RouterResponse = IRouterResponse | string | Stream | null;

/**
 * Route middleware function type.
 */
export type RouteMiddleware<T = any> = (params: IRoute<T>) => void;
/** Response handler function type. */
export type ResponseHandler<T = any> = (params: IRoute<T>) => RouterResponse;

interface IRouteInternal {
  method: string;
  route: RegExp;
  op: ResponseHandler;
  middlewares: RouteMiddleware[];
}

function getMatchParams(r: IRouteInternal, path: string, index?: number) {
  if (!index) {
    index = 1;
  }
  const matches = [...(r.route.exec(path) || [])];
  matches.splice(0, index);
  return matches;
}

/**
 * Router class for the Bayer.js server object. Plug into the server like this:
 *
 * ```javascript
 * const server = new Bayer();
 * const router = new Router();
 * router.route(...);
 *
 * server.use(router.middleware());
 *
 * server.listen();
 * ```
 */
export class Router {
  private routes: IRouteInternal[];

  /**
   * Initializes a new Router object.
   */
  constructor() {
    this.routes = new Array();
  }

  /**
   * Adds a route to be handled by the router
   * @param method Method matching this route
   * @param route URL matching this route
   * @param op Function handling the route
   * @param middlewares Optional middlewares handling the route (ie. access control)
   */
  public route(method: string, route: string, op: ResponseHandler, ...middlewares: RouteMiddleware[]) {
    debug("Add route for %s %o", method, route);
    this.routes.push({ route: pathToRegexp(route), op, middlewares, method: method.toUpperCase() });
  }

  /**
   * Returns this router as a server middleware function.
   */
  public middleware(): ServerMiddleware {
    debug("Mounting router");
    return mergeMap(v =>
      of(v).pipe(
        mergeMap(params => {
          const {
            req: { route }
          } = params;
          const matchedRoutes = this.routes.filter(r => route.method === r.method && r.route.test(route.path));
          debug("%d matched routes", matchedRoutes.length);
          if (matchedRoutes.length > 0) return of({ routes: matchedRoutes, params });
          else return empty();
        }),
        mergeMap(({ routes, params }) => {
          return routes.map(route => ({ route, params }));
        }),
        first(),
        map(({ route: origRoute, params }) => {
          const { op, middlewares } = origRoute;
          const {
            req: { route },
            res,
            extra
          } = params;
          const routeArgs: IRoute<typeof extra> = {
            ...route,
            params: getMatchParams(origRoute, route.path),
            extra
          };
          middlewares.forEach(m => m(routeArgs));
          const result = op(routeArgs);

          if (typeof result === "string" || result instanceof Stream) {
            res.status(200, "OK").send(result);
            return params;
          }
          if (result) {
            const { statusCode, statusReason, content } = result;
            res.status(statusCode || 200, statusReason || "OK").send(content);
            return params;
          }
          return params;
        }),
        catchError(err => {
          if (!(err instanceof Error)) {
            err = new Error(err);
          }
          return empty();
        })
      )
    );
  }
}
