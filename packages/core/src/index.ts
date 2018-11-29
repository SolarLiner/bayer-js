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
import {
  IncomingMessage,
  ServerResponse
} from "http";
import { OperatorFunction } from "rxjs";

/**
 * Server middleware type.
 */
export type ServerMiddleware = OperatorFunction<IServerRequest, IServerRequest>;

/**
 * Encapsulated Request and Response objects. The extra object can contain
 * anything, and is mostly there for middleware that manipulate data.
 */
export interface IServerRequest {
  /**
   * Incoming request. Copied from Node.js's HTTP server module.
   */
  req: IncomingMessage;
  /**
   * Server response. Copied from Node.js's HTTP server module.
   */
  res: ServerResponse;

  /**
   * Extra data that middleware can add to the request object.
   *
   * NOTE: Express middleware that add data to the request/response object are
   * redirected here instead, through Proxying.
   */
  extra: {
    [x: string]: any;
  };
}
export interface InternalMiddleware {
  middleware: ServerMiddleware;
  priority: number;
}

// Export server classes
export { BaseServer } from "./base";
export { HTTPServer, HTTPSServer } from "./http";
export { ManualServer } from "./manual";
