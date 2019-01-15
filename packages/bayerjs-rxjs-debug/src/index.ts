import _debug from "debug";
import { Observable, pipe } from "rxjs"
import { tap } from "rxjs/operators";

export default function debug<T>(name: string, message: string) {
  const d = _debug(name);
  const dErr = d.extend("error");
  function next(n: T) {
    d("[Observable] %s %o", message, n);
  }
  function err(e: any) {
    if (e instanceof Error) {
      dErr("[Observable] %s %O", e.message, e.stack);
    } else {
      dErr("[Observable] %O", e);
    }
  } function complete() {
    d("[Observable] complete.")
  }

  return pipe<Observable<T>, Observable<T>>(
    tap(next, err, complete)
  );
}
