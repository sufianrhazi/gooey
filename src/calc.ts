import {
    InvariantError,
    Calculation,
    Collection,
    ModelField,
    isCalculation,
    makeCalculation,
    makeEffect,
} from './types';
import * as log from './log';
import { DAG } from './dag';
import { clearNames, debugNameFor, name } from './debug';

let activeCalculations: Calculation<unknown>[] = [];
let calculationToInvalidationMap: Map<
    Calculation<unknown>,
    Function
> = new Map();

let partialDag = new DAG<
    Collection<unknown> | Calculation<unknown> | ModelField<unknown>
>();
let globalDependencyGraph = new DAG<
    Collection<unknown> | Calculation<unknown> | ModelField<unknown>
>();

let refcountMap: WeakMap<Calculation<any> | Collection<any>, number> =
    new WeakMap();

/**
 * Reset all data to a clean slate.
 */
export function reset() {
    partialDag = new DAG();
    activeCalculations = [];
    calculationToInvalidationMap = new Map();

    globalDependencyGraph = new DAG();
    refcountMap = new WeakMap();
    clearNames();
}

/**
 * Create a calculation cell: while the provided function is executed, all dependencies are tracked.
 *
 * The provided function will be recalculated when any of those dependencies are changed. The result of this function is
 * treated as a dependency, so if recalculations change the result, any dependent calculations are recalculated.
 */
export function calc<Ret>(
    func: () => Ret,
    debugName?: string
): Calculation<Ret> {
    const calculation = trackCalculation(func, false);
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
    const calculation = trackCalculation(func, true);
    if (debugName) name(calculation, debugName);
    return calculation;
}

function trackCalculation<Ret>(
    func: () => Ret,
    isEffect: boolean
): Calculation<Ret> {
    if (typeof func !== 'function') {
        throw new InvariantError('calculation must be provided a function');
    }

    let result: { result: Ret } | undefined = undefined;

    const invalidate = () => {
        result = undefined;
    };

    const trackedCalculation = (isEffect ? makeEffect : makeCalculation)(
        function runCalculation() {
            if (!isEffect) {
                // effects return void, so they **cannot** have an effect on the current calculation
                addDepToCurrentCalculation(trackedCalculation);
            }

            if (result) {
                return result.result;
            }

            const edgesToRemove: [
                Collection<any> | Calculation<any> | ModelField<any>,
                Calculation<any>
            ][] = globalDependencyGraph
                .getReverseDependencies(trackedCalculation)
                .map((fromNode) => {
                    return [fromNode, trackedCalculation];
                });
            globalDependencyGraph.removeEdges(edgesToRemove);

            activeCalculations.push(trackedCalculation);
            result = { result: func() };

            const sanityCheck = activeCalculations.pop();
            if (sanityCheck !== trackedCalculation) {
                throw new InvariantError(
                    'Active calculation stack inconsistency!'
                );
            }
            return result.result;
        }
    );

    globalDependencyGraph.addNode(trackedCalculation);

    calculationToInvalidationMap.set(trackedCalculation, invalidate);

    // Note: typescript gets confused, this *should* be
    // - Calculation<Ret> when isEffect is true and
    // - Calculation<Ret> when isEffect is false
    // But infers to Calculation<void> because makeEffect is present
    return trackedCalculation as Calculation<Ret>;
}

export function addDepToCurrentCalculation<T, Ret>(
    item: Calculation<Ret> | ModelField<T>
) {
    const dependentCalculation =
        activeCalculations[activeCalculations.length - 1];
    if (dependentCalculation) {
        globalDependencyGraph.addNode(item);
        if (!globalDependencyGraph.hasNode(dependentCalculation)) {
            globalDependencyGraph.addNode(dependentCalculation);
        }
        // Confirmed this is correct
        if (globalDependencyGraph.addEdge(item, dependentCalculation)) {
            log.debug(
                'New global dependency',
                debugNameFor(item),
                '->',
                debugNameFor(dependentCalculation)
            );
        }
    }
}

export function addCollectionDep<T, V>(
    fromNode: Collection<T>,
    toNode: Collection<V> | ModelField<V>
) {
    globalDependencyGraph.addNode(fromNode);
    globalDependencyGraph.addNode(toNode);
    // Confirmed this is correct
    if (globalDependencyGraph.addEdge(fromNode, toNode)) {
        log.debug(
            'New global collection dependency',
            debugNameFor(fromNode),
            '->',
            debugNameFor(toNode)
        );
    }
}

export function processChange(item: ModelField<unknown>) {
    const addNode = (
        node: Collection<unknown> | Calculation<unknown> | ModelField<unknown>
    ) => {
        partialDag.addNode(node);
        const dependencies = globalDependencyGraph.getDependencies(node);
        dependencies.forEach((dependentItem) => {
            if (!partialDag.hasNode(dependentItem)) {
                addNode(dependentItem);
            }
            if (partialDag.addEdge(node, dependentItem)) {
                log.debug(
                    'New local dependency',
                    debugNameFor(item),
                    '->',
                    debugNameFor(dependentItem)
                );
            }
            if (!needsFlush) {
                needsFlush = true;
                notify();
            }
        });
    };
    addNode(item);
}

type Listener = () => void;
let needsFlush = false;
let subscribeListener: Listener = () => setTimeout(() => flush(), 0);

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
export function subscribe(listener: Listener): void {
    subscribeListener = listener;
    if (needsFlush) {
        notify();
    }
}

function notify() {
    try {
        subscribeListener();
    } catch (e) {
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
    const oldPartialDag = partialDag;
    partialDag = new DAG();
    oldPartialDag.visitTopological((item) => {
        if (isCalculation(item)) {
            log.debug('flushing calculation', debugNameFor(item));
            const invalidation = calculationToInvalidationMap.get(item);
            if (invalidation) {
                invalidation();
            }
            item();
        } else {
            log.debug('flushing model', debugNameFor(item));
        }
    });
    globalDependencyGraph.garbageCollect().forEach((item) => {
        if (isCalculation(item)) {
            log.debug('GC calculation', debugNameFor(item));
        } else {
            log.debug('GC model', debugNameFor(item));
        }
    });
}

/**
 * Retain a calculation (increase the refcount)
 */
export function retain(item: Calculation<any> | Collection<any>) {
    const refcount = refcountMap.get(item) ?? 0;
    const newRefcount = refcount + 1;
    if (refcount === 0) {
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
        log.debug(
            `retain ${debugNameFor(
                item
            )} incremented; refcount ${refcount} -> ${newRefcount}`
        );
    }
    refcountMap.set(item, newRefcount);
}

/**
 * Release a calculation (decrease the refcount). If the refcount reaches zero, the calculation will be garbage
 * collected.
 */
export function release(item: Calculation<any> | Collection<any>) {
    const refcount = refcountMap.get(item) ?? 0;
    const newRefcount = Math.min(refcount - 1, 0);
    if (refcount < 1) {
        log.error(
            `release called on unretained item ${debugNameFor(item)}`,
            item
        );
    }
    if (newRefcount < 1) {
        log.debug(
            `release ${debugNameFor(
                item
            )} released; refcount ${refcount} -> ${newRefcount}`
        );
        globalDependencyGraph.release(item);
    } else {
        log.debug(
            `release ${debugNameFor(
                item
            )} decremented; refcount ${refcount} -> ${newRefcount}`
        );
    }
    refcountMap.set(item, newRefcount);
}

/**
 * Return a graphviz formatted directed graph
 */
export function debug(): string {
    return globalDependencyGraph.graphviz((id, item) => {
        return `${id}\n${debugNameFor(item)}`;
    });
}
