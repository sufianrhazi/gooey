import * as toposort from 'toposort';
import { Item, ComputationItem } from './types';
import { getItemId } from './idreg';

export class DAG {
    public nodes: Record<string, Item>;
    public edges: [string, string][];
    public edgeMap: Record<string, Record<string, ComputationItem>>;
    public reverseEdgeMap: Record<string, Record<string, Item>>;

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
     */
    addEdge(fromNode: Item, toNode: ComputationItem) {
        const fromId = getItemId(fromNode);
        const toId = getItemId(toNode);
        if (!this.edgeMap[fromId]) {
            this.edgeMap[fromId] = {};
        }
        if (this.edgeMap[fromId][toId]) {
            // already exists
            return;
        }
        this.edgeMap[fromId][toId] = toNode;
        this.edges.push([fromId, toId]);

        // upkeeping
        if (!this.reverseEdgeMap[toId]) {
            this.reverseEdgeMap[toId] = {};
        }
        this.reverseEdgeMap[toId][fromId] = fromNode;
    }

    removeEdges(edges: [Item, Item][]) {
        edges.forEach(([fromNode, toNode]) => {
            const fromId = getItemId(fromNode);
            const toId = getItemId(toNode);
            delete this.edgeMap[fromId][toId];
            delete this.reverseEdgeMap[toId][fromId];
        });
        this.edges = []; // TODO: make this faster
        Object.keys(this.edgeMap).forEach((fromId) => {
            Object.keys(this.edgeMap[fromId]).forEach((toId) => {
                this.edges.push([fromId, toId]);
            });
        });
    }

    /**
     * Get list of things need to be updated, when fromNode has changed?
     */
    getDependencies(fromNode: Item): ComputationItem[] {
        const fromId = getItemId(fromNode);
        if (!this.edgeMap[fromId]) {
            return [];
        }
        return Object.values(this.edgeMap[fromId]);
    }

    /**
     * Get list of things that cause toNode to updated
     */
    getReverseDependencies(toNode: Item): Item[] {
        const toId = getItemId(toNode);
        if (!this.reverseEdgeMap[toId]) {
            return [];
        }
        return Object.values(this.reverseEdgeMap[toId]);
    }

    topologicalSort(): Item[] {
        return toposort(this.edges).map((itemId) => this.nodes[itemId]);
    }

    getUnreachableReverse(rootItems: Item[]): Item[] {
        // mark and sweep
        //
        // Step one: visit all the items from rootItems
        const marked: Record<string, boolean> = {};
        const visit = (itemId: string) => {
            if (marked[itemId]) return;
            marked[itemId] = true;
            if (this.reverseEdgeMap[itemId]) {
                Object.keys(this.reverseEdgeMap[itemId]).forEach((toId) => {
                    visit(toId);
                });
            }
        };
        rootItems.forEach((rootItem) => {
            const itemId = getItemId(rootItem);
            visit(itemId);
        });

        // Step two: identify unreachable items
        const unreachable: Item[] = [];
        Object.keys(this.nodes).forEach((nodeId) => {
            if (!marked[nodeId]) {
                unreachable.push(this.nodes[nodeId]);
            }
        });
        return unreachable;
    }

    removeNodes(items: Item[]) {
        const itemIds: Record<string, boolean> = {};
        items.forEach((item) => (itemIds[getItemId(item)] = true));
        Object.keys(itemIds).forEach((itemId) => {
            delete this.nodes[itemId];
            const forwardEdgeMap = this.edgeMap[itemId];
            delete this.edgeMap[itemId];
            const reverseEdgeMap = this.reverseEdgeMap[itemId];
            delete this.reverseEdgeMap[itemId];
            if (forwardEdgeMap) {
                Object.keys(forwardEdgeMap).forEach(
                    (toId) => delete this.reverseEdgeMap[toId]
                );
            }
            if (reverseEdgeMap) {
                Object.keys(reverseEdgeMap).forEach(
                    (fromId) => delete this.edgeMap[fromId]
                );
            }
        });
        this.edges = []; // TODO: make this faster
        Object.keys(this.edgeMap).forEach((fromId) => {
            Object.keys(this.edgeMap[fromId]).forEach((toId) => {
                this.edges.push([fromId, toId]);
            });
        });
    }
}
