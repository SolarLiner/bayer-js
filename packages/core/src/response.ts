import { IncomingMessage, ServerResponse } from "http";
import { Server, Socket, SocketConstructorOpts } from "net";
import { Stream } from "stream";

export class Response {
  public static fromMessage(req: IncomingMessage) {
    return new Response(new ServerResponse(req));
  }

  public static fromSocket(sock: Socket) {
    return Response.fromMessage(new IncomingMessage(sock));
  }

  public static withNewSocket(options?: SocketConstructorOpts) {
    return Response.fromSocket(new Socket(options));
  }

  public get statusCode() {
    return this.code;
  }
  public set statusCode(code: number) {
    if (code <= 0) {
      throw new Error("Status code must be positive.");
    }
    this.code = code;
  }

  public get done() {
    return this.sent || this.processed;
  }

  public statusMessage: string;
  // tslint:disable-next-line:variable-name
  private sent: boolean;
  private processed: boolean;
  private res: ServerResponse;
  private code: number;

  constructor(res: ServerResponse) {
    this.res = res;
    this.code = 200;
    this.statusMessage = "OK";
    this.processed = false;
    this.sent = false;
  }

  public contentType(type: string) {
    return this.setHeader("content-type", type);
  }

  public setHeader(name: string, value: string | string[] | number) {
    this.res.setHeader(name, value);

    return this;
  }

  public status(code: number, reason?: string) {
    this.statusCode = code;
    this.statusMessage = reason || "";

    return this;
  }

  public json(data: any) {
    this.contentType("application/json").send(JSON.stringify(data));
  }

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

  public async stream(stream: Stream) {
    this.processed = true;
    return new Promise<void>((resolve, reject) => {
      this.res.writeHead(this.statusCode, this.statusMessage);
      this.res.on("finish", resolve);
      this.res.on("error", reject);
      stream.pipe(this.res);
    });
  }

  public end() {
    this.processed = true;
    this.res.writeHead(this.statusCode, this.statusMessage);
    this.res.write("\n");
    this.res.end();
  }
}
