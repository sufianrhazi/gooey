import {
    Collection,
    FilterFunction,
    FlatMapFunction,
    InvariantError,
    MappingFunction,
    View,
    NotifyKey,
} from './types';
import * as log from './log';
import { trackedData } from './trackeddata';

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

/**
 * Make a mutable array to hold state, with some additional convenience methods
 */
export function collection<T>(array: T[], debugName?: string): Collection<T> {
    if (!Array.isArray(array)) {
        throw new InvariantError('collection must be provided an array');
    }

    return trackedData(
        array,
        'collection' as const,
        {
            get(notify, target, key) {
                return target[key];
            },

            has(notify, target, key) {
                return key in target;
            },

            set(this: Collection<T>, notify, target, key, value) {
                if (
                    key === 'length' &&
                    typeof value === 'number' &&
                    value < target.length
                ) {
                    // Special handling of resizing length smaller than normal length to handle removing of items
                    this.splice(value, target.length - value);
                    return true;
                }
                const numericKey = Number(key);
                if (!isNaN(numericKey) && numericKey <= array.length) {
                    this.splice(numericKey, 1, value);
                } else {
                    target[key] = value;
                }
                return true;
            },

            deleteProperty(notify, target, key) {
                delete target[key];
                return true;
            },
        },
        ({
            notify,
            subscriptionNode,
            makeView,
            observe,
            addDeferredWork,
            processFieldChange,
            removeSubscriptionField,
        }) => ({
            splice: function splice(
                index: number,
                count: number,
                ...items: T[]
            ): T[] {
                if (count < 1 && items.length === 0) return []; // noop
                const origLength = array.length;
                const removed = array.splice(index, count, ...items);
                const newLength = array.length;
                notify({
                    type: 'splice',
                    index,
                    count,
                    items,
                    removed,
                });

                // Cases to consider:
                // 1. count === items.length: we are replacing count items
                // 2. count > items.length: we are adding (count - items.length items), notify index to new end
                // 3. count < items.length: we are removing (items.length - count items), notify index to old end

                // Process changes in *added* items
                if (origLength === newLength) {
                    for (let i = index; i < index + count; ++i) {
                        processFieldChange(i.toString());
                    }
                } else {
                    for (
                        let i = index;
                        i < Math.max(newLength, origLength);
                        ++i
                    ) {
                        const key = i.toString();
                        processFieldChange(key);
                        if (i >= newLength) {
                            removeSubscriptionField(key);
                        }
                    }
                    processFieldChange('length');
                }
                return removed;
            },
            pop: function pop(this: Collection<T>): T | undefined {
                const removed = this.splice(array.length - 1, 1);
                return removed[0];
            },
            shift: function shift(this: Collection<T>): T | undefined {
                const removed = this.splice(0, 1);
                return removed[0];
            },
            push: function push(this: Collection<T>, ...items: T[]): number {
                this.splice(array.length, 0, ...items);
                return array.length;
            },
            unshift: function unshift(
                this: Collection<T>,
                ...items: T[]
            ): number {
                this.splice(0, 0, ...items);
                return array.length;
            },
            reject: function reject(
                this: Collection<T>,
                func: (item: T, index: number) => boolean
            ) {
                for (let i = array.length - 1; i >= 0; --i) {
                    if (func(this[i], i)) {
                        this.splice(i, 1);
                    }
                }
            },
            moveSlice: function moveSlice(
                this: Collection<T>,
                fromIndex: number,
                fromCount: number,
                toIndex: number
            ) {
                if (fromCount <= 0) return; // nothing to slice
                if (toIndex >= fromIndex && toIndex < fromIndex + fromCount)
                    return; // destination is inside moved slice, so noop
                const moved = array.splice(fromIndex, fromCount);
                if (toIndex < fromIndex) {
                    array.splice(toIndex, 0, ...moved);
                } else {
                    array.splice(toIndex - fromCount, 0, ...moved);
                }
                notify({
                    type: 'move',
                    fromIndex,
                    fromCount,
                    toIndex,
                    moved,
                });
            },
            sort: function sort(
                this: Collection<T>,
                sorter: (a: T, b: T) => number = defaultSort
            ): T[] {
                const arrayWithIndexes: [T, number][] = array.map(
                    (item, index) => [item, index]
                );
                array.sort(sorter);
                arrayWithIndexes.sort((ai, bi) => sorter(ai[0], bi[0]));
                notify({
                    type: 'sort',
                    indexes: arrayWithIndexes.map((pair) => pair[1]),
                });
                return this;
            },
            reverse: function reverse(
                this: Collection<T>,
                sorter: (a: T, b: T) => number = defaultSort
            ): T[] {
                if (array.length === 0) return this;
                array.reverse();
                // Simulate a resort
                const indexes: number[] = [];
                for (let i = array.length - 1; i >= 0; --i) {
                    indexes.push(i);
                }
                notify({
                    type: 'sort',
                    indexes,
                });
                return this;
            },
            makeView,
            mapView: function mapView<V>(
                this: Collection<T>,
                mapper: MappingFunction<T, V>,
                debugName?: string | undefined
            ) {
                return mapViewImplementation(this, mapper, debugName);
            },
            filterView: function filterView(
                this: Collection<T>,
                filterFn: FilterFunction<T>,
                debugName?: string
            ) {
                return filterViewImplementation(this, filterFn, debugName);
            },
            flatMapView: function flatMapView<V>(
                this: Collection<T>,
                fn: FlatMapFunction<T, V>,
                debugName?: string | undefined
            ) {
                return flatMapViewImplementation(this, fn, debugName);
            },
        }),
        debugName
    );
}

function mapViewImplementation<T, V>(
    sourceCollection: Collection<T> | View<T>,
    mapper: MappingFunction<T, V>,
    debugName?: string | undefined
): View<V> {
    // map is a specialization of flatMap
    return flatMapViewImplementation(
        sourceCollection,
        (item) => [mapper(item)],
        debugName
    );
}

function filterViewImplementation<T>(
    sourceCollection: Collection<T> | View<T>,
    filterFn: FilterFunction<T>,
    debugName?: string
): View<T> {
    // filter is a specialization of flatMap
    return flatMapViewImplementation(
        sourceCollection,
        (item) => (filterFn(item) ? [item] : []),
        debugName
    );
}

function flatMapViewImplementation<T, V>(
    sourceCollection: Collection<T> | View<T>,
    fn: FlatMapFunction<T, V>,
    debugName?: string | undefined
): View<V> {
    const flatMapCount: number[] = [];

    return sourceCollection.makeView(
        {
            initialize: (items) => {
                const flatMapItems: V[] = [];
                items.forEach((value) => {
                    const chunk = fn(value);
                    flatMapItems.push(...chunk);
                    flatMapCount.push(chunk.length);
                });
                return flatMapItems;
            },
            processEvent: (view, event, rawArray) => {
                if (event.type === 'splice') {
                    const { index, count, items } = event;
                    let realIndex = 0;
                    for (let i = 0; i < index; ++i) {
                        realIndex += flatMapCount[i];
                    }
                    let realCount = 0;
                    for (let i = index; i < index + count; ++i) {
                        realCount += flatMapCount[i];
                    }
                    // Well that's deceptively easy
                    const realItems: V[] = [];
                    const realItemCount: number[] = [];
                    items.forEach((itemValue) => {
                        const chunk = fn(itemValue);
                        realItems.push(...chunk);
                        realItemCount.push(chunk.length);
                    });
                    view.splice(realIndex, realCount, ...realItems);
                    flatMapCount.splice(index, count, ...realItemCount);
                } else if (event.type === 'move') {
                    const { fromIndex, fromCount, toIndex } = event;
                    let realFromCount = 0;
                    for (let i = fromIndex; i < fromIndex + fromCount; ++i) {
                        realFromCount += flatMapCount[i];
                    }

                    if (realFromCount > 0) {
                        let realFromIndex = 0;
                        let realToIndex = 0;

                        const lastIndex = Math.max(fromIndex, toIndex);
                        let count = 0;
                        for (let i = 0; i <= lastIndex; ++i) {
                            if (i === fromIndex) realFromIndex = count;
                            if (i === toIndex) realToIndex = count;
                            count += flatMapCount[i];
                        }
                        view.moveSlice(
                            realFromIndex,
                            realFromCount,
                            realToIndex
                        );
                    }
                    flatMapCount.splice(
                        toIndex,
                        0,
                        ...flatMapCount.splice(fromIndex, fromCount)
                    );
                } else if (event.type === 'sort') {
                    const { indexes } = event;

                    const flatMapIndexes: number[] = [];
                    let accumulatorIndex = 0;
                    for (let i = 0; i < flatMapCount.length; ++i) {
                        flatMapIndexes.push(accumulatorIndex);
                        accumulatorIndex += flatMapCount[i];
                    }

                    const copiedSource = rawArray.slice();
                    const newIndexes: number[] = [];
                    let destIndex = 0;
                    indexes.forEach((sourceIndex) => {
                        const realCount = flatMapCount[sourceIndex];
                        if (realCount === 0) return;
                        const realIndex = flatMapIndexes[sourceIndex];
                        for (let i = 0; i < realCount; ++i) {
                            newIndexes.push(realIndex + i);
                            rawArray[destIndex] = copiedSource[realIndex + i];
                            destIndex += 1;
                        }
                    });

                    view[NotifyKey]({
                        type: 'sort',
                        indexes: newIndexes,
                    });
                } else {
                    log.assertExhausted(
                        event,
                        'unhandled collection event type'
                    );
                }
            },
        },
        debugName
    );
}
