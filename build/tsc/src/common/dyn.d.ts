import type { Calculation } from '../model/calc';
export interface DynamicNonErrorSubscriptionHandler<T> {
    (error: undefined, val: T): void;
}
export interface DynamicSubscriptionHandler<T> {
    (...args: [error: Error, val: undefined] | [error: undefined, val: T]): void;
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
export declare function dynGet<TVal>(wrapper: Dyn<TVal>): TVal;
export declare function dynSet<TVal>(wrapper: Dyn<TVal> | DynMut<TVal>, value: TVal): boolean;
export declare function dynSubscribe<TVal>(wrapper: Dyn<TVal>, callback: DynamicSubscriptionHandler<TVal>): () => void;
export declare function isDynamic<TVal>(val: Dyn<TVal>): val is Dynamic<TVal>;
export declare function isDynamicMut<TVal>(val: DynMut<TVal>): val is DynamicMut<TVal>;
export declare function dynMap<T, V>(val: Dyn<T>, fn: (val: T) => V): Calculation<V>;
export declare function dyn<T>(val: Dyn<T>): {
    get: () => T;
    subscribe: (handler: DynamicSubscriptionHandler<T>) => () => void;
    map: <V>(fn: (val: T) => V) => Calculation<V>;
};
//# sourceMappingURL=dyn.d.ts.map