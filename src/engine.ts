import { Graph, ProcessAction } from './graph';
import * as log from './log';
import { RenderNodeCommitPhase } from './rendernode/constants';
import type { RenderNode } from './rendernode/rendernode';
import { noop } from './util';

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
let renderNodesToCommit = new Set<RenderNode>();
let trackReadSets: (Set<Retainable> | null)[] = [];
let trackCreateSets: (Set<Retainable> | null)[] = [];
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
    renderNodesToCommit = new Set<RenderNode>();
    trackReadSets = [];
    trackCreateSets = [];
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
    if (!needsFlush || isFlushing) return;
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
    // Flushing has a few phases:
    // - 1: process the global dependency graph to get state to a stable resolution
    // - 2: notify "onUnmount"
    // - 2.5: record document.activeElement
    // - 3: commit DOM deletions (notify "raw" DOM deletions)
    // - 4: commit DOM insertions (notify "raw" DOM insertions)
    // - 4.5: restore document.activeElement if it was moved
    // - 5: notify "onMount"
    isFlushing = true;
    const toCommit = renderNodesToCommit;
    renderNodesToCommit = new Set();
    globalDependencyGraph.process();
    for (const renderNode of toCommit) {
        renderNode.commit?.(RenderNodeCommitPhase.COMMIT_UNMOUNT);
    }
    const prevFocus = document.activeElement;
    for (const renderNode of toCommit) {
        renderNode.commit?.(RenderNodeCommitPhase.COMMIT_DEL);
    }
    for (const renderNode of toCommit) {
        renderNode.commit?.(RenderNodeCommitPhase.COMMIT_INS);
    }
    if (
        prevFocus &&
        (prevFocus instanceof HTMLElement || prevFocus instanceof SVGElement) &&
        document.documentElement.contains(prevFocus)
    ) {
        prevFocus.focus();
    }
    for (const renderNode of toCommit) {
        renderNode.commit?.(RenderNodeCommitPhase.COMMIT_MOUNT);
    }
    toCommit.clear();
    isFlushing = false;
    if (needsFlush) {
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

export function removeRenderNode(vertex: RenderNode) {
    renderNodesToCommit.delete(vertex);
}

export function dirtyRenderNode(renderNode: RenderNode) {
    DEBUG && log.debug('dirty renderNode', renderNode.__debugName);
    renderNodesToCommit.add(renderNode);
    scheduleFlush();
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
                retainable.__debugName,
                'to was created'
            );
        if (!createSet.has(retainable)) {
            createSet.add(retainable);
        }
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
