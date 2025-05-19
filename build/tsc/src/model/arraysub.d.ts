import type { ArrayEvent } from '../common/arrayevent';
import { TrackedArray } from './trackedarray';
export type DynamicArraySubscription<T> = {
    handler: (events: Iterable<ArrayEvent<T>>) => void;
    /**
     * The thing called when users unsubscribe; note: this is *mutable*
     */
    onUnsubscribe: () => void;
};
export interface DynamicArray<T> {
    get(key: number): T;
    getLength(): number;
    getItemsUnsafe(): T[];
    subscribe(handler: (event: Iterable<ArrayEvent<T>>) => void): () => void;
    retain(): void;
    release(): void;
    takeSubscriptions(): DynamicArraySubscription<T>[];
    getTrackedArray(): TrackedArray<ArrayEvent<T>>;
}
export declare class ArraySub<T> implements DynamicArray<T> {
    private items;
    private trackedArray;
    private subscriptions;
    __debugName: string;
    constructor(init?: T[] | undefined, debugName?: string, lifecycle?: {
        onAlive?: () => void;
        onDead?: () => void;
    });
    getItemsUnsafe(): T[];
    get(index: number): T;
    set(index: number, value: T): void;
    setLength(newLength: number): void;
    getLength(): number;
    /**
     * Implement a splice, dirtying the affected fields, but do not queue a
     * splice event
     */
    private spliceInner;
    splice(index: number, count: number, items: T[]): any[];
    sort(sortFn?: (a: T, b: T) => number): this;
    reverse(): this;
    moveSlice(fromIndex: number, count: number, toIndex: number): void;
    subscribe(handler: (events: Iterable<ArrayEvent<T>>) => void): () => void;
    takeSubscriptions(): DynamicArraySubscription<T>[];
    retain(): void;
    release(): void;
    getTrackedArray(): TrackedArray<ArrayEvent<T>>;
}
export declare class DerivedArraySub<T, TSource> implements DynamicArray<T> {
    private source;
    private sourceUnsubscribe;
    private eventTransform;
    private items;
    private trackedArray;
    private subscriptions;
    __debugName: string;
    constructor(source: DynamicArray<TSource>, eventTransform: (events: Iterable<ArrayEvent<TSource>>) => Iterable<ArrayEvent<T>>, debugName?: string);
    replaceSource(source: DynamicArray<TSource>): void;
    get(index: number): T;
    getItemsUnsafe(): T[];
    set(index: number, value: T): void;
    getLength(): number;
    subscribe(handler: (events: Iterable<ArrayEvent<T>>) => void): () => void;
    takeSubscriptions(): DynamicArraySubscription<T>[];
    private ingestEvents;
    retain(): void;
    release(): void;
    getTrackedArray(): TrackedArray<ArrayEvent<T>>;
}
export declare function mapView<TSource, TTarget>(source: DynamicArray<TSource>, mapFn: (val: TSource) => TTarget): DerivedArraySub<TTarget, TSource>;
export declare function flatMapView<TSource, TTarget>(source: DynamicArray<TSource>, mapFn: (val: TSource) => TTarget[]): DerivedArraySub<TTarget, TSource>;
export declare function filterView<TSource>(source: DynamicArray<TSource>, mapFn: (val: TSource) => boolean): DerivedArraySub<TSource, TSource>;
//# sourceMappingURL=arraysub.d.ts.map