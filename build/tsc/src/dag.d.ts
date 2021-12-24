export declare class DAG<Type extends object> {
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
     *
     * Returns true if edge is added
     */
    addEdge(fromNode: Type, toNode: Type): boolean;
    /**
     * Returns true if edge is removed
     */
    removeEdge(fromNode: Type, toNode: Type): boolean;
    private removeNodeInner;
    /**
     * Remove a node and all its edges from the graph, returns true if node not present
     */
    removeNode(node: Type): boolean;
    retain(node: Type): void;
    release(node: Type): void;
    removeIncoming(node: Type): void;
    /**
     * Get list of things need to be updated, when fromNode has changed?
     */
    getDependencies(fromNode: Type): Type[];
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
    visitDirtyTopological(callback: (node: Type) => boolean): void;
    /**
     * All nodes that do not lead to a retained (sink) node are considered garbage.
     *
     * Note: there may be a much more efficient way than doing this.
     *
     * It's possible that we could instead assert that a node is reachable from a retained node prior to calculation, which may be *much* faster in practice.
     */
    garbageCollect(): Type[];
    /**
     * Generate a dot file structure of the graph
     */
    graphviz(getAttributes: (label: string, item: Type) => {
        label: string;
        subgraph: object | undefined;
    }): string;
}
//# sourceMappingURL=dag.d.ts.map