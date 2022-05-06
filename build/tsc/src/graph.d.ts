import type { ProcessAction } from './types';
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
export declare class Graph<Type extends object> {
    private static EDGE_NONE;
    static EDGE_SOFT: 1;
    static EDGE_HARD: 2;
    private static EDGE_ANY;
    private retained;
    private dirtyNodes;
    private recentDirtyNodes;
    private informedCycles;
    private knownCycles;
    private minCycleBrokenIndex;
    /**
     * The subgraph that has been added but not yet ordered
     */
    private pendingOperations;
    private pendingNodes;
    /**
     * A mapping of nodeId to index in topological order
     */
    private topologicalIndex;
    /**
     * The list of vertices maintained in topological order
     */
    private topologicallyOrderedNodes;
    /**
     * A mapping of nodeId to whether or not the node is visited while reordering
     * Note: this is internal state to the process() function but global to reduce object memory thrash
     */
    private reorderingVisitedState;
    private graph;
    private reverseGraph;
    constructor();
    private getId;
    private hasNodeInner;
    addNode(node: Type): boolean;
    private performAddNodeInner;
    markNodeCycle(node: Type): void;
    markNodeDirty(node: Type): void;
    private markNodeDirtyInner;
    private markNodeCleanInner;
    private isNodeDirty;
    getUnorderedDirtyNodes(): string[];
    hasDirtyNodes(): boolean;
    /**
     * Indicate that toNode needs to be updated if fromNode has changed
     */
    addEdge(fromNode: Type, toNode: Type, kind: 0b01 | 0b10): void;
    private addEdgeInner;
    private performAddEdgeInner;
    /**
     * Returns true if edge is removed
     */
    removeEdge(fromNode: Type, toNode: Type, kind: 0b01 | 0b10 | 0b11): void;
    private removeEdgeInner;
    private performRemoveEdgeInner;
    removeNode(node: Type): void;
    private removeNodeInner;
    private performRemoveNodeInner;
    retain(node: Type): void;
    release(node: Type): void;
    replaceIncoming(node: Type, newIncomingNodes: Type[]): void;
    removeIncoming(node: Type): void;
    /**
     * Get dependencies (specify EDGE_SOFT, EDGE_HARD, or EDGE_ANY)
     */
    private getDependenciesInner;
    /**
     * Get reverse dependencies (either EDGE_SOFT or EDGE_HARD)
     */
    private getReverseDependenciesInner;
    /**
     * Get list of things need to be updated, when fromNode has changed?
     */
    _test_getDependencies(fromNode: Type, edgeType?: 0b01 | 0b10 | 0b11): Type[];
    process(callback: (node: Type, action: ProcessAction) => boolean): void;
    /**
     * Generate a dot file structure of the graph
     */
    graphviz(getAttributes: (label: string, item: Type) => {
        label: string;
        subgraph: object | undefined;
        penwidth: string;
    }): string;
}
//# sourceMappingURL=graph.d.ts.map