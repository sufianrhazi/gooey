export declare enum ArrayEventType {
    SPLICE = "splice",
    MOVE = "move",
    SORT = "sort"
}
export declare type ArrayEvent<T> = {
    type: ArrayEventType.SPLICE;
    index: number;
    count: number;
    items?: T[] | undefined;
} | {
    type: ArrayEventType.MOVE;
    from: number;
    count: number;
    to: number;
} | {
    type: ArrayEventType.SORT;
    from: number;
    indexes: number[];
};
export declare function shiftEvent<T>(slotSizes: number[], slotIndex: number, event: ArrayEvent<T>): void;
export declare function applyEvent<T>(target: T[], event: ArrayEvent<T>): void;
export declare function arrayEventFlatMap<T, V>(slotSizes: number[], flatMap: (item: T) => readonly V[], target: V[], event: ArrayEvent<T>): IterableIterator<ArrayEvent<V>>;
//# sourceMappingURL=arrayevent.d.ts.map