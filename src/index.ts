import {
    InvariantError,
    TrackedComputation,
    TrackedModel,
    ModelField,
    isTrackedComputation,
    isTrackedEffect,
    makeComputation,
    makeEffect,
} from './types';
import { DAG } from './dag';
export { React, mount } from './view';

export { InvariantError, TrackedComputation, TrackedModel } from './types';

export const version = '0.0.1';

let activeComputations: TrackedComputation<unknown>[] = [];
let computationToInvalidationMap: Map<
    TrackedComputation<unknown>,
    Function
> = new Map();
let nameMap: WeakMap<any, string> = new WeakMap();

let refcountMap: Map<TrackedComputation<unknown>, number> = new Map();

function debugNameFor(
    item: TrackedComputation<unknown> | ModelField<unknown>
): string {
    if (isTrackedComputation(item)) {
        return `${isTrackedEffect(item) ? 'eff' : 'comp'}:${
            nameMap.get(item) ?? '?'
        }`;
    }
    return `model:${nameMap.get(item.model) ?? '?'}:${String(item.key)}`;
}

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

    refcountMap = new Map();

    globalDependencyGraph = new DAG();
}

export function name<T>(item: T, name: string): T {
    nameMap.set(item, name);
    return item;
}

export function model<T extends {}>(obj: T): TrackedModel<T> {
    if (typeof obj !== 'object' || !obj) {
        throw new InvariantError('model must be provided an object');
    }

    const fields: Map<string | symbol, ModelField<T>> = new Map();

    const proxy = new Proxy(obj, {
        get(target: any, key: string | symbol) {
            let field = fields.get(key);
            if (!field) {
                field = {
                    model: proxy,
                    key,
                };
                fields.set(key, field);
            }
            addDepToCurrentComputation(field);
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
            target[key] = value;
            return true;
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

export function computation<Ret>(func: () => Ret): TrackedComputation<Ret> {
    return trackComputation(func, false);
}

export function effect(func: () => void): TrackedComputation<void> {
    return trackComputation(func, true);
}

function trackComputation<Ret>(
    func: () => Ret,
    isEffect: boolean
): TrackedComputation<Ret> {
    if (typeof func !== 'function') {
        throw new InvariantError('computation must be provided a function');
    }

    let result: { result: Ret } | undefined = undefined;

    const invalidate = () => {
        result = undefined;
    };

    const trackedComputation = (isEffect ? makeEffect : makeComputation)(
        function runComputation() {
            if (!isEffect) {
                // effects return void, so they **cannot** have an effect on the current computation
                addDepToCurrentComputation(trackedComputation);
            }

            if (result) {
                return result.result;
            }

            const edgesToRemove: [
                TrackedComputation<any> | ModelField<any>,
                TrackedComputation<any>
            ][] = globalDependencyGraph
                .getReverseDependencies(trackedComputation)
                .map((fromNode) => {
                    return [fromNode, trackedComputation];
                });
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
        }
    );

    computationToInvalidationMap.set(trackedComputation, invalidate);

    // Note: typescript gets confused, this *should* be
    // - TrackedComputation<Ret> when isEffect is true and
    // - TrackedComputation<Ret> when isEffect is false
    // But infers to TrackedComputation<void> because makeEffect is present
    return trackedComputation as TrackedComputation<Ret>;
}

function addDepToCurrentComputation<T, Ret>(
    item: TrackedComputation<Ret> | ModelField<T>
) {
    const dependentComputation =
        activeComputations[activeComputations.length - 1];
    if (dependentComputation) {
        globalDependencyGraph.addNode(item);
        if (!globalDependencyGraph.hasNode(dependentComputation)) {
            globalDependencyGraph.addNode(dependentComputation);
        }
        // Confirmed this is correct
        if (globalDependencyGraph.addEdge(item, dependentComputation)) {
            console.log(
                'New global dependency',
                debugNameFor(item),
                '->',
                debugNameFor(dependentComputation)
            );
        }
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
            if (partialDag.addEdge(node, dependentItem)) {
                console.log(
                    'New local dependency',
                    debugNameFor(item),
                    '->',
                    debugNameFor(dependentItem)
                );
            }
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
            console.log('flushing computation', debugNameFor(item));
            const invalidation = computationToInvalidationMap.get(item);
            if (invalidation) {
                invalidation();
            }
            item();
        } else {
            console.log('flushing model', debugNameFor(item));
        }
    });

    garbageCollect();
}

export function retain(item: TrackedComputation<any>) {
    refcountMap.set(item, (refcountMap.get(item) || 0) + 1);
}

export function release(item: TrackedComputation<any>) {
    const refCount = refcountMap.get(item);
    if (refCount && refCount > 1) {
        refcountMap.set(item, refCount - 1);
        return;
    }
    refcountMap.delete(item);
}

function garbageCollect() {
    const retained: TrackedComputation<unknown>[] = [];
    refcountMap.forEach((refCount, item) => {
        if (refCount > 0) {
            retained.push(item);
        }
    });
    globalDependencyGraph.removeExitsRetaining(retained);
    partialDag.removeExitsRetaining(retained);
}

export function debug(): string {
    return globalDependencyGraph.graphviz((id, item) => {
        return `${id}\n${debugNameFor(item)}`;
    });
}
