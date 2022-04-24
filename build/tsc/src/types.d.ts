export declare class InvariantError extends Error {
    detail?: any;
    constructor(msg: string, detail?: any);
}
export declare const TypeTag: unique symbol;
export declare const ContextGetterTag: unique symbol;
export declare const DataTypeTag: unique symbol;
export declare const CalculationTypeTag: unique symbol;
export declare const CalculationRecalculateTag: unique symbol;
export declare const CalculationInvalidateTag: unique symbol;
export declare const CalculationSetCycleTag: unique symbol;
export declare const ObserveKey: unique symbol;
export declare const GetSubscriptionNodeKey: unique symbol;
export declare const MakeModelViewKey: unique symbol;
export declare const DisposeKey: unique symbol;
export declare const FlushKey: unique symbol;
export declare const AddDeferredWorkKey: unique symbol;
export declare const NotifyKey: unique symbol;
export declare type ProcessAction = 'recalculate' | 'cycle' | 'invalidate';
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
};
export declare type ModelObserver = (event: ModelEvent) => void;
export declare type EqualityFunc<T> = (a: T, b: T) => boolean;
export declare type MappingFunction<T, V> = (item: T) => V;
export declare type FilterFunction<T> = (item: T) => boolean;
export declare type FlatMapFunction<T, V> = (item: T) => V[];
export interface ViewSpec<TInitialize, TItem, TEvent> {
    /**
     * Return initial items
     */
    initialize: (items: TInitialize) => TItem[];
    /**
     * Process subscription events
     */
    processEvent: (view: Collection<TItem>, event: TEvent, initialValue: TItem[]) => void;
}
export declare type CollectionEvent<T> = {
    type: 'splice';
    index: number;
    count: number;
    items: readonly T[];
    removed: readonly T[];
} | {
    type: 'move';
    fromIndex: number;
    fromCount: number;
    toIndex: number;
    moved: readonly T[];
} | {
    type: 'sort';
    indexes: readonly number[];
};
export declare type TrackedData<TTypeTag, TEvent> = {
    $__id: string;
    [TypeTag]: 'data';
    [DataTypeTag]: TTypeTag;
    [FlushKey]: () => boolean;
    [AddDeferredWorkKey]: (task: () => void) => void;
    [ObserveKey]: (listener: (events: TEvent[], subscriptionNode: Subscription) => void) => () => void;
    [GetSubscriptionNodeKey]: () => Subscription;
    [NotifyKey]: (event: TEvent) => void;
    [DisposeKey]: () => void;
};
/**
 * A mutable object to hold state
 */
interface ModelMethods<T extends {}> {
    [MakeModelViewKey]: <V>(modelViewSpec: ViewSpec<Readonly<T>, V, ModelEvent>, debugName?: string) => View<V>;
}
export declare type Model<T> = TrackedData<'model', ModelEvent> & ModelMethods<T> & {
    [Key in keyof T]: T[Key];
};
/**
 * A mutable array to hold state, with some additional convenience methods
 */
interface CollectionMethods<T> {
    makeView<V>(viewSpec: ViewSpec<readonly T[], V, CollectionEvent<T>>, debugName?: string): View<V>;
    mapView<V>(mapFn: MappingFunction<T, V>, debugName?: string): View<V>;
    filterView(filterFn: FilterFunction<T>, debugName?: string): View<T>;
    flatMapView<V>(flatMapFn: MappingFunction<T, V[]>, debugName?: string): View<V>;
    reject(shouldReject: (item: T, index: number) => boolean): T[];
    moveSlice(fromIndex: number, fromCount: number, toIndex: number): void;
}
export interface Collection<T> extends TrackedData<'collection', CollectionEvent<T>>, CollectionMethods<T>, Array<T> {
}
/**
 * A readonly array to hold projected state
 */
interface ViewMethods<T> {
    makeView<V>(viewSpec: ViewSpec<readonly T[], V, CollectionEvent<T>>, debugName?: string): View<V>;
    mapView<V>(mapFn: MappingFunction<T, V>, debugName?: string): View<V>;
    filterView(filterFn: FilterFunction<T>, debugName?: string): View<T>;
    flatMapView<V>(flatMapFn: MappingFunction<T, V[]>, debugName?: string): View<V>;
}
export interface View<T> extends TrackedData<'collection', CollectionEvent<T>>, ViewMethods<T>, ReadonlyArray<T> {
}
export interface Subscription {
    $__id: string;
    [TypeTag]: 'subscription';
    item: any;
    [FlushKey]: () => boolean;
}
export interface NodeOrdering {
    $__id: string;
    [TypeTag]: 'nodeOrdering';
}
/**
 * A key-value pair that is active for a subtree
 */
export interface Context<TValue> {
    (): never;
    [ContextGetterTag]: () => TValue;
    [TypeTag]: 'context';
}
export declare function createContext<TValue>(val: TValue): Context<TValue>;
export declare function getContext<TValue>(context: Context<TValue>): TValue;
export declare function isContext(val: any): val is Context<any>;
/**
 * A calculation cell that recalculates when dependencies change
 */
export interface Calculation<Result> {
    (): Result;
    $__id: string;
    [TypeTag]: 'calculation';
    [CalculationTypeTag]: 'calculation' | 'effect';
    dispose: () => void;
    onError: (handler: (errorType: 'cycle' | 'error') => Result) => this;
    [CalculationSetCycleTag]: () => boolean;
    [CalculationRecalculateTag]: () => boolean;
    [CalculationInvalidateTag]: () => void;
}
export interface ModelField {
    $__id: string;
    model: {
        [DataTypeTag]: any;
    };
    key: string | number | symbol;
}
export declare function isModel(thing: any): thing is Model<unknown>;
export declare function isModelField(thing: any): thing is ModelField;
export declare function isCollection(thing: any): thing is Collection<any> | View<any>;
export declare function isCalculation(thing: any): thing is Calculation<any>;
export declare function isEffect(thing: Calculation<unknown>): boolean;
export declare function isSubscription(thing: any): thing is Subscription;
export declare function isNodeOrdering(thing: any): thing is NodeOrdering;
export declare type GraphNode = {
    $__id: string;
};
export {};
//# sourceMappingURL=types.d.ts.map