import { createWriteStream } from "fs";
import { IncomingHttpHeaders, IncomingMessage } from "http";
import { Socket } from "net";
import { tmpdir } from "os";
import { join, relative } from "path";
import querystring from "querystring";
import { StringDecoder } from "string_decoder";
import { parse } from "url";

import Busboy from "busboy";
import chalk from "chalk";

// from https://developer.mozilla.org/en-US/docs/Web/HTTP/Methods
const HTTP_VERBS = ["GET", "HEAD", "POST", "PUT", "DELETE", "CONNECT", "OPTIONS", "TRACE", "PATCH"];

/**
 * Accepted HTTP verbs. This restricts the use of allowed HTTP verbs towards
 * better developer experience - this may be changed later though.
 *
 * The list of verbs has been taken from
 * https://developer.mozilla.org/en-US/docs/Web/HTTP/Methods.
 */
export type HTTPVerb = "GET" | "HEAD" | "POST" | "PUT" | "DELETE" | "CONNECT" | "OPTIONS" | "TRACE" | "PATCH";
type MatchHTTPVerb = HTTPVerb | "__all__";

/**
 * Uploaded files type. Used by {@link Request.formData}.
 */
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
  method: HTTPVerb;
  /**
   * Headers passed by the client in the request.
   */
  headers: IncomingHttpHeaders;
  /**
   * URL query (the part after the question mark), if any.
   */
  query: {
    [x: string]: string | string[];
  };
}

/**
 * Request class. Used by the Bayer server to represent an incoming request.
 *
 * The Request class doesn't extend IncomingMessage in order to shield its methods to the user - instead exposing a
 * select few.
 */
export class Request {
  /**
   * Create a new Request object from a socket.
   * @param sock Socket to bind.
   */
  public static fromSocket(sock: Socket) {
    const req = new IncomingMessage(sock);
    return new Request(req);
  }

  private req: IncomingMessage;
  private memUrl?: IRoute;

  /**
   * Initializes a new Request object.
   * @param request Node.js's IncomingMessage object used as base for this Request object.
   */
  constructor(request: IncomingMessage, private baseUrl = "/") {
    this.req = request;
  }

  /**
   * Gets the request's HTTP version as an object {version, major, minor}.
   */
  public get httpVersion() {
    return {
      version: this.req.httpVersion,
      major: this.req.httpVersionMajor,
      minor: this.req.httpVersionMinor
    };
  }

  /**
   * Gets the request trailers.
   */
  public get trailers() {
    return this.req.trailers;
  }

  /**
   * Gets the request's method.
   */
  public get method() {
    return this.route.method;
  }

  /**
   * Gets the requests headers.
   */
  public get headers() {
    return this.req.headers;
  }

  /** Pipes data out of this request to a WriterStream. */
  public get pipe() {
    return this.req.pipe;
  }

  /**
   * Subscribe to the underlying IncomingMessage events.
   */
  public get on() {
    return this.req.on;
  }

  /**
   * Get request route, which is its headers, method, path, and query parameters.
   *
   * Note: This is memoized per Request object. Data will only be evaluated once.
   */
  public get route() {
    if (this.memUrl) {
      return this.memUrl;
    }
    return (this.memUrl = this.getRoute());
  }

  /**
   * Gets a value from this request's query objects, headers or trailers.
   * @param key Key string to search for.
   */
  public get(key: string) {
    return { ...this.trailers, ...this.headers, ...this.route.query }[key];
  }

  /** Returns the request body from a JSON object body. */
  public async json<T = any>(): Promise<T> {
    return JSON.parse(await this.body());
  }

  /** Returns the request body from a Form Data body. */
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
        file.pipe(createWriteStream(filepath, { encoding }));
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

  /** Returns the request body from a URL Encoded body. */
  public async urlEncoded() {
    return parse(await this.body());
  }

  /** Decodes and returns the request body as string. */
  public body() {
    return new Promise<string>((resolve, reject) => {
      const d = new StringDecoder();
      let payload = "";
      this.on("data", chunk => (payload += d.write(chunk)));
      this.on("end", () => resolve(payload + d.end()));
      this.on("error", err => reject(err));
      this.on("close", () => {
        process.stdout.write(
          chalk.gray(new Date().toLocaleString()) + chalk.yellowBright(" W: Connection closed") + "\n"
        );
        resolve(payload + d.end());
      });
    });
  }

  private getRoute() {
    const { url, method: m, headers } = this.req;
    const { pathname, query } = parse(url || "");
    const method = toHTTPVerb(m || "GET");
    if (!method) {
      throw new Error("Unrecognized HTTP verb.");
    }

    return {
      headers,
      method,
      path: relative(this.baseUrl, pathname || "/"),
      query: querystring.parse(query || "")
    };
  }
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
