export interface DynamicNonErrorSubscriptionHandler<T> {
    (error: undefined, val: T): void;
}
export interface DynamicSubscriptionHandler<T> {
    (...args: [error: Error, val: undefined] | [error: undefined, val: T]): void;
}
export interface DynamicArraySubscriptionHandler<T> {
    (...args: [error: Error, val: undefined] | [error: undefined, val: T]): void;
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
export declare function dynGet<T>(wrapper: T | Dynamic<T>): T;
export declare function dynSet<T>(wrapper: T | DynamicMut<T>, value: T): boolean;
export declare function dynSubscribe<T>(wrapper: T | Dynamic<T>, callback: DynamicSubscriptionHandler<T>): () => void;
export declare function isDynamic<T>(val: T | Dynamic<T>): val is Dynamic<T>;
export declare function isDynamicMut<T>(val: T | DynamicMut<T>): val is DynamicMut<T>;
//# sourceMappingURL=dyn.d.ts.map