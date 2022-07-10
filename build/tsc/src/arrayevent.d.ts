export declare enum ArrayEventType {
    SPLICE = 0,
    MOVE = 1,
    SORT = 2
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