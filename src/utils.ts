import { Observable, OperatorFunction } from "rxjs";

export function addToPipe<T, R>(obs: Observable<T>, func: OperatorFunction<T, R>) {
  return obs.pipe(func);
}
