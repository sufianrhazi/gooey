export class InvariantError extends Error {}

export const ReviseSymbol = Symbol('revise');

export type TrackedModel<T> = T & { [ReviseSymbol]: 'model' };
export type TrackedComputation<Result> = (() => Result) & {
    [ReviseSymbol]: 'computation';
};

export interface ModelField<T> {
    model: TrackedModel<T>;
    key: string | symbol;
}

export function isTrackedComputation(
    thing: any
): thing is TrackedComputation<unknown> {
    return !!(thing && (thing as any)[ReviseSymbol] === 'computation');
}
