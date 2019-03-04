# `@bayerjs/rxjs-debug`

Debug RxJS Observables with the `debug` package. Used internally by the Bayer.js library to, well, debug observables.

## Usage

```typescript
const values$ = of(something);
values$.pipe(debug("@bayerjs/core", "Value from something"));
```

The debug operator will use the first argument as the name for `debug`, and the second as a message to print on every
value, as well as when erroring out or completing.
