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
    computationToInvalidationMap = new Map();

    globalDependencyGraph = new DAG();
}

export function model<T extends {}>(obj: T): TrackedModel<T> {
    if (typeof obj !== 'object' || !obj) {
        throw new InvariantError('model must be provided an object');
    }

    const fields: Map<string | symbol, ModelField<T>> = new Map();

    const proxy = new Proxy(obj, {
        get(target: any, key: string | symbol) {
            if (key === ReviseSymbol) {
                return 'model';
            }
            let field = fields.get(key);
            if (!field) {
                field = {
                    model: proxy,
                    key,
                };
                fields.set(key, field);
            }
            processDependency(field);
            return target[key];
        },

        set(target: any, key, value: any) {
            let field = fields.get(key);
            if (!field) {
                field = {
                    model: proxy,
                    key,
                };
                fields.set(key, field);
            }
            processChange(field);
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

export function computation<Param, Ret>(
    func: () => Ret
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

    garbageCollect();
}

function garbageCollect() {
    // TODO: implement correctly
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
