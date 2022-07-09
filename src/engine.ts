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

export interface Retainable {
    [SymDebugName]: string;
    [SymRefcount]: number;
    [SymAlive]: () => void;
    [SymDead]: () => void;
}

export interface Processable {
    [SymDebugName]: string;
    [SymRecalculate]?: () => boolean;
    [SymCycle]?: () => boolean;
    [SymInvalidate]?: () => boolean;
}

let globalDependencyGraph = new Graph<Processable>(processHandler);
let activeCalculationReads: (Set<Retainable & Processable> | null)[] = [];
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
    activeCalculationReads = [];
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

export function tracked<T>(
    set: Set<Retainable & Processable>,
    fn: () => T,
    debugName?: string
): T {
    DEBUG && log.group('tracked', debugName ?? 'call');
    activeCalculationReads.push(set);
    try {
        return fn();
    } finally {
        DEBUG && log.groupEnd();
        log.assert(
            set === activeCalculationReads.pop(),
            'Calculation tracking consistency error'
        );
    }
}

export function untracked<T>(fn: () => T, debugName?: string): T {
    DEBUG && log.group('untracked', debugName ?? 'call');
    activeCalculationReads.push(null);
    try {
        return fn();
    } finally {
        DEBUG && log.groupEnd();
        log.assert(
            null === activeCalculationReads.pop(),
            'Calculation tracking consistency error'
        );
    }
}

export function addDependencyToActiveCalculation(
    dependency: Retainable & Processable
) {
    if (activeCalculationReads.length === 0) return;
    const calculationReads =
        activeCalculationReads[activeCalculationReads.length - 1];
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
