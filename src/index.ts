import { InvariantError, Item, SourceItem, ComputationItem } from './types';
import { getItemId, registerItem } from './idreg';
import { DAG } from './dag';

export const version = '0.0.1';

let activeComputations: ComputationItem[] = [];
let computationToInvalidationMap: Map<Function, Function> = new Map();
let rootComputations: ComputationItem[] = [];

let partialDag = new DAG();
let globalDependencyGraph = new DAG();

export function reset() {
    partialDag = new DAG();
    activeComputations = [];
    rootComputations = [];
    computationToInvalidationMap = new Map();

    globalDependencyGraph = new DAG();
}

export function model<T extends {}>(obj: T): T {
    if (typeof obj !== 'object' || !obj) {
        throw new InvariantError('model must be provided an object');
    }

    const proxy = new Proxy(obj, {
        get(target: any, key) {
            const currentItem: SourceItem = {
                type: 'model',
                model: proxy,
                key,
            };
            processDependency(currentItem);
            return target[key];
        },

        set(target: any, key, value: any) {
            // Note: in tup, we should just add to a list of "changed items"
            const currentItem: SourceItem = {
                type: 'model',
                model: proxy,
                key,
            };
            processChange(currentItem);
            return (target[key] = value);
        },
    });

    registerItem(proxy);

    return proxy;
}

export function collection<T>(array: T[]): T[] {
    if (!Array.isArray(array)) {
        throw new InvariantError('collection must be provided an array');
    }

    return model(array);
}

export function rootComputation<Param, Ret>(func: () => Ret): typeof func {
    return makeComputation(func, true);
}

export function computation<Param, Ret>(func: () => Ret): typeof func {
    return makeComputation(func, false);
}

function makeComputation<Param, Ret>(
    func: () => Ret,
    isRoot: boolean
): typeof func {
    if (typeof func !== 'function') {
        throw new InvariantError('computation must be provided a function');
    }

    let result: { result: Ret } | undefined = undefined;

    const invalidate = () => {
        result = undefined;
    };

    const computationItem: ComputationItem = {
        type: 'computation',
        computation: runComputation,
    };

    function runComputation() {
        processDependency(computationItem);

        if (result) {
            return result.result;
        }

        const edgesToRemove: [Item, Item][] = globalDependencyGraph
            .getReverseDependencies(computationItem)
            .map((fromNode) => [fromNode, computationItem]);
        globalDependencyGraph.removeEdges(edgesToRemove);

        activeComputations.push(computationItem);
        result = { result: func() };

        const sanityCheck = activeComputations.pop();
        if (sanityCheck !== computationItem) {
            throw new InvariantError('Active computation stack inconsistency!');
        }
        return result.result;
    }

    registerItem(runComputation);
    computationToInvalidationMap.set(runComputation, invalidate);
    if (isRoot) {
        rootComputations.push(computationItem);
    }

    return runComputation;
}

function processDependency(item: Item) {
    const dependentComputation =
        activeComputations[activeComputations.length - 1];
    if (dependentComputation) {
        globalDependencyGraph.addNode(item);
        if (!globalDependencyGraph.hasNode(dependentComputation)) {
            globalDependencyGraph.addNode(dependentComputation);
        }
        globalDependencyGraph.addEdge(item, dependentComputation); // Confirmed this is correct
    }
}

function processChange(item: Item) {
    const addNode = (item: Item) => {
        partialDag.addNode(item);
        const dependencies = globalDependencyGraph.getDependencies(item);
        dependencies.forEach((dependentItem) => {
            if (!partialDag.hasNode(dependentItem)) {
                addNode(dependentItem);
            }
            partialDag.addEdge(item, dependentItem);
        });
    };
    addNode(item);
}

// build_partial_DAG
export function flush() {
    const partialTopo = partialDag.topologicalSort();
    partialDag = new DAG();
    partialTopo.forEach((item) => {
        if (item.type === 'computation') {
            const invalidation = computationToInvalidationMap.get(
                item.computation
            );
            if (invalidation) {
                invalidation();
            }
            item.computation();
        }
    });

    garbageCollect();
}

function garbageCollect() {
    const unreachable =
        globalDependencyGraph.getUnreachableReverse(rootComputations);
    globalDependencyGraph.removeNodes(unreachable);
}
