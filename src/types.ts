export class InvariantError extends Error {}

export const ReviseSymbol = Symbol('revise');

export type TrackedModel<T> = T & { [ReviseSymbol]: 'model' };
export type TrackedComputation = () => any & { [ReviseSymbol]: 'computation' };
export type TrackedItem<T> = TrackedModel<T> | TrackedComputation;

export interface ModelField<T> {
    model: TrackedModel<T>;
    key: string | symbol;
}

export function isTrackedComputation(
    thing: unknown
): thing is TrackedComputation {
    return !!(thing && (thing as any)[ReviseSymbol] === 'computation');
}
