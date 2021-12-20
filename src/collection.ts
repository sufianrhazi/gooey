import {
    AddDeferredWorkKey,
    Calculation,
    Collection,
    CollectionEvent,
    FilterFunction,
    FlatMapFunction,
    FlushKey,
    GetRawArrayKey,
    InvariantError,
    MappingFunction,
    ModelField,
    ObserveKey,
    Subscription,
    TypeTag,
    View,
    ViewSpec,
} from './types';
import {
    calc,
    effect,
    retain,
    release,
    untracked,
    processChange,
    addManualDep,
    removeManualDep,
    addDepToCurrentCalculation,
} from './calc';
import { name } from './debug';
import * as log from './log';

// Taken from https://stackoverflow.com/a/67605309
type ParametersExceptFirst<F> = F extends (arg0: any, ...rest: infer R) => any
    ? R
    : never;

/**
 * Make a mutable array to hold state, with some additional convenience methods
 */
export function collection<T>(array: T[], debugName?: string): Collection<T> {
    if (!Array.isArray(array)) {
        throw new InvariantError('collection must be provided an array');
    }

    const fields: Map<string | number | symbol, ModelField<T>> = new Map();
    let observers: ((event: CollectionEvent<T>) => void)[] = [];
    let deferredTasks: (() => void)[] = [];
    const subscriptionNode: Subscription = {
        [TypeTag]: 'subscription',
    };
    name(subscriptionNode, `${debugName || '?'}:sub`);

    function addDeferredWork(task: () => void) {
        deferredTasks.push(task);
        processChange(proxy);
    }

    function flush() {
        const toProcess = deferredTasks;
        deferredTasks = [];
        toProcess.forEach((task) => {
            task();
        });
    }
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
                const field = getField(i.toString());
                processChange(field);
                if (i >= newLength) {
                    removeManualDep(field, subscriptionNode);
                }
            }
            processChange(getField('length'));
        }
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

    function moveSlice(fromIndex: number, fromCount: number, toIndex: number) {
        if (fromCount <= 0) return; // nothing to slice
        if (toIndex >= fromIndex && toIndex < fromIndex + fromCount) return; // destination is inside moved slice, so noop
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
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    function sort(_sorter: never): T[] {
        throw new Error('Cannot sort collections, use sortedView instead');
    }

    function set(index: number, val: T): void {
        splice(index, 1, val);
    }

    function observe(observer: (event: CollectionEvent<T>) => void) {
        if (observers.length === 0) {
            // Initialize the subscription node so events are ordered correctly
            fields.forEach((field) => {
                addManualDep(field, subscriptionNode);
            });
        }
        observers.push(observer);
        retain(subscriptionNode);
        return () => {
            observers = observers.filter((obs) => obs !== observer);
            release(subscriptionNode);
        };
    }

    function getRawArray() {
        return array;
    }

    function makeView<V>(
        spec: ViewSpec<T, V>,
        viewDebugName?: string | undefined
    ) {
        const viewArray: V[] = [];
        untracked(() => {
            spec.initialize(viewArray, array);
        });
        const view = collection(viewArray, viewDebugName);
        observe((event: CollectionEvent<T>) => {
            view[AddDeferredWorkKey](() => spec.processEvent(view, event));
        });
        addManualDep(proxy, view);
        addManualDep(subscriptionNode, view);
        return view;
    }

    const methods = {
        splice,
        pop,
        shift,
        push,
        unshift,
        [FlushKey]: flush,
        [AddDeferredWorkKey]: addDeferredWork,
        [GetRawArrayKey]: getRawArray,
        [ObserveKey]: observe,
        sort,
        reject,
        moveSlice,
        makeView,
        mapView: (
            ...args: ParametersExceptFirst<typeof mapViewImplementation>
        ) => mapViewImplementation(proxy, ...args),
        filterView: (
            ...args: ParametersExceptFirst<typeof filterViewImplementation>
        ) => filterViewImplementation(proxy, ...args),
        flatMapView: (
            ...args: ParametersExceptFirst<typeof flatMapViewImplementation>
        ) => flatMapViewImplementation(proxy, ...args),
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
        addManualDep(proxy, field);
        addManualDep(field, subscriptionNode);
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
            if (
                key === 'length' &&
                typeof value === 'number' &&
                value < target.length
            ) {
                // Special handling of resizing length smaller than normal length to handle removing of items
                splice(value, target.length - value);
                return true;
            }
            const numericKey = Number(key);
            if (!isNaN(numericKey) && numericKey <= array.length) {
                set(numericKey, value);
                // Implicitly calls processChange via splice
            } else {
                target[key] = value;
                const field = getField(key);
                processChange(field);
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
            removeManualDep(field, subscriptionNode);
            return true;
        },
    }) as Collection<T>;

    if (debugName) name(proxy, debugName);

    return proxy;
}

function mapViewImplementation<T, V>(
    sourceCollection: Collection<T> | View<T>,
    mapper: MappingFunction<T, V>,
    debugName?: string | undefined
): View<V> {
    return sourceCollection.makeView(
        {
            initialize: (view, items) => {
                view.push(...items.map((item) => mapper(item)));
            },
            processEvent: (view, event) => {
                if (event.type === 'splice') {
                    const { index, count, items } = event;
                    view.splice(
                        index,
                        count,
                        ...items.map((item) => mapper(item))
                    );
                } else if (event.type === 'move') {
                    const { fromIndex, fromCount, toIndex } = event;
                    view.moveSlice(fromIndex, fromCount, toIndex);
                }
            },
        },
        debugName
    );
}

function filterViewImplementation<T>(
    sourceCollection: Collection<T> | View<T>,
    filterFn: FilterFunction<T>,
    debugName?: string
): View<T> {
    const presentCache: boolean[] = [];
    const filterEffects: [
        sourceIndex: number,
        recalculateVisibility: Calculation<void>
    ][] = [];

    // TODO: This is really slow! Some sequences of operations make this quadratic!!!
    function getRealIndex(sourceIndex: number) {
        let count = 0;
        for (let i = 0; i < sourceIndex; ++i) {
            if (i >= presentCache.length || presentCache[i]) count += 1;
        }
        return count;
    }

    function addItems(array: T[], addIndex: number, items: readonly T[]) {
        const effectItems = items.map((item, i) => {
            let lastIsPresent = false;
            const filterCalculation = calc(() => filterFn(item));
            const effectItem: [number, Calculation<void>] = [
                addIndex + i,
                effect(() => {
                    const sourceIndex = effectItem[0];
                    const isPresent = filterCalculation();
                    if (isPresent && !lastIsPresent) {
                        const realIndex = getRealIndex(sourceIndex);
                        array.splice(realIndex, 0, item);
                    }
                    if (!isPresent && lastIsPresent) {
                        const realIndex = getRealIndex(sourceIndex);
                        array.splice(realIndex, 1);
                    }
                    lastIsPresent = isPresent;
                    presentCache[sourceIndex] = isPresent;
                }),
            ];
            return effectItem;
        });
        filterEffects.splice(addIndex, 0, ...effectItems);
        for (let i = addIndex + items.length; i < filterEffects.length; ++i) {
            filterEffects[i][0] = i;
        }
        presentCache.splice(addIndex, 0, ...items.map(() => false));
        effectItems.forEach((effectItem) => {
            retain(effectItem[1]);
            effectItem[1]();
        });
    }

    function removeItems(array: T[], sourceIndex: number, removeCount: number) {
        let realIndex = 0;
        let realRemoveCount = 0;
        let count = 0;
        for (let i = 0; i <= sourceIndex + removeCount; ++i) {
            if (i === sourceIndex) realIndex = count;
            if (i === sourceIndex + removeCount)
                realRemoveCount = count - realIndex;
            if (i > presentCache.length || presentCache[i]) count++;
        }
        if (realRemoveCount > 0) {
            array.splice(realIndex, realRemoveCount);
        }

        presentCache.splice(sourceIndex, removeCount);
        const removedEffects = filterEffects.splice(sourceIndex, removeCount);
        // Update index of effects so they update the correct item after removed
        for (let i = sourceIndex; i < filterEffects.length; ++i) {
            filterEffects[i][0] = i;
        }

        removedEffects.forEach(([oldIndex, filterEffect]) => {
            release(filterEffect);
        });
    }

    return sourceCollection.makeView(
        {
            initialize: (array, items) => {
                addItems(array, 0, items);
            },
            processEvent: (view, event) => {
                if (event.type === 'splice') {
                    const { index, count, items } = event;
                    if (count > 0) {
                        removeItems(view, index, count);
                    }
                    addItems(view, index, items);
                } else if (event.type === 'move') {
                    const { fromIndex, fromCount, toIndex } = event;

                    // Determine filtered index
                    let realFromIndex = 0;
                    let realFromCount = 0;
                    let realToIndex = 0;
                    let count = 0;
                    for (
                        let i = 0;
                        i <= Math.max(fromIndex + fromCount, toIndex);
                        ++i
                    ) {
                        if (i === fromIndex) realFromIndex = count;
                        if (i === fromIndex + realFromCount)
                            realFromCount = i - realFromIndex;
                        if (i === toIndex) realToIndex = i;
                        if (i > presentCache.length || presentCache[i])
                            count += 1;
                    }

                    // Splice filterEffects + presentCache
                    const filterEffectsMoved = filterEffects.splice(
                        fromIndex,
                        fromCount
                    );
                    const presentCacheMoved = presentCache.splice(
                        fromIndex,
                        fromCount
                    );
                    if (toIndex < fromIndex) {
                        filterEffects.splice(toIndex, 0, ...filterEffectsMoved);
                        presentCache.splice(toIndex, 0, ...presentCacheMoved);
                    } else {
                        filterEffects.splice(
                            toIndex - fromCount,
                            0,
                            ...filterEffectsMoved
                        );
                        presentCache.splice(
                            toIndex - fromCount,
                            0,
                            ...presentCacheMoved
                        );
                    }

                    // update sourceIndex
                    for (let i = 0; i < filterEffects.length; ++i) {
                        filterEffects[i][0] = i;
                    }

                    // Perform move (if needed)
                    if (realFromCount === 0) return;
                    view.moveSlice(realFromIndex, realFromCount, realToIndex);
                }
            },
        },
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
            initialize: (view, items) => {
                items.forEach((value) => {
                    const chunk = fn(value);
                    view.push(...chunk);
                    flatMapCount.push(chunk.length);
                });
            },
            processEvent: (view, event) => {
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
                }
            },
        },
        debugName
    );
}
