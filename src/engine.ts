import * as log from './log';
import { noop } from './util';
import { Graph, ProcessAction } from './graph';

export const SymDebugName = Symbol('debugName');
export const SymRefcount = Symbol('refcount');
export const SymDestroy = Symbol('refcount');
export const SymRecalculate = Symbol('refcount');
export const SymCycle = Symbol('refcount');
export const SymInvalidate = Symbol('refcount');

export interface Retainable {
    [SymDebugName]: string;
    [SymRefcount]: number;
    [SymDestroy]: () => void;
}

export interface Processable {
    [SymDebugName]: string;
    [SymRecalculate]?: () => boolean;
    [SymCycle]?: () => boolean;
    [SymInvalidate]?: () => boolean;
}

let globalDependencyGraph = new Graph<Processable>(processHandler);
let activeCalculationReads: (Set<Retainable & Processable> | null)[] = [];
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
    flushScheduler = scheduler ? scheduler : noopScheduler;
}

export function retain(retainable: Retainable) {
    console.log(
        'retain',
        retainable[SymDebugName],
        'was',
        retainable[SymRefcount]
    );
    retainable[SymRefcount] += 1;
}

export function release(retainable: Retainable) {
    console.log(
        'release',
        retainable[SymDebugName],
        'was',
        retainable[SymRefcount]
    );
    log.assert(retainable[SymRefcount] > 0, 'double release');
    if (retainable[SymRefcount] === 1) {
        retainable[SymDestroy]();
    }
    retainable[SymRefcount] -= 1;
}

function processHandler(vertex: Processable, action: ProcessAction) {
    console.log('process', ProcessAction[action], vertex[SymDebugName], vertex);
    //console.log(
    //    debug(vertex, `${ProcessAction[action]} ${vertex[SymDebugName]}`)
    //);
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
    globalDependencyGraph.process();
    console.log(debug(undefined, `flush complete`));
}

export function addVertex(vertex: Processable) {
    console.log('addVertex', vertex[SymDebugName]);
    globalDependencyGraph.addVertex(vertex);
}

export function removeVertex(vertex: Processable) {
    console.log('removeVertex', vertex[SymDebugName]);
    globalDependencyGraph.removeVertex(vertex);
}

export function addHardEdge(fromVertex: Processable, toVertex: Processable) {
    console.log(
        'add edge:hard',
        fromVertex[SymDebugName],
        '->',
        toVertex[SymDebugName]
    );
    globalDependencyGraph.addEdge(fromVertex, toVertex, Graph.EDGE_HARD);
}

export function addSoftEdge(fromVertex: Processable, toVertex: Processable) {
    console.log(
        'add edge:soft',
        fromVertex[SymDebugName],
        '->',
        toVertex[SymDebugName]
    );
    globalDependencyGraph.addEdge(fromVertex, toVertex, Graph.EDGE_SOFT);
}

export function removeHardEdge(fromVertex: Processable, toVertex: Processable) {
    console.log(
        'del edge:hard',
        fromVertex[SymDebugName],
        '->',
        toVertex[SymDebugName]
    );
    globalDependencyGraph.removeEdge(fromVertex, toVertex, Graph.EDGE_HARD);
}

export function removeSoftEdge(fromVertex: Processable, toVertex: Processable) {
    console.log(
        'del edge:soft',
        fromVertex[SymDebugName],
        '->',
        toVertex[SymDebugName]
    );
    globalDependencyGraph.removeEdge(fromVertex, toVertex, Graph.EDGE_SOFT);
}

export function markDirty(vertex: Processable) {
    console.log('dirty', vertex[SymDebugName]);
    globalDependencyGraph.markVertexDirty(vertex);
    scheduleFlush();
}

export function unmarkDirty(vertex: Processable) {
    console.log('clean', vertex[SymDebugName]);
    globalDependencyGraph.clearVertexDirty(vertex);
}

export function markRoot(vertex: Processable) {
    console.log('mark root', vertex[SymDebugName]);
    globalDependencyGraph.markVertexRoot(vertex);
}

export function unmarkRoot(vertex: Processable) {
    console.log('clear root', vertex[SymDebugName]);
    globalDependencyGraph.clearVertexRoot(vertex);
}

export function markCycleInformed(vertex: Processable) {
    console.log('cycle informed', vertex[SymDebugName]);
    globalDependencyGraph.markVertexCycleInformed(vertex);
}

export function tracked<T>(
    set: Set<Retainable & Processable>,
    fn: () => T,
    debugName?: string
): T {
    console.group('tracked', debugName ?? 'call');
    activeCalculationReads.push(set);
    try {
        return fn();
    } finally {
        console.groupEnd();
        log.assert(
            set === activeCalculationReads.pop(),
            'Calculation tracking consistency error'
        );
    }
}

export function isToplevel() {
    return activeCalculationReads.length > 0;
}

export function untracked<T>(fn: () => T, debugName?: string): T {
    console.group('untracked', debugName ?? 'call');
    activeCalculationReads.push(null);
    try {
        return fn();
    } finally {
        console.groupEnd();
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
        console.log(
            'adding dependency',
            dependency[SymDebugName],
            'to active calculation'
        );
        calculationReads.add(dependency);
    }
}

export function debug(activeVertex?: Processable, label?: string) {
    return globalDependencyGraph.debug((vertex) => {
        return {
            isActive: vertex === activeVertex,
            group: undefined,
            name: vertex[SymDebugName],
        };
    }, label);
}
