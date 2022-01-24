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
            if (this.reverseGraph[nodeId][fromId] & DAG.EDGE_HARD) {
                this.graph[fromId][nodeId] =
                    (this.graph[fromId][nodeId] || 0) & ~DAG.EDGE_HARD;
                this.reverseGraph[nodeId][fromId] =
                    (this.reverseGraph[nodeId][fromId] || 0) & ~DAG.EDGE_HARD;
            }
        });
    }

    /**
     * Get dependencies (specify EDGE_SOFT, EDGE_HARD, or EDGE_ANY)
     */
    private getDependenciesInner(
        nodeId: string,
        edgeType: 0b01 | 0b10 | 0b11 = DAG.EDGE_ANY
    ): string[] {
        if (!this.graph[nodeId]) return [];
        return Object.keys(this.graph[nodeId]).filter(
            (toId) => (this.graph[nodeId][toId] || 0) & edgeType
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
    getDependencies(
        fromNode: Type,
        edgeType: 0b01 | 0b10 | 0b11 = DAG.EDGE_ANY
    ): Type[] {
        const nodeId = this.getId(fromNode);
        return this.getDependenciesInner(nodeId, edgeType).map(
            (toId) => this.nodesSet[toId]
        );
    }

    /**
     * Process the DAG, visiting dirty nodes topologically that have a data dependency on a retained node.
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
    process(callback: (node: Type) => boolean) {
        // Build topologically sorted list via DFS discoverable only from dirty nodes.
        // After visiting all nodes, the list is in reverse topological order
        const visited: Record<string, boolean> = {};
        const reachesRetained: Record<string, boolean> = {};
        const sortedIds: string[] = [];
        const strayIds: string[] = [];
        const dfsRecurse = (nodeId: string): boolean => {
            if (visited[nodeId]) return reachesRetained[nodeId];
            visited[nodeId] = true;
            reachesRetained[nodeId] = this.retained[nodeId];
            const toIds = this.getDependenciesInner(nodeId);
            let anyDependenciesRetained = false;
            toIds.forEach((toId) => {
                if (dfsRecurse(toId)) {
                    anyDependenciesRetained = true;
                }
            });
            if (anyDependenciesRetained) reachesRetained[nodeId] = true;
            sortedIds.push(nodeId);
            if (!reachesRetained[nodeId]) {
                strayIds.push(nodeId);
                return false;
            } else {
                return true;
            }
        };
        Object.keys(this.dirtyNodes).forEach((nodeId) => {
            dfsRecurse(nodeId);
        });

        // Visit the dirty nodes in topological order, skipping nodes that are not retained
        // If a node is not dirty, skip it.
        // If a node is dirty and the visitor returns true, the node is considered "not dirty" and processing continues
        // If a node is dirty and the visitor returns false, the node is considered "dirty" and all adjacent destination nodes are marked as dirty.
        for (let i = sortedIds.length - 1; i >= 0; --i) {
            const nodeId = sortedIds[i];
            if (this.dirtyNodes[nodeId] && reachesRetained[nodeId]) {
                const node = this.nodesSet[nodeId];
                const isEqual = callback(node);
                if (!isEqual) {
                    const toIds = this.getDependenciesInner(nodeId);
                    toIds.forEach((toId) => {
                        if (this.graph[nodeId][toId] & DAG.EDGE_HARD) {
                            this.dirtyNodes[toId] = true;
                        }
                    });
                }
                delete this.dirtyNodes[nodeId];
            }
        }

        // Garbage collect all the detected stray nodes
        // TODO: this doesn't need to happen each time...
        strayIds.forEach((nodeId) => {
            this.removeNodeInner(nodeId);
        });
    }

    /**
     * Generate a dot file structure of the graph
     */
    graphviz(
        getAttributes: (
            label: string,
            item: Type
        ) => { label: string; subgraph: object | undefined; penwidth: string }
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
            { label: string; subgraph: object | undefined; penwidth: string }
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
                    penwidth: nodeAttributes[nodeId].penwidth,
                    fillcolor: this.dirtyNodes[nodeId] ? '#FFDDDD' : '#DDDDDD',
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
