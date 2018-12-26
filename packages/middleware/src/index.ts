import { join } from "path";

import { empty, from, pipe } from "rxjs";
import { catchError, map, mergeMap } from "rxjs/operators";

import { ServerMiddleware } from "@bayerjs/core";
import { createReadStream, lstat, Stats } from "fs";

export function staticFiles(
  localpath: string,
  baseUrl = "/",
  useIndexFile = true,
  indexExtension = "html"
): ServerMiddleware {
  return pipe(
    mergeMap(params => {
      const resourcePath = absolute(baseUrl, params.req.route.path.substr(1));
      const path = join(localpath, resourcePath);
      return from(nodeCallbackPromise<Stats>(lstat, path)).pipe(map(stat => ({ stat, params, path })));
    }),
    map(({ params, stat, path }) => {
      if (stat.isFile()) {
        return { params, file: createReadStream(path) };
      } else if (useIndexFile) {
        return { params, file: createReadStream(join(path, `index.${indexExtension}`)) };
      } else {
        throw 404;
      }
    }),
    map(({ params, file }) => {
      params.res.status(200).send(file);
      return params;
    }),
    catchError((err, caught) => {
      if (typeof err === "number") {
        return caught.pipe(
          mergeMap(({ res }) => {
            res.status(err).send("");
            return empty();
          })
        );
      } else {
        return caught.pipe(
          mergeMap(({ res }) => {
            res.status(500).send(err.toString());
            return empty();
          })
        );
      }
    })
  );
}

function absolute(base: string, relative: string) {
  const stack = base.split("/");
  const parts = relative.split("/");
  stack.pop(); // remove current file name (or empty string)
  // (omit if "base" is the current folder without trailing slash)
  for (const part of parts) {
    if (part === ".") continue;
    if (part === "..") stack.pop();
    else stack.push(part);
  }
  return stack.join("/");
}

// tslint:disable-next-line:ban-types
function nodeCallbackPromise<T>(func: Function, ...args: any[]) {
  return new Promise<T>((resolve, reject) => {
    func(...args, (err: any, data: T) => {
      if (err) reject(err);
      resolve(data);
    });
  });
}
