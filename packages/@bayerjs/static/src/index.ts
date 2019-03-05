import { access as _access, createReadStream, exists as _exists, lstat, Stats } from "fs";
import { join } from "path";

import _debug from "debug";
import { pipe } from "rxjs";
import { map, mergeMap } from "rxjs/operators";

import { HttpError, ServerMiddleware } from "@bayerjs/core";

const debug = _debug("@bayerjs/static");

/**
 * Options interface for the Bayer.js static middleware.
 */
export interface IBayerStaticOptions {
  /** Local path to the directory containing the */
  localPath: string;
  /** Whether to use the index file on directory hits */
  useIndexFile?: boolean;
  /** File to serve on directory hits, relative to the hit directory */
  indexFile?: string;
  /** Whether to enable SPA mode, which serves a file relative to localPath on 404 errors */
  spaMode?: boolean;
  /** File to serve on 404 errors */
  spaFile?: string;
}

/**
 * Static files middleware for the Bayer.js server library.
 * NOTE: This is a pretty naive implementation, and probably not secure. You should prefer using reverse-proxies or
 * CDNs. This is provided as a convinience function.
 * @param options Options object passed to the middleware.
 * @param options.localPath Local path to the directory containing the files to serve
 * @param [options.useIndexFile=true] Whether to use index file on directory hits
 * @param [options.indexFile=index.html] Filename to use on directory hits
 * @param [options.spaMode=false] SPA mode redirects any 404 to the root index, or to a particular file as defined in
 * spaFile
 * @param [options.spaFile=index.html] file to serve on 404 hits, if SPA mode is turned on.
 * @returns Bayer.js Server middleware.
 */
export default function staticFiles(options: IBayerStaticOptions): ServerMiddleware {
  // Clean input object
  Object.keys(options).forEach((key) => {
    const k = key as keyof IBayerStaticOptions;
    if (options[k] === undefined) delete options[k];
  });
  const opts: Required<IBayerStaticOptions> = Object.assign(
    {},
    {
      useIndexFile: true,
      indexFile: "index.html",
      spaMode: false,
      spaFile: "index.html"
    },
    options
  );
  return pipe(
    map(params => {
      const resourcePath = params.req.route.path.substr(1);
      const path = join(opts.localPath, resourcePath);
      debug("Path: %o", path);
      return { params, path };
    }),
    mergeMap(async ({ params, path }) => {
      debug("Checking '%s' is available for request '%s'", path, params.req.route.path);
      try {
        const file = await checkAvailable(path, opts.useIndexFile, opts.indexFile);
        return { params, file: createReadStream(file) };
      } catch (err) {
        if (opts.spaMode) {
          try {
            const file = await checkAvailable(join(opts.localPath, opts.spaFile), false);
            return { params, file: createReadStream(file) };
          } catch (_) {
            throw err;
          }
        } else throw err;
      }
    }),
    mergeMap(async ({ params, file }) => {
      if(!params.res.done)
        await params.res.send(file);
      return params;
    })
  );
}

async function checkAvailable(p: string, useIndexFile: boolean, indexFile = ""): Promise<string> {
  if (!(await exists(p))) throw new HttpError(404, "Not found");
  const stat = await nodeCallbackPromise<Stats>(lstat, p);
  if (stat.isDirectory()) {
    if (useIndexFile) return checkAvailable(join(p, indexFile), false);
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
