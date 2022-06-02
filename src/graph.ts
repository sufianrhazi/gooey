import * as log from './log';
import type { ProcessAction } from './types';
import { groupBy } from './util';
import { tarjanStronglyConnected } from './tarjan';

const VISITED_NO_CYCLE = 1 as const;
const VISITED_CYCLE = 2 as const;

type EdgeList = [fromId: string, toId: string, edgeKind: number][];
type EdgeMap = Record<string, Record<string, number>>;

function edgeMapToEdgeList(graph: EdgeMap): EdgeList {
    const edgeList: EdgeList = [];
    Object.entries(graph).forEach(([fromId, toIds]) => {
        Object.entries(toIds).forEach(([toId, edgeKind]) => {
            if (edgeKind > 0) {
                edgeList.push([fromId, toId, edgeKind]);
            }
        });
    });
    return edgeList;
}

function edgeListToEdgeMap(edgeList: EdgeList): EdgeMap {
    const graph: EdgeMap = {};
    edgeList.forEach(([fromId, toId, edgeKind]) => {
        if (edgeKind > 0) {
            if (!graph[fromId]) graph[fromId] = {};
            graph[fromId][toId] = edgeKind;
        }
    });
    return graph;
}

enum PendingOperationType {
    NODE_ADD,
    NODE_DELETE,
    EDGE_ADD,
    EDGE_DELETE,
}
type PendingOperation<Type extends object> =
    | {
          type: typeof PendingOperationType.NODE_ADD;
          node: Type;
      }
    | {
          type: typeof PendingOperationType.NODE_DELETE;
          nodeId: string;
      }
    | {
          type: typeof PendingOperationType.EDGE_ADD;
          fromId: string;
          toId: string;
          kind: 0b01 | 0b10;
      }
    | {
          type: typeof PendingOperationType.EDGE_DELETE;
          fromId: string;
          toId: string;
          kind: 0b01 | 0b10 | 0b11;
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

    private rootNodes: Record<string, true>;
    private dirtyNodes: Record<string, true>;
    private recentDirtyNodes: undefined | string[];
    private informedCycles: Map<string, boolean>;
    private knownCycles: Map<
        string,
        {
            connectedComponentEdges: Record<string, Record<string, number>>;
            connectedComponentNodes: Set<string>;
            isInformed: boolean;
            initiallyDirty: boolean;
        }
    >;
    private minCycleBrokenIndex: null | number;

    /**
     * The subgraph that has been added but not yet ordered
     */
    private pendingOperations: PendingOperation<Type>[];
    private pendingNodes: Record<string, boolean>;

    /**
     * A mapping of nodeId to index in topological order
     */
    private topologicalIndex: Record<string, number>;
    /**
     * The list of vertices maintained in topological order
     */
    private topologicallyOrderedNodes: (Type | undefined)[];
    /**
     * A mapping of nodeId to whether or not the node is visited while reordering
     * Note: this is internal state to the process() function but global to reduce object memory thrash
     */
    private reorderingVisitedState: Map<string, boolean>;

    private graph: EdgeMap;
    private reverseGraph: EdgeMap;

    constructor() {
        this.topologicalIndex = {};
        this.topologicallyOrderedNodes = [];

        this.pendingOperations = [];
        this.pendingNodes = {};

        this.rootNodes = {};
        this.graph = {};
        this.reverseGraph = {};

        this.dirtyNodes = {};
        this.recentDirtyNodes = undefined;

        this.knownCycles = new Map();
        this.informedCycles = new Map();
        this.reorderingVisitedState = new Map();
        this.minCycleBrokenIndex = null;
    }

    private getId(node: Type): string {
        return (node as any).$__id.toString();
    }

    private hasNodeInner(nodeId: string) {
        return (
            this.topologicalIndex[nodeId] !== undefined ||
            this.pendingNodes[nodeId]
        );
    }

    addNode(node: Type): boolean {
        const nodeId = this.getId(node);
        if (this.hasNodeInner(nodeId)) return false;
        this.pendingOperations.push({
            type: PendingOperationType.NODE_ADD,
            node,
        });
        this.pendingNodes[nodeId] = true;
        return true;
    }

    private performAddNodeInner(node: Type, nodeId: string) {
        this.graph[nodeId] = {};
        this.reverseGraph[nodeId] = {};
        this.topologicalIndex[nodeId] = this.topologicallyOrderedNodes.length;
        this.topologicallyOrderedNodes.push(node);
        return true;
    }

    markNodeCycle(node: Type): void {
        const nodeId = this.getId(node);
        const cycleInfo = this.knownCycles.get(nodeId);
        if (cycleInfo) {
            cycleInfo.isInformed = true;
        } else {
            this.informedCycles.set(this.getId(node), true);
        }
    }

    markNodeDirty(node: Type): void {
        const nodeId = this.getId(node);
        const cycleInfo = this.knownCycles.get(nodeId);
        if (cycleInfo) {
            cycleInfo.connectedComponentNodes.forEach((cycleId) => {
                this.markNodeDirtyInner(cycleId);
            });
        } else {
            this.markNodeDirtyInner(this.getId(node));
        }
    }

    private markNodeDirtyInner(nodeId: string): void {
        this.dirtyNodes[nodeId] = true;
        if (this.recentDirtyNodes) this.recentDirtyNodes.push(nodeId);
    }

    private markNodeCleanInner(nodeId: string): void {
        delete this.dirtyNodes[nodeId];
        this.informedCycles.set(nodeId, false);
    }

    private isNodeDirty(nodeId: string) {
        return !!this.dirtyNodes[nodeId];
    }

    getUnorderedDirtyNodes() {
        return Object.keys(this.dirtyNodes).filter(
            (nodeId) => !!this.dirtyNodes[nodeId]
        );
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
            this.hasNodeInner(fromId),
            'cannot add edge from node that does not exist'
        );
        log.assert(
            this.hasNodeInner(toId),
            'cannot add edge to node that does not exist'
        );
        this.pendingOperations.push({
            type: PendingOperationType.EDGE_ADD,
            fromId,
            toId,
            kind,
        });
    }

    private performAddEdgeInner(
        fromId: string,
        toId: string,
        kind: 0b01 | 0b10
    ) {
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
            this.hasNodeInner(fromId),
            'cannot remove edge from node that does not exist'
        );
        log.assert(
            this.hasNodeInner(toId),
            'cannot remove edge to node that does not exist'
        );

        this.pendingOperations.push({
            type: PendingOperationType.EDGE_DELETE,
            fromId,
            toId,
            kind,
        });
    }

    private performRemoveEdgeInner(
        fromId: string,
        toId: string,
        kind: 0b01 | 0b10 | 0b11
    ) {
        this.graph[fromId][toId] = (this.graph[fromId][toId] || 0) & ~kind;
        this.reverseGraph[toId][fromId] =
            (this.reverseGraph[toId][fromId] || 0) & ~kind;
        const cycleInfo = this.knownCycles.get(fromId);
        if (cycleInfo && cycleInfo.connectedComponentEdges[fromId]?.[toId]) {
            cycleInfo.connectedComponentEdges[fromId][toId] =
                cycleInfo.connectedComponentEdges[fromId][toId] & ~kind;

            // Note: we are getting the topological ordering + components for **all** of the nodes reachable from these
            // components. This is a conservative guess, which uses the assumption that the presence of cycles can cause
            // incorrect orderings with the Pearce Kelly algorithm and we need to repair them.
            //
            // TODO: determine if we could only look at _just_ cycleInfo.connectedComponentEdges instead of this.graph
            const newComponents = tarjanStronglyConnected(
                this.graph,
                Array.from(cycleInfo.connectedComponentNodes)
            );

            // The edge deletion broke the cycle into multiple components
            const edgeList: EdgeList = edgeMapToEdgeList(
                cycleInfo.connectedComponentEdges
            );
            const affectedIndexes: number[] = [];
            const topologicallyCorrectNodes: {
                nodeId: string;
                node: Type | undefined;
            }[] = [];
            newComponents.forEach((component) => {
                // Obtain the current indexes and topologically correct ordering of the entire component
                component.forEach((nodeId) => {
                    const nodeIndex = this.topologicalIndex[nodeId];
                    affectedIndexes.push(nodeIndex);
                    topologicallyCorrectNodes.push({
                        nodeId,
                        node: this.topologicallyOrderedNodes[nodeIndex],
                    });
                });

                // Update all the knownCycles data structures to reflect the new reality, and collect the correct ordering
                const componentIntersection = new Set(
                    [...component].filter((nodeId) =>
                        cycleInfo.connectedComponentNodes.has(nodeId)
                    )
                );
                const isCycle = componentIntersection.size > 1;
                if (isCycle) {
                    const reducedConnectedComponentEdges = edgeListToEdgeMap(
                        edgeList.filter(
                            ([fromId, toId, _edgeKind]) =>
                                componentIntersection.has(fromId) &&
                                componentIntersection.has(toId)
                        )
                    );
                    componentIntersection.forEach((nodeId) => {
                        this.knownCycles.set(nodeId, {
                            connectedComponentEdges:
                                reducedConnectedComponentEdges,
                            connectedComponentNodes: componentIntersection,
                            isInformed:
                                !!this.knownCycles.get(nodeId)?.isInformed,
                            initiallyDirty:
                                !!this.knownCycles.get(nodeId)?.initiallyDirty,
                        });
                    });
                } else {
                    componentIntersection.forEach((nodeId) => {
                        this.knownCycles.delete(nodeId);
                        this.markNodeDirtyInner(nodeId);
                    });
                }
            });

            // If the current indexes are already in topological order, no need to resort
            let needsResort = false;
            for (let i = 1; i < affectedIndexes.length; ++i) {
                if (affectedIndexes[i - 1] >= affectedIndexes[i]) {
                    needsResort = true;
                    break;
                }
            }
            if (needsResort) {
                affectedIndexes.sort((a, b) => a - b);
                for (let i = 0; i < affectedIndexes.length; ++i) {
                    const entry = topologicallyCorrectNodes[i];
                    this.topologicalIndex[entry.nodeId] = affectedIndexes[i];
                    this.topologicallyOrderedNodes[affectedIndexes[i]] =
                        entry.node;
                }
                this.minCycleBrokenIndex =
                    this.minCycleBrokenIndex === null
                        ? affectedIndexes[0]
                        : Math.min(
                              this.minCycleBrokenIndex,
                              affectedIndexes[0]
                          );
            }
        }
    }

    removeNode(node: Type) {
        const nodeId = this.getId(node);
        this.removeNodeInner(nodeId);
    }

    private removeNodeInner(nodeId: string) {
        this.pendingOperations.push({
            type: PendingOperationType.NODE_DELETE,
            nodeId: nodeId,
        });
        this.pendingNodes[nodeId] = false;
    }

    private performRemoveNodeInner(nodeId: string) {
        // Note: this can be performed without reordering topological ordering,
        // since node and edge removal does not change the topological order.
        log.assert(!this.rootNodes[nodeId], 'attempted to remove a root node'); // Is this right?
        const toIds = this.getDependenciesInner(nodeId, Graph.EDGE_ANY);
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

        this.topologicallyOrderedNodes[this.topologicalIndex[nodeId]] =
            undefined;
        delete this.topologicalIndex[nodeId];
        this.markNodeCleanInner(nodeId);
        delete this.rootNodes[nodeId];
        const cycleInfo = this.knownCycles.get(nodeId);
        if (cycleInfo) {
            // TODO: do we need to "fix" the existing cycles? Yes, yes we do
            throw new Error('Not yet implemented');
        }
    }

    markRoot(node: Type) {
        const nodeId = this.getId(node);
        log.assert(!this.rootNodes[nodeId], 'double mark root node');
        this.rootNodes[nodeId] = true;
    }

    unmarkRoot(node: Type) {
        const nodeId = this.getId(node);
        log.assert(this.rootNodes[nodeId], 'double unmark root node');
        delete this.rootNodes[nodeId];
    }

    replaceIncoming(node: Type, newIncomingNodes: Type[]) {
        const toId = this.getId(node);

        const beforeFromIds = this.getReverseDependenciesInner(
            toId,
            Graph.EDGE_HARD
        );
        const beforeFromSet = new Set(beforeFromIds);
        const newFromMap = new Map<string, Type>();
        newIncomingNodes.forEach((fromNode) => {
            const nodeId = this.getId(fromNode);
            newFromMap.set(nodeId, fromNode);
        });
        const removedFromNodes: Type[] = [];
        const newFromNodes: Type[] = [];
        beforeFromIds.forEach((fromId) => {
            if (!newFromMap.has(fromId)) {
                this.removeEdgeInner(fromId, toId, Graph.EDGE_HARD);
                const node =
                    this.topologicallyOrderedNodes[
                        this.topologicalIndex[fromId]
                    ];
                log.assert(node, 'replaceIncoming removed dead from node');
                removedFromNodes.push(node);
            }
        });
        newFromMap.forEach((fromNode, fromId) => {
            if (!beforeFromSet.has(fromId)) {
                this.addEdgeInner(fromId, toId, Graph.EDGE_HARD);
                newFromNodes.push(fromNode);
            }
        });
        return {
            removed: removedFromNodes,
            added: Array.from(newFromMap.values()),
        };
    }

    /**
     * Get dependencies (specify EDGE_SOFT, EDGE_HARD, or EDGE_ANY)
     */
    private getDependenciesInner(
        nodeId: string,
        edgeType: 0b01 | 0b10 | 0b11
    ): string[] {
        if (!this.graph[nodeId]) return [];
        const dependencies: string[] = [];
        Object.keys(this.graph[nodeId]).forEach((toId) => {
            if ((this.graph[nodeId][toId] || 0) & edgeType) {
                dependencies.push(toId);
            }
        });
        return dependencies;
    }

    /**
     * Get reverse dependencies (either EDGE_SOFT or EDGE_HARD)
     */
    private getReverseDependenciesInner(
        nodeId: string,
        edgeType: 0b01 | 0b10 | 0b11 = Graph.EDGE_ANY
    ): string[] {
        if (!this.reverseGraph[nodeId]) return [];
        const dependencies: string[] = [];
        Object.keys(this.reverseGraph[nodeId]).forEach((fromId) => {
            if ((this.reverseGraph[nodeId][fromId] || 0) & edgeType) {
                dependencies.push(fromId);
            }
        });
        return dependencies;
    }

    /**
     * Get list of things need to be updated, when fromNode has changed?
     */
    _test_getDependencies(
        fromNode: Type,
        edgeType: 0b01 | 0b10 | 0b11 = Graph.EDGE_ANY
    ): Type[] {
        const nodeId = this.getId(fromNode);
        return this.getDependenciesInner(nodeId, edgeType).map(
            (toId) =>
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                this.topologicallyOrderedNodes[this.topologicalIndex[toId]]!
        );
    }

    /*
     * Core Processing Algorithm
     * =========================
     *
     * In topological order, recalculate all of the dirty nodes that reach root nodes; propagating dirtiness if
     * propagation is requested.
     *
     * For all remaining dirty nodes (which do not reach root nodes), flush them & all their reachable nodes.
     *
     * If a strongly connected component is identified, it should be treated as a single unit:
     * - If any node is dirtied or flushed; all nodes are
     *
     * Topological order is maintained by the PK algorithm, outlined in:
     * - David J. Pearce and Paul H. J. Kelly. 2007. A dynamic topological sort algorithm for directed acyclic graphs. ACM J. Exp. Algorithmics 11 (2006), 1.7–es.
     *   https://doi.org/10.1145/1187436.1210590
     * - Available from https://whileydave.com/publications/pk07_jea/
     *
     * TODO: As a performance optimization, consider implementing "A Batch Algorithm for Maintaining a Topological
     * Order"
     */
    process(callback: (node: Type, action: ProcessAction) => boolean): void {
        const forwardSet = new Set<string>();
        const reverseSet = new Set<string>();

        // Affected region (lower bound, upper bound)
        let lowerBound = 0;
        let upperBound = 0;
        let reordered = false;
        const connectedComponentNodes = new Set<string>();
        const connectedComponentEdges: Record<
            string,
            Record<string, number>
        > = {};

        const dfsF = (nodeId: string): boolean => {
            this.reorderingVisitedState.set(nodeId, false);
            forwardSet.add(nodeId);
            return this.getDependenciesInner(nodeId, Graph.EDGE_ANY).some(
                (toId) => {
                    if (this.topologicalIndex[toId] === upperBound) {
                        return true; // We have identified a new cycle!
                    }
                    // Only visit nodes that are in affected region
                    //
                    // **or** nodes that are part of a strongly connected component
                    // Note: this consequent is a diversion from the Pearce-Kelly algorithm to account for cycles which we treat as a single strongly connected component,
                    // in the presence of adding an edge to a cycle, the bounds must extend to the min/max bound of all nodes within the strongly connected component
                    if (
                        !this.reorderingVisitedState.has(toId) &&
                        (this.topologicalIndex[toId] < upperBound ||
                            this.knownCycles.has(toId))
                    ) {
                        if (dfsF(toId)) return true;
                    }
                    return false;
                }
            );
        };

        const dfsB = (nodeId: string) => {
            this.reorderingVisitedState.set(nodeId, true);
            reverseSet.add(nodeId);
            this.getReverseDependenciesInner(nodeId, Graph.EDGE_ANY).forEach(
                (fromId) => {
                    // Only visit nodes that are in affected region
                    //
                    // **or** nodes that are part of a strongly connected component
                    // Note: this consequent is a diversion from the Pearce-Kelly algorithm to account for cycles which we treat as a single strongly connected component,
                    // in the presence of adding an edge to a cycle, the bounds must extend to the min/max bound of all nodes within the strongly connected component
                    if (
                        !this.reorderingVisitedState.has(fromId) &&
                        (lowerBound < this.topologicalIndex[fromId] ||
                            this.knownCycles.has(fromId))
                    ) {
                        dfsB(fromId);
                    }
                }
            );
        };

        const stronglyConnectedVisited: Map<string, number> = new Map();
        const dfsStronglyConnected = (nodeId: string): boolean => {
            stronglyConnectedVisited.set(nodeId, VISITED_NO_CYCLE);
            forwardSet.add(nodeId);
            let reachesCycle = false;
            this.getDependenciesInner(nodeId, Graph.EDGE_ANY).forEach(
                (toId) => {
                    if (this.topologicalIndex[toId] === upperBound) {
                        // We identified the cycle
                        // Add the current node to the connected component
                        stronglyConnectedVisited.set(nodeId, VISITED_CYCLE);
                        connectedComponentNodes.add(nodeId);
                        stronglyConnectedVisited.set(toId, VISITED_CYCLE);
                        connectedComponentNodes.add(toId);
                        if (!connectedComponentEdges[nodeId]) {
                            connectedComponentEdges[nodeId] = {};
                        }
                        connectedComponentEdges[nodeId][toId] =
                            this.graph[nodeId][toId];
                        reachesCycle = true;
                        return;
                    }
                    let partOfComponent = false;

                    if (!stronglyConnectedVisited.has(toId)) {
                        partOfComponent = dfsStronglyConnected(toId);
                    }
                    if (stronglyConnectedVisited.get(toId) === VISITED_CYCLE) {
                        partOfComponent = true;
                    }
                    if (partOfComponent) {
                        reachesCycle = true;
                        // We have identified a new cycle!
                        // This node is part of a connected component
                        stronglyConnectedVisited.set(nodeId, VISITED_CYCLE);
                        connectedComponentNodes.add(nodeId);
                        if (!connectedComponentEdges[nodeId]) {
                            connectedComponentEdges[nodeId] = {};
                        }
                        connectedComponentEdges[nodeId][toId] =
                            this.graph[nodeId][toId];
                    }
                }
            );
            return reachesCycle;
        };

        const reorder = () => {
            const sortedReverseSet = Array.from(reverseSet);
            sortedReverseSet.sort(
                (a, b) => this.topologicalIndex[a] - this.topologicalIndex[b]
            );
            const sortedForwardSet = Array.from(forwardSet);
            sortedForwardSet.sort(
                (a, b) => this.topologicalIndex[a] - this.topologicalIndex[b]
            );
            const correctOrderNodeIds = [
                ...sortedReverseSet,
                ...sortedForwardSet,
            ];
            const affectedIndexes = correctOrderNodeIds
                .map((nodeId) => this.topologicalIndex[nodeId])
                .sort((a, b) => a - b);
            const correctNodes = correctOrderNodeIds.map(
                (nodeId) =>
                    this.topologicallyOrderedNodes[
                        this.topologicalIndex[nodeId]
                    ]
            );
            affectedIndexes.forEach((affectedIndex, i) => {
                this.topologicallyOrderedNodes[affectedIndex] = correctNodes[i];
                this.topologicalIndex[correctOrderNodeIds[i]] = affectedIndex;
            });
        };

        const addEdge = (fromId: string, toId: string) => {
            // Note: this is a diversion from the Pearce-Kelly algorithm to account for cycles which we treat as a single strongly connected component,
            // in the presence of adding an edge to a cycle, the bounds must extend to the min/max bound of all nodes within the strongly connected component
            const toCycleInfo = this.knownCycles.get(toId);
            if (toCycleInfo) {
                lowerBound = this.topologicallyOrderedNodes.length;
                toCycleInfo.connectedComponentNodes.forEach((toCycleId) => {
                    lowerBound = Math.min(
                        lowerBound,
                        this.topologicalIndex[toCycleId]
                    );
                });
            } else {
                lowerBound = this.topologicalIndex[toId];
            }

            const fromCycleInfo = this.knownCycles.get(fromId);
            if (fromCycleInfo) {
                upperBound = 0;
                fromCycleInfo.connectedComponentNodes.forEach((fromCycleId) => {
                    upperBound = Math.max(
                        upperBound,
                        this.topologicalIndex[fromCycleId]
                    );
                });
            } else {
                upperBound = this.topologicalIndex[fromId];
            }

            if (lowerBound < upperBound) {
                const isCycle = dfsF(toId);
                if (isCycle) {
                    stronglyConnectedVisited.clear();
                    dfsStronglyConnected(toId);
                    if (!connectedComponentEdges[fromId]) {
                        connectedComponentEdges[fromId] = {};
                    }
                    connectedComponentEdges[fromId][toId] =
                        this.graph[fromId][toId];
                    connectedComponentNodes.forEach((nodeId) => {
                        const cycleInfo = this.knownCycles.get(nodeId);

                        const isInformed: boolean =
                            !!cycleInfo?.isInformed ||
                            !!this.informedCycles.get(nodeId);

                        const initiallyDirty = !!this.dirtyNodes[nodeId];

                        this.knownCycles.set(nodeId, {
                            connectedComponentEdges,
                            connectedComponentNodes,
                            isInformed,
                            initiallyDirty,
                        });
                    });
                } else {
                    dfsB(fromId);
                    reorder();
                    reordered = true;
                }
                forwardSet.clear();
                reverseSet.clear();
                this.reorderingVisitedState.clear();
            }
        };

        const processPendingEdges = () => {
            let minLowerBound: number | null = null;

            //
            // First construct a graph of *just* the edge additions to the graph and the final set of nodes being added
            //
            const nodesToAdd: Record<string, Type> = {};
            const pendingGraph: EdgeMap = {};
            const filteredPendingOperations = this.pendingOperations.filter(
                (pendingOperation) => {
                    switch (pendingOperation.type) {
                        case PendingOperationType.NODE_ADD:
                            nodesToAdd[this.getId(pendingOperation.node)] =
                                pendingOperation.node;
                            // We are handling node additions here in a specific order
                            return false;
                        case PendingOperationType.NODE_DELETE:
                            if (nodesToAdd[pendingOperation.nodeId]) {
                                delete nodesToAdd[pendingOperation.nodeId];
                                return false;
                            }
                            // Deletions of nodes not added in this batch is handled below
                            return true;
                        case PendingOperationType.EDGE_ADD:
                            if (!pendingGraph[pendingOperation.fromId]) {
                                pendingGraph[pendingOperation.fromId] = {};
                            }
                            pendingGraph[pendingOperation.fromId][
                                pendingOperation.toId
                            ] =
                                (pendingGraph[pendingOperation.fromId][
                                    pendingOperation.toId
                                ] || 0) | pendingOperation.kind;
                            // All edge manipulations occur below
                            return true;
                        case PendingOperationType.EDGE_DELETE:
                            if (!pendingGraph[pendingOperation.fromId]) {
                                pendingGraph[pendingOperation.fromId] = {};
                            }
                            pendingGraph[pendingOperation.fromId][
                                pendingOperation.toId
                            ] =
                                (pendingGraph[pendingOperation.fromId][
                                    pendingOperation.toId
                                ] || 0) & ~pendingOperation.kind;
                            // All edge manipulations occur below
                            return true;
                        default:
                            log.assertExhausted(
                                pendingOperation,
                                'unexpected pending operation'
                            );
                    }
                }
            );
            this.pendingOperations = [];

            //
            // Pre-sort the final set of nodes to be added
            //
            const visited: Record<string, boolean> = {};
            const pendingNodeIdIndex: Record<string, number> = {};
            let assignedIndex = 0;

            const assignIndex = (nodeId: string): void => {
                if (visited[nodeId]) return;
                visited[nodeId] = true;
                const toEdges = pendingGraph[nodeId] || {};
                Object.keys(toEdges).forEach((toId) => {
                    if (toEdges[toId] > 0) {
                        // If we have EDGE_*, the edge was not removed immediately after add
                        assignIndex(toId);
                    }
                });
                pendingNodeIdIndex[nodeId] = assignedIndex;
                assignedIndex += 1;
            };

            // visit the pending graph, assigning indexes such that:
            // for every (a -> b), index b < index a; unless there is a cycle (ignoring edges that close a cycle)
            // This is a (partial) reverse topological sort
            const pendingNodeIds: string[] = [];
            Object.keys(nodesToAdd).forEach((nodeId) => {
                assignIndex(nodeId);
                pendingNodeIds.push(nodeId);
            });

            // Sort the pending nodes by the index (reversed) so they are in
            // (partial) topological order
            pendingNodeIds.sort(
                (a, b) => pendingNodeIdIndex[b] - pendingNodeIdIndex[a]
            );

            //
            // Add the final set of added nodes in this partial order.
            // This ensures that as we add new edges for new nodes, we do not need to resort them.
            pendingNodeIds.forEach((nodeId) => {
                const node = nodesToAdd[nodeId];
                if (node) {
                    this.performAddNodeInner(node, nodeId);
                }
            });

            //
            // Process the remaining pending operations normally
            //
            filteredPendingOperations.forEach((pendingOperation) => {
                switch (pendingOperation.type) {
                    case PendingOperationType.NODE_ADD:
                        log.assert(false, 'Incorrectly adding nodes twice');
                        break;
                    case PendingOperationType.NODE_DELETE:
                        this.performRemoveNodeInner(pendingOperation.nodeId);
                        break;
                    case PendingOperationType.EDGE_ADD:
                        this.performAddEdgeInner(
                            pendingOperation.fromId,
                            pendingOperation.toId,
                            pendingOperation.kind
                        );
                        addEdge(pendingOperation.fromId, pendingOperation.toId);
                        minLowerBound =
                            minLowerBound === null
                                ? lowerBound
                                : Math.min(minLowerBound, lowerBound);
                        break;
                    case PendingOperationType.EDGE_DELETE:
                        this.performRemoveEdgeInner(
                            pendingOperation.fromId,
                            pendingOperation.toId,
                            pendingOperation.kind
                        );
                        break;
                    default:
                        log.assertExhausted(
                            pendingOperation,
                            'unexpected pending operation'
                        );
                }
            });

            return minLowerBound || 0;
        };

        let reachesRootCache: Record<string, boolean> = {};
        const reachesRoot = (nodeId: string) => {
            const visited: Record<string, boolean> = {};
            const visit = (id: string): boolean => {
                if (this.rootNodes[id]) {
                    reachesRootCache[id] = true;
                }
                if (reachesRootCache[id]) {
                    return true;
                }
                if (visited[id]) return false;
                visited[id] = true;
                return this.getDependenciesInner(id, Graph.EDGE_ANY).some(
                    (toId) => visit(toId)
                );
            };
            return visit(nodeId);
        };

        // Step one: batch process pending edges
        processPendingEdges();

        // Step two: start processing dirty nodes in order
        for (
            let index = 0;
            index < this.topologicallyOrderedNodes.length;
            ++index
        ) {
            const node = this.topologicallyOrderedNodes[index];
            if (!node) {
                continue;
            }
            const nodeId = this.getId(node);
            if (!this.dirtyNodes[nodeId]) {
                continue;
            }
            if (!reachesRoot(nodeId)) {
                continue;
            }

            let done = false;
            const dirtyNodesUnknownPosition = new Set<string>();
            this.minCycleBrokenIndex = null;

            /** The set of node ids that have been processed and we will mark as clean after propagation */
            const processedNodeIds = new Set<string>();

            while (!done) {
                const cycleUnconfirmedNodes = new Set<string>();
                this.recentDirtyNodes = [];
                const cycleInfo = this.knownCycles.get(nodeId);
                if (cycleInfo) {
                    // If the node is known to be a cycle, we must treat **all** of
                    // the nodes in the strongly connected component as one.
                    //
                    // That is to say, we:
                    // - invalidate all nodes first (even if they are not dirty)
                    // - notify each they are a cycle (even if they are not dirty)
                    // - if any should propagate, they all propagate -- and we mark dependencies of _all_ of the nodes as dirty -- is this correct?
                    // - mark _all_ of the nodes in the strongly connected component as not dirty (since we just processed them)
                    let anyPropagate = false;
                    cycleInfo.connectedComponentNodes.forEach((cycleId) => {
                        const cycleNode =
                            this.topologicallyOrderedNodes[
                                this.topologicalIndex[cycleId]
                            ];
                        if (cycleNode) {
                            callback(cycleNode, 'invalidate');
                        }
                    });
                    cycleInfo.connectedComponentNodes.forEach((cycleId) => {
                        const cycleNode =
                            this.topologicallyOrderedNodes[
                                this.topologicalIndex[cycleId]
                            ];
                        const currentCycleInfo = this.knownCycles.get(cycleId);
                        log.assert(
                            currentCycleInfo,
                            'missing cycleInfo for node in strongly connected component'
                        );
                        let action:
                            | 'cycle'
                            | 'recalculate-cycle'
                            | 'recalculate';
                        if (
                            !currentCycleInfo.isInformed &&
                            currentCycleInfo.initiallyDirty
                        ) {
                            action = 'recalculate';
                            currentCycleInfo.initiallyDirty = false;
                            cycleUnconfirmedNodes.add(cycleId);
                        } else if (currentCycleInfo.isInformed) {
                            action = 'recalculate-cycle';
                        } else {
                            action = 'cycle';
                            currentCycleInfo.isInformed = true;
                        }
                        if (cycleNode && callback(cycleNode, action)) {
                            anyPropagate = true;
                        }
                    });

                    // Hold onto the dirty nodes we have obtained via side effect
                    this.recentDirtyNodes.forEach((nodeId) =>
                        dirtyNodesUnknownPosition.add(nodeId)
                    );
                    this.recentDirtyNodes = undefined;

                    // If any of the nodes in the cycle propagated, then _all_ should propagate
                    if (anyPropagate) {
                        cycleInfo.connectedComponentNodes.forEach((cycleId) => {
                            this.getDependenciesInner(
                                cycleId,
                                Graph.EDGE_HARD
                            ).forEach((toId) => {
                                if (
                                    !cycleInfo.connectedComponentNodes.has(toId)
                                ) {
                                    const toCycleInfo =
                                        this.knownCycles.get(toId);
                                    if (toCycleInfo) {
                                        toCycleInfo.connectedComponentNodes.forEach(
                                            (toCycleId) => {
                                                this.markNodeDirtyInner(
                                                    toCycleId
                                                );
                                            }
                                        );
                                    } else {
                                        this.markNodeDirtyInner(toId);
                                    }
                                }
                            });
                        });
                    }

                    cycleInfo.connectedComponentNodes.forEach((cycleId) => {
                        processedNodeIds.add(cycleId);
                    });
                } else {
                    const hasSelfEdge = (this.graph[nodeId]?.[nodeId] ?? 0) > 0;
                    if (hasSelfEdge) {
                        callback(node, 'invalidate');
                    }
                    const shouldPropagate = callback(
                        node,
                        hasSelfEdge ? 'cycle' : 'recalculate'
                    );

                    // Hold onto the dirty nodes we have obtained via side effect
                    this.recentDirtyNodes.forEach((nodeId) =>
                        dirtyNodesUnknownPosition.add(nodeId)
                    );
                    this.recentDirtyNodes = undefined;

                    if (shouldPropagate) {
                        // No need to hold onto these in dirtyNodesUnknownPosition as they are
                        // guaranteed to be **after** the current index
                        this.getDependenciesInner(
                            nodeId,
                            Graph.EDGE_HARD
                        ).forEach((toId) => {
                            const toCycleInfo = this.knownCycles.get(toId);
                            if (toCycleInfo) {
                                toCycleInfo.connectedComponentNodes.forEach(
                                    (toCycleId) => {
                                        this.markNodeDirtyInner(toCycleId);
                                    }
                                );
                            } else {
                                this.markNodeDirtyInner(toId);
                            }
                        });
                    }
                    processedNodeIds.add(nodeId);
                }

                // By virtue of recalculating the node, we may have grown/changed dependencies!
                reordered = false;
                processPendingEdges();

                // If a node _believed_ to be a cycle was dirtied prior to becoming identified as part of the cycle, we
                // proactively 'recalculated' it. At this point if these nodes are _still_ part of a cycle, we should
                // call the 'cycle' event on it to allow it to correctly handle its error handling.
                cycleUnconfirmedNodes.forEach((cycleId) => {
                    const cycleNode =
                        this.topologicallyOrderedNodes[
                            this.topologicalIndex[cycleId]
                        ];
                    const newCycleInfo = this.knownCycles.get(cycleId);
                    if (cycleNode && newCycleInfo) {
                        const shouldPropagate = callback(cycleNode, 'cycle');
                        newCycleInfo.isInformed = true;
                        if (shouldPropagate) {
                            // TODO: lift this into a shared ffs
                            this.getDependenciesInner(
                                cycleId,
                                Graph.EDGE_HARD
                            ).forEach((toId) => {
                                const toCycleInfo = this.knownCycles.get(toId);
                                if (toCycleInfo) {
                                    toCycleInfo.connectedComponentNodes.forEach(
                                        (toCycleId) => {
                                            this.markNodeDirtyInner(toCycleId);
                                        }
                                    );
                                } else {
                                    this.markNodeDirtyInner(toId);
                                }
                            });
                        }
                    }
                });

                // At this time, we've dirtied all dependencies; and now can mark the processed nodes as clean.
                // This must happen after dirtying all dependencies to prevent a feedback loop in case of a cycle.
                processedNodeIds.forEach((nodeId) => {
                    this.markNodeCleanInner(nodeId);
                });

                if (reordered || this.minCycleBrokenIndex !== null) {
                    // If we've reordered, we need to flush the root cache
                    reachesRootCache = {};
                    // If we've reordered, all bets are off with respect to which nodes are next
                    this.getUnorderedDirtyNodes().forEach((nodeId) =>
                        dirtyNodesUnknownPosition.add(nodeId)
                    );
                }

                // By virtue of recalculating the node, the node may have become a cycle, or no longer become a cycle.
                // In either case, we need to retry.
                const newCycleInfo = this.knownCycles.get(nodeId);
                if (newCycleInfo && !cycleInfo) {
                    done = false;
                } else if (!newCycleInfo && cycleInfo) {
                    done = false;
                } else {
                    done = true;
                }
            }

            if (
                dirtyNodesUnknownPosition.size > 0 ||
                this.minCycleBrokenIndex !== null
            ) {
                // If any dirty nodes have changed or we have broken a cycle, jump to the earliest of either the dirty
                // node or the minimum broken cycle index
                let minDirtyOrd = this.topologicallyOrderedNodes.length;
                dirtyNodesUnknownPosition.forEach((dirtyNodeId) => {
                    minDirtyOrd = Math.min(
                        minDirtyOrd,
                        this.topologicalIndex[dirtyNodeId]
                    );
                });

                if (this.minCycleBrokenIndex !== null) {
                    minDirtyOrd = Math.min(
                        this.minCycleBrokenIndex,
                        minDirtyOrd
                    );
                }

                if (minDirtyOrd <= index) {
                    index = minDirtyOrd - 1;
                }
            }
        }

        // Step three: flush all remaining dirty nodes and their reachable nodes
        const flushed: Record<string, boolean> = {};
        const transitiveFlush = (nodeId: string) => {
            const node =
                this.topologicallyOrderedNodes[this.topologicalIndex[nodeId]];
            log.assert(node, 'transitiveFlush consistency error');
            callback(node, 'invalidate');
            flushed[nodeId] = true;
            this.getDependenciesInner(nodeId, Graph.EDGE_HARD).forEach(
                (toId) => {
                    if (!flushed[toId]) {
                        transitiveFlush(toId);
                    }
                }
            );
        };
        this.getUnorderedDirtyNodes().forEach((nodeId) => {
            if (!flushed[nodeId]) {
                transitiveFlush(nodeId);
            }
            this.markNodeCleanInner(nodeId);
        });

        // And... we're done!
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

        const nodeIds = Object.keys(this.topologicalIndex).filter(
            (nodeId) =>
                !!this.topologicallyOrderedNodes[this.topologicalIndex[nodeId]]
        );
        const nodeAttributes: Record<
            string,
            { label: string; subgraph: object | undefined; penwidth: string }
        > = {};
        nodeIds.forEach((nodeId) => {
            const node =
                this.topologicallyOrderedNodes[this.topologicalIndex[nodeId]];
            if (node) {
                nodeAttributes[nodeId] = getAttributes(nodeId, node);
            }
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
                    shape: this.rootNodes[nodeId] ? 'box' : 'ellipse',
                    label: nodeAttributes[nodeId]?.label,
                    penwidth: nodeAttributes[nodeId]?.penwidth,
                    fillcolor: this.isNodeDirty(nodeId) ? '#FFDDDD' : '#DDDDDD',
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
