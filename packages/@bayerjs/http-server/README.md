# `@bayerjs/http-server`

Simple static HTTP server - an example package using the Bayer.js library.

## Usage

The package exposes an executable `http-server`. Here are the different options:

```
$ http-server <PATH> [OPTIONS]
  <PATH>                Directory to serve
OPTIONS:
  -p --port             Port to listen to [default: 3000]
  -s --spa              Enables SPA mode (serves a file on 404 errors)
  --spa-file            File to serve on 404 errors
  --no-index            Disable serving index file on directory hits
  --index-file          Index file to serve on directory hits
```
