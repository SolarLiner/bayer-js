import { IncomingMessage, ServerResponse } from "http";
import { Server, Socket, SocketConstructorOpts } from "net";

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
    if (code <= 0) { throw new Error("Status code must be positive."); }
    this.code = code;
  }

  public statusMessage: string;
  private res: ServerResponse;
  private code: number;

  constructor(res: ServerResponse) {
    this.res = res;
    this.code = 200;
    this.statusMessage = "OK";
  }

  public status(code: number, reason?: string) {
    this.statusCode = code;
    this.statusMessage = reason || "";

    return this;
  }

  public json(data: any) {
    this.send(JSON.stringify(data));
  }

  public send(data: string) {
    this.res.writeHead(this.statusCode, this.statusMessage);
    this.res.write(data);
    this.res.end();
  }
}
