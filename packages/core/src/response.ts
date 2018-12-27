import { IncomingMessage, ServerResponse } from "http";
import { Server, Socket, SocketConstructorOpts } from "net";
import { Stream } from "stream";

/**
 * Bayer's Response object. Use it to send responses a-la Express.
 */
export class Response {
  /**
   * Creates a Response object from an IncomingMessage object.
   * @param req IncomingMessage request object to base the Response with.
   */
  public static fromMessage(req: IncomingMessage) {
    return new Response(new ServerResponse(req));
  }

  /**
   * Creates a Response object from a socket.
   * @param sock Socket to bind.
   */
  public static fromSocket(sock: Socket) {
    return Response.fromMessage(new IncomingMessage(sock));
  }

  /**
   * Creates a Socket object, and then binds the Response object to it (through an IncomingMessage object).
   * @param options Options for the socket creation.
   */
  public static withNewSocket(options?: SocketConstructorOpts) {
    return Response.fromSocket(new Socket(options));
  }

  /** Returns the response status code. */
  public get statusCode() {
    return this.code;
  }
  /** Sets the request's status code. */
  public set statusCode(code: number) {
    if (code <= 0) {
      throw new Error("Status code must be positive.");
    }
    this.code = code;
  }

  /** Returns whether the request is done (has been sent) or not. */
  public get done() {
    return this.sent || this.processed;
  }

  /** Gets or sets the status message (appearing next to the status code in a response). */
  public statusMessage: string;
  // tslint:disable-next-line:variable-name
  private sent: boolean;
  private processed: boolean;
  private res: ServerResponse;
  private code: number;

  /**
   * Initializes a new Response object.
   * @param res ServerResponse object to base this Request object from.
   */
  constructor(res: ServerResponse) {
    this.res = res;
    this.code = 200;
    this.statusMessage = "OK";
    this.processed = false;
    this.sent = false;
  }

  /**
   * Sets the content type of the response.
   * @param type mime-type to use for the response.
   * @returns this Response object.
   */
  public contentType(type: string) {
    return this.setHeader("content-type", type);
  }

  /**
   * Sets the value of a header. Note: custom headers should start with `X-` by convention.
   * @param name Key string of the header
   * @param value Value of the header. If an array is provided, the header will be duplicated to send all values in the
   * array.
   * @returns This Response object.
   */
  public setHeader(name: string, value: string | string[] | number) {
    this.res.setHeader(name, value);

    return this;
  }

  /**
   * Sets the status code of the response.
   *
   * Note: This does not send the response or its headers.
   *
   * @param code Status code to send with the response.
   * @param reason Status message to send with the status code.
   * @returns This Response object.
   */
  public status(code: number, reason?: string) {
    this.statusCode = code;
    this.statusMessage = reason || "";

    return this;
  }

  /**
   * Sends the response as JSON.
   * @param data Data to send with the response.
   */
  public json(data: any) {
    this.contentType("application/json").send(JSON.stringify(data));
  }

  /**
   * Send the response with the given data as body.
   * @param data Data to send. If a stream, the data will be piped for optimized memory usage.
   */
  public async send(data: string | Stream) {
    if (typeof data === "string") {
      this.processed = true;
      this.res.writeHead(this.statusCode, this.statusMessage);
      this.res.write(data);
      if (!data.endsWith("\n")) {
        this.res.write("\n");
      }
      this.res.end();
      this.sent = true;
    } else {
      return this.stream(data);
    }
  }

  /**
   * Sends a response as chunked bits of data, optimized for memory consumption.
   * @param stream Stream to pipe to the response.
   */
  public async stream(stream: Stream) {
    this.processed = true;
    return new Promise<void>((resolve, reject) => {
      this.res.writeHead(this.statusCode, this.statusMessage);
      this.res.on("finish", resolve);
      this.res.on("error", reject);
      stream.pipe(this.res);
    });
  }

  /**
   * Finish the request without sending a body.
   */
  public end() {
    this.processed = true;
    this.res.writeHead(this.statusCode, this.statusMessage);
    this.res.write("\n");
    this.res.end();
  }
}
