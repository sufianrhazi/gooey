import * as log from './log';
import { noop } from './util';
import { Graph, ProcessAction } from './graph';

export const SymDebugName = Symbol('debugName');
export const SymRefcount = Symbol('refcount');
export const SymAlive = Symbol('alive');
export const SymDead = Symbol('dead');
export const SymRecalculate = Symbol('recalculate');
export const SymCycle = Symbol('cycle');
export const SymInvalidate = Symbol('invalidate');
export const SymProcessable = Symbol('processable');

export interface Retainable {
    [SymDebugName]: string;
    [SymRefcount]: number;
    [SymAlive]: () => void;
    [SymDead]: () => void;
}

export interface Processable {
    [SymProcessable]: true;
    [SymDebugName]: string;
    [SymRecalculate]?: () => boolean;
    [SymCycle]?: () => boolean;
    [SymInvalidate]?: () => boolean;
}

export function isProcessable(val: any): val is Processable {
    return val && val[SymProcessable] === true;
}

let globalDependencyGraph = new Graph<Processable>(processHandler);
let trackReadSets: (Set<Retainable | (Retainable & Processable)> | null)[] = [];
let trackCreateSets: (Set<Retainable> | null)[] = [];
let isFlushing = false;
let afterFlushCallbacks: (() => void)[] = [];
let needsFlush = false;
let flushHandle: (() => void) | null = null;
let flushScheduler = defaultScheduler;

function noopScheduler(callback: () => void) {
    return noop;
}

function defaultScheduler(callback: () => void) {
    const handle = setTimeout(callback, 0);
    return () => clearTimeout(handle);
}

export function reset() {
    globalDependencyGraph = new Graph<Processable>(processHandler);
    trackReadSets = [];
    trackCreateSets = [];
    isFlushing = false;
    afterFlushCallbacks = [];
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
        flush();
    });
}

export function subscribe(scheduler?: (callback: () => void) => () => void) {
    flushScheduler = scheduler ?? noopScheduler;
}

export function retain(retainable: Retainable) {
    DEBUG &&
        log.debug(
            'retain',
            retainable[SymDebugName],
            'was',
            retainable[SymRefcount]
        );
    retainable[SymRefcount] += 1;
    if (retainable[SymRefcount] === 1) {
        retainable[SymAlive]();
    }
}

export function release(retainable: Retainable) {
    DEBUG &&
        log.debug(
            'release',
            retainable[SymDebugName],
            'was',
            retainable[SymRefcount]
        );
    log.assert(retainable[SymRefcount] > 0, 'double release');
    if (retainable[SymRefcount] === 1) {
        retainable[SymDead]();
    }
    retainable[SymRefcount] -= 1;
}

function processHandler(vertex: Processable, action: ProcessAction) {
    DEBUG &&
        log.debug(
            'process',
            ProcessAction[action],
            vertex[SymDebugName],
            vertex
        );
    switch (action) {
        case ProcessAction.INVALIDATE:
            return vertex[SymInvalidate]?.() ?? false;
        case ProcessAction.RECALCULATE:
            return vertex[SymRecalculate]?.() ?? false;
        case ProcessAction.CYCLE:
            return vertex[SymCycle]?.() ?? false;
        default:
            log.assertExhausted(action, 'unknown action');
    }
}

export function flush() {
    isFlushing = true;
    globalDependencyGraph.process();
    isFlushing = false;
    for (const callback of afterFlushCallbacks) {
        callback();
    }
    afterFlushCallbacks.splice(0, afterFlushCallbacks.length);
}

export function afterFlush(fn: () => void) {
    if (isFlushing) {
        afterFlushCallbacks.push(fn);
    } else {
        fn();
    }
}

export function addVertex(vertex: Processable) {
    DEBUG && log.debug('addVertex', vertex[SymDebugName]);
    globalDependencyGraph.addVertex(vertex);
}

export function removeVertex(vertex: Processable) {
    DEBUG && log.debug('removeVertex', vertex[SymDebugName]);
    globalDependencyGraph.removeVertex(vertex);
}

export function addHardEdge(fromVertex: Processable, toVertex: Processable) {
    DEBUG &&
        log.debug(
            'add edge:hard',
            fromVertex[SymDebugName],
            '->',
            toVertex[SymDebugName]
        );
    globalDependencyGraph.addEdge(fromVertex, toVertex, Graph.EDGE_HARD);
}

export function addSoftEdge(fromVertex: Processable, toVertex: Processable) {
    DEBUG &&
        log.debug(
            'add edge:soft',
            fromVertex[SymDebugName],
            '->',
            toVertex[SymDebugName]
        );
    globalDependencyGraph.addEdge(fromVertex, toVertex, Graph.EDGE_SOFT);
}

export function removeHardEdge(fromVertex: Processable, toVertex: Processable) {
    DEBUG &&
        log.debug(
            'del edge:hard',
            fromVertex[SymDebugName],
            '->',
            toVertex[SymDebugName]
        );
    globalDependencyGraph.removeEdge(fromVertex, toVertex, Graph.EDGE_HARD);
}

export function removeSoftEdge(fromVertex: Processable, toVertex: Processable) {
    DEBUG &&
        log.debug(
            'del edge:soft',
            fromVertex[SymDebugName],
            '->',
            toVertex[SymDebugName]
        );
    globalDependencyGraph.removeEdge(fromVertex, toVertex, Graph.EDGE_SOFT);
}

export function markDirty(vertex: Processable) {
    DEBUG && log.debug('dirty', vertex[SymDebugName]);
    globalDependencyGraph.markVertexDirty(vertex);
    scheduleFlush();
}

export function unmarkDirty(vertex: Processable) {
    DEBUG && log.debug('clean', vertex[SymDebugName]);
    globalDependencyGraph.clearVertexDirty(vertex);
}

export function markRoot(vertex: Processable) {
    DEBUG && log.debug('mark root', vertex[SymDebugName]);
    globalDependencyGraph.markVertexRoot(vertex);
}

export function unmarkRoot(vertex: Processable) {
    DEBUG && log.debug('clear root', vertex[SymDebugName]);
    globalDependencyGraph.clearVertexRoot(vertex);
}

export function markCycleInformed(vertex: Processable) {
    DEBUG && log.debug('cycle informed', vertex[SymDebugName]);
    globalDependencyGraph.markVertexCycleInformed(vertex);
}

export function trackReads<T>(
    set: Set<Retainable | (Retainable & Processable)>,
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

export function trackCreates<T>(
    set: Set<Retainable | (Retainable & Processable)>,
    fn: () => T,
    debugName?: string
): T {
    DEBUG && log.group('trackCreates', debugName ?? 'call');
    trackCreateSets.push(set);
    try {
        return fn();
    } finally {
        DEBUG && log.groupEnd();
        log.assert(
            set === trackCreateSets.pop(),
            'Calculation tracking consistency error'
        );
    }
}

export function untrackCreates<T>(fn: () => T, debugName?: string): T {
    DEBUG && log.group('untrackCreates', debugName ?? 'call');
    trackCreateSets.push(null);
    try {
        return fn();
    } finally {
        DEBUG && log.groupEnd();
        log.assert(
            null === trackCreateSets.pop(),
            'Calculation tracking consistency error'
        );
    }
}

export function notifyCreate(retainable: Retainable) {
    if (trackCreateSets.length === 0) return;
    const createSet = trackCreateSets[trackCreateSets.length - 1];
    if (createSet) {
        DEBUG &&
            log.debug(
                'notifying dependency',
                retainable[SymDebugName],
                'to was created'
            );
        if (!createSet.has(retainable)) {
            createSet.add(retainable);
        }
    }
}

export function notifyRead(dependency: Retainable & Processable) {
    if (trackReadSets.length === 0) return;
    const calculationReads = trackReadSets[trackReadSets.length - 1];
    if (calculationReads) {
        DEBUG &&
            log.debug(
                'adding dependency',
                dependency[SymDebugName],
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
            group: undefined,
            name: `${vertex[SymDebugName]} (rc=${
                (vertex as any)[SymRefcount]
            })`,
        };
    }, label);
}

export function debugSubscribe(fn: (label: string, graphviz: string) => void) {
    return globalDependencyGraph.debugSubscribe((vertex) => {
        return {
            isActive: false,
            group: undefined,
            name: vertex[SymDebugName],
        };
    }, fn);
}

export function debugGetGraph() {
    return globalDependencyGraph;
}
