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
import { clearNames, debugNameFor } from './debug';

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

export function reset() {
    partialDag = new DAG();
    activeCalculations = [];
    calculationToInvalidationMap = new Map();

    globalDependencyGraph = new DAG();
    clearNames();
}

export function calc<Ret>(func: () => Ret): Calculation<Ret> {
    return trackCalculation(func, false);
}

export function effect(func: () => void): Calculation<void> {
    return trackCalculation(func, true);
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

const listeners: Set<Listener> = new Set();
export function subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

function notify() {
    listeners.forEach((listener) => {
        try {
            listener();
        } catch (e) {
            log.exception(e, 'unhandled exception in subscriber');
        }
    });
}

// build_partial_DAG
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

export function retain(item: Calculation<any> | Collection<any>) {
    log.debug('retain', debugNameFor(item));
    if (!globalDependencyGraph.hasNode(item)) {
        globalDependencyGraph.addNode(item);
    }
    globalDependencyGraph.retain(item);
}

export function release(item: Calculation<any> | Collection<any>) {
    log.debug('release', debugNameFor(item));
    globalDependencyGraph.release(item);

    // Can probably incrementally implement garbage collection via:
    //
    // Move retain/release into the DAG and
    // - ADD a -> b means a is retained
    // - DEL a -> b means a is released
}

export function debug(): string {
    return globalDependencyGraph.graphviz((id, item) => {
        return `${id}\n${debugNameFor(item)}`;
    });
}
