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
    private nodesSet: Record<string, Type>;
    private retained: Record<string, true>;
    private dirtyNodes: Record<string, true>;

    private graph: Record<string, Record<string, number>>;
    private reverseGraph: Record<string, Record<string, number>>;

    constructor() {
        this.nextId = 1;
        this.nodesSet = {};
        this.retained = {};
        this.graph = {};
        this.reverseGraph = {};
        this.dirtyNodes = {};
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

    markNodeDirty(node: Type): boolean {
        const nodeId = this.getId(node);
        if (this.dirtyNodes[nodeId]) return false;
        this.dirtyNodes[nodeId] = true;
        return true;
    }

    /**
     * Given a node in a cycle, break the cycle. Return the _other_ nodes in the cycle.
     *
     * The cycle is broken by
     * - Removing the incoming dependencies from the target node
     * - Marking the target node as dirty
     * - Marking the non-target node as
     */
    breakCycle(node: Type) {
        const nodeId = this.getId(node);
        log.assert(
            this.dirtyNodes[nodeId],
            'breakCycle attempted on non-dirty node'
        );
        const components = this._toposort([nodeId]);
        log.assert(
            components[0].length > 1,
            'breakCycle called on a non-cycle'
        );
        log.assert(
            components[0].some((vertex) => vertex.nodeId === nodeId),
            'breakCycle did not find nodeId in its first cycle'
        );
        log.assert(
            components[0].every((vertex) => this.dirtyNodes[vertex.nodeId]),
            'breakCycle does not have a full set of dirty nodes in a cycle'
        );
        const otherNodeIds: string[] = [];
        components[0].forEach((vertex) => {
            delete this.dirtyNodes[vertex.nodeId];
            if (vertex.nodeId !== nodeId) {
                otherNodeIds.push(vertex.nodeId);
            }
        });
        this.removeIncoming(node);
        this.dirtyNodes[nodeId] = true;
        return otherNodeIds.map((otherNodeId) => this.nodesSet[otherNodeId]);
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
    process(callback: (componentNodes: Type[]) => boolean) {
        this._processInner(callback, {});
    }

    private _processInner(
        callback: (componentNodes: Type[]) => boolean,
        toSkip: Record<string, boolean> = {}
    ) {
        const toposort = this._toposort(Object.keys(this.dirtyNodes));

        const toRemove: string[] = [];
        const knownCycles: Record<string, boolean> = {};
        const errorNodes: Record<string, boolean> = {};
        for (let i = 0; i < toposort.length; ++i) {
            const nodeIds: string[] = [];
            let anyDirty = false;
            toposort[i].forEach((vertex) => {
                if (toposort[i].length > 1) {
                    knownCycles[vertex.nodeId] = true;
                }
                if (!toSkip[vertex.nodeId]) {
                    nodeIds.push(vertex.nodeId);
                } else {
                    console.log('SKIPPING', vertex);
                }
                if (vertex.reachesRetained) {
                    // Note: if any vertex in a group reaches retained, they **all** do
                    // TODO: confirm that reachesRetained is correct for all types of graphs
                    anyDirty = anyDirty || this.dirtyNodes[vertex.nodeId];
                } else {
                    toRemove.push(vertex.nodeId);
                }
            });
            if (anyDirty) {
                let isEqual = false;
                try {
                    isEqual = callback(
                        nodeIds.map((nodeId) => this.nodesSet[nodeId])
                    );
                    nodeIds.forEach((nodeId) => {
                        delete this.dirtyNodes[nodeId];
                    });
                } catch (e) {
                    nodeIds.forEach((nodeId) => {
                        errorNodes[nodeId] = true;
                    });
                    log.error('Caught error during flush', e);
                }
                if (!isEqual) {
                    nodeIds.forEach((nodeId) => {
                        this.getDependenciesInner(
                            nodeId,
                            DAG.EDGE_HARD
                        ).forEach((toId) => {
                            // Prevent circular dependencies!
                            this.dirtyNodes[toId] = true;
                        });
                    });
                }
            }
        }

        toRemove.forEach((nodeId) => {
            this.removeNodeInner(nodeId);
            knownCycles[nodeId] = false;
        });

        // The DAG may have changed by virtue of processing it, which may have caused additional nodes to have been dirtied.
        // If there are any dirty nodes that are not part of a known cycle in the last run, re-process the DAG.
        if (
            Object.keys(this.dirtyNodes).some(
                (nodeId) => !knownCycles[nodeId] && !toSkip[nodeId]
            )
        ) {
            this._processInner(callback, {
                ...knownCycles,
                ...errorNodes,
            });
        }
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
