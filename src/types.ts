export class InvariantError extends Error {
    detail?: any;
    constructor(msg: string, detail?: any) {
        super(msg);
        this.detail = detail;
    }
}

export const TypeTag = Symbol('typeTag');
export const ContextGetterTag = Symbol('contextGetter');
export const DataTypeTag = Symbol('dataTypeTag');
export const CalculationTypeTag = Symbol('calculationType');
export const CalculationRecalculateTag = Symbol('calculationRecalculate');
export const CalculationRecalculateCycleTag = Symbol(
    'calculationRecalculateCycle'
);
export const CalculationInvalidateTag = Symbol('calculationInvalidate');
export const CalculationSetCycleTag = Symbol('calculationSetCycle');

export const ObserveKey = Symbol('observe');
export const GetSubscriptionConsumerKey = Symbol('getSubscriptionConsumer');
export const GetSubscriptionEmitterKey = Symbol('getSubscriptionEmitter');
export const MakeModelViewKey = Symbol('makeModelView');

export const DisposeKey = Symbol('dispose');
export const MarkRootKey = Symbol('markRoot');
export const UnmarkRootKey = Symbol('unmarkRoot');

export const FlushKey = Symbol('flush');
export const AddSubscriptionConsumerWorkKey = Symbol(
    'addSubscriptionConsumerWork'
);
export const NotifyKey = Symbol('notify');

export type IntrinsicNodeObserverNodeCallback = (
    node: Node,
    event: 'add' | 'remove'
) => void;
export type IntrinsicNodeObserverElementCallback = (
    element: Element,
    event: 'add' | 'remove'
) => void;

export type ProcessAction =
    | 'recalculate'
    | 'recalculate-cycle'
    | 'cycle'
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

export type TrackedData<TTypeTag, TEvent> = {
    [TypeTag]: 'data';
    [DataTypeTag]: TTypeTag;
    [AddSubscriptionConsumerWorkKey]: (task: () => void) => void;
    [ObserveKey]: (
        listener: (
            events: TEvent[],
            subscriptionEmitter: SubscriptionEmitter
        ) => void
    ) => () => void;
    [GetSubscriptionConsumerKey]: () => SubscriptionConsumer;
    [GetSubscriptionEmitterKey]: () => SubscriptionEmitter;
    [NotifyKey](event: TEvent): void; // Note: bivariance needed here!

    [DisposeKey]: () => void;
    [MarkRootKey]: () => void;
    [UnmarkRootKey]: () => void;
};

/**
 * A mutable object to hold state
 */
interface ModelMethods<T extends {}> {
    [MakeModelViewKey]: <V>(
        modelViewSpec: ViewSpec<Readonly<T>, V, ModelEvent>,
        debugName?: string
    ) => View<V>;
}
export type Model<T> = TrackedData<'model', ModelEvent> &
    ModelMethods<T> & {
        [Key in keyof T]: T[Key];
    };

/**
 * A mutable array to hold state, with some additional convenience methods
 */
interface CollectionMethods<T> {
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
    reject(shouldReject: (item: T, index: number) => boolean): T[];
    moveSlice(fromIndex: number, fromCount: number, toIndex: number): void;
}
export interface Collection<T>
    extends TrackedData<'collection', CollectionEvent<T>>,
        CollectionMethods<T>,
        Array<T> {}

/**
 * A readonly array to hold projected state
 */
interface ViewMethods<T> {
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
}
export interface View<T>
    extends TrackedData<'collection', CollectionEvent<T>>,
        ViewMethods<T>,
        ReadonlyArray<T> {}

export interface SubscriptionConsumer {
    $__id: number;
    [TypeTag]: 'subscriptionConsumer';
    item: any;
    [FlushKey]: () => boolean;
}

export interface SubscriptionEmitter {
    $__id: number;
    [TypeTag]: 'subscriptionEmitter';
    item: any;
    [FlushKey]: () => boolean;
}

export interface NodeOrdering {
    $__id: number;
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

export function createContext<TValue>(val: TValue): Context<TValue> {
    return Object.assign(
        () => {
            throw new Error('Do not call contexts as functions');
        },
        {
            [ContextGetterTag]: () => val,
            [TypeTag]: 'context' as const,
        }
    );
}

export function getContext<TValue>(context: Context<TValue>): TValue {
    return context[ContextGetterTag]();
}

export function isContext(val: any): val is Context<any> {
    return !!(val && val[TypeTag] === 'context');
}

/**
 * A calculation cell that recalculates when dependencies change
 */
export interface Calculation<Result> {
    (): Result;
    $__id: number;
    [TypeTag]: 'calculation';
    [CalculationTypeTag]: 'calculation' | 'effect';
    [DisposeKey]: () => void;
    onError: (handler: (errorType: 'cycle' | 'error') => Result) => this;
    [CalculationSetCycleTag]: () => boolean;
    [CalculationRecalculateTag]: () => boolean;
    [CalculationRecalculateCycleTag]: () => boolean;
    [CalculationInvalidateTag]: () => void;
}

export interface ModelField {
    $__id: number;
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

export function isSubscriptionEmitter(
    thing: any
): thing is SubscriptionEmitter {
    return !!(thing && thing[TypeTag] === 'subscriptionEmitter');
}

export function isSubscriptionConsumer(
    thing: any
): thing is SubscriptionConsumer {
    return !!(thing && thing[TypeTag] === 'subscriptionConsumer');
}

export function isNodeOrdering(thing: any): thing is NodeOrdering {
    return !!(thing && thing[TypeTag] === 'nodeOrdering');
}

export type GraphNode =
    | Calculation<any>
    | ModelField
    | SubscriptionConsumer
    | SubscriptionEmitter
    | NodeOrdering;

export type RetainedItem = GraphNode | Model<any> | Collection<any> | View<any>;
