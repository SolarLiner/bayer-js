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
