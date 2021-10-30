export class InvariantError extends Error {}

export const TrackedTypeTag = Symbol('trackedType');
const ComputationType = Symbol('computationType');

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

export type TrackedModel<T> = T & {
    [TrackedTypeTag]: 'model';
};

type MappingFunction<T, V> = (item: T, index: number, array: T[]) => V;
export const OnCollectionRelease = Symbol('OnCollectionRelease');
export type TrackedCollection<T> = T[] & {
    [TrackedTypeTag]: 'collection';
    observe(observer: CollectionObserver<T>): () => void;
    mapView<V>(fn: MappingFunction<T, V>): Readonly<TrackedCollection<V>>;
    retain(): void;
    release(): void;
    [OnCollectionRelease]: (fn: () => void) => void;
};
export type TrackedComputation<Result> = (() => Result) & {
    [TrackedTypeTag]: 'computation';
    [ComputationType]: 'computation' | 'effect';
};

export interface ModelField<T> {
    model: TrackedModel<T> | TrackedCollection<T>;
    key: string | symbol;
}

export function makeComputation<Ret>(fn: () => Ret): TrackedComputation<Ret> {
    return Object.assign(fn, {
        [TrackedTypeTag]: 'computation' as const,
        [ComputationType]: 'computation' as const,
    });
}

export function makeEffect(fn: () => void): TrackedComputation<void> {
    return Object.assign(fn, {
        [TrackedTypeTag]: 'computation' as const,
        [ComputationType]: 'effect' as const,
    });
}

export function isTrackedCollection(
    thing: any
): thing is TrackedCollection<unknown> {
    return !!(thing && (thing as any)[TrackedTypeTag] === 'collection');
}

export function isTrackedComputation(
    thing: any
): thing is TrackedComputation<unknown> {
    return !!(thing && (thing as any)[TrackedTypeTag] === 'computation');
}

export function isTrackedEffect<T>(
    thing: TrackedComputation<unknown>
): boolean {
    return thing[ComputationType] === 'effect';
}
