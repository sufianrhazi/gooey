export class InvariantError extends Error {}

export const TypeTag = Symbol('reviseType');
const CalculationTypeTag = Symbol('calculationType');

export const ObserveKey = Symbol('observe');

export type Ref<T> = {
    [TypeTag]: 'ref';
    current?: T;
};
export function isRef(ref: any): ref is Ref<unknown> {
    return ref && ref[TypeTag] === 'ref';
}
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
      }
    | {
          type: 'init';
          items: readonly T[];
      }
    | {
          type: 'sort';
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

export type Model<T> = T & {
    [TypeTag]: 'model';
    [ObserveKey]: (observer: ModelObserver) => () => void;
};

type MappingFunction<T, V> = (item: T, index: number, array: T[]) => V;
export const OnCollectionRelease = Symbol('OnCollectionRelease');
export interface Collection<T> extends Array<T> {
    [TypeTag]: 'collection';
    [ObserveKey]: (observer: CollectionObserver<T>) => () => void;
    mapView<V>(fn: MappingFunction<T, V>): Readonly<Collection<V>>;
    reject(fn: (item: T, index: number) => boolean): void;
    [OnCollectionRelease]: (fn: () => void) => void;
}
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

export function isCollection(thing: any): thing is Collection<unknown> {
    return !!(thing && (thing as any)[TypeTag] === 'collection');
}

export function isCalculation(thing: any): thing is Calculation<unknown> {
    return !!(thing && (thing as any)[TypeTag] === 'calculation');
}

export function isEffect(thing: Calculation<unknown>): boolean {
    return thing[CalculationTypeTag] === 'effect';
}
