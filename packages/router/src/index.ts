/**
 * Rourter middleware for the Bayer.JS server.
 *
 * TODO: Write router documentation
 *
 * Copyright 2018 Nathan "SolarLiner" Graule
 *
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

import { IncomingHttpHeaders, OutgoingHttpHeaders, ServerResponse } from "http";
import { Stream } from "stream";
import { parse } from "url";

import pathToRegExp from "path-to-regexp";
import { of, OperatorFunction, pipe } from "rxjs";
import { map, mergeMap } from "rxjs/operators";

import { ServerMiddleware } from "@bayerjs/core";
import { IBayerCallback } from "@bayerjs/core";

// from https://developer.mozilla.org/en-US/docs/Web/HTTP/Methods
const HTTP_VERBS = [
  "GET",
  "HEAD",
  "POST",
  "PUT",
  "DELETE",
  "CONNECT",
  "OPTIONS",
  "TRACE",
  "PATCH"
];

/**
 * Accepted HTTP verbs. This restricts the use of allowed HTTP verbs towards
 * better developer experience - this may be changed later though.
 *
 * The list of verbs has been taken from
 * https://developer.mozilla.org/en-US/docs/Web/HTTP/Methods.
 */
export type HTTPVerb =
  | "GET"
  | "HEAD"
  | "POST"
  | "PUT"
  | "DELETE"
  | "CONNECT"
  | "OPTIONS"
  | "TRACE"
  | "PATCH";
type MatchHTTPVerb = HTTPVerb | "__all__";

/**
 * Router object being passed in to routes upon request.
 */
export interface IRouterProps<T extends { [x: string]: any } = any> {
  /**
   * Request path by the client. Has been processed and standardized to always
   * finish with a slash.
   */
  path: string;
  /**
   * HTTP method requested by the client.
   */
  method?: HTTPVerb;
  /**
   * Headers passed by the client in the request.
   */
  headers: IncomingHttpHeaders;
  /**
   * URL query (the part after the question mark), if any.
   */
  query?: any;
  /**
   * Original server request, containing Node's request and response objects.
   *
   * WARNING: Using req/res directly is NOT supported. It may interfere with
   * other middleware or internals and should only be used as a last measure.
   */
  request: IBayerCallback<any>;
  /**
   * Extra data that may be added from the Server or Router middleware.
   */
  extra: T;
  /**
   * Parameters match from the URL route. Array in order of parameters, as
   * given.
   *
   * TODO: Change to an object.
   */
  params?: string[];
}

/**
 * Router middleware that's called on every request, even unmapped ones.
 * Use for access control, or manipulating the props object.
 */
export type RouterMiddleware = OperatorFunction<
  IBayerCallback<any>,
  IBayerCallback<any>
>;

/**
 * Router response from the Router routes.
 */
interface IRouterResponse {
  /**
   * Status code to return to the client.
   *
   * Cheatsheet:
   * - 200 indicates an OK response
   * - 404 indicates a page not found
   * - 403 indicates permission denied
   * - 418 indicates that you're actually a teapot.
   */
  statusCode: number;
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

/**
 * Response handler type alias. A response handler should take the router props
 * in and generate a response with status code and optionally extra headers.
 */
export type ResponseHandler = OperatorFunction<IRouterProps, IRouterResponse>;
export type RouterFunction = (props: IRouterProps) => IRouterResponse;

interface IRoute {
  route: RegExp;
  methods: MatchHTTPVerb[];
  handler: ResponseHandler;
}

function toHTTPVerb(verb?: string) {
  if (!verb) {
    return undefined;
  }
  if (HTTP_VERBS.some(v => v === verb)) {
    return verb as HTTPVerb;
  } else {
    return null;
  }
}

function matchesRoute(route: IRoute, path: string, method: HTTPVerb) {
  const methodMatches = route.methods.some(
    value => value === method || value === "__all__"
  );
  return methodMatches && route.route.test(path);
}

function getMatchParams(r: IRoute, path: string, index?: number) {
  if (!index) {
    index = 1;
  }
  const matches = [...(r.route.exec(path) || [])];
  matches.splice(0, index);
  return matches;
}

/**
 * Router middleware.
 * This class handles dispatching requests to routes, and piping callbacks.
 */
export class Router {
  private routes: IRoute[];

  /**
   * Initializes a new Router instance.
   */
  constructor() {
    this.routes = new Array();
  }

  /**
   * Add a route to manage through the router.
   *
   * The actual callback will be provided through using the returned function
   * `use`, which itself returns this very instance; this way you can chain
   * several route definitions in one go.
   * @param path Route path. Can have named parameters, which will be matched
   * using `path-to-regexp`, just like many other server libraries.
   * @param methods Methods to match the route to. If omitted, all methods will
   * be matched to this route.
   */
  public addRoute(path: string, ...methods: HTTPVerb[]) {
    let verbs: MatchHTTPVerb[] = [...methods];
    if (verbs.length === 0) {
      verbs = ["__all__"];
    }
    const route = pathToRegExp(path);
    /**
     * Use this route with the given callback.
     * @param handler Pipable callback which handles writing the response
     * string.
     */
    const use = (handler: ResponseHandler) => {
      this.routes.push({ route, methods: verbs, handler });
      return this as Router;
    };
    return { use };
  }

  public route(path: string, ...methods: HTTPVerb[]) {
    return (func: RouterFunction) => {
      this.addRoute(path, ...methods).use(map(func));
    };
  }

  /**
   * Pass this Router instance to the server as a middleware.
   */
  public asMiddleware(): ServerMiddleware {
    console.log(this.routes);
    return pipe(
      mergeMap(({ req, res, extra }) => {
        const { url, method: m, headers } = req;
        const { pathname, query } = parse(url || "");
        const path = (pathname || "").replace(/^\/+|\/+$/g, "");
        const method = toHTTPVerb(m);
        if (method == null) {
          throw new Error("Unrecognized HTTP verb.");
        }

        const request: IRouterProps = {
          extra,
          headers,
          method,
          path,
          query,
          request: { req, res, extra }
        };
        const filteredRoutes = this.routes.filter(r =>
          matchesRoute(r, path, method)
        );
        console.log(filteredRoutes);
        if (filteredRoutes.length > 0) {
          const route = filteredRoutes[0];
          return of({
            ...request,
            params: getMatchParams(route, path)
          }).pipe(
            route.handler,
            map(
              this.sendResponse({
                extra,
                req,
                res
              })
            )
          );
        } else {
          return of({ req, res, extra });
        }
      })
    );
  }

  private sendResponse<T = any>({ req, res, extra }: IBayerCallback<T>) {
    return (response: IRouterResponse) => {
      Object.keys(response.headers || {}).forEach(k =>
        res.setHeader(k, response.headers![k]!)
      );
      res
        .contentType(response.mime || "text/plain")
        .status(response.statusCode, response.statusReason)
        .send(response.content);
      return { req, res, extra };
    };
  }
}
