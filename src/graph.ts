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

    private retained: Record<string, true>;
    private dirtyNodes: Record<string, true>;
    private recentDirtyNodes: undefined | string[];
    private knownCycles: Record<string, boolean>;

    /**
     * The subgraph that has been added but not yet ordered
     */
    private pendingGraph: Map<string, Record<string, number>>;
    private pendingReverseGraph: Map<string, Record<string, number>>;
    private pendingNodes: Map<string, Type>;

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
    private reorderingVisitedState: Record<string, boolean> = {};

    private graph: Record<string, Record<string, number>>;
    private reverseGraph: Record<string, Record<string, number>>;

    constructor() {
        this.topologicalIndex = {};
        this.topologicallyOrderedNodes = [];

        this.pendingGraph = new Map();
        this.pendingReverseGraph = new Map();
        this.pendingNodes = new Map();

        this.retained = {};
        this.graph = {};
        this.reverseGraph = {};

        this.dirtyNodes = {};
        this.recentDirtyNodes = undefined;

        this.knownCycles = {};
    }

    private getId(node: Type): string {
        return (node as any).$__id.toString();
    }

    private hasNodeInner(nodeId: string) {
        return (
            this.topologicalIndex[nodeId] !== undefined ||
            this.pendingNodes.has(nodeId)
        );
    }

    addNode(node: Type): boolean {
        const nodeId = this.getId(node);
        if (this.hasNodeInner(nodeId)) return false;
        this.pendingGraph.set(nodeId, {});
        this.pendingReverseGraph.set(nodeId, {});
        this.pendingNodes.set(nodeId, node);
        return true;
    }

    private performAddNodeInner(node: Type, nodeId: string) {
        this.graph[nodeId] = {};
        this.reverseGraph[nodeId] = {};
        this.topologicalIndex[nodeId] = this.topologicallyOrderedNodes.length;
        this.topologicallyOrderedNodes.push(node);
        return true;
    }

    markNodeDirty(node: Type): void {
        this.markNodeDirtyInner(this.getId(node));
    }

    private markNodeDirtyInner(nodeId: string): void {
        this.dirtyNodes[nodeId] = true;
        if (this.recentDirtyNodes) this.recentDirtyNodes.push(nodeId);
    }

    private markNodeClean(node: Type): void {
        this.markNodeCleanInner(this.getId(node));
    }

    private markNodeCleanInner(nodeId: string): void {
        delete this.dirtyNodes[nodeId];
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
        let fwdEdges = this.pendingGraph.get(fromId);
        if (!fwdEdges) {
            fwdEdges = {};
            this.pendingGraph.set(fromId, fwdEdges);
        }
        fwdEdges[toId] = (fwdEdges[toId] || 0) | kind;

        let revEdges = this.pendingReverseGraph.get(toId);
        if (!revEdges) {
            revEdges = {};
            this.pendingReverseGraph.set(fromId, revEdges);
        }
        revEdges[fromId] = (fwdEdges[fromId] || 0) | kind;
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

        // Note: we remove from **both** the pending graph and the real graph
        // This is possible because removing edges DOES NOT change the topological ordering of a graph
        const fwdEdges = this.pendingGraph.get(fromId);
        if (fwdEdges) {
            fwdEdges[toId] = (fwdEdges[toId] || 0) & ~kind;
        }
        this.graph[fromId][toId] = (this.graph[fromId][toId] || 0) & ~kind;

        const revEdges = this.pendingReverseGraph.get(toId);
        if (revEdges) {
            revEdges[fromId] = (revEdges[fromId] || 0) & ~kind;
        }
        this.reverseGraph[toId][fromId] =
            (this.reverseGraph[toId][fromId] || 0) & ~kind;
    }

    removeNode(node: Type) {
        const nodeId = this.getId(node);
        this.removeNodeInner(nodeId);
    }

    private removeNodeInner(nodeId: string) {
        // Note: this can be performed without reordering topological ordering,
        // since node and edge removal does not change the topological order.
        log.assert(
            !this.retained[nodeId],
            'attempted to remove a retained node'
        ); // Is this right?
        const toIds = this.getDependenciesInner(nodeId, Graph.EDGE_ANY);
        const fromIds = this.getReverseDependenciesInner(nodeId);

        const pendingFwdEdges = this.pendingGraph.get(nodeId) || {};
        const pendingRevEdges = this.pendingReverseGraph.get(nodeId) || {};

        // delete fromId -> nodeId for fromId in fromIds
        fromIds.forEach((fromId) => {
            this.graph[fromId][nodeId] = 0;
            const fromFwd = this.pendingGraph.get(fromId);
            if (fromFwd) {
                fromFwd[nodeId] = 0;
            }
            this.reverseGraph[nodeId][fromId] = 0;
            const fromRev = this.pendingReverseGraph.get(nodeId);
            if (fromRev) {
                fromRev[fromId] = 0;
            }
        });
        Object.keys(pendingRevEdges).forEach((fromId) => {
            const fromFwd = this.pendingGraph.get(fromId);
            if (fromFwd) {
                fromFwd[nodeId] = 0;
            }
            const fromRev = this.pendingReverseGraph.get(nodeId);
            if (fromRev) {
                fromRev[fromId] = 0;
            }
        });

        // delete nodeId -> toId for toId in toIds
        toIds.forEach((toId) => {
            this.reverseGraph[toId][nodeId] = 0;
            const toRev = this.pendingReverseGraph.get(toId);
            if (toRev) {
                toRev[nodeId] = 0;
            }
            this.graph[nodeId][toId] = 0;
            const toFwd = this.pendingGraph.get(nodeId);
            if (toFwd) {
                toFwd[toId] = 0;
            }
        });
        Object.keys(pendingFwdEdges).forEach((toId) => {
            const toRev = this.pendingReverseGraph.get(toId);
            if (toRev) {
                toRev[nodeId] = 0;
            }
            const toFwd = this.pendingGraph.get(nodeId);
            if (toFwd) {
                toFwd[toId] = 0;
            }
        });

        this.topologicallyOrderedNodes[this.topologicalIndex[nodeId]] =
            undefined;
        delete this.topologicalIndex[nodeId];
        this.markNodeCleanInner(nodeId);
        delete this.retained[nodeId];
        delete this.knownCycles[nodeId];
        this.pendingGraph.delete(nodeId);
        this.pendingReverseGraph.delete(nodeId);
        this.pendingNodes.delete(nodeId);
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
     * In topological order, recalculate all of the dirty nodes that reach retained nodes; propagating dirtiness if
     * propagation is requested.
     *
     * For all remaining dirty nodes (which do not reach retained nodes), flush them & all their reachable nodes.
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

        const dfsF = (nodeId: string) => {
            this.reorderingVisitedState[nodeId] = true;
            forwardSet.add(nodeId);
            this.getDependenciesInner(nodeId, Graph.EDGE_ANY).forEach(
                (toId) => {
                    if (this.topologicalIndex[toId] === upperBound) {
                        // We have identified a new cycle!
                        // Break out of this algorithm, mark the nodes in a cycle as part of a strongly connected component; and retry
                        throw new Error('What the hell to do here?');
                        // cycle!
                    }
                    // Only visit nodes that are in affected region
                    if (
                        !this.reorderingVisitedState[toId] &&
                        this.topologicalIndex[toId] < upperBound
                    ) {
                        dfsF(toId);
                    }
                }
            );
        };

        const dfsB = (nodeId: string) => {
            this.reorderingVisitedState[nodeId] = true;
            reverseSet.add(nodeId);
            this.getReverseDependenciesInner(nodeId, Graph.EDGE_ANY).forEach(
                (fromId) => {
                    // Only visit nodes that are in affected region
                    if (
                        !this.reorderingVisitedState[fromId] &&
                        lowerBound < this.topologicalIndex[fromId]
                    ) {
                        dfsB(fromId);
                    }
                }
            );
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
                this.reorderingVisitedState[correctOrderNodeIds[i]] = false;
                this.topologicallyOrderedNodes[affectedIndex] = correctNodes[i];
                this.topologicalIndex[correctOrderNodeIds[i]] = affectedIndex;
            });

            forwardSet.clear();
            reverseSet.clear();
        };

        const addEdge = (fromId: string, toId: string) => {
            lowerBound = this.topologicalIndex[toId];
            upperBound = this.topologicalIndex[fromId];
            if (lowerBound < upperBound) {
                dfsF(toId);
                dfsB(fromId);
                reorder();
                reordered = true;
            }
        };

        const processPendingEdges = () => {
            let minLowerBound: number | null = null;

            //
            // pre-sort pending nodes
            //
            const visited: Record<string, boolean> = {};
            const pendingNodeIdIndex: Record<string, number> = {};
            let assignedIndex = 0;

            const assignIndex = (nodeId: string): void => {
                if (visited[nodeId]) return;
                visited[nodeId] = true;
                const toEdges = this.pendingGraph.get(nodeId) || {};
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
            this.pendingNodes.forEach((_node, nodeId) => {
                assignIndex(nodeId);
                pendingNodeIds.push(nodeId);
            });

            // Sort the pending nodes by the index (reversed) so they are in
            // (partial) topological order
            pendingNodeIds.sort(
                (a, b) => pendingNodeIdIndex[b] - pendingNodeIdIndex[a]
            );

            // Add the nodes in this partial order. This ensures that as we add
            // new edges for new nodes, we do not need to resort them.
            pendingNodeIds.forEach((nodeId) => {
                const node = this.pendingNodes.get(nodeId);
                if (node) {
                    this.performAddNodeInner(node, nodeId);
                }
            });

            //
            // Add edges (unlike node order, the order here does not matter as all nodes have been added)
            //
            this.pendingGraph.forEach((edges, fromId) => {
                const toIds = Object.keys(edges);
                toIds.forEach((toId) => {
                    if (edges[toId] > 0) {
                        this.performAddEdgeInner(
                            fromId,
                            toId,
                            edges[toId] as 1 | 2
                        );

                        addEdge(fromId, toId);
                        minLowerBound =
                            minLowerBound === null
                                ? lowerBound
                                : Math.min(minLowerBound, lowerBound);
                    }
                });
            });

            // Clean up pending items
            this.pendingNodes.clear();
            this.pendingGraph.clear();
            this.pendingReverseGraph.clear();

            return minLowerBound || 0;
        };

        let reachesRetainedCache: Record<string, boolean> = {};
        const reachesRetained = (nodeId: string) => {
            const visited: Record<string, boolean> = {};
            const visit = (id: string): boolean => {
                if (this.retained[id]) {
                    reachesRetainedCache[id] = true;
                }
                if (reachesRetainedCache[id]) {
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
            if (!node) continue;
            const nodeId = this.getId(node);
            if (!this.dirtyNodes[nodeId]) {
                continue;
            }
            if (!reachesRetained(nodeId)) {
                continue;
            }

            this.recentDirtyNodes = [];
            const shouldPropagate = callback(node, 'recalculate');

            // Hold onto the dirty nodes we have obtained via side effect
            let newDirtyNodes = this.recentDirtyNodes;
            this.recentDirtyNodes = undefined;

            if (shouldPropagate) {
                // No need to hold onto these in newDirtyNodes as they are
                // guaranteed to be **after** the current index
                this.getDependenciesInner(nodeId, Graph.EDGE_HARD).forEach(
                    (toId) => {
                        this.markNodeDirtyInner(toId);
                    }
                );
            }
            this.markNodeCleanInner(nodeId);

            // By virtue of recalculating the node, we may have grown/changed dependencies!
            reordered = false;
            processPendingEdges();
            if (reordered) {
                // If we've reordered, we need to flush the retained cache
                reachesRetainedCache = {};
                // If we've reordered, all bets are off with respect to which nodes are next
                newDirtyNodes = this.getUnorderedDirtyNodes();
            }

            if (newDirtyNodes.length > 0) {
                // If any dirty nodes have changed, jump to the earliest dirty node
                let minDirtyOrd = this.topologicallyOrderedNodes.length;
                newDirtyNodes.forEach((dirtyNodeId) => {
                    minDirtyOrd = Math.min(
                        minDirtyOrd,
                        this.topologicalIndex[dirtyNodeId]
                    );
                });
                const currentOrd = this.topologicalIndex[nodeId];
                if (minDirtyOrd < currentOrd) {
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
                    shape: this.retained[nodeId] ? 'box' : 'ellipse',
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
