import { Observable, OperatorFunction } from "rxjs";

/**
 * Return the passed in operator with the given function piped.
 * @param obs Target observable
 * @param func Operator to pipe to
 */
export function addToPipe<T, R>(obs: Observable<T>, func: OperatorFunction<T, R>) {
  return obs.pipe(func);
}
