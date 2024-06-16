import {
    ArrayEventMove,
    ArrayEventSort,
    ArrayEventSplice,
    ArrayEventType,
    applyMove,
    applySort,
} from './arrayevent';
import type { ArrayEvent } from './arrayevent';
import * as log from './log';

export class SlotSizes<TEventSource> {
    private items: TEventSource[];
    private slots: number[];
    private indexes: Map<TEventSource, number>;

    constructor(items: TEventSource[]) {
        this.slots = items.map(() => 0);
        this.items = items;
        this.indexes = new Map();
        this.updateIndexes(0, items.length);
    }

    updateIndexes(lo: number, hi: number) {
        for (let i = lo; i < hi; ++i) {
            this.indexes.set(this.items[i], i);
        }
    }

    index(item: TEventSource): number | undefined {
        return this.indexes.get(item);
    }

    get(index: number): TEventSource | undefined {
        return this.items[index];
    }

    move(from: number, count: number, to: number): ArrayEventMove {
        let fromShift = 0;
        let countShift = 0;
        let toShift = 0;
        for (let i = 0; i < from; ++i) {
            fromShift += this.slots[i];
        }
        for (let i = from; i < from + count; ++i) {
            countShift += this.slots[i];
        }

        applyMove(this.slots, from, count, to);
        applyMove(this.items, from, count, to);

        for (let i = 0; i < to; ++i) {
            toShift += this.slots[i];
        }

        this.updateIndexes(from, from + count);
        this.updateIndexes(to, to + count);

        return {
            type: ArrayEventType.MOVE,
            from: fromShift,
            count: countShift,
            to: toShift,
        };
    }

    sort(from: number, indexes: number[]): ArrayEventSort {
        // We need to both apply a sort operation and return a projected sort
        // event that is formed from the full array.
        //
        // Imagine slots:
        // - [0, 3, 1, 0, 2]
        // - [[], [a,b,c], [d], [], [e,f]]
        //
        // Where we sort from index 1 so that it goes: 0, 1, 3:
        // - [[], [], [d], [a,b,c], [e,f]]
        //
        // Original event: from: 1, indexes: [3,2,1]
        //
        // Shifted event: from: 0, indexes: [3,0,1,2]
        //
        // We get here by building nested indexes:
        // - [[], [0,1,2], [3], [], [4,5]]
        //
        // Applying the array event:
        // - [[], [], [3], [0,1,2], [4,5]]
        //
        // And slicing/flattening the result with a shifted from:
        // - [3,0,1,2]

        let fromShift = 0;
        let totalIndex = 0;
        const indexedSlots: number[][] = [];
        for (let i = 0; i < from + indexes.length; ++i) {
            const slotSize = this.slots[i];
            const indexedSlot: number[] = [];
            for (let j = 0; j < slotSize; ++j) {
                indexedSlot.push(totalIndex++);
            }
            indexedSlots.push(indexedSlot);
            if (i < from) {
                fromShift += this.slots[i];
            }
        }
        applySort(indexedSlots, from, indexes);
        const newIndexes = indexedSlots.slice(from).flat();
        applySort(this.slots, from, indexes);
        applySort(this.items, from, indexes);
        this.updateIndexes(from, from + indexes.length);
        return {
            type: ArrayEventType.SORT,
            from: fromShift,
            indexes: newIndexes,
        };
    }

    splice<T>(
        index: number,
        count: number,
        items: TEventSource[]
    ): { removed: TEventSource[]; event: ArrayEventSplice<T> } {
        let shiftIndex = 0;
        for (let i = 0; i < index; ++i) {
            shiftIndex += this.slots[i];
        }
        let shiftCount = 0;
        for (let i = index; i < index + count; ++i) {
            shiftCount += this.slots[i];
        }
        this.slots.splice(index, count, ...items.map(() => 0));
        const removedItems = this.items.splice(index, count, ...items);
        for (const removedItem of removedItems) {
            this.indexes.delete(removedItem);
        }
        if (this.items.length === count) {
            this.updateIndexes(index, index + count);
        } else {
            this.updateIndexes(index, this.items.length);
        }
        return {
            removed: removedItems,
            event: {
                type: ArrayEventType.SPLICE,
                index: shiftIndex,
                count: shiftCount,
                items: [], // Note: added items are _always_ treated as if they are empty
            },
        };
    }

    applyEvent<TEvent>(
        source: TEventSource,
        event: ArrayEvent<TEvent>
    ): ArrayEvent<TEvent> {
        const sourceIndex = this.indexes.get(source);
        log.assert(
            sourceIndex !== undefined,
            'event from unknown SlotSizes source',
            source
        );
        let shift = 0;
        for (let i = 0; i < sourceIndex; ++i) {
            shift += this.slots[i];
        }
        switch (event.type) {
            case ArrayEventType.SPLICE: {
                this.slots[sourceIndex] +=
                    event.items?.length ?? 0 - event.count;
                return {
                    type: ArrayEventType.SPLICE,
                    index: event.index + shift,
                    count: event.count,
                    items: event.items,
                };
            }
            case ArrayEventType.SORT: {
                return {
                    type: ArrayEventType.SORT,
                    from: event.from + shift,
                    indexes: event.indexes.map((index) => index + shift),
                };
            }
            case ArrayEventType.MOVE: {
                return {
                    type: ArrayEventType.MOVE,
                    from: event.from + shift,
                    count: event.count,
                    to: event.to + shift,
                };
            }
            default:
                log.assertExhausted(event, 'unknown ArrayEvent type');
        }
    }
}
