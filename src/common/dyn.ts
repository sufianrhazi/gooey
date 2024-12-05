import { calc } from '../model/calc';
import type { Calculation } from '../model/calc';
import { noop } from './util';

export interface DynamicNonErrorSubscriptionHandler<T> {
    (error: undefined, val: T): void;
}
export interface DynamicSubscriptionHandler<T> {
    (
        ...args: [error: Error, val: undefined] | [error: undefined, val: T]
    ): void;
}

export interface Dynamic<out T> {
    get: () => T;
    subscribe: (fn: DynamicSubscriptionHandler<T>) => () => void;
}

export interface DynamicMut<in out T> extends Dynamic<T> {
    set: (val: T) => void;
}

export type Dyn<T> = T | Dynamic<T>;

export type DynMut<T> = T | DynamicMut<T>;

export function dynGet<TVal>(wrapper: Dyn<TVal>): TVal {
    if (isDynamic(wrapper)) {
        return wrapper.get();
    }
    return wrapper;
}

export function dynSet<TVal>(wrapper: DynMut<TVal>, value: TVal): boolean {
    if (isDynamicMut(wrapper)) {
        wrapper.set(value);
        return true;
    }
    return false;
}

export function dynSubscribe<TVal>(
    wrapper: Dyn<TVal>,
    callback: DynamicSubscriptionHandler<TVal>
): () => void {
    if (isDynamic(wrapper)) {
        return wrapper.subscribe(callback);
    }
    callback(undefined, wrapper);
    return noop;
}

export function isDynamic<TVal>(val: Dyn<TVal>): val is Dynamic<TVal> {
    return !!(
        val &&
        typeof val === 'object' &&
        'get' in val &&
        'subscribe' in val &&
        typeof val.get === 'function' &&
        typeof val.subscribe === 'function'
    );
}

export function isDynamicMut<TVal>(val: DynMut<TVal>): val is DynamicMut<TVal> {
    return isDynamic(val) && 'set' in val && typeof val.set === 'function';
}

export function dynMap<T, V>(val: Dyn<T>, fn: (val: T) => V): Calculation<V> {
    return calc(() => fn(dynGet(val)));
}
