import {
    ReviseSymbol,
    InvariantError,
    TrackedComputation,
    TrackedModel,
    ModelField,
    isTrackedComputation,
} from './types';
import { DAG } from './dag';
export { React } from './view';

export { InvariantError, TrackedComputation, TrackedModel } from './types';

export const version = '0.0.1';

let activeComputations: TrackedComputation<unknown>[] = [];
let computationToInvalidationMap: Map<
    TrackedComputation<unknown>,
    Function
> = new Map();
let rootComputations: TrackedComputation<unknown>[] = [];

let partialDag = new DAG<
    TrackedComputation<unknown> | ModelField<unknown>,
    TrackedComputation<unknown>
>();
let globalDependencyGraph = new DAG<
    TrackedComputation<unknown> | ModelField<unknown>,
    TrackedComputation<unknown>
>();

export function reset() {
    partialDag = new DAG();
    activeComputations = [];
    rootComputations = [];
    computationToInvalidationMap = new Map();

    globalDependencyGraph = new DAG();
}

export function model<T extends {}>(obj: T): TrackedModel<T> {
    if (typeof obj !== 'object' || !obj) {
        throw new InvariantError('model must be provided an object');
    }

    const fields: Record<string | symbol, ModelField<T>> = {};

    const proxy = new Proxy(obj, {
        get(target: any, key: string | symbol) {
            if (key === ReviseSymbol) {
                return 'model';
            }
            if (!fields[key]) {
                fields[key] = {
                    model: proxy,
                    key,
                };
            }
            processDependency(fields[key]);
            return target[key];
        },

        set(target: any, key, value: any) {
            if (!fields[key]) {
                fields[key] = {
                    model: proxy,
                    key,
                };
            }
            processChange(fields[key]);
            return (target[key] = value);
        },
    }) as TrackedModel<T>;

    return proxy;
}

export function collection<T>(array: T[]): TrackedModel<T[]> {
    if (!Array.isArray(array)) {
        throw new InvariantError('collection must be provided an array');
    }

    return model(array);
}

export function rootComputation<Param, Ret>(
    func: () => Ret
): TrackedComputation<Ret> {
    return makeComputation(func, true);
}

export function computation<Param, Ret>(
    func: () => Ret
): TrackedComputation<Ret> {
    return makeComputation(func, false);
}

function makeComputation<Param, Ret>(
    func: () => Ret,
    isRoot: boolean
): TrackedComputation<Ret> {
    if (typeof func !== 'function') {
        throw new InvariantError('computation must be provided a function');
    }

    let result: { result: Ret } | undefined = undefined;

    const invalidate = () => {
        result = undefined;
    };

    const trackedComputation: TrackedComputation<Ret> = Object.assign(
        function runComputation() {
            processDependency(trackedComputation);

            if (result) {
                return result.result;
            }

            const edgesToRemove: [
                TrackedComputation<any> | ModelField<any>,
                TrackedComputation<any>
            ][] = globalDependencyGraph
                .getReverseDependencies(trackedComputation)
                .map((fromNode) => [fromNode, trackedComputation]);
            globalDependencyGraph.removeEdges(edgesToRemove);

            activeComputations.push(trackedComputation);
            result = { result: func() };

            const sanityCheck = activeComputations.pop();
            if (sanityCheck !== trackedComputation) {
                throw new InvariantError(
                    'Active computation stack inconsistency!'
                );
            }
            return result.result;
        },
        { [ReviseSymbol]: 'computation' as const }
    );

    computationToInvalidationMap.set(trackedComputation, invalidate);
    if (isRoot) {
        rootComputations.push(trackedComputation);
    }

    return trackedComputation;
}

function processDependency<T, Ret>(
    item: TrackedComputation<Ret> | ModelField<T>
) {
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

function processChange<T>(item: ModelField<T>) {
    const addNode = (node: TrackedComputation<unknown> | ModelField<T>) => {
        partialDag.addNode(node);
        const dependencies = globalDependencyGraph.getDependencies(node);
        dependencies.forEach((dependentItem) => {
            if (!partialDag.hasNode(dependentItem)) {
                addNode(dependentItem);
            }
            partialDag.addEdge(node, dependentItem);
        });
    };
    addNode(item);
}

// build_partial_DAG
export function flush() {
    const partialTopo = partialDag.topologicalSort();
    partialDag = new DAG();
    partialTopo.forEach((item) => {
        if (isTrackedComputation(item)) {
            const invalidation = computationToInvalidationMap.get(item);
            if (invalidation) {
                invalidation();
            }
            item();
        }
    });

    //garbageCollect();
}

function garbageCollect() {
    const unreachable =
        globalDependencyGraph.getUnreachableReverse(rootComputations);
    globalDependencyGraph.removeNodes(unreachable);
}

export function debug(): string {
    return globalDependencyGraph.graphviz((id, item) => {
        if (isTrackedComputation(item)) {
            return `comp\n${id}`;
        } else {
            return `model\n${id}`;
        }
    });
}
