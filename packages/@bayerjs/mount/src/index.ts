import { ServerMiddleware } from "@bayerjs/core";
import assert from "assert";
import _debug from "debug";
import { of } from "rxjs";
import { mergeMap } from "rxjs/operators";

const debug = _debug("@bayerjs/mount");

/**
 * Mount a middleware on a subdirectory of the URL
 * @param mountPath Path onto which to mount the middleware
 * @param middleware Middleware to mount
 */
export default function mount(mountPath: string, middleware: ServerMiddleware): ServerMiddleware {
  assert.equal(mountPath[0], "/", "Mount path must be absolute");
  debug("Mounting middleware to %o", mountPath);
  return mergeMap(ctx => {
    const requestPath = ctx.req.route.path;
    if (!match(mountPath, requestPath)) {
      debug("Unrelated request %s, passing along...", requestPath);
      return of(ctx);
    }
    debug("Passing request %s to mounted middleware", requestPath);
    const req = ctx.req.clone(mountPath);
    const newCtx = Object.assign({}, ctx, { req });
    return of(newCtx).pipe(middleware);
  })
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
