import * as log from './log';
import { isSentinel, sentinel } from './sentinel';
export class DAG {
    constructor() {
        this.maxId = 0;
        this.idMap = new WeakMap();
        this.nodes = {};
        this.edgeMap = {};
        this.reverseEdgeMap = {};
        this.refCount = {};
        this.cullableSet = {};
        this._addNode(sentinel);
        this.sentinelId = this.getItemId(sentinel);
    }
    getItemId(item) {
        let id;
        if ((id = this.idMap.get(item)) === undefined) {
            id = this.maxId.toString();
            this.maxId += 1;
            this.idMap.set(item, id);
        }
        return id;
    }
    addNode(node) {
        return this._addNode(node);
    }
    _addNode(node) {
        const itemId = this.getItemId(node);
        if (!this.nodes[itemId]) {
            this.refCount[itemId] = 0;
            if (!isSentinel(node)) {
                this.cullableSet[itemId] = true;
            }
            this.nodes[itemId] = node;
            this.edgeMap[itemId] = {};
            this.reverseEdgeMap[itemId] = {};
            return true;
        }
        return false;
    }
    hasNode(node) {
        return !!this.nodes[this.getItemId(node)];
    }
    /**
     * Indicate that toNode needs to be updated if fromNode has changed
     *
     * Returns true if edge is added
     */
    addEdge(fromNode, toNode) {
        const fromId = this.getItemId(fromNode);
        const toId = this.getItemId(toNode);
        return this._addEdge(fromId, toId);
    }
    _addEdge(fromId, toId) {
        const fromNode = this.nodes[fromId];
        const toNode = this.nodes[toId];
        log.invariant(() => fromId === this.sentinelId || !!this.nodes[fromId], 'addEdge fromNode does not exist', fromNode);
        log.invariant(() => !!this.nodes[toId], 'addEdge toNode does not exist', toNode);
        if (!this.edgeMap[fromId]) {
            this.edgeMap[fromId] = {};
        }
        if (this.edgeMap[fromId][toId]) {
            // already exists
            return false;
        }
        this.edgeMap[fromId][toId] = toNode;
        // upkeeping
        if (!this.reverseEdgeMap[toId]) {
            this.reverseEdgeMap[toId] = {};
        }
        this.reverseEdgeMap[toId][fromId] = fromNode;
        this.refCount[fromId] += 1;
        delete this.cullableSet[fromId];
        return true;
    }
    /**
     * Indicate that toNode no longer needs to be updated if fromNode has changed
     */
    removeEdge(fromNode, toNode) {
        const fromId = this.getItemId(fromNode);
        const toId = this.getItemId(toNode);
        const result = this._removeEdge(fromId, toId);
        log.invariant(() => result === false, 'removeEdge attempted on nonexistent edge', { fromNode, toNode });
        return result;
    }
    /**
     * Remove a node and all its edges from the graph, returns true if node not present
     */
    removeNode(node) {
        const itemId = this.getItemId(node);
        return this._removeNode(itemId);
    }
    _removeNode(itemId) {
        if (!this.nodes[itemId])
            return true;
        const node = this.nodes[itemId];
        Object.keys(this.edgeMap[itemId]).forEach((toId) => this._removeEdge(itemId, toId));
        Object.keys(this.reverseEdgeMap[itemId]).forEach((fromId) => this._removeEdge(fromId, itemId));
        log.invariant(() => this.refCount[itemId] === 0, 'still has refcount after deleting edges', node);
        log.invariant(() => this.cullableSet[itemId] === true, 'not cullable after deleting edges', node);
        delete this.nodes[itemId];
        delete this.edgeMap[itemId];
        delete this.reverseEdgeMap[itemId];
        delete this.refCount[itemId];
        delete this.cullableSet[itemId];
        return false;
    }
    _removeEdge(fromId, toId) {
        log.assert(!!this.edgeMap[fromId], '_removeEdge fromId not found in edgeMap', fromId);
        log.assert(!!this.reverseEdgeMap[toId], '_removeEdge toId not found in reverseEdgeMap', toId);
        if (!this.edgeMap[fromId][toId]) {
            log.error('_removeEdge edge not found', { fromId, toId });
            return true;
        }
        // Remove fromId -> toId
        delete this.edgeMap[fromId][toId];
        this.refCount[fromId] -= 1;
        if (this.refCount[fromId] === 0) {
            this.cullableSet[fromId] = true;
        }
        delete this.reverseEdgeMap[toId][fromId];
        return false;
    }
    retain(node) {
        const retained = this._addEdge(this.getItemId(node), this.sentinelId);
        log.invariant(() => !!retained, 'double-retained', node);
    }
    release(node) {
        const releaseFailed = this._removeEdge(this.getItemId(node), this.sentinelId);
        log.invariant(() => !releaseFailed, 'released a non-retained node', node);
    }
    removeEdges(edges) {
        edges.forEach(([fromNode, toNode]) => {
            const fromId = this.getItemId(fromNode);
            const toId = this.getItemId(toNode);
            this._removeEdge(fromId, toId);
        });
    }
    /**
     * Get list of things need to be updated, when fromNode has changed?
     */
    getDependencies(fromNode) {
        const fromId = this.getItemId(fromNode);
        if (!this.edgeMap[fromId]) {
            return [];
        }
        const deps = [];
        Object.values(this.edgeMap[fromId]).forEach((node) => {
            if (!isSentinel(node)) {
                deps.push(node);
            }
        });
        return deps;
    }
    /**
     * Get list of things that cause toNode to updated
     */
    getReverseDependencies(toNode) {
        const toId = this.getItemId(toNode);
        if (!this.reverseEdgeMap[toId]) {
            return [];
        }
        const revDeps = [];
        Object.values(this.reverseEdgeMap[toId]).forEach((node) => {
            if (!isSentinel(node)) {
                revDeps.push(node);
            }
        });
        return revDeps;
    }
    /**
     * Visit topological graph
     */
    visitTopological(callback) {
        const visited = {};
        const sorted = [];
        const dfsRecurse = (nodeId) => {
            if (visited[nodeId])
                return;
            visited[nodeId] = true;
            Object.keys(this.edgeMap[nodeId] || {}).forEach((toId) => {
                dfsRecurse(toId);
            });
            const node = this.nodes[nodeId];
            if (!isSentinel(node)) {
                sorted.unshift(node);
            }
        };
        Object.keys(this.nodes).forEach((nodeId) => {
            dfsRecurse(nodeId);
        });
        sorted.forEach((node) => {
            callback(node);
        });
    }
    garbageCollect() {
        const culled = [];
        while (Object.keys(this.cullableSet).length > 0) {
            Object.keys(this.cullableSet).forEach((nodeId) => {
                const node = this.nodes[nodeId];
                log.assert(!isSentinel(node), 'tried to garbage collect sentinel');
                culled.push(node);
                this._removeNode(nodeId);
            });
        }
        return culled;
    }
    /**
     * Generate a dot file structure of the graph
     */
    graphviz(makeName) {
        const lines = ['digraph dag {'];
        Object.entries(this.nodes).forEach(([nodeId, node]) => {
            const props = {
                label: isSentinel(node) ? '<ROOT>' : makeName(nodeId, node),
            };
            if (isSentinel(node)) {
                props.shape = 'circle';
            }
            lines.push(`  item_${nodeId} [${Object.entries(props)
                .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
                .join(',')}];`);
        });
        Object.entries(this.edgeMap).forEach(([fromNodeId, toNodeMap]) => {
            Object.keys(toNodeMap).forEach((toNodeId) => {
                lines.push(`  item_${fromNodeId} -> item_${toNodeId};`);
            });
        });
        lines.push('}');
        return lines.join('\n');
    }
}
//# sourceMappingURL=dag.js.map