import { of } from "rxjs";
import { filter, map, mergeMap } from "rxjs/operators";

import _debug from "debug";

import Bayer, { ServerMiddleware } from "@bayerjs/core";

const debug = _debug("@bayerjs/mount");

export default function mount(baseUrl: string, appOrMiddleware: Bayer | ServerMiddleware): ServerMiddleware {
  debug("Mounting middleware to %o", baseUrl);
  return mergeMap(params => {
    return of(params).pipe(
      filter(({ req }) => {
        return req.route.path.startsWith(baseUrl);
      }),
      map(({ req: oldReq, res, extra }) => {
        const req = oldReq.clone(baseUrl);
        return { req, res, extra };
      }),
      mergeMap(ctx => {
        debug("Passing to mounted middleware from %o %s", baseUrl, ctx.req.route.path);
        if (appOrMiddleware instanceof Bayer) {
          return of(ctx).pipe(appOrMiddleware.middleware());
        } else {
          return of(ctx).pipe(appOrMiddleware);
        }
      })
    );
  });
}
