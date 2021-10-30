export class InvariantError extends Error { }

export const TypeTag = Symbol('reviseType');
const CalculationTypeTag = Symbol('calculationType');

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

export type Model<T> = T & {
    [TypeTag]: 'model';
};

type MappingFunction<T, V> = (item: T, index: number, array: T[]) => V;
export const OnCollectionRelease = Symbol('OnCollectionRelease');
export interface Collection<T> extends Array<T> {
    [TypeTag]: 'collection';
    observe(observer: CollectionObserver<T>): () => void;
    mapView<V>(fn: MappingFunction<T, V>): Readonly<Collection<V>>;
    retain(): void;
    release(): void;
    [OnCollectionRelease]: (fn: () => void) => void;
};
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

export function isCollection(
    thing: any
): thing is Collection<unknown> {
    return !!(thing && (thing as any)[TypeTag] === 'collection');
}

export function isCalculation(
    thing: any
): thing is Calculation<unknown> {
    return !!(thing && (thing as any)[TypeTag] === 'calculation');
}

export function isEffect<T>(
    thing: Calculation<unknown>
): boolean {
    return thing[CalculationTypeTag] === 'effect';
}
