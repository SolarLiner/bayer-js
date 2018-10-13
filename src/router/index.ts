import { ServerMiddleware } from "../middleware";
import { map, mergeMap } from "rxjs/operators";
import { parse } from "url";
import { IncomingHttpHeaders, OutgoingHttpHeaders, ServerResponse } from "http";
import { IServerRequest } from "../server";
import { of, OperatorFunction, pipe } from "rxjs";
import { Minimatch } from "minimatch";
import { Stream } from "stream";

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

export interface IRouterProps {
  path: string;
  method?: HTTPVerb;
  headers: IncomingHttpHeaders;
  query?: any;
  request: IServerRequest;
  extra: {
    [x: string]: any;
  };
  params?: string[];
}

export type RouterMiddleware = OperatorFunction<IRouterProps, IRouterProps>;
interface IRouterResponse {
  statusCode: number;
  statusReason?: string;
  headers?: OutgoingHttpHeaders;
  mime?: string;
  content: string | Stream;
}

type ResponseHandler = OperatorFunction<IRouterProps, IRouterResponse>;

export interface IRoute {
  route: RegExp;
  methods: MatchHTTPVerb[];
  handler: ResponseHandler;
}

function toHTTPVerb(verb?: string) {
  if (!verb) return undefined;
  if (HTTP_VERBS.some(v => v === verb)) return verb as HTTPVerb;
  else return null;
}

function matchesRoute(route: IRoute, path: string, method: HTTPVerb) {
  const methodMatches = route.methods.some(
    value => value === method || value == "__all__"
  );
  return methodMatches && route.route.test(path);
}

function getMatchParams(r: IRoute, path: string, index?: number) {
  index || (index = 1); // default to the first capturing group
  let matches = [...(r.route.exec(path) || [])];
  matches.splice(0, index);
  return matches;
}

export class Router {
  private _routes: IRoute[];

  constructor() {
    this._routes = new Array();
  }

  public asMiddleware(): ServerMiddleware {
    console.log(this._routes);
    return pipe(
      mergeMap(({ req, res, extra }) => {
        const { url, method: _m, headers } = req;
        const { pathname, query } = parse(url || "");
        const path = (pathname || "").replace(/^\/+|\/+$/g, "");
        const method = toHTTPVerb(_m);
        if (method == null) {
          throw new Error("Unrecognized HTTP verb.");
        }

        const request: IRouterProps = {
          path,
          method,
          headers,
          query,
          request: { req, res, extra },
          extra
        };
        const route = this._routes.filter(r =>
          matchesRoute(r, path, method)
        )[0];
        if (route) {
          return of({ ...request, params: getMatchParams(route, path) }).pipe(
            route.handler,
            map(this.sendResponse({res, req, extra}))
          );
        } else {
          return of({ req, res, extra });
        }
      })
    );
  }

  private sendResponse({ req, res, extra }: IServerRequest) {
    return (response: IRouterResponse) => {
      if (response.statusCode == 200) {
        res.writeHead(200, response.headers);
        res.setHeader("Content-Type", response.mime || "text/plain");
        this.sendResponseContent(response.content, res);
      }
      else {
        res.writeHead(response.statusCode, response.statusReason, response.headers);
        if (typeof response.content === "string") {
          res.write(response.content);
          res.end();
        }
        else {
          const b = response.content;
          b.on("data", buf => res.write(buf));
          b.on("error", err => {
            console.error(err);
            if (err instanceof Error)
              throw err;
            else
              throw new Error(err);
          });
          b.on("end", () => res.end());
        }
      }
      return { req, res, extra };
    };
  }

  private sendResponseContent(content: string | Stream, res: ServerResponse) {
    if (typeof content === "string") {
      res.write(content);
      res.end();
    }
    else {
      content.on("data", buf => res.write(buf));
      content.on("end", () => res.end());
    }
  }

  public addRoute(route: RegExp, ...methods: HTTPVerb[]) {
    let verbs: MatchHTTPVerb[] = [...methods];
    if (verbs.length == 0) {
      verbs = ["__all__"];
    }
    const use = (handler: ResponseHandler) => {
      this._routes.push({ route, methods: verbs, handler });
      return this;
    };
    return { use };
  }

  public addGlobRoute(route: string, ...methods: HTTPVerb[]) {
    const r = new Minimatch(route).makeRe();
    return this.addRoute(r, ...methods);
  }
}
