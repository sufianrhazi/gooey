export declare class InvariantError extends Error {
}
export declare const TypeTag: unique symbol;
export declare const DataTypeTag: unique symbol;
declare const CalculationTypeTag: unique symbol;
export declare const RecalculationTag: unique symbol;
export declare const ObserveKey: unique symbol;
export declare const MakeModelViewKey: unique symbol;
export declare const FlushKey: unique symbol;
export declare const AddDeferredWorkKey: unique symbol;
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
export declare type TrackedData<TImplementation, TTypeTag, TEvent> = TImplementation & {
    [TypeTag]: 'data';
    [DataTypeTag]: TTypeTag;
    [FlushKey]: () => void;
    [AddDeferredWorkKey]: (task: () => void) => void;
    [ObserveKey]: (listener: (observer: TEvent) => void) => () => void;
    [NotifyKey]: (event: TEvent) => void;
};
/**
 * A mutable object to hold state
 */
export declare type Model<T> = TrackedData<T, 'model', ModelEvent> & {
    [MakeModelViewKey]: <V>(modelViewSpec: ViewSpec<Readonly<T>, V, ModelEvent>, debugName?: string) => View<V>;
};
/**
 * A mutable array to hold state, with some additional convenience methods
 */
export declare type Collection<T> = TrackedData<Array<T>, 'collection', CollectionEvent<T>> & {
    makeView<V>(viewSpec: ViewSpec<readonly T[], V, CollectionEvent<T>>, debugName?: string): View<V>;
    mapView<V>(mapFn: MappingFunction<T, V>, debugName?: string): View<V>;
    filterView(filterFn: FilterFunction<T>, debugName?: string): View<T>;
    flatMapView<V>(flatMapFn: MappingFunction<T, V[]>, debugName?: string): View<V>;
    reject(shouldReject: (item: T, index: number) => boolean): void;
    moveSlice(fromIndex: number, fromCount: number, toIndex: number): void;
};
/**
 * A readonly array to hold projected state
 */
export declare type View<T> = TrackedData<ReadonlyArray<T>, 'collection', CollectionEvent<T>> & {
    makeView<V>(viewSpec: ViewSpec<readonly T[], V, CollectionEvent<T>>, debugName?: string): View<V>;
    mapView<V>(mapFn: MappingFunction<T, V>, debugName?: string): View<V>;
    filterView(filterFn: FilterFunction<T>, debugName?: string): View<T>;
    flatMapView<V>(flatMapFn: MappingFunction<T, V[]>, debugName?: string): View<V>;
};
export interface Subscription {
    [TypeTag]: 'subscription';
}
/**
 * A key-value pair that is active for a subtree
 */
export interface Context<TValue> {
    /**
     * Note: although this function has a signature, it does not actually take arguments when called directly.
     *
     * This is solely present so that TypeScript can auto-complete the "value" prop of Contexts
     */
    (unusedOnlyForJsxTypeInferrence?: {
        value: TValue;
    }): TValue;
    [TypeTag]: 'context';
}
export declare function createContext<TValue>(val: TValue): Context<TValue>;
export declare function isContext(val: any): val is Context<any>;
/**
 * A calculation cell that recalculates when dependencies change
 */
export declare type Calculation<Result> = (() => Result) & {
    [TypeTag]: 'calculation';
    [CalculationTypeTag]: 'calculation' | 'effect';
    [RecalculationTag]: () => boolean;
};
export interface ModelField {
    model: {
        [DataTypeTag]: any;
    };
    key: string | number | symbol;
}
export declare function makeCalculation<Ret>(fn: () => Ret, recalcFn: () => boolean): Calculation<Ret>;
export declare function makeEffect(fn: () => void, recalcFn: () => boolean): Calculation<void>;
export declare function isModel(thing: any): thing is Model<unknown>;
export declare function isModelField(thing: any): thing is ModelField;
export declare function isCollection(thing: any): thing is Collection<any> | View<any>;
export declare function isCalculation(thing: any): thing is Calculation<any>;
export declare function isEffect(thing: Calculation<unknown>): boolean;
export declare function isSubscription(thing: any): thing is Subscription;
export declare type DAGNode = Model<any> | Collection<any> | Calculation<any> | ModelField | View<any> | Subscription;
export {};
//# sourceMappingURL=types.d.ts.map