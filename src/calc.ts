import {
    Calculation,
    CalculationRecalculateTag,
    CalculationRecalculateCycleTag,
    CalculationInvalidateTag,
    CalculationSetCycleTag,
    CalculationTypeTag,
    GraphNode,
    EqualityFunc,
    FlushKey,
    InvariantError,
    TypeTag,
    isCalculation,
    isCollection,
    isModel,
    isModelField,
    isSubscription,
} from './types';
import * as log from './log';
import { Graph } from './graph';
import { alwaysTrue, noop, strictEqual, uniqueid } from './util';
import { clearNames, debugNameFor, name } from './debug';

let activeCalculations: { calc: null | Calculation<any>; deps: GraphNode[] }[] =
    [];

let globalDependencyGraph = new Graph<GraphNode>();

let refcountMap: Record<string, number> = {};

/**
 * Reset all data to a clean slate.
 */
export function reset() {
    activeCalculations = [];

    globalDependencyGraph = new Graph();
    refcountMap = {};
    clearNames();
}

let createdCalculations: Calculation<any>[] | undefined;
/**
 * Collect all synchronously created calc() and effect() calls
 */
export function trackCreatedCalculations(fn: () => void): Calculation<any>[] {
    const before = createdCalculations;
    createdCalculations = [];
    try {
        fn();
        const toReturn = createdCalculations;
        return toReturn;
    } finally {
        createdCalculations = before;
    }
}

/**
 * Create a calculation cell: while the provided function is executed, all dependencies are tracked.
 *
 * The provided function will be recalculated when any of those dependencies are changed. The result of this function is
 * treated as a dependency, so if recalculations change the result, any dependent calculations are recalculated.
 */
export function calc<Ret>(func: () => Ret): Calculation<Ret>;
export function calc<Ret>(func: () => Ret, debugName: string): Calculation<Ret>;
export function calc<Ret>(
    func: () => Ret,
    isEqual: EqualityFunc<Ret>
): Calculation<Ret>;
export function calc<Ret>(
    func: () => Ret,
    isEqual: EqualityFunc<Ret>,
    debugName: string
): Calculation<Ret>;
export function calc<Ret>(
    func: () => Ret,
    isEqual?: string | EqualityFunc<Ret>,
    debugName?: string
): Calculation<Ret> {
    if (typeof isEqual === 'string') debugName = isEqual;
    if (typeof isEqual !== 'function') isEqual = strictEqual;
    if (typeof debugName !== 'string') debugName = undefined;
    const calculation = makeCalculation(func, isEqual, false);
    if (debugName) name(calculation, debugName);
    if (createdCalculations) createdCalculations.push(calculation);
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
export function effect(
    func: () => void,
    debugName?: string
): Calculation<void> {
    const calculation = makeCalculation(
        func,
        alwaysTrue /* effects always return true for equality */,
        true
    );
    if (debugName) name(calculation, debugName);
    if (createdCalculations) createdCalculations.push(calculation);
    return calculation;
}

export function untracked<TRet>(func: () => TRet): TRet {
    activeCalculations.push({ calc: null, deps: [] });
    try {
        return func();
    } finally {
        activeCalculations.pop();
    }
}

enum CalculationState {
    STATE_FLUSHED,
    STATE_TRACKING,
    STATE_CACHED,
    STATE_CYCLE,
    STATE_ERROR,
}

class CalculationError extends Error {
    public originalError: unknown;
    constructor(msg: string, originalError: unknown) {
        super(msg);
        this.originalError = originalError;
    }
}

class CycleAbortError extends Error {}

function makeCalculation<Ret>(
    calculationFunc: () => Ret,
    isEqual: (a: Ret, b: Ret) => boolean,
    isEffect: boolean
): Calculation<Ret> {
    if (typeof calculationFunc !== 'function') {
        throw new InvariantError('calculation must be provided a function');
    }

    let result: { result: Ret } | undefined = undefined;
    let state: CalculationState = CalculationState.STATE_FLUSHED;
    let errorHandler: ((errorType: 'cycle' | 'error') => Ret) | undefined =
        undefined;
    let isDisposed = false;

    const calculation: Calculation<Ret> = Object.assign(calculationBody, {
        $__id: uniqueid(),
        [TypeTag]: 'calculation' as const,
        [CalculationTypeTag]: isEffect
            ? ('effect' as const)
            : ('calculation' as const),
        [CalculationSetCycleTag]: calculationSetCycle,
        [CalculationRecalculateTag]: calculationRecalculate,
        [CalculationRecalculateCycleTag]: calculationRecalculateCycle,
        [CalculationInvalidateTag]: calculationInvalidate,
        onError: calculationOnError,
        dispose: calculationDispose,
    });

    globalDependencyGraph.addNode(calculation);

    function calculationBody() {
        log.assert(!isDisposed, 'calculation already disposed');
        if (!isEffect) {
            // effects return void, so they **cannot** have an effect on the current calculation
            addDepToCurrentCalculation(calculation);
        }

        switch (state) {
            case CalculationState.STATE_FLUSHED: {
                state = CalculationState.STATE_TRACKING;
                activeCalculations.push({ calc: calculation, deps: [] });
                const prevResult = result;
                try {
                    result = { result: calculationFunc() };
                } catch (e) {
                    const calcRecord = activeCalculations.pop();
                    log.assert(
                        calcRecord?.calc === calculation,
                        'calculation stack inconsistency'
                    );
                    globalDependencyGraph.replaceIncoming(
                        calculation,
                        calcRecord.deps
                    );
                    const isCycle = e instanceof CycleAbortError;
                    if (isCycle) {
                        // Let the graph know that we are part of a cycle
                        globalDependencyGraph.markNodeCycle(calculation);
                    }
                    state = isCycle
                        ? CalculationState.STATE_CYCLE
                        : CalculationState.STATE_ERROR;
                    if (errorHandler) {
                        result = {
                            result: errorHandler(isCycle ? 'cycle' : 'error'),
                        };
                    } else {
                        // If we don't have an error handler, but we hit an
                        // error, we need to clear out the preexisting result
                        // so we throw when called in an error state.
                        result = undefined;
                    }
                    // Only return a value if we're the _outermost_ tracked call.
                    // Otherwise, we need to propagate the error to catch the remaining ones.
                    if (result && activeCalculations.length === 0) {
                        return prevResult &&
                            isEqual(prevResult.result, result.result)
                            ? prevResult.result
                            : result.result;
                    }
                    if (isCycle) {
                        throw e;
                    }
                    throw new CalculationError(
                        'Calculation error: calculation threw error while being called',
                        e
                    );
                }
                state = CalculationState.STATE_CACHED;
                const calcRecord = activeCalculations.pop();
                log.assert(
                    calcRecord?.calc === calculation,
                    'calculation stack inconsistency'
                );
                globalDependencyGraph.replaceIncoming(
                    calculation,
                    calcRecord.deps
                );
                return prevResult && isEqual(prevResult.result, result.result)
                    ? prevResult.result
                    : result.result;
            }
            case CalculationState.STATE_TRACKING:
                state = CalculationState.STATE_ERROR;
                if (errorHandler) {
                    result = {
                        result: errorHandler('cycle'),
                    };

                    // Let the graph know that we are part of a cycle
                    globalDependencyGraph.markNodeCycle(calculation);

                    // If we have an error handler and we call ourselves,
                    // only return a value if we are the outermost tracked
                    // call. Otherwise, we need to propagate the error to the
                    // callers
                    if (activeCalculations.length === 0) {
                        return result.result;
                    }
                }
                throw new CycleAbortError(
                    'Cycle reached: calculation is part of a cycle'
                );
                break;
            case CalculationState.STATE_CACHED:
                if (result) {
                    return result.result;
                }
                throw new InvariantError(
                    'Calculation in cached state missing result value'
                );
            case CalculationState.STATE_CYCLE:
                if (result) {
                    return result.result;
                }
                throw new Error(
                    'Cycle reached: calculation is part of a cycle'
                );
            case CalculationState.STATE_ERROR:
                if (result) {
                    return result.result;
                }
                throw new Error('Calculation in error state');
            default:
                log.assertExhausted(state, 'Unexpected calculation state');
        }
    }

    function calculationInvalidate() {
        log.assert(!isDisposed, 'calculation already disposed');
        switch (state) {
            case CalculationState.STATE_TRACKING:
                throw new InvariantError(
                    'Cannot invalidate a calculation while being tracked'
                );
            case CalculationState.STATE_FLUSHED:
                return;
            case CalculationState.STATE_CYCLE:
                state = CalculationState.STATE_FLUSHED;
                break;
            case CalculationState.STATE_CACHED:
            case CalculationState.STATE_ERROR: {
                DEBUG &&
                    log.debug('Invalidating node', debugNameFor(calculation));
                state = CalculationState.STATE_FLUSHED;
                break;
            }
            default:
                log.assertExhausted(state, 'Unexpected calculation state');
        }
    }

    function calculationSetCycle() {
        log.assert(!isDisposed, 'calculation already disposed');
        switch (state) {
            case CalculationState.STATE_TRACKING:
                throw new InvariantError(
                    'Cannot mark calculation as being a cycle while it is being calculated'
                );
                break;
            case CalculationState.STATE_FLUSHED:
            case CalculationState.STATE_CACHED:
            case CalculationState.STATE_CYCLE:
            case CalculationState.STATE_ERROR: {
                state = CalculationState.STATE_CYCLE;
                if (errorHandler) {
                    let isResultEqual = false;
                    const newResult = errorHandler('cycle');
                    if (result) {
                        isResultEqual = isEqual(result.result, newResult);
                    }
                    if (!isResultEqual) {
                        result = { result: newResult };
                    }
                    return !isResultEqual;
                } else {
                    if (result) {
                        result = undefined;
                        return true;
                    }
                    return false;
                }
            }
            default:
                log.assertExhausted(state, 'Unexpected calculation state');
        }
    }

    function calculationRecalculate() {
        log.assert(!isDisposed, 'calculation already disposed');
        switch (state) {
            case CalculationState.STATE_TRACKING:
                throw new InvariantError(
                    'Cannot recalculate calculation while it is being calculated'
                );
                break;
            case CalculationState.STATE_FLUSHED:
            case CalculationState.STATE_ERROR:
            case CalculationState.STATE_CACHED: {
                const priorResult = result;
                try {
                    calculationBody();
                } catch (e) {
                    // Completely ignore, at this point `result` should hold the correct value
                }
                if (
                    priorResult &&
                    result &&
                    isEqual(priorResult.result, result.result)
                ) {
                    result = priorResult;
                    return false;
                }
                return true;
            }
            case CalculationState.STATE_CYCLE:
                throw new InvariantError(
                    'Cannot recalculate calculation in cycle state without flushing'
                );
            default:
                log.assertExhausted(state, 'Unexpected calculation state');
        }
    }

    function calculationRecalculateCycle() {
        log.assert(!isDisposed, 'calculation already disposed');
        switch (state) {
            case CalculationState.STATE_TRACKING:
                throw new InvariantError(
                    'Cannot recalculate calculation while it is being calculated'
                );
                break;
            case CalculationState.STATE_FLUSHED:
            case CalculationState.STATE_ERROR:
            case CalculationState.STATE_CACHED: {
                const priorResult = result;
                try {
                    calculationBody();
                } catch (e) {
                    // Completely ignore, at this point `result` should hold the correct value
                }
                if (
                    priorResult &&
                    result &&
                    isEqual(priorResult.result, result.result)
                ) {
                    result = priorResult;
                    return false;
                }
                return true;
            }
            case CalculationState.STATE_CYCLE:
                return calculationSetCycle();
            default:
                log.assertExhausted(state, 'Unexpected calculation state');
        }
    }

    function calculationOnError(
        handler: (errorType: 'cycle' | 'error') => Ret
    ) {
        log.assert(!isDisposed, 'calculation already disposed');
        errorHandler = handler;
        return calculation;
    }

    function calculationDispose() {
        log.assert(!isDisposed, 'calculation already disposed');
        globalDependencyGraph.removeNode(calculation);

        // Delete local state
        result = undefined;
        errorHandler = undefined;

        isDisposed = true;
    }

    return calculation;
}

export function addDepToCurrentCalculation(item: GraphNode) {
    if (activeCalculations.length === 0) return;
    const dependentCalculation =
        activeCalculations[activeCalculations.length - 1];
    dependentCalculation.deps.push(item);
    DEBUG &&
        log.debug(
            'New global dependency',
            debugNameFor(item),
            '->',
            dependentCalculation.calc
                ? debugNameFor(dependentCalculation.calc)
                : '<untracked>' // We probably could avoid adding to .deps if we were untracked, but it may be helpful to log these
        );
}

export function addManualDep(fromNode: GraphNode, toNode: GraphNode) {
    globalDependencyGraph.addNode(fromNode);
    globalDependencyGraph.addNode(toNode);
    globalDependencyGraph.addEdge(fromNode, toNode, Graph.EDGE_HARD);
    scheduleFlush();
    DEBUG &&
        log.debug(
            'New manual dependency',
            debugNameFor(fromNode),
            '->',
            debugNameFor(toNode)
        );
}

export function registerNode(node: GraphNode) {
    globalDependencyGraph.addNode(node);
}

export function disposeNode(node: GraphNode) {
    globalDependencyGraph.removeNode(node);
}

export function addOrderingDep(fromNode: GraphNode, toNode: GraphNode) {
    globalDependencyGraph.addEdge(fromNode, toNode, Graph.EDGE_SOFT);
    scheduleFlush();
    DEBUG &&
        log.debug(
            'New manual ordering dependency',
            debugNameFor(fromNode),
            '->',
            debugNameFor(toNode)
        );
}

export function removeManualDep(fromNode: GraphNode, toNode: GraphNode) {
    globalDependencyGraph.removeEdge(fromNode, toNode, Graph.EDGE_HARD);
    DEBUG &&
        log.debug(
            'Removed manual dependency',
            debugNameFor(fromNode),
            '->',
            debugNameFor(toNode)
        );
}

export function removeOrderingDep(fromNode: GraphNode, toNode: GraphNode) {
    globalDependencyGraph.removeEdge(fromNode, toNode, Graph.EDGE_SOFT);
    DEBUG &&
        log.debug(
            'Removed manual ordering dependency',
            debugNameFor(fromNode),
            '->',
            debugNameFor(toNode)
        );
}

export function markDirty(item: GraphNode) {
    DEBUG && log.debug('Dirtying', debugNameFor(item));
    globalDependencyGraph.addNode(item);
    globalDependencyGraph.markNodeDirty(item);
    scheduleFlush();
}

type Listener = () => void;
let needsFlush = false;
let isFlushing = false;
const afterFlushCallbacks = new Set<() => void>();
let flushPromise: Promise<void> = Promise.resolve();
let resolveFlushPromise: () => void = noop;
let subscribeListener: Listener = () => setTimeout(() => flush(), 0);

export function afterFlush(callback: () => void) {
    if (isFlushing) {
        afterFlushCallbacks.add(callback);
    } else {
        callback();
    }
}

export function nextFlush() {
    if (!needsFlush) return Promise.resolve();
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
export function subscribe(listener: Listener = noop): void {
    subscribeListener = listener;
    if (needsFlush) {
        subscribeListener();
    }
}

function scheduleFlush() {
    if (!needsFlush) {
        needsFlush = true;
        notify();
    }
}

function notify() {
    try {
        flushPromise = new Promise((resolve) => {
            resolveFlushPromise = resolve;
        });
        subscribeListener();
    } catch (e) {
        log.exception(e, 'uncaught exception in notify');
    }
}

/**
 * Hoo boy this is probably a mistake. Stream the graph while we flush
 */
let debugSubscription: ((graphViz: string, detail: string) => void) | null =
    null;

/**
 * Recalculate all pending calculations.
 */
export function flush() {
    if (!needsFlush) {
        return;
    }
    needsFlush = false;
    log.assert(!isFlushing, 'Invariant: flush called recursively');
    isFlushing = true;

    DEBUG && debugSubscription && debugSubscription(debug(), '0: flush start');

    // Then flush dependencies in topological order
    globalDependencyGraph.process((item, action) => {
        let shouldPropagate = true;

        switch (action) {
            case 'cycle':
                if (isCalculation(item)) {
                    shouldPropagate = item[CalculationSetCycleTag]();
                } else {
                    throw new Error('Unexpected dependency on cycle');
                }
                break;
            case 'invalidate':
                if (isCalculation(item)) {
                    item[CalculationInvalidateTag]();
                }
                break;
            case 'recalculate-cycle':
                if (isCalculation(item)) {
                    shouldPropagate = item[CalculationRecalculateCycleTag]();
                } else if (
                    isCollection(item) ||
                    isModel(item) ||
                    isSubscription(item)
                ) {
                    shouldPropagate = item[FlushKey]();
                }
                break;
            case 'recalculate':
                if (isCalculation(item)) {
                    item[CalculationInvalidateTag]();
                    shouldPropagate = item[CalculationRecalculateTag]();
                } else if (
                    isCollection(item) ||
                    isModel(item) ||
                    isSubscription(item)
                ) {
                    shouldPropagate = item[FlushKey]();
                }
                break;
            default:
                log.assertExhausted(action);
        }
        if (DEBUG) {
            log.debug(
                `process:${action}`,
                debugNameFor(item),
                `shouldPropagate=${shouldPropagate}`
            );
            debugSubscription &&
                debugSubscription(
                    debug(item),
                    `process:${action}:shouldPropagate=${shouldPropagate}`
                );
        }
        return shouldPropagate;
    });

    log.assert(
        !globalDependencyGraph.hasDirtyNodes(),
        'Graph contained dirty nodes post-flush'
    );

    DEBUG && debugSubscription && debugSubscription(debug(), `2: after visit`);

    afterFlushCallbacks.forEach((callback) => callback());
    afterFlushCallbacks.clear();

    isFlushing = false;
    resolveFlushPromise();
}

/**
 * Retain a calculation (increase the refcount)
 */
export function retain(item: GraphNode) {
    const refcount = refcountMap[item.$__id] ?? 0;
    const newRefcount = refcount + 1;
    if (refcount === 0) {
        DEBUG &&
            log.debug(
                `retain ${debugNameFor(
                    item
                )} retained; refcount ${refcount} -> ${newRefcount}`
            );
        globalDependencyGraph.addNode(item);
        globalDependencyGraph.retain(item);
    } else {
        DEBUG &&
            log.debug(
                `retain ${debugNameFor(
                    item
                )} incremented; refcount ${refcount} -> ${newRefcount}`
            );
    }
    refcountMap[item.$__id] = newRefcount;
}

/**
 * Release a calculation (decrease the refcount). If the refcount reaches zero, the calculation will be garbage
 * collected.
 */
export function release(item: GraphNode) {
    const refcount = refcountMap[item.$__id] ?? 0;
    const newRefcount = Math.min(refcount - 1, 0);
    if (refcount < 1) {
        log.error(
            `release called on unretained item ${debugNameFor(item)}`,
            item
        );
    }
    if (newRefcount < 1) {
        DEBUG &&
            log.debug(
                `release ${debugNameFor(
                    item
                )} released; refcount ${refcount} -> ${newRefcount}`
            );
        globalDependencyGraph.release(item);
    } else {
        DEBUG &&
            log.debug(
                `release ${debugNameFor(
                    item
                )} decremented; refcount ${refcount} -> ${newRefcount}`
            );
    }
    refcountMap[item.$__id] = newRefcount;
}

/**
 * Return a graphviz formatted directed graph
 */
export function debug(activeItem?: any): string {
    return globalDependencyGraph.graphviz((id, item) => {
        let subgraph: object | undefined = undefined;
        if (isModel(item)) {
            subgraph = item;
        }
        if (isCollection(item)) {
            subgraph = item;
        }
        if (isModelField(item)) {
            subgraph = item.model;
        }
        if (isSubscription(item)) {
            subgraph = item.item;
        }
        return {
            label: `${id}\n${debugNameFor(item)}`,
            subgraph,
            penwidth: activeItem === item ? '5.0' : '1.0',
        };
    });
}

export function debugState() {
    return {
        globalDependencyGraph,
        activeCalculations,
        refcountMap,
        needsFlush,
        flushPromise,
        resolveFlushPromise,
        subscribeListener,
    };
}

export function debugSubscribe(
    callback: ((graphviz: string, detail: string) => void) | null
) {
    debugSubscription = callback;
}
