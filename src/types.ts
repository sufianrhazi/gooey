export class InvariantError extends Error {
    detail?: any;
    constructor(msg: string, detail?: any) {
        super(msg);
        this.detail = detail;
    }
}

export const TypeTag = Symbol('reviseType');
export const DataTypeTag = Symbol('dataTypeTag');
export const CalculationTypeTag = Symbol('calculationType');
export const CalculationRecalculateTag = Symbol('calculationRecalculate');
export const CalculationInvalidateTag = Symbol('calculationInvalidate');
export const CalculationSetCycleTag = Symbol('calculationSetCycle');

export const ObserveKey = Symbol('observe');
export const GetSubscriptionNodeKey = Symbol('getSubscriptionNode');
export const MakeModelViewKey = Symbol('makeModelView');
export const FlushKey = Symbol('flush');
export const AddDeferredWorkKey = Symbol('addDeferredWork');
export const NotifyKey = Symbol('notify');

export type ProcessAction =
    | 'recalculate'
    | 'cycle'
    | 'cycle-dependency'
    | 'invalidate';

/**
 * A ref object that can be passed to native elements.
 */
export type Ref<T> = {
    [TypeTag]: 'ref';
    current: T | undefined;
};
export function isRef(ref: any): ref is Ref<unknown> {
    return ref && ref[TypeTag] === 'ref';
}

/**
 * Make a ref object that can be passed to native elements.
 */
export function ref<T>(val?: T): Ref<T> {
    return {
        [TypeTag]: 'ref',
        current: val,
    };
}

export type ModelEvent =
    | {
          type: 'add';
          key: string | number | symbol;
      }
    | {
          type: 'set';
          key: string | number | symbol;
          value: any;
      }
    | {
          type: 'delete';
          key: string | number | symbol;
      };
export type ModelObserver = (event: ModelEvent) => void;

export type EqualityFunc<T> = (a: T, b: T) => boolean;
export type MappingFunction<T, V> = (item: T) => V;
export type FilterFunction<T> = (item: T) => boolean;
export type FlatMapFunction<T, V> = (item: T) => V[];

export interface ViewSpec<TInitialize, TItem, TEvent> {
    /**
     * Return initial items
     */
    initialize: (items: TInitialize) => TItem[];

    /**
     * Process subscription events
     */
    processEvent: (
        view: Collection<TItem>,
        event: TEvent,
        initialValue: TItem[]
    ) => void;
}

export type CollectionEvent<T> =
    | {
          type: 'splice';
          index: number;
          count: number;
          items: readonly T[];
          removed: readonly T[];
      }
    | {
          type: 'move';
          fromIndex: number;
          fromCount: number;
          toIndex: number;
          moved: readonly T[];
      }
    | {
          type: 'sort';
          indexes: readonly number[];
      };

export type TrackedData<TImplementation, TTypeTag, TEvent> = TImplementation & {
    // Note: contains $__id: string
    [TypeTag]: 'data';
    [DataTypeTag]: TTypeTag;
    [FlushKey]: () => boolean;
    [AddDeferredWorkKey]: (task: () => void) => void;
    [ObserveKey]: (
        listener: (events: TEvent[], subscriptionNode: Subscription) => void
    ) => () => void;
    [GetSubscriptionNodeKey]: () => Subscription;
    [NotifyKey]: (event: TEvent) => void;
};

/**
 * A mutable object to hold state
 */
export type Model<T> = TrackedData<T, 'model', ModelEvent> & {
    [MakeModelViewKey]: <V>(
        modelViewSpec: ViewSpec<Readonly<T>, V, ModelEvent>,
        debugName?: string
    ) => View<V>;
};

/**
 * A mutable array to hold state, with some additional convenience methods
 */
export type Collection<T> = TrackedData<
    Array<T>,
    'collection',
    CollectionEvent<T>
> & {
    makeView<V>(
        viewSpec: ViewSpec<readonly T[], V, CollectionEvent<T>>,
        debugName?: string
    ): View<V>;
    mapView<V>(mapFn: MappingFunction<T, V>, debugName?: string): View<V>;
    filterView(filterFn: FilterFunction<T>, debugName?: string): View<T>;
    flatMapView<V>(
        flatMapFn: MappingFunction<T, V[]>,
        debugName?: string
    ): View<V>;
    reject(shouldReject: (item: T, index: number) => boolean): void;
    moveSlice(fromIndex: number, fromCount: number, toIndex: number): void;
};

/**
 * A readonly array to hold projected state
 */
export type View<T> = TrackedData<
    ReadonlyArray<T>,
    'collection',
    CollectionEvent<T>
> & {
    makeView<V>(
        viewSpec: ViewSpec<readonly T[], V, CollectionEvent<T>>,
        debugName?: string
    ): View<V>;
    mapView<V>(mapFn: MappingFunction<T, V>, debugName?: string): View<V>;
    filterView(filterFn: FilterFunction<T>, debugName?: string): View<T>;
    flatMapView<V>(
        flatMapFn: MappingFunction<T, V[]>,
        debugName?: string
    ): View<V>;
};

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
    /**
     * Note: although this function has a signature, it does not actually take arguments when called directly.
     *
     * This is solely present so that TypeScript can auto-complete the "value" prop of Contexts
     */
    (unusedOnlyForJsxTypeInferrence?: { value: TValue }): TValue;
    [TypeTag]: 'context';
}

export function createContext<TValue>(val: TValue): Context<TValue> {
    return Object.assign(() => val, {
        [TypeTag]: 'context' as const,
    });
}

export function isContext(val: any): val is Context<any> {
    return !!(val && val[TypeTag] === 'context');
}

/**
 * A calculation cell that recalculates when dependencies change
 */
export interface Calculation<Result> {
    (): Result;
    $__id: string;
    [TypeTag]: 'calculation';
    [CalculationTypeTag]: 'calculation' | 'effect';
    flush: () => boolean;
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

export function isModel(thing: any): thing is Model<unknown> {
    return !!(
        thing &&
        thing[TypeTag] === 'data' &&
        thing[DataTypeTag] === 'model'
    );
}

export function isModelField(thing: any): thing is ModelField {
    return !!(
        thing &&
        !thing[TypeTag] &&
        !!thing.model &&
        !!thing.model[DataTypeTag]
    );
}

export function isCollection(thing: any): thing is Collection<any> | View<any> {
    return !!(
        thing &&
        thing[TypeTag] === 'data' &&
        thing[DataTypeTag] === 'collection'
    );
}

export function isCalculation(thing: any): thing is Calculation<any> {
    return !!(thing && thing[TypeTag] === 'calculation');
}

export function isEffect(thing: Calculation<unknown>): boolean {
    return thing[CalculationTypeTag] === 'effect';
}

export function isSubscription(thing: any): thing is Subscription {
    return !!(thing && thing[TypeTag] === 'subscription');
}

export function isNodeOrdering(thing: any): thing is NodeOrdering {
    return !!(thing && thing[TypeTag] === 'nodeOrdering');
}

export type DAGNode =
    | Model<any>
    | Collection<any>
    | Calculation<any>
    | ModelField
    | View<any>
    | Subscription
    | NodeOrdering;
