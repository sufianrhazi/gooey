import * as log from './log';
import type { ProcessAction } from './types';
import { groupBy } from './util';

type GraphOperations =
    | {
          fromId: string;
          toId: string;
          kind: number;
          type: 'add' | 'remove';
      }
    | {
          nodeId: string;
          type: 'dirty';
      };

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

    private pendingOperations: GraphOperations[];

    private graph: Record<string, Record<string, number>>;
    private reverseGraph: Record<string, Record<string, number>>;

    constructor() {
        this.nextId = 1;
        this.nodesSet = {};
        this.retained = {};
        this.graph = {};
        this.reverseGraph = {};
        this.dirtyNodes = {};
        this.pendingOperations = [];
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
        this.pendingOperations.push({
            type: 'dirty',
            nodeId: this.getId(node),
        });
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

    breakCycle(node: Type) {
        const nodeId = this.getId(node);
        const { otherNodes, otherNodeIds, isCycle } =
            this.getRecursiveDependenciesInner(nodeId);
        log.assert(isCycle, 'breakCycle did not find a cycle');

        this.getReverseDependenciesInner(nodeId, Graph.EDGE_HARD).forEach(
            (fromId) => {
                if (otherNodeIds[fromId]) {
                    this.removeEdge(
                        this.nodesSet[fromId],
                        node,
                        Graph.EDGE_HARD
                    );
                }
            }
        );

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
        log.assert(
            !!this.nodesSet[fromId],
            'cannot add edge from node that does not exist'
        );
        log.assert(
            !!this.nodesSet[toId],
            'cannot add edge to node that does not exist'
        );
        this.pendingOperations.push({ fromId, toId, kind, type: 'add' });
    }

    _test_processPending() {
        this.processPendingOperations();
    }

    private processPendingOperations() {
        this.pendingOperations.forEach((op) => {
            switch (op.type) {
                case 'add':
                    this.graph[op.fromId][op.toId] =
                        (this.graph[op.fromId][op.toId] || 0) | op.kind;
                    this.reverseGraph[op.toId][op.fromId] =
                        (this.reverseGraph[op.toId][op.fromId] || 0) | op.kind;
                    break;
                case 'remove':
                    this.graph[op.fromId][op.toId] =
                        (this.graph[op.fromId][op.toId] || 0) & ~op.kind;
                    this.reverseGraph[op.toId][op.fromId] =
                        (this.reverseGraph[op.toId][op.fromId] || 0) & ~op.kind;
                    break;
                case 'dirty':
                    this.dirtyNodes[op.nodeId] = true;
                    break;
                default:
                    log.assertExhausted(op);
            }
        });
        this.pendingOperations = [];
    }

    /**
     * Returns true if edge is removed
     */
    removeEdge(fromNode: Type, toNode: Type, kind: 0b01 | 0b10 | 0b11) {
        const fromId = this.getId(fromNode);
        const toId = this.getId(toNode);
        log.assert(
            !!this.nodesSet[fromId],
            'cannot remove edge from node that does not exist'
        );
        log.assert(
            !!this.nodesSet[toId],
            'cannot remove edge to node that does not exist'
        );
        this.pendingOperations.push({ fromId, toId, kind, type: 'remove' });
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
                this.pendingOperations.push({
                    fromId,
                    toId,
                    kind: Graph.EDGE_HARD,
                    type: 'remove',
                });
            }
        });
        newFromIds.forEach((fromId) => {
            if (!beforeFromSet.has(fromId)) {
                this.pendingOperations.push({
                    fromId,
                    toId,
                    kind: Graph.EDGE_HARD,
                    type: 'add',
                });
            }
        });
    }

    removeIncoming(node: Type) {
        const nodeId = this.getId(node);

        const fromIds = this.getReverseDependenciesInner(nodeId);
        fromIds.forEach((fromId) => {
            if (this.reverseGraph[nodeId][fromId] & Graph.EDGE_HARD) {
                this.graph[fromId][nodeId] =
                    (this.graph[fromId][nodeId] || 0) & ~Graph.EDGE_HARD;
                this.reverseGraph[nodeId][fromId] =
                    (this.reverseGraph[nodeId][fromId] || 0) & ~Graph.EDGE_HARD;
            }
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
    process(callback: (node: Type, action: ProcessAction) => boolean): void {
        this.processPendingOperations();
        const toposort = this._toposortRetained();

        // First pass: traverse the _retained_ dirty nodes in topological order
        for (let i = 0; i < toposort.length; ++i) {
            const nodeIds: string[] = [];
            toposort[i].forEach((vertex) => {
                const nodeId = vertex.nodeId;
                nodeIds.push(nodeId);
                let action: ProcessAction | null = null;
                if (toposort[i].length > 1) {
                    action = 'cycle';
                } else if (this.dirtyNodes[nodeId]) {
                    action = 'recalculate';
                }

                if (action) {
                    let shouldPropagate = true;
                    let isError = false;
                    try {
                        shouldPropagate = callback(
                            this.nodesSet[nodeId],
                            action
                        );
                    } catch (e) {
                        isError = true;
                        log.error('Caught error during flush', e);
                    }
                    delete this.dirtyNodes[nodeId];
                    if (shouldPropagate || isError) {
                        this.getDependenciesInner(
                            nodeId,
                            Graph.EDGE_HARD
                        ).forEach((toId) => {
                            this.dirtyNodes[toId] = true;
                        });
                    }
                }
                if (this.pendingOperations.length > 0) {
                    log.warn('Graph mutated while processing, restarting...');
                    return this.process(callback);
                }
            });

            // If we hit a cycle, manually mark the cycle as _not_ dirty so we can safely proceed
            if (toposort[i].length > 1) {
                toposort[i].forEach((vertex) => {
                    delete this.dirtyNodes[vertex.nodeId];
                });
            }
        }

        // Second pass: the remaining dirty nodes are not retained.
        // All dirty nodes and their dependencies should be invalidated, so the
        // next time they come online they have fresh data.
        const isInvalidated: Record<string, boolean> = {};
        const invalidate = (nodeId: string) => {
            if (isInvalidated[nodeId]) return;
            callback(this.nodesSet[nodeId], 'invalidate');
            isInvalidated[nodeId] = true;
            this.getDependenciesInner(nodeId).forEach((toId) => {
                invalidate(toId);
            });
        };

        Object.keys(this.dirtyNodes).forEach((nodeId) => {
            if (this.dirtyNodes[nodeId]) {
                invalidate(nodeId);
            }
        });
        this.dirtyNodes = {};
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
            'digraph Graph {',
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

        // Pending!!!
        const newGraph: Record<string, Record<string, number>> = {};
        const newReverseGraph: Record<string, Record<string, number>> = {};
        const newDirtyNodes = { ...this.dirtyNodes };
        nodeIds.forEach((nodeId) => {
            newGraph[nodeId] = { ...this.graph[nodeId] };
            newReverseGraph[nodeId] = { ...this.reverseGraph[nodeId] };
        });

        this.pendingOperations.forEach((op) => {
            switch (op.type) {
                case 'add':
                    newGraph[op.fromId][op.toId] =
                        (newGraph[op.fromId][op.toId] || 0) | op.kind;
                    newReverseGraph[op.toId][op.fromId] =
                        (newReverseGraph[op.toId][op.fromId] || 0) | op.kind;
                    break;
                case 'remove':
                    newGraph[op.fromId][op.toId] =
                        (newGraph[op.fromId][op.toId] || 0) & ~op.kind;
                    newReverseGraph[op.toId][op.fromId] =
                        (newReverseGraph[op.toId][op.fromId] || 0) & ~op.kind;
                    break;
                case 'dirty':
                    newDirtyNodes[op.nodeId] = true;
                    break;
                default:
                    log.assertExhausted(op);
            }
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
                    fillcolor: this.dirtyNodes[nodeId]
                        ? '#FFDDDD'
                        : newDirtyNodes[nodeId]
                        ? '#FFFFDD'
                        : '#DDDDDD',
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
                new Set([
                    ...Object.keys(this.graph[fromId]),
                    ...Object.keys(newGraph[fromId]),
                ])
            );
            allDestinations.forEach((toId) => {
                if (
                    this.graph[fromId][toId] & Graph.EDGE_HARD &&
                    newGraph[fromId][toId] & Graph.EDGE_HARD
                ) {
                    lines.push(
                        `  item_${fromId} -> item_${toId} [style="solid"];`
                    );
                }
                if (
                    !(this.graph[fromId][toId] & Graph.EDGE_HARD) &&
                    newGraph[fromId][toId] & Graph.EDGE_HARD
                ) {
                    lines.push(
                        `  item_${fromId} -> item_${toId} [style="solid",color="#0000FF"];`
                    );
                }
                if (
                    this.graph[fromId][toId] & Graph.EDGE_HARD &&
                    !(newGraph[fromId][toId] & Graph.EDGE_HARD)
                ) {
                    lines.push(
                        `  item_${fromId} -> item_${toId} [style="solid",color="#FF0000"];`
                    );
                }
                if (
                    this.graph[fromId][toId] & Graph.EDGE_SOFT &&
                    newGraph[fromId][toId] & Graph.EDGE_SOFT
                ) {
                    lines.push(
                        `  item_${fromId} -> item_${toId} [style="dashed"];`
                    );
                }
                if (
                    !(this.graph[fromId][toId] & Graph.EDGE_SOFT) &&
                    newGraph[fromId][toId] & Graph.EDGE_SOFT
                ) {
                    lines.push(
                        `  item_${fromId} -> item_${toId} [style="dashed",color="#0000FF"];`
                    );
                }
                if (
                    this.graph[fromId][toId] & Graph.EDGE_SOFT &&
                    !(newGraph[fromId][toId] & Graph.EDGE_SOFT)
                ) {
                    lines.push(
                        `  item_${fromId} -> item_${toId} [style="dashed",color="#FF0000"];`
                    );
                }
            });
        });

        lines.push('}');

        return lines.join('\n');
    }
}
