export declare enum ArrayEventType {
    SPLICE = "splice",
    MOVE = "move",
    SORT = "sort"
}
export interface ArrayEventSplice<T> {
    type: ArrayEventType.SPLICE;
    index: number;
    count: number;
    items?: T[] | undefined;
}
export interface ArrayEventMove {
    type: ArrayEventType.MOVE;
    from: number;
    count: number;
    to: number;
}
export interface ArrayEventSort {
    type: ArrayEventType.SORT;
    from: number;
    indexes: number[];
}
export type ArrayEvent<T> = ArrayEventSplice<T> | ArrayEventMove | ArrayEventSort;
export declare function applySort<T>(target: T[], from: number, indexes: number[]): void;
export declare function applyMove<T>(target: T[], from: number, count: number, to: number): void;
export declare function applyArrayEvent<T>(target: T[], event: ArrayEvent<T>): readonly T[];
/**
 * Merge array events into a stream of more optimized events.
 *
 * i.e. join splice events that can be joined
 */
export declare function mergeArrayEvents<T>(events: ArrayEvent<T>[]): Generator<ArrayEvent<T>, void, unknown>;
//# sourceMappingURL=arrayevent.d.ts.map