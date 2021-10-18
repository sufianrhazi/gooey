export class InvariantError extends Error {}

const TrackedTypeTag = Symbol('trackedType');
const ComputationType = Symbol('computationType');

export type TrackedModel<T> = T & {
    [TrackedTypeTag]: 'model';
    release: () => void;
};
export type TrackedComputation<Result> = (() => Result) & {
    [TrackedTypeTag]: 'computation';
    [ComputationType]: 'computation' | 'effect';
};

export interface ModelField<T> {
    model: TrackedModel<T>;
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
