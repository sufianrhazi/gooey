import { TrackedData, ProxyHandler } from './trackeddata';
import { Retainable } from './engine';
import { ArrayEvent } from './arrayevent';
export interface CollectionImpl<T> extends Retainable {
    _type: 'collection';
    splice(start: number, deleteCount?: number | undefined): T[];
    splice(start: number, deleteCount: number, ...items: T[]): T[];
    push(...items: T[]): number;
    pop(): T | undefined;
    shift(): T | undefined;
    unshift(...items: T[]): number;
    sort(cmp?: ((a: T, b: T) => number) | undefined): this;
    reverse(): this;
    reject: (pred: (val: T) => boolean) => T[];
    moveSlice: (fromIndex: number, count: number, toIndex: number) => void;
    mapView: <V>(fn: (val: T) => V, debugName?: string | undefined) => View<V, ArrayEvent<T>>;
    filterView: (fn: (val: T) => boolean, debugName?: string | undefined) => View<T, ArrayEvent<T>>;
    flatMapView: <V>(fn: (val: T) => V[], debugName?: string | undefined) => View<V, ArrayEvent<T>>;
    subscribe: (handler: (event: ArrayEvent<T>[]) => void) => () => void;
}
export declare function makeCollectionPrototype<T>(): CollectionImpl<T>;
export interface ViewImpl<T> extends Retainable {
    _type: 'view';
    splice(start: number, deleteCount?: number | undefined): never;
    splice(start: number, deleteCount: number, ...items: T[]): never;
    push(...items: T[]): never;
    pop(): never;
    shift(): never;
    unshift(...items: T[]): never;
    sort(cmp?: ((a: T, b: T) => number) | undefined): never;
    reverse(): never;
    mapView: <V>(fn: (val: T) => V, debugName?: string | undefined) => View<V, ArrayEvent<T>>;
    filterView: (fn: (val: T) => boolean, debugName?: string | undefined) => View<T, ArrayEvent<T>>;
    flatMapView: <V>(fn: (val: T) => V[], debugName?: string | undefined) => View<V, ArrayEvent<T>>;
    subscribe: (handler: (event: ArrayEvent<T>[]) => void) => () => void;
}
export declare function makeViewPrototype<T>(sourceCollection: TrackedData<any, any, unknown, unknown>): ViewImpl<T>;
export type Collection<T> = TrackedData<T[], CollectionImpl<T>, ArrayEvent<T>, ArrayEvent<T>>;
export type View<T, TConsumeEvent = any> = TrackedData<readonly T[], ViewImpl<T>, ArrayEvent<T>, TConsumeEvent>;
export declare function isCollection(val: any): val is Collection<any>;
export declare function isView(val: any): val is View<any>;
export declare const CollectionHandler: ProxyHandler<ArrayEvent<any>>;
export declare const ViewHandler: ProxyHandler<ArrayEvent<any>>;
export declare function collection<T>(items: T[], debugName?: string): Collection<T>;
//# sourceMappingURL=collection.d.ts.map