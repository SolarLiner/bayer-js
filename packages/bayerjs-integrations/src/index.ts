import Vue from "vue";
import { createBundleRenderer } from "vue-server-renderer";

import { of } from "rxjs";
import { map, mergeMap, tap } from "rxjs/operators";

import { ServerMiddleware } from "@bayerjs/core";

const DEFAULT_TEMPLATE = `<html>
<head>
  <!-- use double mustache for HTML-escaped interpolation -->
  <title>{{ title }}</title>

  <!-- use triple mustache for non-HTML-escaped interpolation -->
  {{{ meta }}}
</head>
<body>
  <!--vue-ssr-outlet-->
</body>
</html>;`;

interface IVueContext {
  url: string;
  [x: string]: any;
}

interface IVueAppOptions {
  template?: string;
  context?: IVueContext;
}

type CreateAppFunction = (context: IVueContext) => Vue | PromiseLike<Vue>;

interface IBundles {
  clientManifest?: object;
  serverBundle: string;
}

export function renderVueApp(bundles: IBundles, options?: IVueAppOptions): ServerMiddleware {
  const renderer = createBundleRenderer(bundles.serverBundle, {
    runInNewContext: false,
    template: (options && options.template) ? options.template : DEFAULT_TEMPLATE,
    clientManifest: bundles.clientManifest
  })
  return mergeMap(params => {
    const context = { url: params.req.route.path };
    params.res.send("Vue SSR middleware");
    return of(context).pipe(
      mergeMap(ctx => {
        return renderer.renderToString(ctx);
      }),
      map(html => {
        params.res.send(html);
        return params;
      })
    )
  });
}
