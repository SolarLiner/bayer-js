import { join } from "path";

import { pipe } from "rxjs";
import { map, mergeMap } from "rxjs/operators";

import { HttpError, ServerMiddleware } from "@bayerjs/core";
import { access as _access, createReadStream, exists as _exists, lstat, Stats } from "fs";

export function staticFiles(
  localpath: string,
  baseUrl = "/",
  useIndexFile = true,
  indexExtension = "html"
): ServerMiddleware {
  return pipe(
    map(params => {
      const resourcePath = absolute(baseUrl, params.req.route.path.substr(1)).substr(1);
      const path = join(localpath, resourcePath);
      return { params, path };
    }),
    mergeMap(({ params, path }) => {
      return checkAvailable(path, useIndexFile, indexExtension).then(p => ({ params, file: createReadStream(p) }));
    }),
    mergeMap(({ params, file }) => {
      return params.res.send(file).then(() => params);
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

async function checkAvailable(p: string, useIndexFile: boolean, indexExtension: string, forceNoIndex = false): Promise<string> {
  if (!await exists(p)) throw new HttpError(404, "Not found");
  const stat = await nodeCallbackPromise<Stats>(lstat, p);
  if (stat.isDirectory()) {
    if (useIndexFile && !forceNoIndex) return checkAvailable(join(p, `index.${indexExtension}`), useIndexFile, indexExtension, true);
    else throw new HttpError(404, "Not found");
  } else if (stat.isFile()) {
    if (await access(p)) return p;
    else throw new HttpError(403, "Resource forbidden");
  } else {
    throw new HttpError(404, "Not found");
  }
}

// tslint:disable-next-line:ban-types
function nodeCallbackPromise<T>(func: Function, ...args: any[]) {
  return new Promise<T>((resolve, reject) => {
    func(...args, (err: any, data: T) => {
      if (err) reject(err);
      else resolve(data);
    });
  });
}

async function access(path: string) {
  return new Promise<boolean>(resolve => {
    _access(path, err => {
      if (err) resolve(false);
      else resolve(true);
    });
  });
}

async function exists(path: string) {
  return new Promise<boolean>(resolve => {
    _exists(path, e => resolve(e));
  });
}
