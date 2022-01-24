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
export declare class DAG<Type extends object> {
    private static EDGE_NONE;
    static EDGE_SOFT: 1;
    static EDGE_HARD: 2;
    private static EDGE_ANY;
    private nextId;
    private idMap;
    private nodesSet;
    private retained;
    private dirtyNodes;
    private graph;
    private reverseGraph;
    constructor();
    private getId;
    addNode(node: Type): boolean;
    hasNode(node: Type): boolean;
    markNodeDirty(node: Type): boolean;
    /**
     * Indicate that toNode needs to be updated if fromNode has changed
     */
    addEdge(fromNode: Type, toNode: Type, kind: 0b01 | 0b10): void;
    /**
     * Returns true if edge is removed
     */
    removeEdge(fromNode: Type, toNode: Type, kind: 0b01 | 0b10 | 0b11): boolean;
    private removeNodeInner;
    /**
     * Remove a node and all its edges from the graph, returns true if node not present
     */
    removeNode(node: Type): boolean;
    retain(node: Type): void;
    release(node: Type): void;
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
    process(callback: (node: Type) => boolean): void;
    /**
     * Generate a dot file structure of the graph
     */
    graphviz(getAttributes: (label: string, item: Type) => {
        label: string;
        subgraph: object | undefined;
        penwidth: string;
    }): string;
}
//# sourceMappingURL=dag.d.ts.map