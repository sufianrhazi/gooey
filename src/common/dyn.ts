import { noop } from './util';

export interface DynamicNonErrorSubscriptionHandler<T> {
    (error: undefined, val: T): void;
}
export interface DynamicSubscriptionHandler<T> {
    (
        ...args: [error: Error, val: undefined] | [error: undefined, val: T]
    ): void;
}

export interface DynamicArraySubscriptionHandler<T> {
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

export interface DynamicMut<in out T> extends Dynamic<T> {
    set: (val: T) => void;
}

export type Dyn<T> = T | Dynamic<T>;

export type DynMut<T> = T | DynamicMut<T>;

export function dynGet<T>(wrapper: T | Dynamic<T>): T {
    if (isDynamic(wrapper)) {
        return wrapper.get();
    }
    return wrapper as T;
}

export function dynSet<T>(wrapper: T | DynamicMut<T>, value: T): boolean {
    if (isDynamicMut(wrapper)) {
        wrapper.set(value);
        return true;
    }
    return false;
}

export function dynSubscribe<T>(
    wrapper: T | Dynamic<T>,
    callback: DynamicSubscriptionHandler<T>
): () => void {
    if (isDynamic(wrapper)) {
        return wrapper.subscribe(callback);
    }
    callback(undefined, wrapper);
    return noop;
}

export function isDynamic<T>(val: T | Dynamic<T>): val is Dynamic<T> {
    return val && typeof val === 'object' && 'subscribe' in val;
}

export function isDynamicMut<T>(val: T | DynamicMut<T>): val is DynamicMut<T> {
    return val && typeof val === 'object' && 'set' in val;
}
