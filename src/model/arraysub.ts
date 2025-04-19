import {
    applyArrayEvent,
    ArrayEventType,
    mergeArrayEvents,
} from '../common/arrayevent';
import type { ArrayEvent } from '../common/arrayevent';
import * as log from '../common/log';
import { SlotSizes } from '../common/slotsizes';
import { TrackedArray } from './trackedarray';

// https://tc39.es/ecma262/multipage/indexed-collections.html#sec-sortcompare
function defaultSort(x: any, y: any) {
    if (x === undefined && y === undefined) return 0;
    if (x === undefined) return 1;
    if (y === undefined) return -1;
    const xStr = '' + x;
    const yStr = '' + y;
    if (xStr < yStr) return -1;
    if (xStr > yStr) return 1;
    return 0;
}

export interface DynamicArray<T> {
    get(key: number): T;
    getLength(): number;
    getItemsUnsafe(): T[];
    subscribe(handler: (event: Iterable<ArrayEvent<T>>) => void): () => void;
    retain(): void;
    release(): void;
}

export class ArraySub<T> implements DynamicArray<T> {
    private declare items: T[];
    private declare trackedArray: TrackedArray<ArrayEvent<T>>;

    declare __debugName: string;

    constructor(
        init?: T[] | undefined,
        debugName?: string,
        lifecycle?: { onAlive?: () => void; onDead?: () => void }
    ) {
        this.items = init ?? [];
        this.trackedArray = new TrackedArray(
            mergeArrayEvents,
            lifecycle,
            debugName
        );

        this.__debugName = debugName ?? 'arraysub';
    }

    getItemsUnsafe() {
        return this.items;
    }

    get(index: number) {
        this.trackedArray.notifyRead(index);
        return this.items[index];
    }

    set(index: number, value: T) {
        if (index >= this.items.length) {
            log.warn('Assigning to out-of-bounds index');
            const items: T[] = [];
            for (let i = this.items.length; i < index; ++i) {
                items.push(undefined as T);
            }
            items.push(value);
            this.splice(this.items.length, 0, items);
            return;
        }
        if (this.items[index] === value) {
            // Avoid doing anything if the write is a noop
            return;
        }
        this.items[index] = value;
        this.trackedArray.markDirty({ start: index, end: index + 1 });

        this.trackedArray.addEvent({
            type: ArrayEventType.SPLICE,
            index,
            count: 1,
            items: [value],
        });

        this.trackedArray.tickClock();
    }

    setLength(newLength: number) {
        if (newLength < this.items.length) {
            this.splice(newLength, this.items.length - newLength, []);
        } else if (newLength > this.items.length) {
            const items: T[] = [];
            for (let i = this.items.length; i < newLength; ++i) {
                items.push(undefined as T);
            }
            this.splice(this.items.length, 0, items);
        }
    }

    getLength() {
        this.trackedArray.notifyRead('length');
        return this.items.length;
    }

    /**
     * Implement a splice, dirtying the affected fields, but do not queue a
     * splice event
     */
    private spliceInner(index: number, count: number, items: T[]) {
        const startLength = this.items.length;
        const removed = Array.prototype.splice.call(
            this.items,
            index,
            count,
            ...items
        );
        const endLength = this.items.length;

        if (startLength === endLength) {
            // invalidate fields affected by splice
            this.trackedArray.markDirty({
                start: index,
                end: index + items.length,
            });
        } else {
            // invalidate fields affected by splice
            this.trackedArray.markDirty({ start: index, end: endLength });

            // destroy any dead fields
            this.trackedArray.markDirty({ start: endLength, end: startLength });
            this.trackedArray.markDirty('length');
        }

        return removed;
    }

    splice(index: number, count: number, items: T[]) {
        if (count === 0 && items.length === 0) {
            // no-op avoid incrementing clock
            return [];
        }
        let fixedIndex: number;
        if (index < -this.items.length) {
            fixedIndex = 0;
        } else if (index < 0) {
            fixedIndex = this.items.length - index;
        } else if (index > this.items.length) {
            fixedIndex = this.items.length;
        } else {
            fixedIndex = index;
        }

        const removed = this.spliceInner(fixedIndex, count, items);

        this.trackedArray.addEvent({
            type: ArrayEventType.SPLICE,
            index: fixedIndex,
            count,
            items,
        });

        this.trackedArray.tickClock();
        return removed;
    }

    sort(sortFn: (a: T, b: T) => number = defaultSort) {
        const indexes = this.items
            .map((_unused: T, index: number) => index)
            .sort((a, b) => sortFn(this.items[a], this.items[b]));
        this.items.sort(sortFn);

        this.trackedArray.addEvent({
            type: ArrayEventType.SORT,
            from: 0,
            indexes,
        });

        // Invalidate sorted fields
        this.trackedArray.markDirty({ start: 0, end: this.items.length });

        this.trackedArray.tickClock();

        return this;
    }

    reverse() {
        const indexes: number[] = [];
        for (let i = this.items.length - 1; i >= 0; --i) {
            indexes.push(i);
        }

        // Perform the reverse
        this.items.reverse();

        // Notify of the (reversed) sort
        this.trackedArray.addEvent({
            type: ArrayEventType.SORT,
            from: 0,
            indexes,
        });

        // Invalidate all fields
        this.trackedArray.markDirty({ start: 0, end: this.items.length });

        this.trackedArray.tickClock();

        return this;
    }

    moveSlice(fromIndex: number, count: number, toIndex: number) {
        const removed = this.items.splice(fromIndex, count);
        this.items.splice(toIndex, 0, ...removed);

        // When you move a section, everything before & after the move is
        // unchanged, but everything *between* the move is shifted:
        //   abcdefghiJKLmnop
        //            ^^^
        //             |
        //       +-----+
        //       |
        //      vvv
        //   abcJKLdefghimnop
        //
        //   ...XXXYYYYYY....
        //
        // So everything between the lower & upper bounds of the move is dirty
        const lowerBound = Math.min(fromIndex, toIndex);
        const upperBound = Math.max(fromIndex, toIndex) + count;
        this.trackedArray.markDirty({ start: lowerBound, end: upperBound });

        this.trackedArray.addEvent({
            type: ArrayEventType.MOVE,
            from: fromIndex,
            count,
            to: toIndex,
        });

        this.trackedArray.tickClock();
    }

    subscribe(handler: (events: Iterable<ArrayEvent<T>>) => void) {
        this.retain();
        const unsubscribe = this.trackedArray.subscribe(handler);
        handler([
            {
                type: ArrayEventType.SPLICE,
                index: 0,
                count: 0,
                items: this.items.slice(),
            },
        ]);
        return () => {
            unsubscribe();
            this.release();
        };
    }

    retain() {
        this.trackedArray.retain();
    }

    release() {
        this.trackedArray.release();
    }
}

export class DerivedArraySub<T, TSource> implements DynamicArray<T> {
    private declare source: DynamicArray<TSource>;
    private declare sourceUnsubscribe: (() => void) | undefined;
    private declare eventTransform: (
        events: Iterable<ArrayEvent<TSource>>
    ) => Iterable<ArrayEvent<T>>;
    private declare items: T[];
    private declare trackedArray: TrackedArray<ArrayEvent<T>>;

    declare __debugName: string;

    constructor(
        source: DynamicArray<TSource>,
        eventTransform: (
            events: Iterable<ArrayEvent<TSource>>
        ) => Iterable<ArrayEvent<T>>,
        debugName?: string
    ) {
        this.source = source;
        this.eventTransform = eventTransform;
        this.items = [];
        this.trackedArray = new TrackedArray(
            mergeArrayEvents,
            {
                onAlive: () => {
                    this.source.retain();
                    this.sourceUnsubscribe = this.source.subscribe((events) => {
                        this.ingestEvents(events);
                    });
                },
                onDead: () => {
                    this.sourceUnsubscribe?.();
                    this.items = [];
                    this.source.release();
                },
            },
            debugName
        );

        this.__debugName = debugName ?? 'arraysub';
    }

    get(index: number) {
        log.assert(
            index >= 0 && index < this.items.length,
            'Out-of-bounds ArraySub read'
        );

        this.trackedArray.notifyRead(index);
        return this.items[index];
    }

    getItemsUnsafe() {
        return this.items;
    }

    set(index: number, value: T) {
        throw new Error('Read-only');
    }

    getLength() {
        this.trackedArray.notifyRead('length');
        return this.items.length;
    }

    subscribe(handler: (events: Iterable<ArrayEvent<T>>) => void) {
        this.retain();
        const unsubscribe = this.trackedArray.subscribe(handler);
        handler([
            {
                type: ArrayEventType.SPLICE,
                index: 0,
                count: 0,
                items: this.items.slice(),
            },
        ]);
        return () => {
            unsubscribe();
            this.release();
        };
    }

    private ingestEvents(events: Iterable<ArrayEvent<TSource>>) {
        const transformedEvents = mergeArrayEvents(this.eventTransform(events));
        for (const transformed of transformedEvents) {
            const lengthBefore = this.items.length;
            applyArrayEvent(this.items, transformed);
            const lengthAfter = this.items.length;
            switch (transformed.type) {
                case ArrayEventType.SPLICE: {
                    this.trackedArray.markDirty({
                        start: transformed.index,
                        end: transformed.index + transformed.count,
                    });
                    if (lengthBefore !== lengthAfter) {
                        const dirtyEnd = Math.max(lengthBefore, lengthAfter);
                        this.trackedArray.markDirty({
                            start: transformed.index + transformed.count,
                            end: dirtyEnd,
                        });
                        this.trackedArray.markDirty('length');
                    }
                    break;
                }
                case ArrayEventType.MOVE: {
                    const startIndex = Math.min(
                        transformed.from,
                        transformed.to
                    );
                    const endIndex =
                        Math.max(transformed.from, transformed.to) +
                        transformed.count;
                    this.trackedArray.markDirty({
                        start: startIndex,
                        end: endIndex,
                    });
                    break;
                }
                case ArrayEventType.SORT: {
                    this.trackedArray.markDirty({
                        start: transformed.from,
                        end: transformed.from + transformed.indexes.length,
                    });
                    break;
                }
            }
            this.trackedArray.addEvent(transformed);
        }
        this.trackedArray.tickClock();
    }

    retain() {
        this.trackedArray.retain();
    }

    release() {
        this.trackedArray.release();
    }
}

export function mapView<TSource, TTarget>(
    source: DynamicArray<TSource>,
    mapFn: (val: TSource) => TTarget
): DerivedArraySub<TTarget, TSource> {
    return new DerivedArraySub(source, function* (events) {
        for (const event of events) {
            switch (event.type) {
                case ArrayEventType.SPLICE:
                    yield {
                        type: event.type,
                        index: event.index,
                        count: event.count,
                        items: event.items?.map((val) => mapFn(val)),
                    };
                    break;
                default:
                    yield event;
            }
        }
    });
}

export function flatMapView<TSource, TTarget>(
    source: DynamicArray<TSource>,
    mapFn: (val: TSource) => TTarget[]
): DerivedArraySub<TTarget, TSource> {
    const slotSizes = new SlotSizes<TTarget[]>([]);
    return new DerivedArraySub(source, function* (events) {
        for (const event of events) {
            switch (event.type) {
                case ArrayEventType.SPLICE: {
                    const mappedItems =
                        event.items?.map((item) => mapFn(item)) ?? [];
                    yield slotSizes.splice<TTarget>(
                        event.index,
                        event.count,
                        mappedItems
                    ).event;
                    for (const item of mappedItems) {
                        yield slotSizes.applyEvent(item, {
                            type: ArrayEventType.SPLICE,
                            index: 0,
                            count: 0,
                            items: item,
                        });
                    }
                    break;
                }
                case ArrayEventType.SORT: {
                    yield slotSizes.sort(event.from, event.indexes);
                    break;
                }
                case ArrayEventType.MOVE: {
                    yield slotSizes.move(event.from, event.count, event.to);
                    break;
                }
            }
        }
    });
}

export function filterView<TSource>(
    source: DynamicArray<TSource>,
    mapFn: (val: TSource) => boolean
): DerivedArraySub<TSource, TSource> {
    return flatMapView(source, (item) => (mapFn(item) ? [item] : []));
}
