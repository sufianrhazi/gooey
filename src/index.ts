import * as toposort from 'toposort';

export const version = '0.0.1';

export class InvariantError extends Error {}

type SourceItem = {
    type: 'model';
    model: any;
    key: string | symbol;
};

type ComputationItem = {
    type: 'computation';
    computation: () => any;
    invalidate: () => void;
};

type Item = SourceItem | ComputationItem;

let id = 0;
const modelIdMap = new WeakMap<any, number>();
const symbolIdMap = new Map<symbol, number>();
const computationIdMap = new Map<Function, number>();
const getItemId = (item: Item) => {
    if (item.type === 'model') {
        let modelId = modelIdMap.get(item.model);
        if (modelId === undefined) {
            throw new Error('Consistency error: unknown modelId');
        }
        if (typeof item.key === 'symbol') {
            let symbolId = symbolIdMap.get(item.key);
            if (symbolId === undefined) {
                symbolId = id++;
                symbolIdMap.set(item.key, symbolId);
            }
            return `model:${modelId}:symbol:${symbolId}`;
        }
        return `model:${modelId}:field:${item.key}`;
    }

    const computationId = computationIdMap.get(item.computation);
    if (computationId === undefined) {
        throw new Error('Consistency error: unknown computationId');
    }
    return `computation:${computationId}`;
};

let changes: SourceItem[] = [];
let activeComputations: ComputationItem[] = [];

class DAG {
    public nodes: Record<string, Item>;
    public edges: [string, string][];
    public edgeMap: Record<string, Record<string, true>>;
    public reverseEdgeMap: Record<string, Record<string, true>>;

    constructor() {
        this.nodes = {};
        this.edges = [];
        this.edgeMap = {};
        this.reverseEdgeMap = {};
    }

    addNode(node: Item) {
        const itemId = getItemId(node);
        if (!this.nodes[itemId]) {
            this.nodes[itemId] = node;
        }
    }

    hasNode(node: Item) {
        return !!this.nodes[getItemId(node)];
    }

    /**
     * Indicate that toNode needs to be updated if fromNode has changed
     *
     * TODO: can toNode be changed to ComputationItem?
     */
    addEdge(fromNode: Item, toNode: Item) {
        const fromId = getItemId(fromNode);
        const toId = getItemId(toNode);
        if (!this.edgeMap[fromId]) {
            this.edgeMap[fromId] = {};
        }
        if (this.edgeMap[fromId][toId]) {
            // already exists
            return;
        }
        this.edgeMap[fromId][toId] = true;
        this.edges.push([fromId, toId]);

        // upkeeping
        if (!this.reverseEdgeMap[toId]) {
            this.reverseEdgeMap[toId] = {};
        }
        this.reverseEdgeMap[toId][fromId] = true;
    }

    /**
     * Indicate that toNode no longer needs to be updated if any of the fromNodes have changed
     */
    removeFromEdges(fromNodes: Item[], toNode: Item) {
        const toId = getItemId(toNode);
        const fromIds: Record<string, true> = {};
        fromNodes.forEach((fromNode) => {
            const fromId = getItemId(fromNode);
            fromIds[fromId] = true;

            delete this.edgeMap[fromId][toId];
            delete this.reverseEdgeMap[toId][fromId];
        });
        this.edges = this.edges.filter(([a, b]) => !(b === toId && fromIds[a]));
    }

    /**
     * Get list of things need to be updated, when fromNode has changed?
     */
    getDependencies(fromNode: Item): Item[] {
        const fromId = getItemId(fromNode);
        if (!this.edgeMap[fromId]) {
            return [];
        }
        return Object.keys(this.edgeMap[fromId]).map(
            (toId) => this.nodes[toId]
        );
    }

    /**
     * Get list of things that cause toNode to updated
     */
    getReverseDependencies(toNode: Item): Item[] {
        const toId = getItemId(toNode);
        if (!this.reverseEdgeMap[toId]) {
            return [];
        }
        return Object.keys(this.reverseEdgeMap[toId]).map(
            (toId) => this.nodes[toId]
        );
    }

    topologicalSort(): Item[] {
        return toposort(this.edges).map((itemId) => this.nodes[itemId]);
    }
}

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

    modelIdMap.set(proxy, id++);

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

    computationIdMap.set(computation, id++);

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
