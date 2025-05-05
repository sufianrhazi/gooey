import { ArrayEventType } from '../common/arrayevent';
import type { DynamicInternalSubscription } from '../common/dyn';
import * as log from '../common/log';
import { noop } from '../common/util';
import { commit } from '../viewcontroller/commit';
import { isClassComponent } from '../viewcontroller/createelement';
import type { Component } from '../viewcontroller/rendernode/componentrendernode';
import type { DynamicArraySubscription } from './arraysub';
import { Calculation, takeCalcSubscriptions } from './calc';
import type { Collection, View } from './collection';
import { getDynamicArray, isCollectionOrView } from './collection';
import { DictEventType, getDictTrackedData, isDict } from './dict';
import type { DictEvent } from './dict';
import { Field, takeFieldSubscriptions } from './field';
import { Graph, ProcessAction } from './graph';
import { getModelDict, isModel, model } from './model';
import type { ModelEvent } from './model';
import type { TrackedDataSubscription } from './trackeddata';

export interface Retainable {
    __debugName: string;
    __refcount: number;
    __alive: () => void;
    __dead: () => void;
}

export interface Processable {
    __processable: true;
    __debugName: string;
    __recalculate?: (vertexSet: Set<Processable>) => Processable[];
    __cycle?: () => void;
    __invalidate?: () => void;
}

export function isProcessable(val: any): val is Processable {
    return val && val.__processable === true;
}

/**
 * When reader R reads data D, data D calls `const reader = notifyRead(data)`
 *
 *   An edge is added between data D -> reader R
 *   Data D should be retained if it is a new dependency (by reader R, responsibility to do this is on the reader R)
 *   Data D gets a reference back to Reader R so it may markDirty(reader) when D is processed and needs to propagate change
 */
type OnReadCallback = (
    vertex: Retainable & Processable
) => Retainable & Processable;

export type MountSubscription = () => void;

let globalDependencyGraph = new Graph<Processable>(processHandler);
let trackReadCallbackStack: (OnReadCallback | null)[] = [];
let isFlushing = false;
let needsFlush = false;
let flushHandle: (() => void) | null = null;
let flushScheduler = defaultScheduler;
let componentToReplaceSet: Map<
    Component<any>,
    Set<(newComponent: Component<any>) => void>
> = new Map();
let collectionToReplaceSet: Map<
    Collection<any> | View<any>,
    Set<(newCollection: Collection<any> | View<any>) => void>
> = new Map();
let mountPoints: Map<Element | ShadowRoot, MountSubscription> = new Map();

function noopScheduler(callback: () => void) {
    return noop;
}

function defaultScheduler(callback: () => void) {
    if ((window as any).queueMicrotask) {
        let cancelled = false;
        queueMicrotask(() => {
            if (cancelled) return;
            callback();
        });
        return () => {
            cancelled = true;
        };
    }
    const handle = setTimeout(callback, 0);
    return () => clearTimeout(handle);
}

export function reset() {
    globalDependencyGraph = new Graph<Processable>(processHandler);
    trackReadCallbackStack = [];
    isFlushing = false;
    needsFlush = false;
    if (flushHandle) flushHandle();
    flushHandle = null;
    flushScheduler = defaultScheduler;
    componentToReplaceSet = new Map();
    collectionToReplaceSet = new Map();
    mountPoints = new Map();
}

export function registerMountPoint(
    target: Element | ShadowRoot,
    mountSubscription: MountSubscription
) {
    mountPoints.set(target, mountSubscription);
}

export function takeMountPoint(target: Element | ShadowRoot) {
    const sub = mountPoints.get(target);
    if (sub) {
        mountPoints.delete(target);
    }
    return sub;
}

export function registerComponentReload<T>(
    component: Component<T>,
    reload: (newComponent: typeof component) => void
) {
    let reloads = componentToReplaceSet.get(component);
    if (!reloads) {
        reloads = new Set();
        componentToReplaceSet.set(component, reloads);
    }
    reloads.add(reload);
}

export function unregisterComponentReload<T>(
    component: Component<T>,
    reload: (newComponent: typeof component) => void
) {
    const reloads = componentToReplaceSet.get(component);
    log.assert(
        reloads,
        'Internal error: unexpected unregisterComponentRenderNode, previously unseen',
        { component, reload }
    );
    reloads.delete(reload);
}

export function registerCollectionViewReload<T>(
    coll: Collection<T> | View<T>,
    reload: (newComponent: typeof coll) => void
) {
    let reloads = collectionToReplaceSet.get(coll);
    if (!reloads) {
        reloads = new Set();
        collectionToReplaceSet.set(coll, reloads);
    }
    reloads.add(reload);
}

export function unregisterCollectionViewReload<T>(
    coll: Collection<T> | View<T>,
    reload: (newComponent: typeof coll) => void
) {
    const reloads = collectionToReplaceSet.get(coll);
    log.assert(
        reloads,
        'Internal error: unexpected unregisterComponentRenderNode, previously unseen',
        { coll, reload }
    );
    reloads.delete(reload);
}

export function hotSwapModuleExport(
    beforeExport: unknown,
    afterExport: unknown
) {
    let beforeVertex: Processable | undefined;
    let beforeArraySubscriptions:
        | { length: number; subscriptions: DynamicArraySubscription<unknown>[] }
        | undefined;
    let beforeValueSubscriptions:
        | DynamicInternalSubscription<unknown>[]
        | undefined;
    let beforeDictSubscriptions:
        | {
              keys: unknown[];
              subscriptions: TrackedDataSubscription<
                  DictEvent<unknown, unknown>
              >[];
          }
        | undefined;
    let beforeModelSubscriptions:
        | {
              keys: unknown[];
              subscriptions: TrackedDataSubscription<
                  ModelEvent<any, string | number | symbol>
              >[];
          }
        | undefined;
    let beforeComponent: Component<unknown> | undefined;
    if (beforeExport instanceof Field) {
        beforeVertex = beforeExport;
        beforeValueSubscriptions = takeFieldSubscriptions(beforeExport);
    } else if (beforeExport instanceof Calculation) {
        beforeVertex = beforeExport;
        beforeValueSubscriptions = takeCalcSubscriptions(beforeExport);
    } else if (isModel(beforeExport)) {
        const dict = getModelDict(beforeExport);
        const trackedData = getDictTrackedData(dict);
        // TODO: this is unsound!
        beforeVertex = trackedData;
        beforeModelSubscriptions = {
            keys: [],
            subscriptions:
                trackedData.takeSubscriptions() as unknown as TrackedDataSubscription<
                    ModelEvent<any, any>
                >[],
        };
    } else if (isCollectionOrView(beforeExport)) {
        const dynamicArray = getDynamicArray(beforeExport);
        beforeVertex = dynamicArray.getTrackedArray();
        beforeArraySubscriptions = {
            length: beforeExport.length,
            subscriptions: dynamicArray.takeSubscriptions(),
        };
    } else if (isDict(beforeExport)) {
        const trackedData = getDictTrackedData(beforeExport);
        if (globalDependencyGraph.hasVertex(trackedData)) {
            for (const dep of globalDependencyGraph.getForwardDependencies(
                trackedData
            )) {
                globalDependencyGraph.markVertexDirty(dep);
            }
        }
        beforeDictSubscriptions = {
            keys: Array.from(beforeExport.keys()),
            subscriptions: trackedData.takeSubscriptions(),
        };
    } else if (
        typeof beforeExport === 'function' ||
        isClassComponent(beforeExport)
    ) {
        beforeComponent = beforeExport as Component<any>;
    }

    // If the export was a vertex, downstream dependencies must be dirtied
    if (beforeVertex) {
        if (globalDependencyGraph.hasVertex(beforeVertex)) {
            for (const dep of globalDependencyGraph.getForwardDependencies(
                beforeVertex
            )) {
                globalDependencyGraph.markVertexDirty(dep);
            }
        }
    }

    // If the old export had value subscriptions, hand them to the new export
    if (beforeValueSubscriptions) {
        for (const subscription of beforeValueSubscriptions) {
            subscription.onUnsubscribe();
            if (
                afterExport instanceof Calculation ||
                afterExport instanceof Field
            ) {
                subscription.onUnsubscribe = afterExport.subscribe(
                    subscription.handler
                );
            } else {
                subscription.onUnsubscribe = noop;
                subscription.handler(
                    new Error(
                        'Hot swapping replaced Field/Calculation with non-Field/Calculation value'
                    ),
                    undefined
                );
            }
        }
    }
    // If the old export had array subscriptions, hand them to the new export
    if (beforeArraySubscriptions) {
        for (const subscription of beforeArraySubscriptions.subscriptions) {
            subscription.handler([
                {
                    type: ArrayEventType.SPLICE,
                    index: 0,
                    count: beforeArraySubscriptions.length,
                },
            ]);
            subscription.onUnsubscribe();

            if (isCollectionOrView(afterExport)) {
                subscription.onUnsubscribe = afterExport.subscribe(
                    subscription.handler
                );
            }
        }
    }

    // If the old export had dict subscriptions, hand them to the new export
    if (beforeDictSubscriptions) {
        for (const subscription of beforeDictSubscriptions.subscriptions) {
            subscription.handler(
                beforeDictSubscriptions.keys.map((key) => ({
                    type: DictEventType.DEL,
                    prop: key,
                }))
            );
            subscription.onUnsubscribe();

            if (isDict(afterExport)) {
                subscription.onUnsubscribe = afterExport.subscribe(
                    subscription.handler
                );
            }
        }
    }

    // If the old export had model subscriptions, hand them to the new export
    if (beforeModelSubscriptions) {
        for (const subscription of beforeModelSubscriptions.subscriptions) {
            subscription.onUnsubscribe();

            if (isModel(afterExport)) {
                subscription.onUnsubscribe = model.subscribe(
                    afterExport,
                    subscription.handler
                );
            }
        }
    }

    // If the old export is a component, replace with new export
    if (beforeComponent) {
        const replaceFunctions = componentToReplaceSet.get(beforeComponent);
        if (replaceFunctions) {
            // Note: if there is no after export, we swap it with a dead component
            const afterComponent: Component<unknown> =
                typeof afterExport === 'function' ||
                isClassComponent(afterExport)
                    ? (afterExport as Component<unknown>)
                    : () => {
                          log.warn(
                              'Hot swapping replaced component with non-component value; the old component will now render to nothing'
                          );
                          return null;
                      };
            replaceFunctions.forEach((replaceFn) => {
                replaceFn(afterComponent);
                registerComponentReload(afterComponent, replaceFn);
            });
        }
        componentToReplaceSet.delete(beforeComponent);
    }
}

function scheduleFlush() {
    if (needsFlush) return;
    needsFlush = true;
    flushHandle = flushScheduler(() => {
        needsFlush = false;
        flushHandle = null;
        flushInner();
    });
}

export function flush() {
    if (isFlushing) {
        return;
    }
    if (flushHandle) {
        flushHandle();
        flushHandle = null;
    }
    needsFlush = false;
    flushInner();
}

export function subscribe(scheduler?: (callback: () => void) => () => void) {
    flushScheduler = scheduler ?? noopScheduler;
}

export function retain(retainable: Retainable) {
    DEBUG &&
        log.debug(
            'retain',
            retainable.__debugName,
            'was',
            retainable.__refcount
        );
    retainable.__refcount += 1;
    if (retainable.__refcount === 1) {
        retainable.__alive();
    }
}

export function release(retainable: Retainable) {
    DEBUG &&
        log.debug(
            'release',
            retainable.__debugName,
            'was',
            retainable.__refcount
        );
    log.assert(retainable.__refcount > 0, 'double release');
    if (retainable.__refcount === 1) {
        retainable.__dead();
    }
    retainable.__refcount -= 1;
}

function processHandler(vertexGroup: Set<Processable>, action: ProcessAction) {
    const toInvalidate = new Set<Processable>();
    for (const vertex of vertexGroup) {
        DEBUG &&
            log.debug(
                'process',
                ProcessAction[action],
                vertex.__debugName,
                vertex
            );
        switch (action) {
            case ProcessAction.INVALIDATE:
                vertex.__invalidate?.();
                break;
            case ProcessAction.RECALCULATE:
                vertex
                    .__recalculate?.(vertexGroup)
                    .forEach((v) => toInvalidate.add(v));
                break;
            case ProcessAction.CYCLE:
                vertex.__cycle?.();
                // TODO: This is awkward! We need to propagate when a cycle _first occurs_
                for (const toVertex of getForwardDependencies(
                    vertex as Processable & Retainable
                )) {
                    toInvalidate.add(toVertex);
                }
                break;
            default:
                log.assertExhausted(action, 'unknown action');
        }
    }
    for (const vertex of vertexGroup) {
        toInvalidate.delete(vertex);
    }
    for (const vertex of toInvalidate) {
        DEBUG &&
            log.debug('post-process invalidate', vertex.__debugName, vertex);
        markDirty(vertex);
    }
    return false;
}

function flushInner() {
    isFlushing = true;
    globalDependencyGraph.process();
    commit();
    isFlushing = false;
    if (needsFlush) {
        // This can happen when a flush or commit causes nodes in the dependency graph to be dirtied
        // Ideally this shouldn't happen in a normal application, probably should measure if that's true in an idiomatic one
        flush();
    }
}

export function addVertex(vertex: Processable) {
    DEBUG && log.debug('addVertex', vertex.__debugName);
    globalDependencyGraph.addVertex(vertex);
}

export function removeVertex(vertex: Processable) {
    DEBUG && log.debug('removeVertex', vertex.__debugName);
    globalDependencyGraph.removeVertex(vertex);
}

export function addEdge(fromVertex: Processable, toVertex: Processable) {
    DEBUG &&
        log.debug(
            'add edge',
            fromVertex.__debugName,
            '->',
            toVertex.__debugName
        );
    globalDependencyGraph.addEdge(fromVertex, toVertex);
}

export function removeEdge(fromVertex: Processable, toVertex: Processable) {
    DEBUG &&
        log.debug(
            'del edge',
            fromVertex.__debugName,
            '->',
            toVertex.__debugName
        );
    globalDependencyGraph.removeEdge(fromVertex, toVertex);
}

export function markDirty(vertex: Processable) {
    DEBUG && log.debug('Vertex manually marked dirty', vertex.__debugName);
    globalDependencyGraph.markVertexDirty(vertex);
    scheduleFlush();
}

export function unmarkDirty(vertex: Processable) {
    DEBUG && log.debug('Vertex manually unmarked dirty', vertex.__debugName);
    globalDependencyGraph.clearVertexDirty(vertex);
}

export function markCycleInformed(vertex: Processable) {
    DEBUG &&
        log.debug(
            'Vertex manually marked as cycle informed',
            vertex.__debugName
        );
    globalDependencyGraph.markVertexCycleInformed(vertex);
}

export function trackReads<T>(
    onRead: OnReadCallback,
    fn: () => T,
    debugName?: string
): T {
    DEBUG && log.group('trackReads', debugName ?? 'call');
    trackReadCallbackStack.push(onRead);
    try {
        return fn();
    } finally {
        DEBUG && log.groupEnd();
        log.assert(
            onRead === trackReadCallbackStack.pop(),
            'Calculation tracking consistency error'
        );
    }
}

export function untrackReads<T>(fn: () => T, debugName?: string): T {
    DEBUG && log.group('untrackReads', debugName ?? 'call');
    trackReadCallbackStack.push(null);
    try {
        return fn();
    } finally {
        DEBUG && log.groupEnd();
        log.assert(
            null === trackReadCallbackStack.pop(),
            'Calculation tracking consistency error'
        );
    }
}

export function notifyRead(
    dependency: Retainable & Processable
): undefined | (Retainable & Processable) {
    if (trackReadCallbackStack.length === 0) return undefined;
    const onRead = trackReadCallbackStack[trackReadCallbackStack.length - 1];
    if (onRead) {
        DEBUG &&
            log.debug(
                'adding dependency',
                dependency.__debugName,
                'to active calculation'
            );
        return onRead(dependency);
    }
    return undefined;
}

export function* getForwardDependencies(dependency: Retainable & Processable) {
    yield* globalDependencyGraph.getForwardDependencies(dependency);
}

export function debug(activeVertex?: Processable, label?: string) {
    return globalDependencyGraph.debug((vertex) => {
        return {
            isActive: vertex === activeVertex,
            name: `${vertex.__debugName} (rc=${(vertex as any).__refcount})`,
        };
    }, label);
}

export function debugSubscribe(fn: (label: string, graphviz: string) => void) {
    return globalDependencyGraph.debugSubscribe((vertex) => {
        return {
            isActive: false,
            name: vertex.__debugName,
        };
    }, fn);
}

export function debugGetGraph() {
    const { vertices, edges } = globalDependencyGraph.debugGetGraph();
    const labels = new Map<Processable, string>();
    vertices.forEach((vertex) => {
        labels.set(vertex, vertex.__debugName);
    });
    return { vertices, edges, labels };
}
