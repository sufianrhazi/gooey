export class InvariantError extends Error {}

export const TypeTag = Symbol('reviseType');
const CalculationTypeTag = Symbol('calculationType');
export const RecalculationTag = Symbol('recalculate');

export const ObserveKey = Symbol('observe');
export const MakeModelViewKey = Symbol('makeModelView');
export const DeferredKey = Symbol('deferred');
export const FlushKey = Symbol('flush');
export const AddDeferredWorkKey = Symbol('addDeferredWork');
export const NotifyKey = Symbol('notifyEvent');

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

/**
 * A mutable object to hold state
 */
export type Model<T> = T & {
    [TypeTag]: 'model';
    [FlushKey]: () => void;
    [ObserveKey]: (observer: ModelObserver) => () => void;
    [AddDeferredWorkKey]: (task: () => void) => void;
    [MakeModelViewKey]: <V>(
        modelViewSpec: ModelViewSpec<T, V>,
        debugName?: string
    ) => View<V>;
};

export type EqualityFunc<T> = (a: T, b: T) => boolean;
export type MappingFunction<T, V> = (item: T) => V;
export type FilterFunction<T> = (item: T) => boolean;
export type FlatMapFunction<T, V> = (item: T) => V[];

export const OnCollectionRelease = Symbol('OnCollectionRelease');

export interface ViewSpec<T, V> {
    /**
     * Return initial items
     */
    initialize: (items: readonly T[]) => V[];

    /**
     * Process subscription events
     */
    processEvent: (view: Collection<V>, event: CollectionEvent<T>) => void;
}

export interface ModelViewSpec<T, V> {
    /**
     * Return initial items
     */
    initialize: (obj: Readonly<T>) => V[];

    /**
     * Process subscription events
     */
    processEvent: (view: Collection<V>, event: ModelEvent) => void;
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
      };

/**
 * A mutable array to hold state, with some additional convenience methods
 */
export interface Collection<T> extends Array<T> {
    [TypeTag]: 'collection';
    [FlushKey]: () => void;
    [AddDeferredWorkKey]: (task: () => void) => void;
    [ObserveKey]: (
        listener: (observer: CollectionEvent<T>) => void
    ) => () => void;
    makeView<V>(viewSpec: ViewSpec<T, V>, debugName?: string): View<V>;
    mapView<V>(mapFn: MappingFunction<T, V>, debugName?: string): View<V>;
    filterView(filterFn: FilterFunction<T>, debugName?: string): View<T>;
    flatMapView<V>(
        flatMapFn: MappingFunction<T, V[]>,
        debugName?: string
    ): View<V>;
    reject(shouldReject: (item: T, index: number) => boolean): void;
    moveSlice(fromIndex: number, fromCount: number, toIndex: number): void;
    [OnCollectionRelease]: (fn: () => void) => void;
}

export interface Subscription {
    [TypeTag]: 'subscription';
}

/**
 * A readonly array to hold projected state
 */
export interface View<T> extends ReadonlyArray<T> {
    [TypeTag]: 'collection';
    [FlushKey]: () => void;
    [AddDeferredWorkKey]: (task: () => void) => void;
    [ObserveKey]: (
        listener: (observer: CollectionEvent<T>) => void
    ) => () => void;
    makeView<V>(viewSpec: ViewSpec<T, V>, debugName?: string): View<V>;
    mapView<V>(mapFn: MappingFunction<T, V>, debugName?: string): View<V>;
    filterView(filterFn: FilterFunction<T>, debugName?: string): View<T>;
    flatMapView<V>(
        flatMapFn: MappingFunction<T, V[]>,
        debugName?: string
    ): View<V>;
    [OnCollectionRelease]: (fn: () => void) => void;
}

/**
 * A calculation cell that recalculates when dependencies change
 */
export type Calculation<Result> = (() => Result) & {
    [TypeTag]: 'calculation';
    [CalculationTypeTag]: 'calculation' | 'effect';
    [RecalculationTag]: () => boolean;
};

export interface ModelField<T> {
    model: Model<T> | Collection<T>;
    key: string | number | symbol;
}

export function makeCalculation<Ret>(
    fn: () => Ret,
    recalcFn: () => boolean
): Calculation<Ret> {
    return Object.assign(fn, {
        [TypeTag]: 'calculation' as const,
        [CalculationTypeTag]: 'calculation' as const,
        [RecalculationTag]: recalcFn,
    });
}

export function makeEffect(
    fn: () => void,
    recalcFn: () => boolean
): Calculation<void> {
    return Object.assign(fn, {
        [TypeTag]: 'calculation' as const,
        [CalculationTypeTag]: 'effect' as const,
        [RecalculationTag]: recalcFn,
    });
}

export function isModel(thing: any): thing is Model<unknown> {
    return !!(thing && thing[TypeTag] === 'model');
}

export function isModelField(thing: any): thing is ModelField<unknown> {
    return !!(
        thing &&
        !thing[TypeTag] &&
        (isCollection(thing.model) || isModel(thing.model)) &&
        (typeof thing.key === 'string' ||
            typeof thing.key === 'number' ||
            typeof thing.key === 'symbol')
    );
}

export function isCollection(thing: any): thing is Collection<any> | View<any> {
    return !!(thing && thing[TypeTag] === 'collection');
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

export type DAGNode<T> =
    | Model<T>
    | Collection<T>
    | Calculation<T>
    | ModelField<T>
    | View<T>
    | Subscription;
