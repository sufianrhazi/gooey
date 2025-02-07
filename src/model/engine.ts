import * as log from '../common/log';
import { noop } from '../common/util';
import { commit } from '../viewcontroller/commit';
import { Graph, ProcessAction } from './graph';

export interface Retainable {
    __debugName: string;
    __refcount: number;
    __alive: () => void;
    __dead: () => void;
}

export interface Processable {
    __processable: true;
    __debugName: string;
    __recalculate?: (
        addPostAction: (postAction: () => void) => void
    ) => boolean;
    __cycle?: (addPostAction: (postAction: () => void) => void) => boolean;
    __invalidate?: () => boolean;
}

export function isProcessable(val: any): val is Processable {
    return val && val.__processable === true;
}

let globalDependencyGraph = new Graph<Processable>(processHandler);
let postProcessActions = new Set<() => void>();
let trackReadSets: (Set<Retainable> | null)[] = [];
let isFlushing = false;
let needsFlush = false;
let flushHandle: (() => void) | null = null;
let flushScheduler = defaultScheduler;

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
    postProcessActions = new Set();
    trackReadSets = [];
    isFlushing = false;
    needsFlush = false;
    if (flushHandle) flushHandle();
    flushHandle = null;
    flushScheduler = defaultScheduler;
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

function processHandler(
    vertex: Processable,
    action: ProcessAction,
    addPostAction: (postAction: () => void) => void
) {
    DEBUG &&
        log.debug('process', ProcessAction[action], vertex.__debugName, vertex);
    switch (action) {
        case ProcessAction.INVALIDATE:
            return vertex.__invalidate?.() ?? false;
        case ProcessAction.RECALCULATE:
            return vertex.__recalculate?.(addPostAction) ?? false;
        case ProcessAction.CYCLE:
            return vertex.__cycle?.(addPostAction) ?? false;
        default:
            log.assertExhausted(action, 'unknown action');
    }
}

function flushInner() {
    isFlushing = true;
    globalDependencyGraph.process();
    const toProcess = postProcessActions;
    postProcessActions = new Set();
    for (const postProcessAction of toProcess) {
        postProcessAction();
    }
    commit();
    isFlushing = false;
    if (needsFlush) {
        // This can happen when a flush or commit causes nodes in the dependency graph to be dirtied
        // Ideally this shouldn't happen in a normal application, probably should measure if that's true in an idiomatic one
        flush();
    }
}

export function addPostProcessAction(action: () => void) {
    postProcessActions.add(action);
    scheduleFlush();
    return () => {
        postProcessActions.delete(action);
    };
}

export function addVertex(vertex: Processable) {
    DEBUG && log.debug('addVertex', vertex.__debugName);
    globalDependencyGraph.addVertex(vertex);
}

export function removeVertex(vertex: Processable) {
    DEBUG && log.debug('removeVertex', vertex.__debugName);
    globalDependencyGraph.removeVertex(vertex);
}

export function addHardEdge(fromVertex: Processable, toVertex: Processable) {
    DEBUG &&
        log.debug(
            'add edge:hard',
            fromVertex.__debugName,
            '->',
            toVertex.__debugName
        );
    globalDependencyGraph.addEdge(fromVertex, toVertex, Graph.EDGE_HARD);
}

export function addSoftEdge(fromVertex: Processable, toVertex: Processable) {
    DEBUG &&
        log.debug(
            'add edge:soft',
            fromVertex.__debugName,
            '->',
            toVertex.__debugName
        );
    globalDependencyGraph.addEdge(fromVertex, toVertex, Graph.EDGE_SOFT);
}

export function removeHardEdge(fromVertex: Processable, toVertex: Processable) {
    DEBUG &&
        log.debug(
            'del edge:hard',
            fromVertex.__debugName,
            '->',
            toVertex.__debugName
        );
    globalDependencyGraph.removeEdge(fromVertex, toVertex, Graph.EDGE_HARD);
}

export function removeSoftEdge(fromVertex: Processable, toVertex: Processable) {
    DEBUG &&
        log.debug(
            'del edge:soft',
            fromVertex.__debugName,
            '->',
            toVertex.__debugName
        );
    globalDependencyGraph.removeEdge(fromVertex, toVertex, Graph.EDGE_SOFT);
}

export function markDirty(vertex: Processable) {
    DEBUG && log.debug('dirty', vertex.__debugName);
    globalDependencyGraph.markVertexDirty(vertex);
    scheduleFlush();
}

export function unmarkDirty(vertex: Processable) {
    DEBUG && log.debug('clean', vertex.__debugName);
    globalDependencyGraph.clearVertexDirty(vertex);
}

export function markCycleInformed(vertex: Processable) {
    DEBUG && log.debug('cycle informed', vertex.__debugName);
    globalDependencyGraph.markVertexCycleInformed(vertex);
}

export function trackReads<T>(
    set: Set<Retainable>,
    fn: () => T,
    debugName?: string
): T {
    DEBUG && log.group('trackReads', debugName ?? 'call');
    trackReadSets.push(set);
    try {
        return fn();
    } finally {
        DEBUG && log.groupEnd();
        log.assert(
            set === trackReadSets.pop(),
            'Calculation tracking consistency error'
        );
    }
}

export function untrackReads<T>(fn: () => T, debugName?: string): T {
    DEBUG && log.group('untrackReads', debugName ?? 'call');
    trackReadSets.push(null);
    try {
        return fn();
    } finally {
        DEBUG && log.groupEnd();
        log.assert(
            null === trackReadSets.pop(),
            'Calculation tracking consistency error'
        );
    }
}

export function notifyRead(dependency: Retainable) {
    if (trackReadSets.length === 0) return;
    const calculationReads = trackReadSets[trackReadSets.length - 1];
    if (calculationReads) {
        DEBUG &&
            log.debug(
                'adding dependency',
                dependency.__debugName,
                'to active calculation'
            );
        if (!calculationReads.has(dependency)) {
            retain(dependency);
            calculationReads.add(dependency);
        }
    }
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
