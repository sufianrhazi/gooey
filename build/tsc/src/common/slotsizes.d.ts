import type { ArrayEvent, ArrayEventMove, ArrayEventSort, ArrayEventSplice } from './arrayevent';
export declare class SlotSizes<TEventSource> {
    items: TEventSource[];
    private slots;
    private indexes;
    constructor(items: TEventSource[]);
    clearSlots(): void;
    updateIndexes(lo: number, hi: number): void;
    get(index: number): TEventSource | undefined;
    move(from: number, count: number, to: number): ArrayEventMove;
    sort(from: number, indexes: number[]): ArrayEventSort;
    splice<T>(index: number, count: number, items: TEventSource[]): {
        removed: TEventSource[];
        event: ArrayEventSplice<T>;
    };
    applyEvent<TEvent>(source: TEventSource, event: ArrayEvent<TEvent>): ArrayEvent<TEvent>;
}
//# sourceMappingURL=slotsizes.d.ts.map