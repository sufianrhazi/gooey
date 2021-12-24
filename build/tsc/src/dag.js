import * as log from './log';
import { groupBy } from './util';
export class DAG {
    constructor() {
        Object.defineProperty(this, "nextId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "idMap", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "nodesSet", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "retained", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "dirtyNodes", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "graph", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "reverseGraph", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.nextId = 1;
        this.idMap = new WeakMap();
        this.nodesSet = {};
        this.retained = {};
        this.graph = {};
        this.reverseGraph = {};
        this.dirtyNodes = {};
    }
    getId(node) {
        let id = this.idMap.get(node);
        if (id === undefined) {
            id = this.nextId.toString();
            this.nextId += 1;
            this.idMap.set(node, id);
        }
        return id;
    }
    addNode(node) {
        const nodeId = this.getId(node);
        if (this.nodesSet[nodeId])
            return false;
        this.graph[nodeId] = {};
        this.reverseGraph[nodeId] = {};
        this.nodesSet[nodeId] = node;
        return true;
    }
    hasNode(node) {
        return !!this.nodesSet[this.getId(node)];
    }
    markNodeDirty(node) {
        const nodeId = this.getId(node);
        if (this.dirtyNodes[nodeId])
            return false;
        this.dirtyNodes[nodeId] = true;
        return true;
    }
    /**
     * Indicate that toNode needs to be updated if fromNode has changed
     *
     * Returns true if edge is added
     */
    addEdge(fromNode, toNode) {
        const fromId = this.getId(fromNode);
        const toId = this.getId(toNode);
        log.assert(!!this.nodesSet[fromId], 'cannot add edge from node that does not exist');
        log.assert(!!this.nodesSet[toId], 'cannot add edge to node that does not exist');
        this.graph[fromId][toId] = true;
        this.reverseGraph[toId][fromId] = true;
        return true;
    }
    /**
     * Returns true if edge is removed
     */
    removeEdge(fromNode, toNode) {
        const fromId = this.getId(fromNode);
        const toId = this.getId(toNode);
        if (!this.nodesSet[fromId])
            return false;
        if (!this.nodesSet[toId])
            return false;
        if (!this.graph[fromId][toId])
            return false;
        delete this.graph[fromId][toId];
        delete this.reverseGraph[toId][fromId];
        return true;
    }
    removeNodeInner(nodeId) {
        log.assert(!this.retained[nodeId], 'attempted to remove a retained node'); // Is this right?
        const toIds = Object.keys(this.graph[nodeId]);
        const fromIds = Object.keys(this.reverseGraph[nodeId]);
        // delete fromId -> nodeId for fromId in fromIds
        fromIds.forEach((fromId) => {
            delete this.graph[fromId][nodeId];
        });
        // delete nodeId -> toId for toId in toIds
        toIds.forEach((toId) => {
            delete this.reverseGraph[toId][nodeId];
        });
        delete this.reverseGraph[nodeId];
        delete this.graph[nodeId];
        delete this.nodesSet[nodeId];
        delete this.dirtyNodes[nodeId];
        delete this.retained[nodeId];
    }
    /**
     * Remove a node and all its edges from the graph, returns true if node not present
     */
    removeNode(node) {
        const nodeId = this.getId(node);
        if (!this.nodesSet[nodeId])
            return true;
        this.removeNodeInner(nodeId);
        return false;
    }
    retain(node) {
        const nodeId = this.getId(node);
        log.assert(!this.retained[nodeId], 'double-retain');
        this.retained[nodeId] = true;
    }
    release(node) {
        const nodeId = this.getId(node);
        log.assert(this.retained[nodeId], 'double-release');
        delete this.retained[nodeId];
    }
    removeIncoming(node) {
        const nodeId = this.getId(node);
        const fromIds = Object.keys(this.reverseGraph[nodeId]);
        fromIds.forEach((fromId) => {
            delete this.graph[fromId][nodeId];
        });
        this.reverseGraph[nodeId] = {};
    }
    /**
     * Get list of things need to be updated, when fromNode has changed?
     */
    getDependencies(fromNode) {
        const nodeId = this.getId(fromNode);
        if (!this.graph[nodeId])
            return [];
        return Object.keys(this.graph[nodeId]).map((toId) => this.nodesSet[toId]);
    }
    /**
     * Visit dirty nodes topologically.
     *
     * When building topologically sorted list, refcount dirtiness (the number of incoming edges that are from dirty
     * nodes).
     *
     * If a recalculation produces the same value, decrement the refcount on all destination edges.
     *
     * If a node while visiting topologically is at 0, no need to recalculate; decrement all of its destination nodes
     * and proceed.
     *
     * This way we can prevent recalculations that are triggered if the calculation is "equal".
     *
     */
    visitDirtyTopological(callback) {
        // Clear the current set of dirty nodes, retaining the ones visited.
        const dirtyNodes = this.dirtyNodes;
        this.dirtyNodes = {};
        // Build topologically sorted list via DFS discoverable only from dirty nodes.
        // After visiting all nodes, the list is in reverse topological order
        const visited = {};
        const sortedIds = [];
        const dfsRecurse = (nodeId) => {
            if (visited[nodeId])
                return;
            visited[nodeId] = true;
            const toIds = Object.keys(this.graph[nodeId]);
            toIds.forEach((toId) => {
                dfsRecurse(toId);
            });
            sortedIds.push(nodeId);
        };
        Object.keys(dirtyNodes).forEach((nodeId) => {
            dfsRecurse(nodeId);
        });
        // Visit the dirty nodes in topological order.
        // If a node is not dirty, skip it.
        // If a node is dirty and the visitor returns true, the node is considered "not dirty" and processing continues
        // If a node is dirty and the visitor returns false, the node is considered "dirty" and all adjacent destination nodes are marked as dirty.
        for (let i = sortedIds.length - 1; i >= 0; --i) {
            const nodeId = sortedIds[i];
            if (dirtyNodes[nodeId]) {
                const node = this.nodesSet[nodeId];
                const isEqual = callback(node);
                if (!isEqual) {
                    const toIds = Object.keys(this.graph[nodeId]);
                    toIds.forEach((toId) => {
                        dirtyNodes[toId] = true;
                    });
                }
            }
        }
    }
    /**
     * All nodes that do not lead to a retained (sink) node are considered garbage.
     *
     * Note: there may be a much more efficient way than doing this.
     *
     * It's possible that we could instead assert that a node is reachable from a retained node prior to calculation, which may be *much* faster in practice.
     */
    garbageCollect() {
        const marked = {};
        // Mark nodes reachable from retained sink nodes (in reverse: retained nodes are "sink" nodes)
        const mark = (nodeId) => {
            if (marked[nodeId])
                return;
            marked[nodeId] = true;
            const fromIds = Object.keys(this.reverseGraph[nodeId]);
            fromIds.forEach((fromId) => {
                mark(fromId);
            });
        };
        Object.keys(this.retained).forEach((nodeId) => {
            mark(nodeId);
        });
        // Sweep
        const removed = [];
        Object.keys(this.graph).forEach((nodeId) => {
            if (!marked[nodeId]) {
                removed.push(this.nodesSet[nodeId]);
                this.removeNodeInner(nodeId);
            }
        });
        return removed;
    }
    /**
     * Generate a dot file structure of the graph
     */
    graphviz(getAttributes) {
        const lines = [
            'digraph dag {',
            'graph [rankdir="LR"];',
            'node [style="filled", fillcolor="#DDDDDD"];',
        ];
        const nodeIds = Object.keys(this.graph);
        const nodeAttributes = {};
        nodeIds.forEach((nodeId) => {
            nodeAttributes[nodeId] = getAttributes(nodeId, this.nodesSet[nodeId]);
        });
        const groupedNodes = groupBy(nodeIds, (nodeId) => {
            return [nodeAttributes[nodeId].subgraph, nodeId];
        });
        let clusterId = 0;
        groupedNodes.forEach((nodeIds, group) => {
            if (group)
                lines.push(`subgraph cluster_${clusterId++} {`, 'style="filled";', 'color="#AAAAAA";');
            nodeIds.forEach((nodeId) => {
                const props = {
                    shape: this.retained[nodeId] ? 'box' : 'ellipse',
                    label: nodeAttributes[nodeId].label,
                };
                lines.push(`  item_${nodeId} [${Object.entries(props)
                    .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
                    .join(',')}];`);
            });
            if (group)
                lines.push('}');
        });
        nodeIds.forEach((fromId) => {
            Object.keys(this.graph[fromId]).forEach((toId) => {
                lines.push(`  item_${fromId} -> item_${toId};`);
            });
        });
        lines.push('}');
        return lines.join('\n');
    }
}
//# sourceMappingURL=dag.js.map