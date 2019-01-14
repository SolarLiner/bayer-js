import assert from "assert";

import _debug from "debug";
import { of } from "rxjs";
import { filter, map, mergeMap } from "rxjs/operators";

import Bayer, { ServerMiddleware } from "@bayerjs/core";

const debug = _debug("@bayerjs/mount");

export default function mount(mountPath: string, appOrMiddleware: Bayer | ServerMiddleware): ServerMiddleware {
  assert.equal(mountPath[0], "/", "Mount path must be absolute");
  const trailingSlash = mountPath.slice(-1) === "/";
  debug("Mounting middleware to %o", mountPath);
  return mergeMap(params => {
    return of(params).pipe(
      filter(({ req }) => {
        return match(mountPath, req.route.path, trailingSlash);
      }),
      map(({ req: oldReq, res, extra }) => {
        const req = oldReq.clone(mountPath);
        return { req, res, extra };
      }),
      mergeMap(ctx => {
        debug("Passing to mounted middleware from %o %s", mountPath, ctx.req.route.path);
        if (appOrMiddleware instanceof Bayer) {
          return of(ctx).pipe(appOrMiddleware.middleware());
        } else {
          return of(ctx).pipe(appOrMiddleware);
        }
      })
    );
  });
}

function match(prefix: string, path: string, trailingSlash = false) {
  // does not match prefix at all
  if (path.indexOf(prefix) !== 0) return false;

  const newPath = path.replace(prefix, "") || "/";
  if (trailingSlash) return true;

  // `/mount` does not match `/mountlkjalskjdf`
  if (newPath[0] !== "/") return false;
  return true;
}
