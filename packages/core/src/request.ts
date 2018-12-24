import { createWriteStream } from "fs";
import { IncomingMessage, IncomingHttpHeaders } from "http";
import { tmpdir } from "os";
import { join } from "path";
import { parse } from "querystring";
import { StringDecoder } from "string_decoder";

import Busboy from "busboy";
import { IBayerCallback } from ".";

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

export interface IUploadedFiles {
  [x: string]: {
    /**
     * MIME type of the uploaded object.
     * @example "image/png"
     */
    mimetype: string;
    /**
     * Path of the temporary file containing the uploaded file.
     */
    filepath: string;
    /**
     * Original file name when uploaded.
     */
    filename: string;
  };
}

export interface IFormData<T> {
  data: T;
  files: IUploadedFiles;
}

/**
 * Router object being passed in to routes upon request.
 */
export interface IRoute {
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
}

export class Request extends IncomingMessage {
  public static fromMessage(req: IncomingMessage) {
    return new Request(req.socket);
  }

  private memUrl?: IRoute;

  public get route() {
    if (this.memUrl) {
      return this.memUrl;
    }
    const { url, method: m, headers } = this;
    const { pathname, query } = parse(url || "");
    const path =
      typeof pathname === "string"
        ? (pathname || "").replace(/^\/+|\/+$/g, "")
        : (pathname[0] || "").replace(/^\/+|\/+$/g, "");
    const method = toHTTPVerb(m);
    if (!method) { throw new Error("Unrecognized HTTP verb."); }

    return this.memUrl = { headers, method, path, query };
  }

  public get(key: string) {
    return { ...this.headers, ...this.route.query }[key];
  }

  public async json<T = any>(): Promise<T> {
    return JSON.parse(await this.body());
  }

  public async formData<T = any>() {
    const busboy = new Busboy({ headers: this.headers });
    const body: IFormData<T> = {
      data: {} as T,
      files: {}
    };

    return new Promise<IFormData<T>>((resolve, reject) => {
      busboy.on("file", (fieldname, file, filename, encoding, mimetype) => {
        const fn = `${fieldname.toLowerCase()}-${filename.toLowerCase()}`;
        const filepath = join(tmpdir(), fn);
        file.pipe(createWriteStream(filepath));
        body.files[fieldname] = { filename, filepath, mimetype };
      });
      busboy.on("field", (fieldname, val) => {
        (body.data as any)[fieldname] = val;
      });
      busboy.on("finish", () => {
        resolve(body);
      });
      this.pipe(busboy);
    });
  }

  public async urlEncoded() {
    return parse(await this.body());
  }

  public body() {
    return new Promise<string>((resolve, reject) => {
      const d = new StringDecoder();
      let payload = "";
      this.on("data", chunk => (payload += d.write(chunk)));
      this.on("end", () => resolve(payload + d.end()));
      this.on("error", err => reject(err));
      this.on("close", () => {
        console.log("Connection closed.");
        resolve(payload + d.end());
      });
    });
  }
}

function toHTTPVerb(verb?: string) {
  if (!verb) { return undefined; }
  if (HTTP_VERBS.some(v => v === verb)) { return verb as HTTPVerb; }
  else { return null; }
}
