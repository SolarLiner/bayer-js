import assert from "assert";

import _debug from "debug";
import { of, pipe } from "rxjs";
import { filter, map, mergeMap } from "rxjs/operators";

import { ServerMiddleware } from "@bayerjs/core";

const debug = _debug("@bayerjs/mount");

export default function mount(mountPath: string, middleware: ServerMiddleware): ServerMiddleware {
  assert.equal(mountPath[0], "/", "Mount path must be absolute");
  const trailingSlash = mountPath.slice(-1) === "/";
  debug("Mounting middleware to %o", mountPath);
  return pipe(
    filter(({ req }) => {
      debug("Request test for %o on %o", req.route.path, mountPath);
      return match(mountPath, req.route.path, trailingSlash);
    }),
    map(({ req: oldReq, res, extra }) => {
      const req = oldReq.clone(mountPath);
      debug("Mapping request %o %o", oldReq.route.path, req.route.path);
      return { req, res, extra };
    }),
    mergeMap(ctx => {
      debug("Passing to mounted middleware from %o %s", mountPath, ctx.req.route.path);
      return of(ctx).pipe(middleware);
    })
  );
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
