/**
 * Server class definitions for the Bayer.JS project.
 *
 * TODO: Write getting started page
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
import { Server } from "http";
import { createServer, ServerOptions } from "https";
import { Observable } from "rxjs";
import { IServerRequest } from ".";
import { BaseServer } from "./base";
export class HTTPServer extends BaseServer {
  private obs: Observable<IServerRequest>;

  constructor(port: number) {
    super();
    this.obs = new Observable<IServerRequest>(sub => {
      const server = new Server((req, res) => {
        sub.next({ req, res, extra: {} });
      });
      server.on("close", () => sub.complete());
      server.listen(port);
    });
  }

  public get observer() {
    return this.obs;
  }
}

export class HTTPSServer extends BaseServer {
  private obs: Observable<IServerRequest>;

  constructor(port: number, options: ServerOptions) {
    super();
    this.obs = new Observable<IServerRequest>(sub => {
      const server = createServer(options || {}, (req, res) => {
        sub.next({ req, res, extra: {} });
      })
      server.on("close", () => sub.complete());
      server.listen(port);
    });
  }

  public get observer() {
    return this.obs;
  }
}
