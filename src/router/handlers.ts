/**
 * Route handlers for the Bayer.JS router.
 * 
 * TODO: Write router handler documentation
 * 
 * Copyright 2018 Nathan "SolarLiner" Graule

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

import { ResponseHandler } from ".";
import { map } from "rxjs/operators";
import { join } from "path";
import { createReadStream, lstatSync } from "fs";
import { lookup } from "mime-types";
import { lstat } from "fs-extra";

export function staticHandler(directory: string, base: string): ResponseHandler {
  if (!base.endsWith("/")) base += "/";
  return map(({ path }) => {
    const relPath = path.replace(base, "").replace(/^\/|\/$/, "");
    let filepath = join(directory, relPath);
    if (lstatSync(filepath).isDirectory()) {
      filepath = join(filepath, "index.html");
    }
    const fstream = createReadStream(filepath);
    const mime = lookup(filepath);
    if (!mime) {
      return {
        statusCode: 404,
        statusReason: "File not found",
        content: `Couldn't retrieve ${path}`
      };
    } else {
      return {
        statusCode: 200,
        mime,
        content: fstream
      };
    }
  });
}
