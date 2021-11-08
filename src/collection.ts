import {
    InvariantError,
    TypeTag,
    Collection,
    View,
    CollectionEvent,
    CollectionObserver,
    ModelField,
    ObserveKey,
    GetRawArrayKey,
    FlushKey,
    SortFunction,
    MappingFunction,
    FilterFunction,
    FlatMapFunction,
} from './types';
import {
    processChange,
    addCollectionDep,
    addDepToCurrentCalculation,
} from './calc';
import { name } from './debug';
import * as log from './log';

/**
 * Find the index of `item` using binary search in a sorted array
 *
 * Returns [lastComparison, index]
 * - if lastComparison < 0, item would be inserted before index
 * - if lastComparison > 0, item would be inserted after index
 * - if lastComparison == 0, item is compared equal to index
 */
function binarySearchIndex<T>(
    sortedArray: T[],
    item: T,
    sorter: SortFunction<T>
): [lastComparison: number, index: number] {
    let min = 0;
    let max = sortedArray.length - 1;
    let pivot = min;
    let result = -1; // if sortedArray.length == 0, we want -1, so on a miss, we insert "before" index 0: arr.splice(0, 0, item)
    while (min <= max) {
        pivot = (min + max) >> 1; // floor((L+R)/2)
        result = sorter(item, sortedArray[pivot]);
        if (result < 0) {
            max = pivot - 1;
        } else if (result > 0) {
            min = pivot + 1;
        } else {
            return [result, pivot];
        }
    }
    return [result, pivot];
}

/**
 * Make a mutable array to hold state, with some additional convenience methods
 */
export function collection<T>(array: T[], debugName?: string): Collection<T> {
    if (!Array.isArray(array)) {
        throw new InvariantError('collection must be provided an array');
    }

    const fields: Map<string | number | symbol, ModelField<T>> = new Map();
    let observers: CollectionObserver<T>[] = [];

    function notify(event: CollectionEvent<T>) {
        observers.forEach((observer) => {
            observer(event);
        });
    }

    function splice(index: number, count: number, ...items: T[]): T[] {
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
                processChange(getField(i.toString()));
            }
        } else {
            for (let i = index; i < Math.max(newLength, origLength); ++i) {
                processChange(getField(i.toString()));
            }
            processChange(getField('length'));
        }
        processChange(proxy);
        return removed;
    }

    function pop(): T | undefined {
        const removed = splice(array.length - 1, 1);
        return removed[0];
    }

    function shift(): T | undefined {
        const removed = splice(0, 1);
        return removed[0];
    }

    function push(...items: T[]): number {
        splice(array.length, 0, ...items);
        return array.length;
    }

    function unshift(...items: T[]): number {
        splice(0, 0, ...items);
        return array.length;
    }

    function reject(func: (item: T, index: number) => boolean) {
        for (let i = proxy.length - 1; i >= 0; --i) {
            if (!func(proxy[i], i)) {
                proxy.splice(i, 1);
            }
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    function sort(_sorter: never): T[] {
        throw new Error('sort not implemented');
    }

    const deferred: (() => void)[] = [];

    function sortedView(
        sorter: SortFunction<T>,
        viewDebugName?: string
    ): View<T> {
        let sortedDebugName: string | undefined;
        if (viewDebugName) {
            sortedDebugName = viewDebugName;
        } else if (debugName) {
            sortedDebugName = `${debugName}:sortedView`;
        }
        const sorted: Collection<T> = collection([], sortedDebugName);
        proxy[ObserveKey]((event) => {
            if (event.type === 'init') {
                const initialItems = event.items.slice();
                initialItems.sort(sorter);
                sorted.push(...initialItems);
                return;
            } else if (event.type === 'splice') {
                deferred.push(() => {
                    const { items, removed } = event;
                    // First handle removals
                    const rawArray = sorted[GetRawArrayKey]();
                    removed.forEach((removedItem, removedItemIndex) => {
                        const [lastComparison, index] = binarySearchIndex(
                            rawArray,
                            removedItem,
                            sorter
                        );
                        log.assert(
                            lastComparison === 0,
                            'Missing item removed from source array in sortedView splice',
                            { removedItem, removedItemIndex, event }
                        );
                        sorted.splice(index, 1);
                    });

                    // Then handle insertions
                    items.forEach((item) => {
                        const [lastComparison, insertionIndex] =
                            binarySearchIndex(rawArray, item, sorter);
                        sorted.splice(
                            lastComparison > 0
                                ? insertionIndex + 1
                                : insertionIndex,
                            0,
                            item
                        );
                    });
                });
            }
        });
        return sorted;
    }

    function mapView<V>(
        mapper: MappingFunction<T, V>,
        viewDebugName?: string
    ): View<V> {
        let mappedDebugName: string | undefined;
        if (viewDebugName) {
            mappedDebugName = viewDebugName;
        } else if (debugName) {
            mappedDebugName = `${debugName}:mapView`;
        }
        const mapped = collection(array.map(mapper), mappedDebugName);
        proxy[ObserveKey]((event) => {
            if (event.type === 'splice') {
                deferred.push(() => {
                    const { index, count, items } = event;
                    // Well that's deceptively easy
                    mapped.splice(index, count, ...items.map(mapper));
                });
            }
        });
        addCollectionDep(proxy, mapped);
        return mapped;
    }

    function filterView(
        fn: FilterFunction<T>,
        viewDebugName?: string
    ): View<T> {
        let mappedDebugName: string | undefined;
        if (viewDebugName) {
            mappedDebugName = viewDebugName;
        } else if (debugName) {
            mappedDebugName = `${debugName}:filterView`;
        }
        // TODO: this could probably be more efficient, each time splice() is called, we iterate from 0 to index+count
        // We may be able to precalculate a mapping from index -> filteredIndex
        const filterPresent: boolean[] = [];
        const filtered: Collection<T> = collection([], mappedDebugName);
        array.forEach((value, index) => {
            const present = fn(value, index);
            filterPresent.push(present);
            if (present) {
                filtered.push(value);
            }
        });

        proxy[ObserveKey]((event) => {
            if (event.type === 'splice') {
                deferred.push(() => {
                    const { index, count, items } = event;
                    let realIndex = 0;
                    let realCount = 0;
                    for (let i = 0; i < index; ++i) {
                        if (filterPresent[i]) {
                            realIndex++;
                        }
                    }
                    for (let i = 0; i < count; ++i) {
                        if (filterPresent[index + i]) {
                            realCount++;
                        }
                    }
                    const presentItems = items.map(fn);
                    filterPresent.splice(index, count, ...presentItems);
                    filtered.splice(
                        realIndex,
                        realCount,
                        ...items.filter((_value, index) => presentItems[index])
                    );
                });
            }
        });
        addCollectionDep(proxy, filtered);
        return filtered;
    }

    function flatMapView<V>(
        fn: FlatMapFunction<T, V>,
        viewDebugName?: string
    ): View<V> {
        let mappedDebugName: string | undefined;
        if (viewDebugName) {
            mappedDebugName = viewDebugName;
        } else if (debugName) {
            mappedDebugName = `${debugName}:flatMapView`;
        }
        const flatMapped: Collection<V> = collection([], mappedDebugName);
        const flatMapCount: number[] = [];
        array.forEach((value, index) => {
            const chunk = fn(value, index);
            flatMapped.push(...chunk);
            flatMapCount.push(chunk.length);
        });

        proxy[ObserveKey]((event) => {
            if (event.type === 'splice') {
                deferred.push(() => {
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
                    items.forEach((itemValue, itemIndex) => {
                        const chunk = fn(itemValue, itemIndex);
                        realItems.push(...chunk);
                        realItemCount.push(chunk.length);
                    });
                    flatMapped.splice(realIndex, realCount, ...realItems);
                    flatMapCount.splice(index, count, ...realItemCount);
                });
            }
        });
        addCollectionDep(proxy, flatMapped);
        return flatMapped;
    }

    function set(index: number, val: T): void {
        splice(index, 1, val);
    }

    function observe(observer: CollectionObserver<T>) {
        observers.push(observer);
        observer({
            type: 'init',
            items: array,
        });
        return () => {
            observers = observers.filter((obs) => obs !== observer);
        };
    }

    function flush() {
        let thunk;
        while ((thunk = deferred.shift())) {
            thunk();
        }
    }

    function getRawArray() {
        return array;
    }

    const methods = {
        splice,
        pop,
        shift,
        push,
        unshift,
        [ObserveKey]: observe,
        [FlushKey]: flush,
        [GetRawArrayKey]: getRawArray,
        sort,
        reject,
        sortedView,
        mapView,
        filterView,
        flatMapView,
    };

    function getField(key: string | number | symbol) {
        let field = fields.get(key);
        if (!field) {
            field = {
                model: proxy,
                key,
            };
            if (debugName) name(field, debugName);
            fields.set(key, field);
        }
        return field;
    }

    const proxy: Collection<T> = new Proxy(array, {
        get(target: any, key: string | symbol) {
            if (key in methods) {
                return (methods as any)[key];
            }
            if (key === TypeTag) {
                return 'collection';
            }
            const field = getField(key);
            addCollectionDep(proxy, field);
            addDepToCurrentCalculation(field);
            return target[key];
        },

        set(target: any, key: string | number | symbol, value: any) {
            if (key in methods) {
                log.error(
                    'Overriding certain collection methods not supported',
                    key
                );
                // TODO(sufian): maybe support this?
                return false;
            }
            const numericKey = Number(key);
            if (!isNaN(numericKey) && numericKey <= array.length) {
                set(numericKey, value);
                // Implicitly calls processChange via splice
            } else {
                target[key] = value;
                const field = getField(key);
                processChange(field);
                processChange(proxy);
            }
            return true;
        },

        deleteProperty(target: any, key) {
            if (key in methods) {
                log.error(
                    'Deleting certain collection methods not supported',
                    key
                );
                // TODO(sufian): maybe support this?
                return false;
            }
            const field = getField(key);
            processChange(field); // TODO(sufian): what to do here?
            delete target[key];
            return true;
        },
    }) as Collection<T>;

    if (debugName) name(proxy, debugName);

    return proxy;
}
