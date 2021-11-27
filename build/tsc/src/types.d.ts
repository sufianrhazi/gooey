export declare class InvariantError extends Error {
}
export declare const TypeTag: unique symbol;
declare const CalculationTypeTag: unique symbol;
export declare const OwnKeysField: unique symbol;
export declare const ObserveKey: unique symbol;
export declare const GetRawArrayKey: unique symbol;
export declare const FlushKey: unique symbol;
export declare const NotifyKey: unique symbol;
/**
 * A ref object that can be passed to native elements.
 */
export declare type Ref<T> = {
    [TypeTag]: 'ref';
    current: T | undefined;
};
export declare function isRef(ref: any): ref is Ref<unknown>;
/**
 * Make a ref object that can be passed to native elements.
 */
export declare function ref<T>(val?: T): Ref<T>;
export declare type CollectionEvent<T> = {
    type: 'splice';
    index: number;
    count: number;
    items: readonly T[];
    removed: readonly T[];
} | {
    type: 'init';
    items: readonly T[];
};
export declare type CollectionObserver<T> = (event: CollectionEvent<T>) => void;
export declare type ModelEvent = {
    type: 'add';
    key: string | number | symbol;
} | {
    type: 'set';
    key: string | number | symbol;
    value: any;
} | {
    type: 'delete';
    key: string | number | symbol;
} | {
    type: 'init';
    keys: (string | number | symbol)[];
};
export declare type ModelObserver = (event: ModelEvent) => void;
/**
 * A mutable object to hold state
 */
export declare type Model<T> = T & {
    [TypeTag]: 'model';
    [ObserveKey]: (observer: ModelObserver) => () => void;
    /** internal Object.keys pseudo-result field; only used for tracking key changes */
    [OwnKeysField]: any;
};
export declare type EqualityFunc<T> = (a: T, b: T) => boolean;
export declare type MappingFunction<T, V> = (item: T) => V;
export declare type FilterFunction<T> = (item: T) => boolean;
export declare type FlatMapFunction<T, V> = (item: T) => V[];
export declare type SortKeyFunction<T> = ((item: T) => string) | ((item: T) => number);
export declare const OnCollectionRelease: unique symbol;
/**
 * A mutable array to hold state, with some additional convenience methods
 */
export interface Collection<T> extends Array<T> {
    [TypeTag]: 'collection';
    [ObserveKey]: (observer: CollectionObserver<T>) => () => void;
    [FlushKey]: () => void;
    [GetRawArrayKey]: () => T[];
    mapView<V>(mapFn: MappingFunction<T, V>, debugName?: string): View<V>;
    sortedView(sortKeyFn: SortKeyFunction<T>, debugName?: string): View<T>;
    filterView(filterFn: FilterFunction<T>, debugName?: string): View<T>;
    flatMapView<V>(flatMapFn: MappingFunction<T, V[]>, debugName?: string): View<V>;
    reject(shouldReject: (item: T, index: number) => boolean): void;
    [OnCollectionRelease]: (fn: () => void) => void;
}
/**
 * A readonly array to hold projected state
 */
export interface View<T> extends ReadonlyArray<T> {
    [TypeTag]: 'collection';
    [ObserveKey]: (observer: CollectionObserver<T>) => () => void;
    [FlushKey]: () => void;
    mapView<V>(mapFn: MappingFunction<T, V>, debugName?: string): View<V>;
    sortedView(sortKeyFn: SortKeyFunction<T>, debugName?: string): View<T>;
    filterView(filterFn: FilterFunction<T>, debugName?: string): View<T>;
    flatMapView<V>(flatMapFn: MappingFunction<T, V[]>, debugName?: string): View<V>;
    [OnCollectionRelease]: (fn: () => void) => void;
}
/**
 * A calculation cell that recalculates when dependencies change
 */
export declare type Calculation<Result> = (() => Result) & {
    [TypeTag]: 'calculation';
    [CalculationTypeTag]: 'calculation' | 'effect';
};
export interface ModelField<T> {
    model: Model<T> | Collection<T>;
    key: string | number | symbol;
}
export declare function makeCalculation<Ret>(fn: () => Ret): Calculation<Ret>;
export declare function makeEffect(fn: () => void): Calculation<void>;
export declare function isModel(thing: any): thing is Model<unknown>;
export declare function isCollection(thing: any): thing is Collection<any> | View<any>;
export declare function isCalculation(thing: any): thing is Calculation<any>;
export declare function isEffect(thing: Calculation<unknown>): boolean;
export {};
//# sourceMappingURL=types.d.ts.map