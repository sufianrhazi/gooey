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
}
