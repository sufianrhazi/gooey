import type { ArrayEvent } from '../common/arrayevent';
import {
    addArrayEvent,
    arrayEventFlatMap,
    ArrayEventType,
} from '../common/arrayevent';
import * as log from '../common/log';
import { CollectionRenderNode } from '../modelview/collectionrendernode';
import type { JSXNode, JSXRenderable } from '../viewcontroller/jsx';
import type { RenderNode } from '../viewcontroller/rendernode/rendernode';
import type { Retainable } from './engine';
import { release, retain, untrackReads } from './engine';
import type { ProxyHandler, TrackedData } from './trackeddata';
import { getTrackedDataHandle, TrackedDataHandle } from './trackeddata';

export interface CollectionImpl<T> extends Retainable, JSXRenderable {
    _type: 'collection';
    splice(start: number, deleteCount?: number | undefined): T[];
    splice(start: number, deleteCount: number, ...items: T[]): T[];
    push(...items: T[]): number;
    pop(): T | undefined;
    shift(): T | undefined;
    unshift(...items: T[]): number;
    sort(cmp?: ((a: T, b: T) => number) | undefined): this;
    reverse(): this;

    reject: (pred: (val: T) => boolean) => T[];
    moveSlice: (fromIndex: number, count: number, toIndex: number) => void;

    mapView: <V>(
        fn: (val: T) => V,
        debugName?: string | undefined
    ) => View<V, ArrayEvent<T>>;
    filterView: (
        fn: (val: T) => boolean,
        debugName?: string | undefined
    ) => View<T, ArrayEvent<T>>;
    flatMapView: <V>(
        fn: (val: T) => V[],
        debugName?: string | undefined
    ) => View<V, ArrayEvent<T>>;

    subscribe: (handler: (event: ArrayEvent<T>[]) => void) => () => void;
    __renderNode: (
        renderJSXNode: (jsxNode: JSXNode) => RenderNode
    ) => RenderNode;
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
        __refcount: 0,
        __alive: collectionAlive,
        __dead: collectionDead,
        __debugName: 'collection',

        // JSXRenderable
        __renderNode: collectionRender,
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

    mapView: <V>(
        fn: (val: T) => V,
        debugName?: string | undefined
    ) => View<V, ArrayEvent<T>>;
    filterView: (
        fn: (val: T) => boolean,
        debugName?: string | undefined
    ) => View<T, ArrayEvent<T>>;
    flatMapView: <V>(
        fn: (val: T) => V[],
        debugName?: string | undefined
    ) => View<V, ArrayEvent<T>>;

    subscribe: (handler: (event: ArrayEvent<T>[]) => void) => () => void;
    __renderNode: (
        renderJSXNode: (jsxNode: JSXNode) => RenderNode
    ) => RenderNode;
}

export function makeViewPrototype<T>(
    sourceCollection: TrackedData<any, any, unknown, unknown>
): ViewImpl<T> {
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
        __refcount: 0,
        __alive(this: View<T>) {
            retain(sourceCollection);
            const tdHandle = getTrackedDataHandle(this);
            log.assert(tdHandle, 'missing tdHandle');
            retain(tdHandle.fieldMap);
        },
        __dead(this: View<T>) {
            const tdHandle = getTrackedDataHandle(this);
            log.assert(tdHandle, 'missing tdHandle');
            release(tdHandle.fieldMap);
            release(sourceCollection);
        },
        __debugName: 'collection',

        // JSXRenderable
        __renderNode: collectionRender,
    };
}

export type Collection<T> = TrackedData<
    T[],
    CollectionImpl<T>,
    ArrayEvent<T>,
    ArrayEvent<T>
>;
export type View<T, TConsumeEvent = any> = TrackedData<
    readonly T[],
    ViewImpl<T>,
    ArrayEvent<T>,
    TConsumeEvent
>;

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
        if (prop === '__refcount') {
            return dataAccessor.set(prop, value, receiver);
        }
        log.fail('Cannot mutate readonly view');
    },
    delete: (dataAccessor, emitter, prop) => {
        log.fail('Cannot mutate readonly view');
    },
};

export function collection<T>(items: T[], debugName?: string): Collection<T> {
    const handle = new TrackedDataHandle<
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
        addArrayEvent,
        addArrayEvent,
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

function spliceInner<T>(
    tdHandle: TrackedDataHandle<
        T[],
        CollectionImpl<T>,
        ArrayEvent<T>,
        ArrayEvent<T>
    >,
    index: number,
    count: number,
    ...items: T[]
) {
    const startLength = tdHandle.target.length;
    const removed = Array.prototype.splice.call(
        tdHandle.target,
        index,
        count,
        ...items
    );
    const endLength = tdHandle.target.length;
    if (startLength === endLength) {
        // invalidate fields affected by splice
        for (let i = index; i < index + items.length; ++i) {
            tdHandle.fieldMap.set(i.toString(), tdHandle.target[i]);
        }
    } else {
        // invalidate fields affected by splice
        for (let i = index; i < endLength; ++i) {
            tdHandle.fieldMap.set(i.toString(), tdHandle.target[i]);
        }
        // destroy any dead fields
        for (let i = endLength; i < startLength; ++i) {
            tdHandle.fieldMap.delete(i.toString());
        }
        tdHandle.fieldMap.set('length', endLength);
    }
    tdHandle.emitter.addEvent({
        type: ArrayEventType.SPLICE,
        index,
        count,
        items,
    });
    return removed;
}

function collectionSplice<T>(
    this: Collection<T>,
    index: number,
    count = 0,
    ...items: T[]
) {
    const tdHandle = getTrackedDataHandle(this);
    log.assert(tdHandle, 'missing tdHandle');
    return spliceInner(tdHandle, index, count, ...items);
}

function viewPush<T>(this: View<T>, ...items: T[]): never {
    log.fail('Cannot mutate readonly view');
}

function collectionPush<T>(this: Collection<T>, ...items: T[]) {
    const tdHandle = getTrackedDataHandle(this);
    log.assert(tdHandle, 'missing tdHandle');
    spliceInner(tdHandle, tdHandle.target.length, 0, ...items);
    return tdHandle.target.length;
}

function viewPop<T>(this: View<T>): never {
    log.fail('Cannot mutate readonly view');
}

function collectionPop<T>(this: Collection<T>): T | undefined {
    const tdHandle = getTrackedDataHandle(this);
    log.assert(tdHandle, 'missing tdHandle');
    return spliceInner(tdHandle, tdHandle.target.length - 1, 1)[0];
}

function viewShift<T>(this: View<T>): never {
    log.fail('Cannot mutate readonly view');
}

function collectionShift<T>(this: Collection<T>): T | undefined {
    const tdHandle = getTrackedDataHandle(this);
    log.assert(tdHandle, 'missing tdHandle');
    return spliceInner(tdHandle, 0, 1)[0];
}

function viewUnshift<T>(this: View<T>, ...items: T[]): never {
    log.fail('Cannot mutate readonly view');
}

function collectionUnshift<T>(this: Collection<T>, ...items: T[]) {
    const tdHandle = getTrackedDataHandle(this);
    log.assert(tdHandle, 'missing tdHandle');
    spliceInner(tdHandle, 0, 0, ...items);
    return tdHandle.target.length;
}

function collectionReject<T>(
    this: Collection<T>,
    pred: (val: T) => boolean
): T[] {
    const tdHandle = getTrackedDataHandle(this);
    log.assert(tdHandle, 'missing tdHandle');

    let start: null | number = null;
    let length = tdHandle.target.length;
    let toRemove = false;
    const removed: T[] = [];
    for (let i = 0; i < length; ++i) {
        toRemove = pred(tdHandle.target[i]);
        if (toRemove && start === null) {
            start = i;
        }
        if (!toRemove && start !== null) {
            const count = i - start;
            removed.push(...spliceInner(tdHandle, start, count));
            length -= count;
            i -= count;
            start = null;
        }
    }
    if (start !== null) {
        const count = length - start;
        removed.push(...spliceInner(tdHandle, start, count));
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
    handler: (event: ArrayEvent<T>[]) => void
) {
    const tdHandle = getTrackedDataHandle<
        readonly T[],
        CollectionImpl<T> | ViewImpl<T>,
        ArrayEvent<T>,
        ArrayEvent<any>
    >(this);
    log.assert(tdHandle, 'subscribe missing tdHandle');
    retain(this); // Yes, this is a bit odd -- a collection with a subscription should always be retained while the subscription is alive
    retain(tdHandle.emitter);
    const unsubscribe = tdHandle.emitter.subscribe((events) => {
        handler(events);
    });
    return () => {
        unsubscribe();
        release(tdHandle.emitter);
        release(this);
    };
}

function collectionAlive<T>(this: Collection<T>) {
    const tdHandle = getTrackedDataHandle<
        T[],
        CollectionImpl<T>,
        ArrayEvent<T>,
        ArrayEvent<T>
    >(this);
    log.assert(tdHandle, 'missing tdHandle');
    retain(tdHandle.fieldMap);
}

function collectionDead<T>(this: Collection<T>) {
    const tdHandle = getTrackedDataHandle<
        T[],
        CollectionImpl<T>,
        ArrayEvent<T>,
        ArrayEvent<T>
    >(this);
    log.assert(tdHandle, 'missing tdHandle');
    release(tdHandle.fieldMap);
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
        tdHandle.fieldMap.set(i.toString(), tdHandle.target[i]);
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
        tdHandle.fieldMap.set(i.toString(), tdHandle.target[i]);
    }
    return this;
}

function mapView<T, V>(
    this: Collection<T> | View<T>,
    fn: (item: T) => V,
    debugName?: string
): View<V, ArrayEvent<T>> {
    return makeFlatMapView(this, (item: T) => [fn(item)], debugName);
}
function filterView<T>(
    this: Collection<T> | View<T>,
    fn: (item: T) => boolean,
    debugName?: string
): View<T, ArrayEvent<T>> {
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
): View<V, ArrayEvent<T>> {
    return makeFlatMapView(this, fn, debugName);
}

function makeFlatMapView<T, V>(
    sourceCollection: Collection<T> | View<T>,
    flatMap: (item: T) => readonly V[],
    debugName?: string
): View<V, ArrayEvent<T>> {
    const sourceTDHandle = getTrackedDataHandle<
        readonly T[],
        CollectionImpl<T> | ViewImpl<T>,
        ArrayEvent<T>,
        ArrayEvent<any>
    >(sourceCollection);
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

    const derivedCollection = new TrackedDataHandle<
        readonly V[],
        ViewImpl<V>,
        ArrayEvent<V>,
        ArrayEvent<T>
    >(
        initialTransform,
        ViewHandler,
        makeViewPrototype(sourceCollection),
        sourceTDHandle.emitter,
        function* (target, events: ArrayEvent<T>[]) {
            for (const event of events) {
                const lengthStart = initialTransform.length;
                // Oops this is accidentally quadratic!
                yield* arrayEventFlatMap(
                    slotSizes,
                    flatMap,
                    initialTransform,
                    event
                );
                // Invalidate affected ranges
                switch (event.type) {
                    case ArrayEventType.SPLICE: {
                        const lengthEnd = initialTransform.length;
                        if (lengthStart === lengthEnd) {
                            for (
                                let i = event.index;
                                i < event.index + event.count;
                                ++i
                            ) {
                                derivedCollection.fieldMap.set(
                                    i.toString(),
                                    initialTransform[i]
                                );
                            }
                        } else {
                            for (let i = event.index; i < lengthEnd; ++i) {
                                derivedCollection.fieldMap.set(
                                    i.toString(),
                                    initialTransform[i]
                                );
                            }
                            for (let i = lengthEnd; i < lengthStart; ++i) {
                                derivedCollection.fieldMap.delete(i.toString());
                            }
                            derivedCollection.fieldMap.set('length', lengthEnd);
                        }
                        break;
                    }
                    case ArrayEventType.MOVE: {
                        const lowerBound = Math.min(event.from, event.to);
                        const upperBound = Math.max(
                            event.from + event.count,
                            event.to + event.count
                        );
                        for (let i = lowerBound; i < upperBound; ++i) {
                            derivedCollection.fieldMap.set(
                                i.toString(),
                                initialTransform[i]
                            );
                        }
                        break;
                    }
                    case ArrayEventType.SORT:
                        for (
                            let i = event.from;
                            i < event.from + event.indexes.length;
                            ++i
                        ) {
                            derivedCollection.fieldMap.set(
                                i.toString(),
                                initialTransform[i]
                            );
                        }
                        break;
                }
            }
        },
        addArrayEvent,
        addArrayEvent,
        debugName ?? 'derived'
    );

    return derivedCollection.revocable.proxy;
}

function collectionRender<T>(
    this: Collection<T>,
    renderJSXNode: (jsxNode: JSXNode) => RenderNode
): RenderNode {
    return CollectionRenderNode(renderJSXNode, this, this.__debugName);
}
