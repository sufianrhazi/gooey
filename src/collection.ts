import {
    TrackedData,
    makeTrackedData,
    getTrackedDataHandle,
    ProxyHandler,
} from './trackeddata';
import {
    untrackReads,
    retain,
    release,
    SymRefcount,
    SymAlive,
    SymDead,
    SymDebugName,
    Retainable,
} from './engine';
import { ArrayEvent, ArrayEventType, arrayEventFlatMap } from './arrayevent';
import * as log from './log';

export interface CollectionImpl<T> extends Retainable {
    _type: 'collection';
    splice(start: number, deleteCount?: number | undefined): T[];
    splice(start: number, deleteCount: number, ...items: T[]): T[];
    push(...items: T[]): number;
    pop(): T | undefined;
    shift(): T | undefined;
    unshift(...items: T[]): number;
    sort(cmp?: ((a: T, b: T) => number) | undefined): this;
    reverse(): Collection<T>;

    reject: (pred: (val: T) => boolean) => T[];
    moveSlice: (fromIndex: number, count: number, toIndex: number) => void;

    mapView: <V>(fn: (val: T) => V) => View<V>;
    filterView: (fn: (val: T) => boolean) => View<T>;
    flatMapView: <V>(fn: (val: T) => V[]) => View<V>;

    subscribe: (handler: (event: ArrayEvent<T>) => void) => () => void;
}

export function makeCollectionPrototype<T>(): CollectionImpl<T> {
    return {
        _type: 'collection',

        // Array mutation values
        splice: collectionSplice,
        push: collectionPush,
        pop: collectionPop,
        shift: collectionShift,
        unshift: collectionUnshift,
        sort: collectionSort,
        reverse: collectionReverse,

        // Handy API values
        reject: collectionReject,
        moveSlice: collectionMoveSlice,

        // View production
        mapView,
        filterView,
        flatMapView,
        subscribe: collectionSubscribe,

        // Retainable
        [SymRefcount]: 0,
        [SymAlive]: collectionAlive,
        [SymDead]: collectionDead,
        [SymDebugName]: 'collection',
    };
}

export interface ViewImpl<T> extends Retainable {
    _type: 'view';
    splice(start: number, deleteCount?: number | undefined): never;
    splice(start: number, deleteCount: number, ...items: T[]): never;
    push(...items: T[]): never;
    pop(): never;
    shift(): never;
    unshift(...items: T[]): never;
    sort(cmp?: ((a: T, b: T) => number) | undefined): never;
    reverse(): never;

    mapView: <V>(fn: (val: T) => V) => View<V>;
    filterView: (fn: (val: T) => boolean) => View<T>;
    flatMapView: <V>(fn: (val: T) => V[]) => View<V>;

    subscribe: (handler: (event: ArrayEvent<T>) => void) => () => void;
}

export function makeViewPrototype<T>(): ViewImpl<T> {
    return {
        _type: 'view',

        // Array mutation values
        splice: viewSplice,
        push: viewPush,
        pop: viewPop,
        shift: viewShift,
        unshift: viewUnshift,
        sort: viewSort,
        reverse: viewReverse,

        // View production
        mapView,
        filterView,
        flatMapView,
        subscribe: collectionSubscribe,

        // Retainable
        [SymRefcount]: 0,
        [SymAlive]: viewAlive,
        [SymDead]: viewDead,
        [SymDebugName]: 'collection',
    };
}

export type Collection<T> = TrackedData<T[], CollectionImpl<T>>;
export type View<T> = TrackedData<readonly T[], ViewImpl<T>>;

export function isCollection(val: any): val is Collection<any> {
    return val && val._type === 'collection';
}

export function isView(val: any): val is View<any> {
    return val && val._type === 'view';
}

export const CollectionHandler: ProxyHandler<ArrayEvent<any>> = {
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
                    type: ArrayEventType.SPLICE,
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

export const ViewHandler: ProxyHandler<ArrayEvent<any>> = {
    get: (dataAccessor, emitter, prop, receiver) => {
        return dataAccessor.get(prop, receiver);
    },
    has: (dataAccessor, emitter, prop) => {
        return dataAccessor.has(prop);
    },
    set: (dataAccessor, emitter, prop, value, receiver) => {
        if (prop === SymRefcount) {
            return dataAccessor.set(prop, value, receiver);
        }
        log.fail('Cannot mutate readonly view');
    },
    delete: (dataAccessor, emitter, prop) => {
        log.fail('Cannot mutate readonly view');
    },
};

export function collection<T>(items: T[], debugName?: string): Collection<T> {
    const handle = makeTrackedData<
        T[],
        CollectionImpl<T>,
        ArrayEvent<T>,
        ArrayEvent<T>
    >(
        items,
        CollectionHandler,
        makeCollectionPrototype(),
        null,
        null,
        debugName
    );
    return handle.revocable.proxy;
}

function viewSplice<T>(
    this: View<T>,
    index: number,
    count: number,
    ...items: T[]
): never {
    log.fail('Cannot mutate readonly view');
}

function collectionSplice<T>(
    this: Collection<T>,
    index: number,
    count = 0,
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
        type: ArrayEventType.SPLICE,
        index,
        count,
        items,
    });
    return removed;
}

function viewPush<T>(this: View<T>, ...items: T[]): never {
    log.fail('Cannot mutate readonly view');
}

function collectionPush<T>(this: Collection<T>, ...items: T[]) {
    collectionSplice.call(this, this.length, 0, ...items);
    return this.length;
}

function viewPop<T>(this: View<T>): never {
    log.fail('Cannot mutate readonly view');
}

function collectionPop<T>(this: Collection<T>): T | undefined {
    return collectionSplice.call(this, this.length - 1, 1)[0];
}

function viewShift<T>(this: View<T>): never {
    log.fail('Cannot mutate readonly view');
}

function collectionShift<T>(this: Collection<T>): T | undefined {
    return collectionSplice.call(this, 0, 1)[0];
}

function viewUnshift<T>(this: View<T>, ...items: T[]): never {
    log.fail('Cannot mutate readonly view');
}

function collectionUnshift<T>(this: Collection<T>, ...items: T[]) {
    collectionSplice.call(this, 0, 0, ...items);
    return this.length;
}

function collectionReject<T>(
    this: Collection<T>,
    pred: (val: T) => boolean
): T[] {
    let start: null | number = null;
    let length = this.length;
    let toRemove = false;
    const removed: T[] = [];
    for (let i = 0; i < length; ++i) {
        toRemove = pred(this[i]);
        if (toRemove && start === null) {
            start = i;
        }
        if (!toRemove && start !== null) {
            const count = i - start;
            removed.push(...this.splice(start, count));
            length -= count;
            i -= count;
            start = null;
        }
    }
    if (start !== null) {
        const count = length - start;
        removed.push(...this.splice(start, count));
    }
    return removed;
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
        type: ArrayEventType.MOVE,
        from: fromIndex,
        count,
        to: toIndex,
    });
}

function collectionSubscribe<T>(
    this: Collection<T> | View<T>,
    handler: (event: ArrayEvent<T>) => void
) {
    const tdHandle = getTrackedDataHandle(this);
    log.assert(tdHandle, 'subscribe missing tdHandle');
    retain(tdHandle.emitter);
    const unsubscribe = tdHandle.emitter.subscribe((events, offset) => {
        for (let i = offset; i < events.length; ++i) {
            handler(events[i]);
        }
    });
    return () => {
        unsubscribe();
        release(tdHandle.emitter);
    };
}

function collectionAlive() {
    // TODO: what to do here?
}

function collectionDead() {
    // TODO: what to do here?
}

function viewSort<T>(
    this: Collection<T>,
    sortFn?: (a: T, b: T) => number
): never {
    log.fail('Cannot mutate readonly view');
}

function viewReverse<T>(this: Collection<T>): never {
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
            type: ArrayEventType.SORT,
            from: 0,
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

function collectionReverse<T>(this: Collection<T>) {
    const tdHandle = getTrackedDataHandle(this);
    log.assert(tdHandle, 'collectionReverse missing tdHandle');
    tdHandle.target.reverse();
    if (tdHandle.emitter) {
        const indexes: number[] = [];
        for (let i = tdHandle.target.length - 1; i >= 0; --i) {
            indexes.push(i);
        }
        tdHandle.emitter.addEvent({
            type: ArrayEventType.SORT,
            from: 0,
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

    untrackReads(() => {
        for (const item of sourceCollection) {
            const slot = flatMap(item);
            slotSizes.push(slot.length);
            initialTransform.push(...slot);
        }
    });

    const derivedCollection = makeTrackedData<
        readonly V[],
        ViewImpl<V>,
        ArrayEvent<V>,
        ArrayEvent<T>
    >(
        initialTransform,
        ViewHandler,
        makeViewPrototype(),
        sourceTDHandle.emitter,
        (target, event) =>
            arrayEventFlatMap(slotSizes, flatMap, initialTransform, event),
        debugName ?? 'derived'
    );

    return derivedCollection.revocable.proxy;
}

function viewAlive<T>(this: View<T>) {
    const tdHandle = getTrackedDataHandle(this);
    log.assert(tdHandle, 'missing tdHandle');
    log.assert(tdHandle.consumer, 'missing tdHandle consumer');
    retain(tdHandle.consumer);
}

function viewDead<T>(this: View<T>) {
    const tdHandle = getTrackedDataHandle(this);
    log.assert(tdHandle, 'missing tdHandle');
    log.assert(tdHandle.consumer, 'missing tdHandle consumer');
    release(tdHandle.consumer);
}
