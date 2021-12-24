import { InvariantError, FlushKey, isCalculation, isCollection, isModel, isModelField, makeCalculation, makeEffect, RecalculationTag, } from './types';
import * as log from './log';
import { DAG } from './dag';
import { noop, alwaysFalse, strictEqual } from './util';
import { clearNames, debugNameFor, name } from './debug';
let activeCalculations = [];
let globalDependencyGraph = new DAG();
let refcountMap = new WeakMap();
/**
 * Reset all data to a clean slate.
 */
export function reset() {
    activeCalculations = [];
    globalDependencyGraph = new DAG();
    refcountMap = new WeakMap();
    clearNames();
}
export function calc(func, isEqual, debugName) {
    if (typeof isEqual === 'string')
        debugName = isEqual;
    if (typeof isEqual !== 'function')
        isEqual = strictEqual;
    if (typeof debugName !== 'string')
        debugName = undefined;
    const calculation = trackCalculation(func, isEqual, false);
    if (debugName)
        name(calculation, debugName);
    return calculation;
}
/**
 * Create an effect cell: while the provided function is executed, all dependencies are tracked.
 *
 * The provided function will be re-executed when any of those dependencies are changed.
 *
 * Effect cells are not be added as dependencies to the current computation.
 *
 * Note: Since nothing depends on created effects, they must be be manually retained and released if you want the effect
 * to re-run when its dependencies change. Failure to do so will not automatically re-run the effect (which may be
 * desired if you want to trigger behavior only once within a computation)
 */
export function effect(func, debugName) {
    const calculation = trackCalculation(func, alwaysFalse, true);
    if (debugName)
        name(calculation, debugName);
    return calculation;
}
export function untracked(func) {
    activeCalculations.push(null);
    const result = func();
    activeCalculations.pop();
    return result;
}
function trackCalculation(func, isEqual, isEffect) {
    if (typeof func !== 'function') {
        throw new InvariantError('calculation must be provided a function');
    }
    let result = undefined;
    // Note: typescript gets confused, this *should* be
    // - Calculation<Ret> when isEffect is false and
    // - Calculation<Ret> when isEffect is true, infering Ret to void
    // But infers to Calculation<void> because makeEffect is present
    const trackedCalculation = (isEffect
        ? makeEffect(runCalculation, recalculate)
        : makeCalculation(runCalculation, recalculate));
    function runCalculation() {
        if (!isEffect) {
            // effects return void, so they **cannot** have an effect on the current calculation
            addDepToCurrentCalculation(trackedCalculation);
        }
        if (result) {
            return result.result;
        }
        globalDependencyGraph.removeIncoming(trackedCalculation);
        activeCalculations.push(trackedCalculation);
        result = { result: func() };
        const sanityCheck = activeCalculations.pop();
        if (sanityCheck !== trackedCalculation) {
            throw new InvariantError('Active calculation stack inconsistency!');
        }
        return result.result;
    }
    globalDependencyGraph.addNode(trackedCalculation);
    function recalculate() {
        if (!result) {
            trackedCalculation();
            return false;
        }
        const prevResult = result.result;
        result = undefined;
        const newResult = trackedCalculation();
        const eq = isEqual(prevResult, newResult);
        if (eq) {
            // Ensure future invocations reuse original calculated value
            result = { result: prevResult };
        }
        return eq;
    }
    return trackedCalculation;
}
export function addDepToCurrentCalculation(item) {
    const dependentCalculation = activeCalculations[activeCalculations.length - 1];
    if (dependentCalculation) {
        globalDependencyGraph.addNode(item);
        if (!globalDependencyGraph.hasNode(dependentCalculation)) {
            globalDependencyGraph.addNode(dependentCalculation);
        }
        if (globalDependencyGraph.addEdge(item, dependentCalculation)) {
            DEBUG &&
                log.debug('New global dependency', debugNameFor(item), '->', debugNameFor(dependentCalculation));
        }
    }
}
export function addManualDep(fromNode, toNode) {
    globalDependencyGraph.addNode(fromNode);
    globalDependencyGraph.addNode(toNode);
    if (globalDependencyGraph.addEdge(fromNode, toNode)) {
        DEBUG &&
            log.debug('New manual dependency', debugNameFor(fromNode), '->', debugNameFor(toNode));
    }
}
export function removeManualDep(fromNode, toNode) {
    if (globalDependencyGraph.removeEdge(fromNode, toNode)) {
        DEBUG &&
            log.debug('Removed manual dependency', debugNameFor(fromNode), '->', debugNameFor(toNode));
    }
}
export function processChange(item) {
    const newNode = globalDependencyGraph.addNode(item);
    const marked = globalDependencyGraph.markNodeDirty(item);
    DEBUG &&
        log.debug('processChange', item, newNode ? 'new' : 'existing', marked ? 'fresh' : 'stale');
    if (!needsFlush) {
        needsFlush = true;
        notify();
    }
}
let needsFlush = false;
let flushPromise = Promise.resolve();
let resolveFlushPromise = noop;
let subscribeListener = () => setTimeout(() => flush(), 0);
export function nextFlush() {
    if (!needsFlush)
        return Promise.resolve();
    return flushPromise;
}
/**
 * Call provided callback when any pending calculations are created. Use to configure how/when the application flushes calculations.
 *
 * If any pending calculations are needed when this function is called, the provided callback is called synchronously.
 *
 * By default, the subscribe mechanism is to call flush() on setTimeout. Calling subscribe removes this default and
 * replaces it with whatever mechanism you'd like.
 *
 * Example: subscribe(() => requestAnimationFrame(() => flush()));
 */
export function subscribe(listener) {
    subscribeListener = listener;
    if (needsFlush) {
        subscribeListener();
    }
}
function notify() {
    try {
        flushPromise = new Promise((resolve) => {
            resolveFlushPromise = resolve;
        });
        subscribeListener();
    }
    catch (e) {
        log.exception(e, 'uncaught exception in notify');
    }
}
/**
 * Recalculate all pending calculations.
 */
export function flush() {
    if (!needsFlush) {
        return;
    }
    needsFlush = false;
    // First, collect all the unreferenced nodes to avoid calculating stragglers
    const removed = globalDependencyGraph.garbageCollect();
    DEBUG &&
        removed.forEach((item) => {
            if (isCalculation(item)) {
                log.debug('GC calculation', debugNameFor(item));
            }
            else if (isCollection(item)) {
                log.debug('GC collection', debugNameFor(item));
            }
            else {
                log.debug('GC model', debugNameFor(item));
            }
        });
    // Then flush dependencies in topological order
    globalDependencyGraph.visitDirtyTopological((item) => {
        if (isCalculation(item)) {
            DEBUG && log.debug('flushing calculation', debugNameFor(item));
            const recalculation = item[RecalculationTag];
            return recalculation();
        }
        else if (isCollection(item)) {
            DEBUG && log.debug('flushing collection', debugNameFor(item));
            item[FlushKey]();
        }
        else if (isModel(item)) {
            DEBUG && log.debug('flushing model', debugNameFor(item));
            item[FlushKey]();
        }
        else {
            DEBUG && log.debug('flushing other', debugNameFor(item));
        }
        return false;
    });
    resolveFlushPromise();
}
/**
 * Retain a calculation (increase the refcount)
 */
export function retain(item) {
    var _a;
    const refcount = (_a = refcountMap.get(item)) !== null && _a !== void 0 ? _a : 0;
    const newRefcount = refcount + 1;
    if (refcount === 0) {
        DEBUG &&
            log.debug(`retain ${debugNameFor(item)} retained; refcount ${refcount} -> ${newRefcount}`);
        if (!globalDependencyGraph.hasNode(item)) {
            globalDependencyGraph.addNode(item);
        }
        globalDependencyGraph.retain(item);
    }
    else {
        DEBUG &&
            log.debug(`retain ${debugNameFor(item)} incremented; refcount ${refcount} -> ${newRefcount}`);
    }
    refcountMap.set(item, newRefcount);
}
/**
 * Release a calculation (decrease the refcount). If the refcount reaches zero, the calculation will be garbage
 * collected.
 */
export function release(item) {
    var _a;
    const refcount = (_a = refcountMap.get(item)) !== null && _a !== void 0 ? _a : 0;
    const newRefcount = Math.min(refcount - 1, 0);
    if (refcount < 1) {
        log.error(`release called on unretained item ${debugNameFor(item)}`, item);
    }
    if (newRefcount < 1) {
        DEBUG &&
            log.debug(`release ${debugNameFor(item)} released; refcount ${refcount} -> ${newRefcount}`);
        globalDependencyGraph.release(item);
    }
    else {
        DEBUG &&
            log.debug(`release ${debugNameFor(item)} decremented; refcount ${refcount} -> ${newRefcount}`);
    }
    refcountMap.set(item, newRefcount);
}
/**
 * Return a graphviz formatted directed graph
 */
export function debug() {
    return globalDependencyGraph.graphviz((id, item) => {
        let subgraph = undefined;
        if (isModel(item)) {
            subgraph = item;
        }
        if (isCollection(item)) {
            subgraph = item;
        }
        if (isModelField(item)) {
            subgraph = item.model;
        }
        return {
            label: `${id}\n${debugNameFor(item)}`,
            subgraph,
        };
    });
}
//# sourceMappingURL=calc.js.map