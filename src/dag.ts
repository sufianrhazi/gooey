import * as log from './log';
import { groupBy } from './util';

/**
 * A directed acyclic graph
 *
 * Edges may me marked as DAG.EDGE_SOFT (visualized as ->) or DAG.EDGE_HARD (visualized as =>):
 * - An EDGE_SOFT edge from A to B indicate an order dependency, but not a data dependency
 *   - If A and B are both dirty, A should be flushed **after** B is flushed
 *   - If A is not dirty and B is dirty and B is visited and B does not short-circuit, A does not get marked as dirty
 *   - Used to ensure that the DOM structure is updated in the correct order
 *     - onEffect() effects are executed after all of the calc() present in a component's DOM
 *     - "parent" calc() view nodes are executed after "child" calc() view nodes
 * - An EDGE_HARD edge from A to B indicates both order dependency and data dependency
 *   - If A and B are both dirty, A should be flushed **after** B is flushed
 *   - If A is not dirty and B is dirty and B is visited and B does not short-circuit, A gets marked as dirty and is visited
 */
export class DAG<Type extends object> {
    private static EDGE_NONE = 0b00 as const;
    static EDGE_SOFT = 0b01 as const;
    static EDGE_HARD = 0b10 as const;
    private static EDGE_ANY = 0b11 as const;

    private nextId: number;
    private idMap: WeakMap<Type, string>;
    private nodesSet: Record<string, Type>;
    private retained: Record<string, true>;
    private dirtyNodes: Record<string, true>;

    private graph: Record<string, Record<string, number>>;
    private reverseGraph: Record<string, Record<string, number>>;

    constructor() {
        this.nextId = 1;
        this.idMap = new WeakMap();
        this.nodesSet = {};
        this.retained = {};
        this.graph = {};
        this.reverseGraph = {};
        this.dirtyNodes = {};
    }

    private getId(node: Type): string {
        let id = this.idMap.get(node);
        if (id === undefined) {
            id = this.nextId.toString();
            this.nextId += 1;
            this.idMap.set(node, id);
        }
        return id;
    }

    addNode(node: Type): boolean {
        const nodeId = this.getId(node);
        if (this.nodesSet[nodeId]) return false;
        this.graph[nodeId] = {};
        this.reverseGraph[nodeId] = {};
        this.nodesSet[nodeId] = node;
        return true;
    }

    hasNode(node: Type): boolean {
        return !!this.nodesSet[this.getId(node)];
    }

    markNodeDirty(node: Type): boolean {
        const nodeId = this.getId(node);
        if (this.dirtyNodes[nodeId]) return false;
        this.dirtyNodes[nodeId] = true;
        return true;
    }

    /**
     * Indicate that toNode needs to be updated if fromNode has changed
     */
    addEdge(fromNode: Type, toNode: Type, kind: 0b01 | 0b10): void {
        const fromId = this.getId(fromNode);
        const toId = this.getId(toNode);
        log.assert(
            !!this.nodesSet[fromId],
            'cannot add edge from node that does not exist'
        );
        log.assert(
            !!this.nodesSet[toId],
            'cannot add edge to node that does not exist'
        );
        this.graph[fromId][toId] = (this.graph[fromId][toId] || 0) | kind;
        this.reverseGraph[toId][fromId] =
            (this.reverseGraph[toId][fromId] || 0) | kind;
    }

    /**
     * Returns true if edge is removed
     */
    removeEdge(
        fromNode: Type,
        toNode: Type,
        kind: 0b01 | 0b10 | 0b11
    ): boolean {
        const fromId = this.getId(fromNode);
        const toId = this.getId(toNode);
        if (!this.nodesSet[fromId]) return false;
        if (!this.nodesSet[toId]) return false;
        if (!(this.graph[fromId][toId] & kind)) return false;
        this.graph[fromId][toId] = (this.graph[fromId][toId] || 0) & ~kind;
        this.reverseGraph[toId][fromId] =
            (this.reverseGraph[toId][fromId] || 0) & ~kind;
        return true;
    }

    private removeNodeInner(nodeId: string) {
        log.assert(
            !this.retained[nodeId],
            'attempted to remove a retained node'
        ); // Is this right?
        const toIds = this.getDependenciesInner(nodeId);
        const fromIds = this.getReverseDependenciesInner(nodeId);

        // delete fromId -> nodeId for fromId in fromIds
        fromIds.forEach((fromId) => {
            this.graph[fromId][nodeId] = 0;
            this.reverseGraph[nodeId][fromId] = 0;
        });
        // delete nodeId -> toId for toId in toIds
        toIds.forEach((toId) => {
            this.reverseGraph[toId][nodeId] = 0;
            this.graph[nodeId][toId] = 0;
        });
        delete this.nodesSet[nodeId];
        delete this.dirtyNodes[nodeId];
        delete this.retained[nodeId];
    }

    /**
     * Remove a node and all its edges from the graph, returns true if node not present
     */
    removeNode(node: Type): boolean {
        const nodeId = this.getId(node);
        if (!this.nodesSet[nodeId]) return true;
        this.removeNodeInner(nodeId);
        return false;
    }

    retain(node: Type) {
        const nodeId = this.getId(node);
        log.assert(!this.retained[nodeId], 'double-retain');
        this.retained[nodeId] = true;
    }

    release(node: Type) {
        const nodeId = this.getId(node);
        log.assert(this.retained[nodeId], 'double-release');
        delete this.retained[nodeId];
    }

    removeIncoming(node: Type) {
        const nodeId = this.getId(node);

        const fromIds = this.getReverseDependenciesInner(nodeId);
        fromIds.forEach((fromId) => {
            if (
                (this.reverseGraph[nodeId][fromId] & DAG.EDGE_HARD) ===
                DAG.EDGE_HARD
            ) {
                this.graph[fromId][nodeId] =
                    (this.graph[fromId][nodeId] || 0) & ~DAG.EDGE_HARD;
                this.reverseGraph[nodeId][fromId] =
                    (this.reverseGraph[nodeId][fromId] || 0) & ~DAG.EDGE_HARD;
            }
        });
    }

    /**
     * Get dependencies (either EDGE_SOFT or EDGE_HARD)
     */
    private getDependenciesInner(nodeId: string): string[] {
        if (!this.graph[nodeId]) return [];
        return Object.keys(this.graph[nodeId]).filter(
            (toId) => !!this.graph[nodeId][toId]
        );
    }

    /**
     * Get reverse dependencies (either EDGE_SOFT or EDGE_HARD)
     */
    private getReverseDependenciesInner(nodeId: string): string[] {
        if (!this.reverseGraph[nodeId]) return [];
        return Object.keys(this.reverseGraph[nodeId]).filter(
            (fromId) => !!this.reverseGraph[nodeId][fromId]
        );
    }

    /**
     * Get list of things need to be updated, when fromNode has changed?
     */
    getDependencies(fromNode: Type): Type[] {
        const nodeId = this.getId(fromNode);
        return this.getDependenciesInner(nodeId).map(
            (toId) => this.nodesSet[toId]
        );
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
    visitDirtyTopological(callback: (node: Type) => boolean) {
        // Clear the current set of dirty nodes, retaining the ones visited.
        const dirtyNodes = this.dirtyNodes;
        this.dirtyNodes = {};

        // Build topologically sorted list via DFS discoverable only from dirty nodes.
        // After visiting all nodes, the list is in reverse topological order
        const visited: Record<string, boolean> = {};
        const sortedIds: string[] = [];
        const dfsRecurse = (nodeId: string) => {
            if (visited[nodeId]) return;
            visited[nodeId] = true;
            const toIds = this.getDependenciesInner(nodeId);
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
                    const toIds = this.getDependenciesInner(nodeId);
                    toIds.forEach((toId) => {
                        if (this.graph[nodeId][toId] & DAG.EDGE_HARD) {
                            dirtyNodes[toId] = true;
                        }
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
    garbageCollect(): Type[] {
        const marked: Partial<Record<string, true>> = {};

        // Mark nodes reachable from retained sink nodes (in reverse: retained nodes are "sink" nodes)
        const mark = (nodeId: string) => {
            if (marked[nodeId]) return;
            marked[nodeId] = true;
            const fromIds = this.getReverseDependenciesInner(nodeId);
            fromIds.forEach((fromId) => {
                mark(fromId);
            });
        };
        Object.keys(this.retained).forEach((nodeId) => {
            mark(nodeId);
        });

        // Sweep
        const removed: Type[] = [];
        Object.keys(this.nodesSet).forEach((nodeId) => {
            if (this.nodesSet[nodeId] && !marked[nodeId]) {
                removed.push(this.nodesSet[nodeId]);
                this.removeNodeInner(nodeId);
            }
        });

        return removed;
    }

    /**
     * Generate a dot file structure of the graph
     */
    graphviz(
        getAttributes: (
            label: string,
            item: Type
        ) => { label: string; subgraph: object | undefined }
    ) {
        const lines = [
            'digraph dag {',
            //'graph [rankdir="LR"];',
            'node [style="filled", fillcolor="#DDDDDD"];',
        ];

        const nodeIds = Object.keys(this.nodesSet).filter(
            (nodeId) => !!this.nodesSet[nodeId]
        );
        const nodeAttributes: Record<
            string,
            { label: string; subgraph: object | undefined }
        > = {};
        nodeIds.forEach((nodeId) => {
            nodeAttributes[nodeId] = getAttributes(
                nodeId,
                this.nodesSet[nodeId]
            );
        });
        const groupedNodes = groupBy(nodeIds, (nodeId) => {
            return [nodeAttributes[nodeId].subgraph, nodeId];
        });

        let clusterId = 0;
        groupedNodes.forEach((nodeIds, group) => {
            if (group)
                lines.push(
                    `subgraph cluster_${clusterId++} {`,
                    'style="filled";',
                    'color="#AAAAAA";'
                );
            nodeIds.forEach((nodeId) => {
                const props: Record<string, string> = {
                    shape: this.retained[nodeId] ? 'box' : 'ellipse',
                    label: nodeAttributes[nodeId].label,
                };
                lines.push(
                    `  item_${nodeId} [${Object.entries(props)
                        .map(
                            ([key, value]) => `${key}=${JSON.stringify(value)}`
                        )
                        .join(',')}];`
                );
            });
            if (group) lines.push('}');
        });

        nodeIds.forEach((fromId) => {
            this.getDependenciesInner(fromId).forEach((toId) => {
                if (this.graph[fromId][toId] & DAG.EDGE_HARD) {
                    lines.push(
                        `  item_${fromId} -> item_${toId} [style="solid"];`
                    );
                }
                if (this.graph[fromId][toId] & DAG.EDGE_SOFT) {
                    lines.push(
                        `  item_${fromId} -> item_${toId} [style="dashed"];`
                    );
                }
            });
        });

        lines.push('}');

        return lines.join('\n');
    }
}
