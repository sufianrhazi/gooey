export class InvariantError extends Error {}

export const TypeTag = Symbol('reviseType');
const CalculationTypeTag = Symbol('calculationType');

export const OwnKeysField = Symbol('ownKeys');
export const ObserveKey = Symbol('observe');
export const GetRawArrayKey = Symbol('getRawArray');
export const FlushKey = Symbol('flush');
export const NotifyKey = Symbol('notifyEvent');

/**
 * A ref object that can be passed to native elements.
 */
export type Ref<T> = {
    [TypeTag]: 'ref';
    current?: T;
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

export type CollectionEvent<T> =
    | {
          type: 'splice';
          index: number;
          count: number;
          items: readonly T[];
          removed: readonly T[];
      }
    | {
          type: 'init';
          items: readonly T[];
      };

export type CollectionObserver<T> = (event: CollectionEvent<T>) => void;

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
      }
    | {
          type: 'init';
          keys: (string | number | symbol)[];
      };
export type ModelObserver = (event: ModelEvent) => void;

/**
 * A mutable object to hold state
 */
export type Model<T> = T & {
    [TypeTag]: 'model';
    [ObserveKey]: (observer: ModelObserver) => () => void;
    /** internal Object.keys pseudo-result field; only used for tracking key changes */
    [OwnKeysField]: any;
};

export type MappingFunction<T, V> = (item: T) => V;
export type FilterFunction<T> = (item: T) => boolean;
export type FlatMapFunction<T, V> = (item: T) => V[];
export type SortKeyFunction<T> = ((item: T) => string) | ((item: T) => number);

export const OnCollectionRelease = Symbol('OnCollectionRelease');

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
    flatMapView<V>(
        flatMapFn: MappingFunction<T, V[]>,
        debugName?: string
    ): View<V>;
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
};

export interface ModelField<T> {
    model: Model<T> | Collection<T>;
    key: string | number | symbol;
}

export function makeCalculation<Ret>(fn: () => Ret): Calculation<Ret> {
    return Object.assign(fn, {
        [TypeTag]: 'calculation' as const,
        [CalculationTypeTag]: 'calculation' as const,
    });
}

export function makeEffect(fn: () => void): Calculation<void> {
    return Object.assign(fn, {
        [TypeTag]: 'calculation' as const,
        [CalculationTypeTag]: 'effect' as const,
    });
}

export function isModel(thing: any): thing is Model<unknown> {
    return !!(thing && (thing as any)[TypeTag] === 'model');
}

export function isCollection(
    thing: any
): thing is Collection<unknown> | View<unknown> {
    return !!(thing && (thing as any)[TypeTag] === 'collection');
}

export function isCalculation(thing: any): thing is Calculation<unknown> {
    return !!(thing && (thing as any)[TypeTag] === 'calculation');
}

export function isEffect(thing: Calculation<unknown>): boolean {
    return thing[CalculationTypeTag] === 'effect';
}
