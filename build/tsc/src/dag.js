import * as log from './log';
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
    removeNodeInner(nodeId) {
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
     * Visit topological graph
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
    visitTopological(callback) {
        // Nodes with no incoming edges must have a dirty count of 1.
        const dirtyCount = {};
        const entryNodes = new Set();
        Object.keys(this.reverseGraph).forEach((toId) => {
            const fromIds = Object.keys(this.reverseGraph[toId]);
            if (fromIds.length === 0) {
                entryNodes.add(toId);
                dirtyCount[toId] = 1;
            }
            else {
                dirtyCount[toId] = fromIds.length;
            }
        });
        // Build topologically sorted list via DFS visiting exactly once
        // - When exiting an unvisited node, push to the end of a list
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
        Object.keys(this.graph).forEach((nodeId) => {
            dfsRecurse(nodeId);
        });
        // Visit the dirty nodes in topological order. If after visiting the node is unchanged, we can decrement the
        // refcount for all its destination edges.
        for (let i = sortedIds.length - 1; i >= 0; --i) {
            const nodeId = sortedIds[i];
            if (dirtyCount[nodeId] > 0) {
                const node = this.nodesSet[nodeId];
                const isEqual = callback(node);
                if (isEqual) {
                    const toIds = Object.keys(this.graph[nodeId]);
                    toIds.forEach((toId) => {
                        dirtyCount[toId] -= 1;
                    });
                }
            }
            else {
                const toIds = Object.keys(this.graph[nodeId]);
                toIds.forEach((toId) => {
                    dirtyCount[toId] -= 1;
                });
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
    graphviz(makeName) {
        const lines = ['digraph dag {'];
        Object.keys(this.graph).forEach((nodeId) => {
            const node = this.nodesSet[nodeId];
            const props = {
                shape: this.retained[nodeId] ? 'box' : 'ellipse',
                label: makeName(nodeId, node),
            };
            lines.push(`  item_${nodeId} [${Object.entries(props)
                .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
                .join(',')}];`);
        });
        Object.keys(this.graph).forEach((fromId) => {
            Object.keys(this.graph[fromId]).forEach((toId) => {
                lines.push(`  item_${fromId} -> item_${toId};`);
            });
        });
        lines.push('}');
        return lines.join('\n');
    }
}
//# sourceMappingURL=dag.js.map