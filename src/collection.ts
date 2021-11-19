import {
    Calculation,
    Collection,
    CollectionEvent,
    CollectionObserver,
    FilterFunction,
    FlatMapFunction,
    FlushKey,
    GetRawArrayKey,
    InvariantError,
    MappingFunction,
    ModelField,
    ObserveKey,
    SortKeyFunction,
    TypeTag,
    View,
} from './types';
import {
    calc,
    effect,
    retain,
    release,
    processChange,
    addManualDep,
    addDepToCurrentCalculation,
} from './calc';
import { name } from './debug';
import * as log from './log';

function compareCalculations(
    a: Calculation<string | number>,
    b: typeof a
): number {
    const aVal = a();
    const bVal = b();
    if (aVal < bVal) return -1;
    if (aVal > bVal) return 1;
    return 0;
}
/**
 * Find the index of `item` using binary search in a sorted array
 *
 * Returns [lastComparison, index]
 * - if lastComparison < 0, item would be inserted before index
 * - if lastComparison > 0, item would be inserted after index
 * - if lastComparison == 0, item is compared equal to index
 */
function binarySearchIndex(
    sortedArray: Calculation<string | number>[],
    item: Calculation<string | number>
): [lastComparison: number, index: number] {
    let min = 0;
    let max = sortedArray.length - 1;
    let pivot = min;
    let result = -1; // if sortedArray.length == 0, we want -1, so on a miss, we insert "before" index 0: arr.splice(0, 0, item)
    while (min <= max) {
        pivot = (min + max) >> 1; // floor((L+R)/2)
        result = compareCalculations(item, sortedArray[pivot]);
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
            if (func(proxy[i], i)) {
                proxy.splice(i, 1);
            }
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    function sort(_sorter: never): T[] {
        throw new Error('Cannot sort collections, use sortedView instead');
    }

    const deferred: (() => void)[] = [];

    function sortedView(
        keyFn: SortKeyFunction<T>,
        viewDebugName?: string
    ): View<T> {
        let sortKeysDebugName: string | undefined;
        let sortedDebugName: string | undefined;
        if (viewDebugName) {
            sortKeysDebugName = `${viewDebugName}:sortKeys`;
            sortedDebugName = viewDebugName;
        } else if (debugName) {
            sortKeysDebugName = `${debugName}:sortKeys`;
            sortedDebugName = `${debugName}:sortedView`;
        }
        const sortKeysMap: Map<T, Calculation<string | number>> = new Map();
        const sortKeys: Collection<Calculation<string | number>> = collection(
            [],
            sortKeysDebugName
        );
        const sortEffects: Collection<Calculation<void>> = collection(
            [],
            sortKeysDebugName
        );
        const sorted: Collection<T> = collection([], sortedDebugName);

        const rawKeyArray = sortKeys[GetRawArrayKey]();

        function removeItem(removedItem: T) {
            const removedKeyCalculation = sortKeysMap.get(removedItem);
            log.assert(
                removedKeyCalculation,
                'Missing keyCalculation from removed item',
                { removedItem }
            );
            const [lastComparison, sortedIndex] = binarySearchIndex(
                rawKeyArray,
                removedKeyCalculation
            );
            log.assert(
                lastComparison === 0,
                'Missing item removed from source array in sortedView splice',
                { removedItem }
            );
            sortKeysMap.delete(removedItem);
            sortKeys.splice(sortedIndex, 1);
            sorted.splice(sortedIndex, 1);
            const keyEffect = sortEffects.splice(sortedIndex, 1)[0];
            release(keyEffect);
        }

        function addItem(item: T) {
            let lastKey: string | number = 0; // dummy value
            const keyCalculation = calc(() => {
                lastKey = keyFn(item);
                return lastKey;
            });
            let enableEffect = false;
            const keyEffect = effect(() => {
                keyCalculation();

                // Find the index without affecting the dependencies
                if (enableEffect) {
                    effect(() => {
                        removeItem(item);
                        addItem(item);
                    })();
                }
            });
            keyEffect();
            enableEffect = true;
            const [lastComparison, insertionIndex] = binarySearchIndex(
                rawKeyArray,
                keyCalculation
            );
            const targetIndex =
                lastComparison > 0 ? insertionIndex + 1 : insertionIndex;
            sortKeysMap.set(item, keyCalculation);
            sortKeys.splice(targetIndex, 0, keyCalculation);
            sorted.splice(targetIndex, 0, item);
            retain(keyEffect);
            sortEffects.splice(targetIndex, 0, keyEffect);
        }

        proxy[ObserveKey]((event) => {
            if (event.type === 'init') {
                event.items.forEach((item) => {
                    addItem(item);
                });
                return;
            } else if (event.type === 'splice') {
                deferred.push(() => {
                    const { items, removed } = event;

                    // First handle removals
                    removed.forEach((removedItem, removedItemIndex) => {
                        removeItem(removedItem);
                    });

                    // Then handle insertions
                    items.forEach((item) => {
                        addItem(item);
                    });
                });
            }
        });
        addManualDep(proxy, sortKeys);
        addManualDep(proxy, sortEffects);
        addManualDep(sortKeys, sorted);
        addManualDep(sortEffects, sorted);
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
        const mapped = collection(
            array.map((item) => mapper(item)),
            mappedDebugName
        );
        proxy[ObserveKey]((event) => {
            if (event.type === 'splice') {
                deferred.push(() => {
                    const { index, count, items } = event;
                    // Well that's deceptively easy
                    mapped.splice(index, count, ...items.map(mapper));
                });
            }
        });
        addManualDep(proxy, mapped);
        return mapped;
    }

    function filterView(
        filterFn: FilterFunction<T>,
        viewDebugName?: string
    ): View<T> {
        let mappedDebugName: string | undefined;
        if (viewDebugName) {
            mappedDebugName = viewDebugName;
        } else if (debugName) {
            mappedDebugName = `${debugName}:filterView`;
        }
        // TODO: make more efficient, every item addition/removal is O(length of source collection)
        // With a tree cache of presence, we could probably make this O(log(length of source collection))
        // Can this become linear?
        const presentCache: boolean[] = [];
        const filterEffects: Map<T, Calculation<void>> = new Map();
        const filtered: Collection<T> = collection([], mappedDebugName);

        function getRealIndex(sourceIndex: number) {
            let realIndex = 0;
            for (let i = 0; i < sourceIndex; ++i) {
                if (presentCache[i]) realIndex++;
            }
            return realIndex;
        }

        function addItem(item: T, sourceIndex: number) {
            let lastIsPresent = false;
            const filterCalculation = calc(() => filterFn(item));
            const filterEffect = effect(() => {
                const isPresent = filterCalculation();
                if (isPresent && !lastIsPresent) {
                    const realIndex = getRealIndex(sourceIndex);
                    filtered.splice(realIndex, 0, item);
                }
                if (!isPresent && lastIsPresent) {
                    const realIndex = getRealIndex(sourceIndex);
                    filtered.splice(realIndex, 1);
                }
                lastIsPresent = isPresent;
                presentCache[sourceIndex] = isPresent;
            });
            presentCache.splice(sourceIndex, 0, false);
            filterEffect();
            filterEffects.set(item, filterEffect);
            retain(filterEffect);
        }

        function removeItem(item: T, sourceIndex: number) {
            const filterEffect = filterEffects.get(item);
            log.assert(
                filterEffect,
                'filterEffect not found when removing item'
            );

            const isPresent = presentCache[sourceIndex];
            if (isPresent) {
                const realIndex = getRealIndex(sourceIndex);
                filtered.splice(realIndex, 1);
            }
            presentCache.splice(sourceIndex, 1);
            release(filterEffect);
        }

        proxy[ObserveKey]((event) => {
            if (event.type === 'init') {
                event.items.forEach((item, index) => addItem(item, index));
            } else if (event.type === 'splice') {
                deferred.push(() => {
                    const { index, items, removed } = event;
                    removed.forEach((item, removeIndex) =>
                        removeItem(item, index + removeIndex)
                    );
                    items.forEach((item, addIndex) =>
                        addItem(item, index + addIndex)
                    );
                });
            }
        });
        addManualDep(proxy, filtered);
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
        array.forEach((value) => {
            const chunk = fn(value);
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
                    items.forEach((itemValue) => {
                        const chunk = fn(itemValue);
                        realItems.push(...chunk);
                        realItemCount.push(chunk.length);
                    });
                    flatMapped.splice(realIndex, realCount, ...realItems);
                    flatMapCount.splice(index, count, ...realItemCount);
                });
            }
        });
        addManualDep(proxy, flatMapped);
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
            addManualDep(proxy, field);
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
