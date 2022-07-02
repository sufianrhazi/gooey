import {
    TrackedData,
    makeTrackedData,
    getTrackedDataHandle,
    ProxyHandler,
    SubscriptionEmitter,
} from './trackeddata';
import { untracked } from './engine';
import * as log from './log';

export const CollectionPrototype = {
    // Array mutation values
    splice: collectionSplice,
    push: collectionPush,
    pop: collectionPop,
    shift: collectionShift,
    unshift: collectionUnshift,
    sort: collectionSort,

    // Handy API values
    reject: collectionReject,
    moveSlice: collectionMoveSlice,

    // View production
    mapView,
    filterView,
    flatMapView,
} as const;

export const ViewPrototype = {
    // Array mutation values
    splice: viewSplice,
    push: viewPush,
    pop: viewPop,
    shift: viewShift,
    unshift: viewUnshift,
    sort: viewSort,

    // View production
    mapView,
    filterView,
    flatMapView,
} as const;

export type Collection<T> = TrackedData<T[], typeof CollectionPrototype>;
export type View<T> = TrackedData<readonly T[], typeof ViewPrototype>;

export enum CollectionEventType {
    SPLICE,
    MOVE,
    SORT,
}
export type CollectionEvent<T> =
    | {
          type: CollectionEventType.SPLICE;
          index: number;
          count: number;
          items: readonly T[];
      }
    | {
          type: CollectionEventType.MOVE;
          from: number;
          count: number;
          to: number;
      }
    | {
          type: CollectionEventType.SORT;
          indexes: readonly number[];
      };

export const CollectionHandler: ProxyHandler<CollectionEvent<any>> = {
    get: (dataAccessor, emitter, prop, receiver) => {
        return dataAccessor.get(prop, receiver);
    },
    has: (dataAccessor, emitter, prop) => {
        return dataAccessor.has(prop);
    },
    set: (dataAccessor, emitter, prop, value, receiver) => {
        if (typeof prop === 'string') {
            const numericProp = parseInt(prop, 10);
            if (!isNaN(numericProp)) {
                emitter({
                    type: CollectionEventType.SPLICE,
                    index: numericProp,
                    count: 1,
                    items: [value],
                });
            }
        }
        return dataAccessor.set(prop, value, receiver);
    },
    delete: (dataAccessor, emitter, prop) => {
        return dataAccessor.delete(prop);
    },
};

export const ViewHandler: ProxyHandler<CollectionEvent<any>> = {
    get: (dataAccessor, emitter, prop, receiver) => {
        return dataAccessor.get(prop, receiver);
    },
    has: (dataAccessor, emitter, prop) => {
        return dataAccessor.has(prop);
    },
    set: (dataAccessor, emitter, prop, value, receiver) => {
        log.fail('Cannot mutate readonly view');
    },
    delete: (dataAccessor, emitter, prop) => {
        log.fail('Cannot mutate readonly view');
    },
};

export function collection<T>(items: T[], debugName?: string): Collection<T> {
    const handle = makeTrackedData<
        T[],
        typeof CollectionPrototype,
        CollectionEvent<T>,
        CollectionEvent<T>
    >(items, CollectionHandler, CollectionPrototype, null, null, debugName);
    return handle.revocable.proxy;
}

function viewSplice<T>(
    this: View<T>,
    index: number,
    count: number,
    ...items: T[]
) {
    log.fail('Cannot mutate readonly view');
}

function collectionSplice<T>(
    this: Collection<T>,
    index: number,
    count: number,
    ...items: T[]
) {
    const tdHandle = getTrackedDataHandle(this);
    log.assert(tdHandle, 'splice operation lacking tdHandle');
    const startLength = this.length;
    const removed = Array.prototype.splice.call(
        tdHandle.target,
        index,
        count,
        ...items
    );
    const endLength = this.length;
    if (startLength === endLength) {
        // invalidate fields affected by splice
        for (let i = index; i < index + items.length; ++i) {
            const field = tdHandle.fieldMap.get(i.toString());
            field?.set(tdHandle.target[i]);
        }
    } else {
        // invalidate fields affected by splice
        for (let i = index; i < endLength; ++i) {
            const field = tdHandle.fieldMap.get(i.toString());
            field?.set(tdHandle.target[i]);
        }
        // destroy any dead fields
        for (let i = endLength; i < startLength; ++i) {
            const field = tdHandle.fieldMap.get(i.toString());
            field?.set(undefined);
        }
        const field = tdHandle.fieldMap.get('length');
        field?.set(endLength);
    }
    tdHandle.emitter.addEvent({
        type: CollectionEventType.SPLICE,
        index,
        count,
        items,
    });
    return removed;
}

function viewPush<T>(this: View<T>, ...items: T[]) {
    log.fail('Cannot mutate readonly view');
}

function collectionPush<T>(this: Collection<T>, ...items: T[]) {
    collectionSplice.call(this, this.length, 0, ...items);
    return this.length;
}

function viewPop<T>(this: View<T>) {
    log.fail('Cannot mutate readonly view');
}

function collectionPop<T>(this: Collection<T>): T | undefined {
    return collectionSplice.call(this, this.length - 1, 1)[0];
}

function viewShift<T>(this: View<T>) {
    log.fail('Cannot mutate readonly view');
}

function collectionShift<T>(this: Collection<T>): T | undefined {
    return collectionSplice.call(this, 0, 1)[0];
}

function viewUnshift<T>(this: View<T>, ...items: T[]) {
    log.fail('Cannot mutate readonly view');
}

function collectionUnshift<T>(this: Collection<T>, ...items: T[]) {
    collectionSplice.call(this, 0, 0, ...items);
    return this.length;
}

function collectionReject<T>(this: Collection<T>, pred: (val: T) => boolean) {
    let start: null | number = null;
    let length = this.length;
    let toRemove = false;
    for (let i = 0; i < length; ++i) {
        toRemove = pred(this[i]);
        if (toRemove && start === null) {
            start = i;
        }
        if (!toRemove && start !== null) {
            const count = i - start;
            this.splice(start, count);
            length -= count;
            i -= count;
            start = null;
        }
    }
    if (start !== null) {
        const count = length - start;
        this.splice(start, count);
    }
}

function collectionMoveSlice<T>(
    this: Collection<T>,
    fromIndex: number,
    count: number,
    toIndex: number
) {
    const tdHandle = getTrackedDataHandle(this);
    log.assert(tdHandle, 'moveSlice missing tdHandle');
    const removed = tdHandle.target.splice(fromIndex, count);
    tdHandle.target.splice(toIndex, 0, ...removed);
    tdHandle.emitter.addEvent({
        type: CollectionEventType.MOVE,
        from: fromIndex,
        count,
        to: toIndex,
    });
}

function viewSort<T>(this: Collection<T>, sortFn?: (a: T, b: T) => number) {
    log.fail('Cannot mutate readonly view');
}

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

function collectionSort<T>(
    this: Collection<T>,
    sortFn: (a: T, b: T) => number = defaultSort
) {
    const tdHandle = getTrackedDataHandle(this);
    log.assert(tdHandle, 'collectionSort missing tdHandle');
    let indexes: null | number[] = null;
    if (tdHandle.emitter) {
        indexes = (tdHandle.target as T[])
            .map((_unused: T, index: number) => index)
            .sort((a, b) => sortFn(tdHandle.target[a], tdHandle.target[b]));
    }
    tdHandle.target.sort(sortFn);
    if (indexes) {
        tdHandle.emitter.addEvent({
            type: CollectionEventType.SORT,
            indexes,
        });
    }

    // Invalidate sorted fields
    for (let i = 0; i < tdHandle.target.length; ++i) {
        const field = tdHandle.fieldMap.get(i.toString());
        field?.set(tdHandle.target[i]);
    }
    return this;
}

function mapView<T, V>(
    this: Collection<T> | View<T>,
    fn: (item: T) => V,
    debugName?: string
) {
    return makeFlatMapView(this, (item: T) => [fn(item)], debugName);
}
function filterView<T>(
    this: Collection<T> | View<T>,
    fn: (item: T) => boolean,
    debugName?: string
) {
    return makeFlatMapView(
        this,
        (item: T) => (fn(item) ? [item] : []),
        debugName
    );
}
function flatMapView<T, V>(
    this: Collection<T> | View<T>,
    fn: (item: T) => V[],
    debugName?: string
) {
    return makeFlatMapView(this, fn, debugName);
}

function makeFlatMapView<T, V>(
    sourceCollection: Collection<T> | View<T>,
    flatMap: (item: T) => readonly V[],
    debugName?: string
) {
    const sourceTDHandle = getTrackedDataHandle(sourceCollection);
    log.assert(sourceTDHandle, 'missing tdHandle');
    const slotSizes: number[] = [];
    const initialTransform: V[] = [];

    untracked(() => {
        for (const item of sourceCollection) {
            const slot = flatMap(item);
            slotSizes.push(slot.length);
            initialTransform.push(...slot);
        }
    });

    const derivedCollection = makeTrackedData<
        readonly V[],
        typeof ViewPrototype,
        CollectionEvent<V>,
        CollectionEvent<T>
    >(
        initialTransform,
        ViewHandler,
        ViewPrototype,
        sourceTDHandle.emitter,
        (target, event, emitter) =>
            flatMapHandler(
                slotSizes,
                flatMap,
                initialTransform,
                event,
                emitter
            ),
        debugName ?? 'derived'
    );

    return derivedCollection.revocable.proxy;
}

function flatMapHandler<T, V>(
    slotSizes: number[],
    flatMap: (item: T) => readonly V[],
    target: V[],
    event: CollectionEvent<T>,
    emitter: SubscriptionEmitter<CollectionEvent<V>>
) {
    switch (event.type) {
        case CollectionEventType.SPLICE: {
            let fromIndex = 0;
            let count = 0;
            for (let i = 0; i < event.index; ++i) {
                fromIndex += i < slotSizes.length ? slotSizes[i] : 0;
            }
            for (let i = 0; i < event.count; ++i) {
                const slotIndex = event.index + i;
                count +=
                    slotIndex < slotSizes.length ? slotSizes[slotIndex] : 0;
            }
            const slotItems: number[] = [];
            const items: V[] = [];
            for (const item of event.items) {
                const slot = flatMap(item);
                slotItems.push(slot.length);
                items.push(...slot);
            }
            target.splice(fromIndex, count, ...items);
            slotSizes.splice(event.index, event.count, ...slotItems);
            emitter.addEvent({
                type: CollectionEventType.SPLICE,
                index: fromIndex,
                count,
                items,
            });
            break;
        }
        case CollectionEventType.SORT: {
            const slotStartIndex: number[] = [];
            let realIndex = 0;
            for (const slotSize of slotSizes) {
                slotStartIndex.push(realIndex);
                realIndex += slotSize;
            }
            const copiedSlotSizes = slotSizes.slice();
            const copiedSource = target.slice();
            const newIndexes: number[] = [];
            let destSlotIndex = 0;
            let destIndex = 0;
            for (const sourceIndex of event.indexes) {
                const realCount = copiedSlotSizes[sourceIndex];
                const realIndex = slotStartIndex[sourceIndex];
                for (let i = 0; i < realCount; ++i) {
                    newIndexes.push(realIndex + i);
                    target[destIndex] = copiedSource[realIndex + i];
                    destIndex += 1;
                }
                slotSizes[destSlotIndex] = copiedSlotSizes[sourceIndex];
                destSlotIndex += 1;
            }
            emitter.addEvent({
                type: CollectionEventType.SORT,
                indexes: newIndexes,
            });
            break;
        }
        case CollectionEventType.MOVE: {
            let fromIndex = 0;
            let toIndex = 0;
            let count = 0;
            for (let i = 0; i < event.from; ++i) {
                fromIndex += slotSizes[i];
            }
            for (let i = 0; i < event.count; ++i) {
                count += slotSizes[event.from + i];
            }
            const movedSlots = slotSizes.splice(event.from, event.count);
            const movedItems = target.splice(fromIndex, count);
            for (let i = 0; i < event.to; ++i) {
                toIndex += slotSizes[i];
            }
            slotSizes.splice(event.to, 0, ...movedSlots);
            target.splice(toIndex, 0, ...movedItems);
            emitter.addEvent({
                type: CollectionEventType.MOVE,
                from: fromIndex,
                count,
                to: toIndex,
            });
            break;
        }
        default:
            log.assertExhausted(event);
    }
}
