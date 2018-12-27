import Vue from "vue";
import { createRenderer } from "vue-server-renderer";

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

export function renderVueApp(createApp: CreateAppFunction, options?: IVueAppOptions): ServerMiddleware {
  return tap(params => {
    of(params).pipe(
      mergeMap(({ req }) => {
        const context = Object.assign({}, options && options.context ? options.context : {}, {
          url: req.route.path
        }) as IVueContext;
        return Promise.resolve(createApp(context));
      }),
      map(app => {
        const renderer = createRenderer({
          template: (options && options.template) ? options.template : DEFAULT_TEMPLATE
        });
        return renderer.renderToStream(app);
      }),
      map(html => {
        params.res.send(html);
      })
    );
  });
}
