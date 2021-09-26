import { InvariantError, Item, SourceItem, ComputationItem } from './types';
import { registerItem } from './idreg';
import { DAG } from './dag';

export const version = '0.0.1';

let changes: SourceItem[] = [];
let activeComputations: ComputationItem[] = [];

const globalDag = new DAG();

export function model<T extends {}>(obj: T): T {
    if (typeof obj !== 'object' || !obj) {
        throw new InvariantError('model must be provided an object');
    }

    const proxy = new Proxy(obj, {
        get(target: any, key) {
            if (activeComputations.length > 0) {
                const currentItem: SourceItem = {
                    type: 'model',
                    model: proxy,
                    key,
                };
                const dependentComputation =
                    activeComputations[activeComputations.length - 1];
                globalDag.addNode(currentItem);
                globalDag.addEdge(currentItem, dependentComputation); // Confirmed this is correct
            }
            return target[key];
        },

        set(target: any, key, value: any) {
            // Note: in tup, we should just add to a list of "changed items"
            const currentItem: SourceItem = {
                type: 'model',
                model: proxy,
                key,
            };
            changes.push(currentItem);
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

export function computation<Param, Ret>(func: () => Ret): typeof func {
    if (typeof func !== 'function') {
        throw new InvariantError('computation must be provided a function');
    }

    let result: { result: Ret } | undefined = undefined;

    const invalidate = () => {
        result = undefined;
    };

    const computation = () => {
        const currentComputation: ComputationItem = {
            type: 'computation',
            computation,
            invalidate,
        };

        // Let's say this is the second time I've run
        //
        // The first time around,
        // - computationA calls computationB
        // - computationA reads modelA
        // - computationA reads modelB
        // - computationA calls computationC
        //
        // This means the graph looks like:
        // - computationB -> computationA
        // - modelA -> computationA
        // - modelB -> computationA
        // - computationC -> computationA
        //
        // However, if the second time this gets called,
        // - computationA calls computationB
        // - computationA reads modelB
        // - computationA reads modelC
        // - computationA calls computationD
        //
        // The graph should be updated to look like this:
        // - computationB -> computationA
        // - modelA -> computationA (removed)
        // - modelB -> computationA
        // - computationC -> computationA (removed)
        // - modelC -> computationA (added)
        // - computationD -> computationA (added)
        //
        // To do this, prior to touching the graph, we need to:
        // 1. For all the items that point to currentComputation, (causeUpdateDependencies)
        //    - remove (causeUpdateDependency -> currentComputation) from the DAG
        // 2. Perform the update
        //
        // That's it!

        globalDag.addNode(currentComputation);
        if (activeComputations.length > 0) {
            globalDag.addEdge(
                currentComputation,
                activeComputations[activeComputations.length - 1]
            ); // Confirmed this is correct
        }

        // We sadly *need* to do the above bookkeeping before reusing the prior value. Maybe there's a way to not do it?
        if (result) {
            return result.result;
        }

        const itemsThatWouldPreviouslyCauseThisComputation =
            globalDag.getReverseDependencies(currentComputation);
        globalDag.removeFromEdges(
            itemsThatWouldPreviouslyCauseThisComputation,
            currentComputation
        );

        activeComputations.push(currentComputation);
        result = { result: func() };
        const sanityCheck = activeComputations.pop();
        if (sanityCheck !== currentComputation) {
            throw new Error('Something weird happened!');
        }
        return result.result;
    };

    registerItem(computation);

    return computation;
}

// build_partial_DAG
export function flush() {
    const toProcess = changes;
    changes = [];

    const partialDag = new DAG();

    const addNode = (item: Item) => {
        partialDag.addNode(item);
        const dependencies = globalDag.getDependencies(item);
        dependencies.forEach((dependentItem) => {
            if (!partialDag.hasNode(dependentItem)) {
                addNode(dependentItem);
            }
            partialDag.addEdge(item, dependentItem);
        });
    };

    toProcess.forEach((item) => {
        addNode(item);
    });

    partialDag.topologicalSort().forEach((item) => {
        if (item.type === 'computation') {
            item.invalidate();
            item.computation();
        }
    });
}
