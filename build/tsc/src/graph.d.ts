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
    private nextId;
    private nodesSet;
    private retained;
    private dirtyNodes;
    private knownCycles;
    private graph;
    private reverseGraph;
    constructor();
    private getId;
    addNode(node: Type): boolean;
    hasNode(node: Type): boolean;
    markNodeDirty(node: Type): void;
    private getRecursiveDependenciesInner;
    getRecursiveDependencies(node: Type): Type[];
    hasDirtyNodes(): boolean;
    /**
     * Indicate that toNode needs to be updated if fromNode has changed
     */
    addEdge(fromNode: Type, toNode: Type, kind: 0b01 | 0b10): void;
    private addEdgeInner;
    /**
     * Returns true if edge is removed
     */
    removeEdge(fromNode: Type, toNode: Type, kind: 0b01 | 0b10 | 0b11): void;
    private removeEdgeInner;
    removeNode(node: Type): void;
    private removeNodeInner;
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
    getDependencies(fromNode: Type, edgeType?: 0b01 | 0b10 | 0b11): Type[];
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
    private _toposortRetained;
    private _toposort;
    /**
     * Process the graph, visiting strongly connected nodes topologically that have a data dependency on a retained
     * node.
     *
     * This uses Tarjan's strongly connected component algorithm to both segment strongly connected nodes and
     * topologically sort them.
     */
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