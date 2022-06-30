import {
    TrackedData,
    makeTrackedData,
    getTrackedDataHandle,
    SubscriptionConsumer,
    SubscribeHandlerType,
    subscriptionConsumerAddEvent,
    subscriptionEmitterAddEvent,
    ProxyHandler,
} from './trackeddata';
import {
    SymDebugName,
    SymRecalculate,
    untracked,
    addVertex,
    markRoot,
} from './engine';
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
    mapView: collectionMapView,
    filterView: collectionFilterView,
    flatMapView: collectionFlatMapView,
} as const;

export type Collection<T> = TrackedData<T[], typeof CollectionPrototype>;

enum CollectionEventType {
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
          from: number;
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

export function collection<T>(items: T[], debugName?: string): Collection<T> {
    const handle = makeTrackedData<
        T[],
        typeof CollectionPrototype,
        CollectionEvent<T>,
        CollectionEvent<T>
    >(items, CollectionHandler, CollectionPrototype, debugName);
    return handle.revocable.proxy;
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
    if (tdHandle.emitter) {
        subscriptionEmitterAddEvent(tdHandle.emitter, {
            type: CollectionEventType.SPLICE,
            index,
            count,
            items,
        });
    }
    return removed;
}

function collectionPush<T>(this: Collection<T>, ...items: T[]) {
    collectionSplice.call(this, this.length, 0, ...items);
    return this.length;
}

function collectionPop<T>(this: Collection<T>): T | undefined {
    return collectionSplice.call(this, this.length - 1, 1)[0];
}

function collectionShift<T>(this: Collection<T>): T | undefined {
    return collectionSplice.call(this, 0, 1)[0];
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
    if (tdHandle.emitter) {
        subscriptionEmitterAddEvent(tdHandle.emitter, {
            type: CollectionEventType.MOVE,
            from: fromIndex,
            count,
            to: toIndex,
        });
    }
}

function collectionSort<T>(
    this: Collection<T>,
    sortFn?: (a: T, b: T) => number
) {
    const tdHandle = getTrackedDataHandle(this);
    log.assert(tdHandle, 'collectionSort missing tdHandle');
    // TODO: invalidate fields, emit sort action
    tdHandle.target.sort.call(this, sortFn);
    return this;
}

function collectionMapView<T, V>(
    this: Collection<T>,
    fn: (item: T) => V,
    debugName?: string
) {
    return makeFlatMapView(this, (item: T) => [fn(item)], debugName);
}
function collectionFilterView<T>(
    this: Collection<T>,
    fn: (item: T) => boolean,
    debugName?: string
) {
    return makeFlatMapView(
        this,
        (item: T) => (fn(item) ? [item] : []),
        debugName
    );
}
function collectionFlatMapView<T, V>(
    this: Collection<T>,
    fn: (item: T) => V[],
    debugName?: string
) {
    return makeFlatMapView(this, fn, debugName);
}

interface FlatMapConsumer<T, V>
    extends SubscriptionConsumer<Collection<V>, CollectionEvent<T>> {
    slotSizes: number[];
    flatMap: (item: T) => readonly V[];
}

function makeFlatMapView<T, V>(
    sourceCollection: Collection<T>,
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
        V[],
        typeof CollectionPrototype,
        CollectionEvent<V>,
        CollectionEvent<T>
    >(
        initialTransform,
        CollectionHandler,
        CollectionPrototype,
        debugName ?? 'derived'
    );

    const subscriptionConsumer: FlatMapConsumer<T, V> = {
        [SymDebugName]: `subcons:${debugName ?? 'derived'}`,
        [SymRecalculate]: flatMapConsumerFlush,
        events: [],
        handler: flatMapHandler,
        trackedData: derivedCollection.revocable.proxy,
        slotSizes,
        flatMap,
    };

    derivedCollection.consumer = subscriptionConsumer;
    addVertex(subscriptionConsumer);
    markRoot(subscriptionConsumer);

    subscriptionConsumer.unsubscribe = sourceTDHandle.subscribe(
        subscribeHandler,
        subscriptionConsumer
    );
    return derivedCollection.revocable.proxy;

    function subscribeHandler(
        type: SubscribeHandlerType.EVENTS,
        events: CollectionEvent<T>[],
        index: number
    ): void {
        switch (type) {
            case SubscribeHandlerType.EVENTS:
                // index must be defined
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                for (let i = index!; i < events.length; ++i) {
                    subscriptionConsumerAddEvent(
                        subscriptionConsumer,
                        events[i]
                    );
                }
                break;
            default:
                log.assertExhausted(type);
        }
    }
}

function flatMapConsumerFlush<T>(
    this: SubscriptionConsumer<Collection<T>, CollectionEvent<T>>
) {
    for (const event of this.events) {
        this.handler(this.trackedData, event);
    }
    this.events.splice(0, this.events.length);
    return false;
}

function flatMapHandler<T, V>(
    this: FlatMapConsumer<T, V>,
    trackedData: Collection<V>,
    event: CollectionEvent<T>
) {
    switch (event.type) {
        case CollectionEventType.SPLICE: {
            let fromIndex = 0;
            let count = 0;
            for (let i = 0; i < event.index; ++i) {
                fromIndex += i < this.slotSizes.length ? this.slotSizes[i] : 0;
            }
            for (let i = 0; i < event.count; ++i) {
                const slotIndex = event.index + i;
                count +=
                    slotIndex < this.slotSizes.length
                        ? this.slotSizes[slotIndex]
                        : 0;
            }
            const slotItems: number[] = [];
            const items: V[] = [];
            for (const item of event.items) {
                const slot = this.flatMap(item);
                slotItems.push(slot.length);
                items.push(...slot);
            }
            this.trackedData.splice(fromIndex, count, ...items);
            this.slotSizes.splice(event.index, event.count, ...slotItems);
            break;
        }
        case CollectionEventType.SORT: {
            break;
        }
        case CollectionEventType.MOVE: {
            let fromIndex = 0;
            let toIndex = 0;
            let count = 0;
            for (let i = 0; i < event.from; ++i) {
                fromIndex += this.slotSizes[i];
            }
            for (let i = 0; i < event.count; ++i) {
                count += this.slotSizes[event.from + i];
            }
            const movedSlots = this.slotSizes.splice(event.from, event.count);
            const movedItems = this.trackedData.splice(fromIndex, count);
            for (let i = 0; i < event.to; ++i) {
                toIndex += this.slotSizes[i];
            }
            this.slotSizes.splice(event.to, 0, ...movedSlots);
            this.trackedData.splice(toIndex, 0, ...movedItems);
            break;
        }
        default:
            log.assertExhausted(event);
    }
}
