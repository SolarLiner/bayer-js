import { IncomingMessage } from "http";
import { relative } from "path";

import { of } from "rxjs";
import { filter, map, mergeMap } from "rxjs/operators";

import Bayer, { Request, ServerMiddleware } from "@bayerjs/core";
import { RequestOptions } from "https";
import { unwatchFile } from "fs";

export function mount(baseUrl: string, appOrMiddleware: Bayer | ServerMiddleware): ServerMiddleware {
  return mergeMap(params => {
    return of(params).pipe(
      filter(({ req }) => {
        return req.route.path.startsWith(baseUrl);
      }),
      map(({ req: oldReq, res, extra }) => {
        const req = new SubRequest(oldReq);
        return {req, res, extra};
      }),
      mergeMap(params => {
        if (appOrMiddleware instanceof Bayer) {
          return of(params).pipe()
        }
      })
    );
  });
}
