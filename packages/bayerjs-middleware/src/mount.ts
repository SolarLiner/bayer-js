import { of } from "rxjs";
import { filter, map, mergeMap } from "rxjs/operators";

import Bayer, { ServerMiddleware } from "@bayerjs/core";

export function mount(baseUrl: string, appOrMiddleware: Bayer | ServerMiddleware): ServerMiddleware {
  return mergeMap(params => {
    return of(params).pipe(
      filter(({ req }) => {
        return req.route.path.startsWith(baseUrl);
      }),
      map(({ req: oldReq, res, extra }) => {
        const req = oldReq.clone(baseUrl)
        return {req, res, extra};
      }),
      mergeMap(ctx => {
        if (appOrMiddleware instanceof Bayer) {
          return of(ctx).pipe(appOrMiddleware.middleware());
        } else {
          return of(ctx).pipe(appOrMiddleware);
        }
      })
    );
  });
}
