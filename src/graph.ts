import * as log from './log';
import type { ProcessAction } from './types';
import { groupBy } from './util';

/**
 * A directed graph
 *
 * Edges may me marked as Graph.EDGE_SOFT (visualized as ->) or Graph.EDGE_HARD (visualized as =>):
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
export class Graph<Type extends object> {
    private static EDGE_NONE = 0b00 as const;
    static EDGE_SOFT = 0b01 as const;
    static EDGE_HARD = 0b10 as const;
    private static EDGE_ANY = 0b11 as const;

    private nextId: number;
    private nodesSet: Record<string, Type>;
    private retained: Record<string, true>;
    private dirtyNodes: Record<string, true>;
    private knownCycles: Record<string, boolean>;

    private graph: Record<string, Record<string, number>>;
    private reverseGraph: Record<string, Record<string, number>>;

    constructor() {
        this.nextId = 1;
        this.nodesSet = {};
        this.retained = {};
        this.graph = {};
        this.reverseGraph = {};
        this.dirtyNodes = {};
        this.knownCycles = {};
    }

    private getId(node: Type): string {
        return (node as any).$__id;
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

    markNodeDirty(node: Type): void {
        this.dirtyNodes[this.getId(node)] = true;
    }

    private getRecursiveDependenciesInner(nodeId: string): {
        otherNodeIds: Record<string, 1 | 2 | undefined>;
        otherNodes: Type[];
        isCycle: boolean;
    } {
        const otherNodeIds: Record<string, 1 | 2 | undefined> = {};
        const otherNodes: Type[] = [];
        let foundCycle = false;
        const visit = (visitId: string) => {
            if (otherNodeIds[visitId] === 2) foundCycle = true;
            if (otherNodeIds[visitId]) return;
            if (visitId !== nodeId) otherNodes.push(this.nodesSet[visitId]);
            otherNodeIds[visitId] = 2;
            this.getDependenciesInner(visitId, Graph.EDGE_ANY).forEach(
                (toId) => {
                    visit(toId);
                }
            );
            otherNodeIds[visitId] = 1;
        };

        visit(nodeId);
        return { otherNodeIds, otherNodes, isCycle: foundCycle };
    }

    getRecursiveDependencies(node: Type): Type[] {
        const nodeId = this.getId(node);
        const { otherNodes, isCycle } =
            this.getRecursiveDependenciesInner(nodeId);
        log.assert(!isCycle, 'getRecursiveDependencies found a cycle');
        return otherNodes;
    }

    hasDirtyNodes(): boolean {
        return Object.keys(this.dirtyNodes).length > 0;
    }

    /**
     * Indicate that toNode needs to be updated if fromNode has changed
     */
    addEdge(fromNode: Type, toNode: Type, kind: 0b01 | 0b10): void {
        const fromId = this.getId(fromNode);
        const toId = this.getId(toNode);
        this.addEdgeInner(fromId, toId, kind);
    }

    private addEdgeInner(
        fromId: string,
        toId: string,
        kind: 0b01 | 0b10
    ): void {
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
    removeEdge(fromNode: Type, toNode: Type, kind: 0b01 | 0b10 | 0b11) {
        const fromId = this.getId(fromNode);
        const toId = this.getId(toNode);
        this.removeEdgeInner(fromId, toId, kind);
    }

    private removeEdgeInner(
        fromId: string,
        toId: string,
        kind: 0b01 | 0b10 | 0b11
    ) {
        log.assert(
            !!this.nodesSet[fromId],
            'cannot remove edge from node that does not exist'
        );
        log.assert(
            !!this.nodesSet[toId],
            'cannot remove edge to node that does not exist'
        );
        this.graph[fromId][toId] = (this.graph[fromId][toId] || 0) & ~kind;
        this.reverseGraph[toId][fromId] =
            (this.reverseGraph[toId][fromId] || 0) & ~kind;
    }

    removeNode(node: Type) {
        const nodeId = this.getId(node);
        this.removeNodeInner(nodeId);
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
        delete this.knownCycles[nodeId];
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

    replaceIncoming(node: Type, newIncomingNodes: Type[]) {
        const toId = this.getId(node);

        const beforeFromIds = this.getReverseDependenciesInner(
            toId,
            Graph.EDGE_HARD
        );
        const beforeFromSet = new Set(beforeFromIds);
        const newFromIds = newIncomingNodes.map((fromNode) =>
            this.getId(fromNode)
        );
        const newFromSet = new Set(newFromIds);
        beforeFromIds.forEach((fromId) => {
            if (!newFromSet.has(fromId)) {
                this.removeEdgeInner(fromId, toId, Graph.EDGE_HARD);
            }
        });
        newFromIds.forEach((fromId) => {
            if (!beforeFromSet.has(fromId)) {
                this.addEdgeInner(fromId, toId, Graph.EDGE_HARD);
            }
        });
    }

    removeIncoming(node: Type) {
        const toId = this.getId(node);

        const fromIds = this.getReverseDependenciesInner(toId);
        fromIds.forEach((fromId) => {
            this.removeEdgeInner(fromId, toId, Graph.EDGE_HARD);
        });
    }

    /**
     * Get dependencies (specify EDGE_SOFT, EDGE_HARD, or EDGE_ANY)
     */
    private getDependenciesInner(
        nodeId: string,
        edgeType: 0b01 | 0b10 | 0b11 = Graph.EDGE_ANY
    ): string[] {
        if (!this.graph[nodeId]) return [];
        return Object.keys(this.graph[nodeId]).filter(
            (toId) => (this.graph[nodeId][toId] || 0) & edgeType
        );
    }

    /**
     * Get reverse dependencies (either EDGE_SOFT or EDGE_HARD)
     */
    private getReverseDependenciesInner(
        nodeId: string,
        edgeType: 0b01 | 0b10 | 0b11 = Graph.EDGE_ANY
    ): string[] {
        if (!this.reverseGraph[nodeId]) return [];
        return Object.keys(this.reverseGraph[nodeId]).filter(
            (fromId) => (this.reverseGraph[nodeId][fromId] || 0) & edgeType
        );
    }

    /**
     * Get list of things need to be updated, when fromNode has changed?
     */
    getDependencies(
        fromNode: Type,
        edgeType: 0b01 | 0b10 | 0b11 = Graph.EDGE_ANY
    ): Type[] {
        const nodeId = this.getId(fromNode);
        return this.getDependenciesInner(nodeId, edgeType).map(
            (toId) => this.nodesSet[toId]
        );
    }

    /**
     * This uses Tarjan's strongly connected components algorithm to build the
     * topological sort of the subgraph that contains all retained nodes.
     *
     * Note: Because we are starting at retained nodes, which should be "end"
     * bestination nodes, we build a topological sort of the _reverse graph_.
     * Due to the nature of Tarjan's algorithm, the sort we build is
     * constructed in reverse order. It is also the case that the reverse of a
     * topological sort of the reverse graph is a valid topological sort of the
     * forward graph.
     *
     * This means that we do not need to reverse the topological sort produced
     * by Tarjan's algorithm if we follow the reverse edges.
     *
     * Note: handling of dynamic additions/deletions of edges in this algorithm is incredibly inefficient!
     * TODO: Implement the algorithm outlined in:
     * - Title: Incremental Topological Sort and Cycle Detection in O(msqrt{n}) Expected Total Time
     * - Authors: Aaron Bernstein and Shiri Chechik
     * - Paper: https://aaronbernstein.cs.rutgers.edu/wp-content/uploads/sites/43/2018/12/Dynamic-Cycle-Detection.pdf
     * - From: https://aaronbernstein.cs.rutgers.edu/publications/
     */
    private _toposortRetained() {
        type Vertex = {
            nodeId: string;
            index?: number;
            lowlink?: number;
            onStack?: boolean;
        };
        let index = 0;
        const nodeVertex: Record<string, Vertex> = {};
        const stack: Vertex[] = [];
        const reverseTopoSort: Vertex[][] = [];

        const strongconnect = (vertex: Vertex) => {
            vertex.index = index;
            vertex.lowlink = index;
            index = index + 1;
            stack.push(vertex);
            vertex.onStack = true;

            // Consider successors of v
            this.getReverseDependenciesInner(vertex.nodeId).forEach((toId) => {
                if (!nodeVertex[toId]) {
                    nodeVertex[toId] = {
                        nodeId: toId,
                    };
                }
                const toVertex = nodeVertex[toId];
                if (toVertex.index === undefined) {
                    // Successor toVertex has not yet been visited; recurse on it
                    strongconnect(toVertex);
                    vertex.lowlink = Math.min(
                        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                        vertex.lowlink!,
                        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                        toVertex.lowlink!
                    );
                } else if (toVertex.onStack) {
                    // Successor toVertex is in stack S and hence in the current SCC
                    // If toVertex is not on stack, then (vertex, toVertex) is an edge pointing to an SCC already found and must be ignored
                    // Note: The next line may look odd - but is correct.
                    // It says toVertex.index not toVertex.lowlink; that is deliberate and from the original paper
                    vertex.lowlink = Math.min(
                        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                        vertex.lowlink!,
                        toVertex.index
                    );
                }
            });

            // If vertex is a root node, pop the stack and generate an SCC
            if (vertex.lowlink === vertex.index) {
                // start a new strongly connected component
                const component: Vertex[] = [];
                for (;;) {
                    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                    const toVertex = stack.pop()!;
                    toVertex.onStack = false;
                    // add toVertex to current strongly connected component
                    component.push(toVertex);
                    if (toVertex === vertex) {
                        break;
                    }
                }
                // output the current strongly connected component
                reverseTopoSort.push(component);
            }
        };

        Object.keys(this.retained).forEach((nodeId) => {
            if (this.retained[nodeId] && !nodeVertex[nodeId]) {
                nodeVertex[nodeId] = {
                    nodeId,
                };
                strongconnect(nodeVertex[nodeId]);
            }
        });

        // Note: Because we traversed the reverse graph, the reverse
        // topological sort is a valid forward topological sort of the forward
        // graph.
        return reverseTopoSort;
    }

    private _toposort(fromNodeIds: string[]) {
        type Vertex = {
            nodeId: string;
            index?: number;
            lowlink?: number;
            onStack?: boolean;
            reachesRetained?: boolean;
        };
        let index = 0;
        const nodeVertex: Record<string, Vertex> = {};
        const stack: Vertex[] = [];
        const reverseTopoSort: Vertex[][] = [];

        const strongconnect = (vertex: Vertex) => {
            vertex.index = index;
            vertex.lowlink = index;
            index = index + 1;
            stack.push(vertex);
            vertex.onStack = true;

            // Consider successors of v
            this.getDependenciesInner(vertex.nodeId).forEach((toId) => {
                if (!nodeVertex[toId]) {
                    nodeVertex[toId] = {
                        nodeId: toId,
                        reachesRetained: !!this.retained[toId],
                    };
                }
                const toVertex = nodeVertex[toId];
                if (toVertex.index === undefined) {
                    // Successor toVertex has not yet been visited; recurse on it
                    strongconnect(toVertex);
                    vertex.lowlink = Math.min(
                        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                        vertex.lowlink!,
                        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                        toVertex.lowlink!
                    );
                } else if (toVertex.onStack) {
                    // Successor toVertex is in stack S and hence in the current SCC
                    // If toVertex is not on stack, then (vertex, toVertex) is an edge pointing to an SCC already found and must be ignored
                    // Note: The next line may look odd - but is correct.
                    // It says toVertex.index not toVertex.lowlink; that is deliberate and from the original paper
                    vertex.lowlink = Math.min(
                        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                        vertex.lowlink!,
                        toVertex.index
                    );
                }
                if (toVertex.reachesRetained) {
                    vertex.reachesRetained = true;
                }
            });

            // If vertex is a root node, pop the stack and generate an SCC
            if (vertex.lowlink === vertex.index) {
                // start a new strongly connected component
                const component: Vertex[] = [];
                for (;;) {
                    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                    const toVertex = stack.pop()!;
                    toVertex.onStack = false;
                    // add toVertex to current strongly connected component
                    component.push(toVertex);
                    if (toVertex === vertex) {
                        break;
                    }
                }
                // output the current strongly connected component
                reverseTopoSort.push(component);
            }
        };

        fromNodeIds.forEach((nodeId) => {
            if (!nodeVertex[nodeId]) {
                nodeVertex[nodeId] = {
                    nodeId,
                    reachesRetained: !!this.retained[nodeId],
                };
                strongconnect(nodeVertex[nodeId]);
            }
        });

        return reverseTopoSort.reverse();
    }

    /**
     * Process the graph, visiting strongly connected nodes topologically that have a data dependency on a retained
     * node.
     *
     * This uses Tarjan's strongly connected component algorithm to both segment strongly connected nodes and
     * topologically sort them.
     */
    /*
     * Core Processing Algorithm
     * =========================
     *
     * First, soft-flush all dirty nodes in case recalculating a node grows a dependency on a dirty node.
     * This prevents basic forms of stale reads.
     *
     * Until we perform the rest of the algorithm without visiting a dirty node, repeat:
     * - Visit all strongly connected components in topological order reachable from retained nodes.
     * - For each component:
     *   - If it is a cycle (length > 1), flush + mark dirty all nodes that are not known to already be in a cycle, and record the node is known to be in a cycle
     *   - If it is not cycle (length = 1), flush + mark dirty all nodes that are not known to already be in a cycle, and clear the record that the node is not to be known to be in a cycle
     *   - Process the node if it is dirty, propagating dirtiness (if specified) to all hard edges that is not in the component
     *     - When a node becomes dirty, flush the node
     *   - After visiting all nodes in the component, mark all nodes in the component as not dirty
     *
     * For all remaining dirty nodes:
     * - Recursively flush the node and its hard dependencies, (keeping track of those visited so we only visit a node at most one time)
     *
     * This should handle all tricky edge cases, and in most cases flush the graph with either 2 or 3 topological sorts.
     *
     *
     * ## Edge cases to handle:
     *
     * Edge case 1: It's possible that a dirty node grows a dependency on a cached node that has a dependency on a dirty node.
     * In this case, when processing is complete, if we topologically order all nodes reachable from retained nodes, a dirty node will be discovered.
     * To account for this, we loop until visiting all newly topologically ordered strongly connected components are not dirty.
     *
     * Edge case 2: It's possible that a cycle is detected (a strongly connected component with more than 1 node)
     * We keep track of known cycle nodes. To handle cycles correctly, we need to: identify when a node newly becomes part of a cycle and identify when a node is no longer part of a cycle.
     * The graph keeps track of known cycle nodes.
     *
     * In case of a component of length > 1 for each node, we (in this specific order):
     * 1. for all of the nodes that are not known to be in a cycle:
     *   a. flush the node
     *   b. mark the node as dirty
     *   c. set the node to be known to be in a cycle
     * 2. process _all_ of the dirty nodes in the cycle, propagating dirtiness **only to nodes not in the cycle**
     * This handles the case for identifying when a node becomes part of a cycle.
     *
     * In case of a component of length = 1 where the node is known to be in a cycle, we (in this specific order):
     * 1. flush the node
     * 2. mark the node as dirty
     * 3. set the node to not be known to be in a cycle
     * 4. process the node, propagating dirtiness if needed
     * This handles the case for identifying when a node becomes part of a cycle.
     *
     *
     * ## In pseudocode
     *
     * for node in dirty_nodes:
     *   soft_flush(node)
     * do:
     *   visited_dirty := false
     *   to_process := tarjan_connected(retained)
     *   for component in to_process:
     *     is_cycle := len(component) > 1
     *     if is_cycle:
     *       for node in component:
     *         if not is_known_cycle(node):
     *           soft_flush(node)
     *           set_dirty(node)
     *           set_known_cycle(node)
     *     elif is_known_cycle(component[0]):
     *       soft_flush(component[0])
     *       set_dirty(component[0])
     *       clear_known_cycle(component[0])
     *     for node in component:
     *       if is_dirty(node):
     *         should_propagate := callback(node, is_cycle ? 'cycle' : 'recalculate')
     *         if should_propagate:
     *           for to_node in hard_edges(node):
     *             if to_node not in component:
     *               set_dirty(to_node)
     *               soft_flush(to_node)
     *         visited_dirty := true
     *     for node in component:
     *       clear_dirty(node)
     * while visited_dirty
     */
    process(callback: (node: Type, action: ProcessAction) => boolean): void {
        // Preemptively flush all of the dirty nodes to prevent direct stale accesses
        Object.keys(this.dirtyNodes).forEach((nodeId) => {
            if (this.dirtyNodes[nodeId]) {
                callback(this.nodesSet[nodeId], 'invalidate');
            }
        });

        let visitedAnyDirty = false;
        do {
            visitedAnyDirty = false;
            this._toposortRetained().forEach((component) => {
                const isCycle =
                    component.length > 1 ||
                    (this.graph[component[0].nodeId][component[0].nodeId] &
                        Graph.EDGE_HARD) ===
                        Graph.EDGE_HARD;
                const nodeIds = new Set(
                    component.map((vertex) => vertex.nodeId)
                );

                // If the nodes in the component have either become part of a
                // cycle or been removed from a cycle, flush and dirty the node
                // so it is processed
                nodeIds.forEach((nodeId) => {
                    const wasCycle = !!this.knownCycles[nodeId];
                    if (wasCycle !== isCycle) {
                        callback(this.nodesSet[nodeId], 'invalidate');
                        this.dirtyNodes[nodeId] = true;
                        this.knownCycles[nodeId] = isCycle;
                    }
                });

                // Process and propagate dirty nodes, omitting those in the
                // current component
                nodeIds.forEach((nodeId) => {
                    if (this.dirtyNodes[nodeId]) {
                        const shouldPropagate = callback(
                            this.nodesSet[nodeId],
                            isCycle ? 'cycle' : 'recalculate'
                        );
                        if (shouldPropagate) {
                            this.getDependenciesInner(
                                nodeId,
                                Graph.EDGE_HARD
                            ).forEach((toId) => {
                                if (!nodeIds.has(toId)) {
                                    this.dirtyNodes[toId] = true;
                                    callback(this.nodesSet[toId], 'invalidate');
                                }
                            });
                        }
                        visitedAnyDirty = true;
                        delete this.dirtyNodes[nodeId];
                    }
                });
            });
        } while (visitedAnyDirty);

        // Flush all remaining stray dirty nodes (and unfortunately their transitive dependencies) --
        // these do not reach retained nodes, but need to be flushed so future reads are not stale
        const visited: Record<string, boolean> = {};
        const flushTransitive = (nodeId: string) => {
            if (visited[nodeId]) return;
            visited[nodeId] = true;
            callback(this.nodesSet[nodeId], 'invalidate');
            this.getDependenciesInner(nodeId, Graph.EDGE_HARD).forEach(
                (toId) => {
                    flushTransitive(toId);
                }
            );
        };
        Object.keys(this.dirtyNodes).forEach((nodeId) => {
            if (this.dirtyNodes[nodeId]) {
                flushTransitive(nodeId);
                delete this.dirtyNodes[nodeId];
            }
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
            'digraph debug {',
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
            const allDestinations = Array.from(
                new Set(Object.keys(this.graph[fromId]))
            );
            allDestinations.forEach((toId) => {
                if (this.graph[fromId][toId] & Graph.EDGE_HARD) {
                    lines.push(
                        `  item_${fromId} -> item_${toId} [style="solid"];`
                    );
                }
                if (this.graph[fromId][toId] & Graph.EDGE_SOFT) {
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
