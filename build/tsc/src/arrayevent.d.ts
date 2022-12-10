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
export declare type ArrayEvent<T> = ArrayEventSplice<T> | ArrayEventMove | ArrayEventSort;
export declare function shiftEventBy<T>(shiftAmount: number, event: ArrayEvent<T>): void;
export declare function shiftEvent<T>(slotSizes: number[], slotIndex: number, event: ArrayEvent<T>): void;
export declare function applyArrayEvent<T>(target: T[], event: ArrayEvent<T>): readonly T[];
export declare function arrayEventFlatMap<T, V>(slotSizes: number[], flatMap: (item: T) => readonly V[], target: V[], event: ArrayEvent<T>): IterableIterator<ArrayEvent<V>>;
export declare function addArrayEvent<T>(events: ArrayEvent<T>[], event: ArrayEvent<T>): void;
//# sourceMappingURL=arrayevent.d.ts.map