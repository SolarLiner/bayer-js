import { ResponseHandler } from ".";
import { map } from "rxjs/operators";
import { join } from "path";
import { createReadStream } from "fs";
import { lookup } from "mime-types";

export function staticHandler(directory: string, base: string): ResponseHandler {
  if (!base.endsWith("/")) base += "/";
  return map(({ path }) => {
    const relPath = path.replace(base, "").replace(/\/$/, "");
    const filepath = join(directory, relPath);
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
