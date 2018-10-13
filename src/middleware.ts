import { Observable, OperatorFunction, of, Subscriber, from } from "rxjs";
import { tap, map, mergeMap } from "rxjs/operators";
import { StringDecoder } from "string_decoder";
import { IServerRequest } from "./server";
import { IncomingMessage, ServerResponse } from "http";
import { parse } from "querystring";
import Busboy from "busboy";
import fs from "fs";
import os from "os";
import path from "path";
import { Transform, Readable, Writable } from "stream";

/**
 * Server middleware type.
 */
export type ServerMiddleware = OperatorFunction<IServerRequest, IServerRequest>;

export interface IUploadedFiles {
  [x: string]: {
    mimetype: string;
    file: NodeJS.ReadableStream;
    filename: string;
  };
}

function parseRequestBody(res: IncomingMessage): Promise<string> {
  const d = new StringDecoder();
  return new Promise((resolve, reject) => {
    let payload = "";
    res
      .on("data", chunk => {
        payload += d.write(chunk);
      })
      .on("end", () => {
        resolve(payload + d.end());
      })
      .on("error", err => reject(err));
  });
}

/**
 * Parses the body of a Request and tries to decode its payload.
 *
 * If decoded, the object will be in `extra.body`. If not, the payload will be
 * available under `extra.payload`.
 */
export function bodyParser(): ServerMiddleware {
  return mergeMap(({ req, res, extra }) => {
    const [mimeType, _] = (req.headers["content-type"] || "text-plain").split(
      ";",
      2
    );
    switch (mimeType) {
      case "application/json":
        return from(parseAsJSON(req)).pipe(
          map(body => {
            return { req, res, extra: { ...extra, body } };
          })
        );
      case "multipart/form-data":
        return from(parseAsFormData(req)).pipe(
          map(body => {
            return { req, res, extra: { ...extra, body } };
          })
        );
      case "application/x-www-form-urlencoded":
        return from(parseAsURLEncoded(req)).pipe(
          map(body => {
            return { req, res, extra: { ...extra, body } };
          })
        );
      default:
        return from(parseRequestBody(req)).pipe(
          map(body => {
            return { req, res, extra: { ...extra, body } };
          })
        );
    }
  });
}

async function parseAsURLEncoded(req: IncomingMessage) {
  const payload = await parseRequestBody(req);
  return parse(payload);
}

interface IFormDataBody {
  files: IUploadedFiles;
  data: any;
}

function parseAsFormData(req: IncomingMessage): Promise<IFormDataBody> {
  const busboy = new Busboy({ headers: req.headers });
  const body = {
    files: {} as IUploadedFiles,
    data: {} as any
  };
  return new Promise((resolve, reject) => {
    busboy.on("file", (fieldname, file, filename, encoding, mimetype) => {
      body.files[fieldname] = { file, filename, mimetype };
    });
    busboy.on("field", (fieldname, val) => {
      body.data[fieldname] = val;
    });
    busboy.on("finish", () => {
      resolve(body);
    });
    req.pipe(busboy);
  });
}

async function parseAsJSON(req: IncomingMessage) {
  const payload = await parseRequestBody(req);
  return JSON.parse(payload);
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
