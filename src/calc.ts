import {
    Calculation,
    CalculationRecalculateTag,
    CalculationMarkCycleTag,
    CalculationTypeTag,
    DAGNode,
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
import { DAG } from './dag';
import { alwaysTrue, noop, strictEqual, uniqueid } from './util';
import { clearNames, debugNameFor, name } from './debug';

let activeCalculations: (null | Calculation<any>)[] = [];

let globalDependencyGraph = new DAG<DAGNode>();

let refcountMap: Record<string, number> = {};

/**
 * Reset all data to a clean slate.
 */
export function reset() {
    activeCalculations = [];

    globalDependencyGraph = new DAG();
    refcountMap = {};
    clearNames();
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
    return calculation;
}

export function untracked<TRet>(func: () => TRet): TRet {
    activeCalculations.push(null);
    const result = func();
    activeCalculations.pop();
    return result;
}

enum CalculationState {
    STATE_FLUSHED,
    STATE_TRACKING,
    STATE_CACHED,
    STATE_CYCLE,
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
    // States:
    // - flushed (initial) -- no cached value, not cycled
    // - tracking (transitory) -- currently being called (tracking dependencies)
    // - cached -- finished call, return value cached
    // - cycle -- error state; cycle is detected
    //
    // digraph state {
    //     node [style="filled",fillcolor="#eeeeee",fontname="Helvetica"];
    //     edge [fontname="Helvetica"];
    //     fontname="Helvetica";
    //
    //     flushed [peripheries="2"];
    //     tracking [style="filled",fillcolor="#444444",fontcolor="white"];
    //     cached;
    //     exception [shape="polygon",sides="8",fillcolor="#ffdddd"];
    //     cycle [style="filled",fillcolor="#ffdddd"];
    //
    //     flushed -> flushed [label="  flush"];
    //     flushed -> tracking [label="  call",tailport="w"];
    //     tracking -> cached [tailport="s",headport="w",label="call:return"];
    //     cached -> flushed [label="  flush"];
    //     tracking -> cycle [tailport="sw",headport="w",label="recurse"];
    //     cycle -> flushed [label="  flush"];
    //     cached -> cycle [label="cycle dep"];
    //     cycle -> exception [label="call"];
    //     tracking -> exception [label="flush",tailport="w"];
    // }
    //
    //
    // Events:
    // - calculation gets called:
    //   - flushed -> tracking -> cached
    //   - tracking -> cycle
    //   - cached -> cached
    //   - cycle -> throw Exception (cycle)
    // - calculation gets flushed:
    //   - flushed -> flushed
    //   - tracking -> throw Exception (invariant: cannot flush mid-call)
    //   - cached -> flushed
    //   - cycle -> flushed

    let cycleResult: { result: Ret } | undefined = undefined;
    let result: { result: Ret } | undefined = undefined;
    let state: CalculationState = CalculationState.STATE_FLUSHED;
    let cycleHandler: (() => Ret) | undefined = undefined;

    const calculation: Calculation<Ret> = Object.assign(calculationBody, {
        $__id: uniqueid(),
        [TypeTag]: 'calculation' as const,
        [CalculationTypeTag]: isEffect
            ? ('effect' as const)
            : ('calculation' as const),
        [CalculationMarkCycleTag]: calculationMarkCycle,
        [CalculationRecalculateTag]: calculationRecalculate,
        flush: calculationFlush,
        onCycle: calculationOnCycle,
    });

    globalDependencyGraph.addNode(calculation);

    function calculationBody() {
        if (!isEffect) {
            // effects return void, so they **cannot** have an effect on the current calculation
            addDepToCurrentCalculation(calculation);
        }

        switch (state) {
            case CalculationState.STATE_FLUSHED:
                globalDependencyGraph.removeIncoming(calculation);
                state = CalculationState.STATE_TRACKING;
                activeCalculations.push(calculation);
                try {
                    result = { result: calculationFunc() };
                } catch (e) {
                    log.assert(
                        activeCalculations.pop() === calculation,
                        'calculation stack inconsistency'
                    );
                    if (e instanceof CycleAbortError) {
                        state = CalculationState.STATE_CYCLE;
                        if (cycleHandler && !cycleResult) {
                            cycleResult = { result: cycleHandler() };
                        }
                        if (cycleResult && activeCalculations.length === 0) {
                            return cycleResult.result;
                        }
                        throw e;
                    } else {
                        state = CalculationState.STATE_FLUSHED;
                    }
                    throw e;
                }
                state = CalculationState.STATE_CACHED;
                log.assert(
                    activeCalculations.pop() === calculation,
                    'calculation stack inconsistency'
                );
                break;
            case CalculationState.STATE_TRACKING:
                state = CalculationState.STATE_CYCLE;
                if (cycleHandler && !cycleResult) {
                    cycleResult = { result: cycleHandler() };
                }
                throw new CycleAbortError(
                    'Cycle reached: calculation processing reached itself'
                );
                break;
            case CalculationState.STATE_CACHED:
                log.assert(result, 'cached calculation missing result');
                return result.result;
            case CalculationState.STATE_CYCLE:
                if (cycleResult) {
                    return cycleResult.result;
                }
                throw new CycleAbortError(
                    'Cycle reached: calculation is part of a cycle'
                );
                break;
            default:
                log.assertExhausted(state, 'Unexpected calculation state');
        }

        return result.result;
    }

    function calculationFlush() {
        const priorResult = result?.result;
        switch (state) {
            case CalculationState.STATE_FLUSHED:
                break;
            case CalculationState.STATE_TRACKING:
                throw new InvariantError(
                    'Cannot flush calculation while it is being calculated'
                );
                break;
            case CalculationState.STATE_CACHED:
                cycleResult = undefined;
                result = undefined;
                state = CalculationState.STATE_FLUSHED;
                break;
            case CalculationState.STATE_CYCLE:
                cycleResult = undefined;
                result = undefined;
                state = CalculationState.STATE_FLUSHED;
                // TODO: maybe: tell the DAG to flush cycles?
                break;
            default:
                log.assertExhausted(state, 'Unexpected calculation state');
        }
        return priorResult;
    }

    function calculationMarkCycle() {
        switch (state) {
            case CalculationState.STATE_TRACKING:
                throw new InvariantError(
                    'Cannot mark calculation as being a cycle while it is being calculated'
                );
                break;
            case CalculationState.STATE_FLUSHED:
            case CalculationState.STATE_CACHED:
            case CalculationState.STATE_CYCLE:
                result = undefined;
                state = CalculationState.STATE_CYCLE;
                break;
            default:
                log.assertExhausted(state, 'Unexpected calculation state');
        }
    }

    function calculationRecalculate() {
        switch (state) {
            case CalculationState.STATE_TRACKING:
                throw new InvariantError(
                    'Cannot recalculate calculation while it is being calculated'
                );
                break;
            case CalculationState.STATE_FLUSHED:
                calculationBody();
                return false;
            case CalculationState.STATE_CACHED:
            case CalculationState.STATE_CYCLE: {
                const priorResult = result;
                calculationFlush();
                result = { result: calculationBody() };
                if (priorResult && isEqual(priorResult.result, result.result)) {
                    result = priorResult;
                    return true;
                }
                return false;
            }
            default:
                log.assertExhausted(state, 'Unexpected calculation state');
        }
    }

    function calculationOnCycle(handler: () => Ret) {
        cycleHandler = handler;
        return calculation;
    }

    return calculation;
}

export function addDepToCurrentCalculation(item: DAGNode) {
    const dependentCalculation =
        activeCalculations[activeCalculations.length - 1];
    if (dependentCalculation) {
        globalDependencyGraph.addNode(item);
        if (!globalDependencyGraph.hasNode(dependentCalculation)) {
            globalDependencyGraph.addNode(dependentCalculation);
        }
        globalDependencyGraph.addEdge(
            item,
            dependentCalculation,
            DAG.EDGE_HARD
        );
        DEBUG &&
            log.debug(
                'New global dependency',
                debugNameFor(item),
                '->',
                debugNameFor(dependentCalculation)
            );
    }
}

export function addManualDep(fromNode: DAGNode, toNode: DAGNode) {
    globalDependencyGraph.addNode(fromNode);
    globalDependencyGraph.addNode(toNode);
    globalDependencyGraph.addEdge(fromNode, toNode, DAG.EDGE_HARD);
    DEBUG &&
        log.debug(
            'New manual dependency',
            debugNameFor(fromNode),
            '->',
            debugNameFor(toNode)
        );
}

export function registerNode(node: DAGNode) {
    globalDependencyGraph.addNode(node);
}

export function addOrderingDep(fromNode: DAGNode, toNode: DAGNode) {
    globalDependencyGraph.addEdge(fromNode, toNode, DAG.EDGE_SOFT);
    DEBUG &&
        log.debug(
            'New manual ordering dependency',
            debugNameFor(fromNode),
            '->',
            debugNameFor(toNode)
        );
}

export function removeManualDep(fromNode: DAGNode, toNode: DAGNode) {
    if (globalDependencyGraph.removeEdge(fromNode, toNode, DAG.EDGE_HARD)) {
        DEBUG &&
            log.debug(
                'Removed manual dependency',
                debugNameFor(fromNode),
                '->',
                debugNameFor(toNode)
            );
    }
}

export function removeOrderingDep(fromNode: DAGNode, toNode: DAGNode) {
    if (globalDependencyGraph.removeEdge(fromNode, toNode, DAG.EDGE_SOFT)) {
        DEBUG &&
            log.debug(
                'Removed manual ordering dependency',
                debugNameFor(fromNode),
                '->',
                debugNameFor(toNode)
            );
    }
}

export function processChange(item: DAGNode) {
    globalDependencyGraph.addNode(item);
    const hardEdges = globalDependencyGraph.getDependencies(
        item,
        DAG.EDGE_HARD
    );
    if (hardEdges.length > 0) {
        const marked = globalDependencyGraph.markNodeDirty(item);
        DEBUG && log.debug('processChange', item, marked ? 'fresh' : 'stale');
        scheduleFlush();
    }
}

type Listener = () => void;
let needsFlush = false;
let flushPromise: Promise<void> = Promise.resolve();
let resolveFlushPromise: () => void = noop;
let subscribeListener: Listener = () => setTimeout(() => flush(), 0);

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

    DEBUG && debugSubscription && debugSubscription(debug(), '0: flush start');

    // Then flush dependencies in topological order
    globalDependencyGraph.process((connectedItems) => {
        if (connectedItems.length === 1) {
            const item = connectedItems[0];
            let isEqual = false;
            if (isCalculation(item)) {
                isEqual = item[CalculationRecalculateTag]();
                DEBUG &&
                    log.debug(
                        'flushing calculation',
                        debugNameFor(item),
                        `isEqual=${isEqual}`
                    );
            } else if (isCollection(item)) {
                isEqual = item[FlushKey]();
                DEBUG &&
                    log.debug(
                        'flushing collection',
                        debugNameFor(item),
                        `isEqual=${isEqual}`
                    );
            } else if (isModel(item)) {
                isEqual = item[FlushKey]();
                DEBUG &&
                    log.debug(
                        'flushing model',
                        debugNameFor(item),
                        `isEqual=${isEqual}`
                    );
            } else if (isSubscription(item)) {
                isEqual = item[FlushKey]();
                DEBUG &&
                    log.debug(
                        'flushing subscription',
                        debugNameFor(item),
                        `isEqual=${isEqual}`
                    );
            } else {
                DEBUG && log.debug('flushing other', debugNameFor(item));
            }

            DEBUG &&
                debugSubscription &&
                debugSubscription(
                    debug(item),
                    `1: visited ${debugNameFor(item)}: isEqual=${isEqual}`
                );
            return isEqual;
        } else {
            // Of all of the types that can be in a cycle, only calculations
            // matter as they have dynamic dependencies. Everything else should
            // not be able to alter its set of dependencies on execution.
            const isEqualList = connectedItems.map((item) => {
                if (isCalculation(item)) {
                    DEBUG &&
                        log.debug(
                            'flushing calculation in a cycle',
                            debugNameFor(item)
                        );
                    item[CalculationMarkCycleTag]();
                    return true; // If a calculation is in a cycle, it shouldn't propagate its dirtyness; TODO: confirm this is true
                } else if (isCollection(item)) {
                    DEBUG &&
                        log.debug(
                            'flushing collection in a cycle',
                            debugNameFor(item)
                        );
                    return item[FlushKey]();
                } else if (isModel(item)) {
                    DEBUG &&
                        log.debug(
                            'flushing model in a cycle',
                            debugNameFor(item)
                        );
                    return item[FlushKey]();
                } else if (isSubscription(item)) {
                    DEBUG &&
                        log.debug(
                            'flushing subscription in a cycle',
                            debugNameFor(item)
                        );
                    return item[FlushKey]();
                } else {
                    DEBUG &&
                        log.debug(
                            'flushing other in a cycle',
                            debugNameFor(item)
                        );
                    return true;
                }
            });
            return isEqualList.every((isEqual) => isEqual);
        }
    });

    if (globalDependencyGraph.hasDirtyNodes()) {
        DEBUG && log.debug('DAG contained dirty nodes post-flush');
        scheduleFlush();
    }

    DEBUG && debugSubscription && debugSubscription(debug(), `2: after visit`);

    resolveFlushPromise();
}

/**
 * Retain a calculation (increase the refcount)
 */
export function retain(item: DAGNode) {
    const refcount = refcountMap[item.$__id] ?? 0;
    const newRefcount = refcount + 1;
    if (refcount === 0) {
        DEBUG &&
            log.debug(
                `retain ${debugNameFor(
                    item
                )} retained; refcount ${refcount} -> ${newRefcount}`
            );
        if (!globalDependencyGraph.hasNode(item)) {
            globalDependencyGraph.addNode(item);
        }
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
export function release(item: DAGNode) {
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
