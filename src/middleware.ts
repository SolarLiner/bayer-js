import { Observable, OperatorFunction } from "rxjs";
import { tap, map, mergeMap } from "rxjs/operators";
import { StringDecoder } from "string_decoder";
import { IServerRequest } from "./server";
import { IncomingMessage, ServerResponse } from "http";
import qs from "querystring";

/**
 * Server middleware type.
 */
export type ServerMiddleware = OperatorFunction<IServerRequest, IServerRequest>;

/**
 * Parses the body of a Request and tries to decode its payload.
 * 
 * If decoded, the object will be in `extra.body`. If not, the payload will be
 * available under `extra.payload`.
 */
export function bodyParser(): ServerMiddleware {
  return mergeMap(({ req, res, extra }) => {
    return new Observable<IServerRequest>(sub => {
      const d = new StringDecoder();
      let payload = "";
      req.on("data", buf => (payload += d.write(buf)));
      req.on("end", async () => {
        payload += d.end();
        switch (req.headers["content-type"]) {
          case "application/json":
            const json = JSON.parse(payload);
            sub.next({ req, res, extra: { ...extra, body: json } });
            break;
          case "multipart/form-data":
            const formdata = qs.parse(payload);
            console.log(formdata);
            sub.next({ req, res, extra: { ...extra, body: formdata } });
          default:
            console.log("Unknown MIME", req.headers["content-type"]);
            sub.next({ req, res, extra: {...extra, payload} });
            break;
        }
        sub.complete();
      });
      req.on("error", err => sub.error(err));
    });
  });
}

/**
 * Logs request as they come.
 */
export function requestLogger(): ServerMiddleware {
  return tap(({ req, extra }) => {
    const { url, method } = req;
    console.log("Request", method, url, extra);
  });
}

type ExpressMiddleware = (
  req: IncomingMessage,
  res: ServerResponse,
  next: (err?: any) => void
) => void;

/**
 * Wrap an Express middleware to work for the server.
 * 
 * Note: The wrapped middleware receive proxied objects of the request and
 * response. If the middleware adds a property to either `req` or `res`, the
 * the proxies will instead set it to the `extra` object.
 * 
 * About `next()`: This server makes no use of the `next()` method - middlewares
 * are chained together through Observable piping. All the passed function does
 * is throw an error if something is passed to it. It also checks for the type
 * to throw an Error objects everytime, as it should be :)
 * @param m Express middleware to wrap.
 */
export function expressWrapper(m: ExpressMiddleware): ServerMiddleware {
  const t = function(err?: any) {
    if (!err) return;
    if (!(err instanceof Error)) {
      throw new Error(err);
    } else {
      throw err;
    }
  };

  return map(({ req, res, extra: _e }) => {
    const extra: any = {};
    const proxyFactory = (obj: any) => {
      return new Proxy(obj, {
        get: (tgt, name) => {
          if (name in tgt) return tgt[name];
          else return extra[name] || undefined;
        },
        set: (tgt, name, value, receiver) => {
          if (name in tgt) tgt[name] = value;
          else extra[name] = value;
          return true;
        }
      });
    };
    const __req = proxyFactory(req);
    const __res = proxyFactory(res);
    m(__req, __res, t);
    return { req, res, extra };
  });
}
