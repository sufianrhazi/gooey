import { Field } from './field';
import { Calculation } from './calc';
import { noop } from './util';

export type Dyn<T> = T | Field<T> | Calculation<T>;

export function dynGet<T>(wrapper: Dyn<T>): T {
    if (wrapper instanceof Field || wrapper instanceof Calculation) {
        return wrapper.get();
    }
    return wrapper as any;
}

export function dynSet<T>(wrapper: Dyn<T>, value: T): boolean {
    if (wrapper instanceof Field) {
        wrapper.set(value);
        return true;
    }
    if (wrapper instanceof Calculation) {
        return false;
    }
    return false;
}

export function dynSubscribe<T>(
    wrapper: Dyn<T>,
    callback: (val: T) => void
): () => void {
    if (wrapper instanceof Field) {
        return wrapper.subscribe(callback);
    }
    if (wrapper instanceof Calculation) {
        return wrapper.subscribe(callback);
    }
    callback(wrapper);
    return noop;
}
