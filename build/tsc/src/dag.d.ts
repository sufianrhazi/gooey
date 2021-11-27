import { Sentinel } from './sentinel';
export declare class DAG<Type extends object> {
    private maxId;
    private sentinelId;
    private idMap;
    private nodes;
    private refCount;
    private cullableSet;
    private edgeMap;
    private reverseEdgeMap;
    constructor();
    getItemId(item: Sentinel | Type): string;
    addNode(node: Type): boolean;
    private _addNode;
    hasNode(node: Type): boolean;
    /**
     * Indicate that toNode needs to be updated if fromNode has changed
     *
     * Returns true if edge is added
     */
    addEdge(fromNode: Type, toNode: Type): boolean;
    private _addEdge;
    /**
     * Indicate that toNode no longer needs to be updated if fromNode has changed
     */
    removeEdge(fromNode: Type, toNode: Type): boolean;
    /**
     * Remove a node and all its edges from the graph, returns true if node not present
     */
    removeNode(node: Type): boolean;
    private _removeNode;
    private _removeEdge;
    retain(node: Type): void;
    release(node: Type): void;
    removeEdges(edges: [Type, Type][]): void;
    /**
     * Get list of things need to be updated, when fromNode has changed?
     */
    getDependencies(fromNode: Type): Type[];
    /**
     * Get list of things that cause toNode to updated
     */
    getReverseDependencies(toNode: Type): Type[];
    /**
     * Visit topological graph
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
    visitTopological(callback: (node: Type) => boolean): void;
    garbageCollect(): Type[];
    /**
     * Generate a dot file structure of the graph
     */
    graphviz(makeName: (label: string, item: Type) => string): string;
}
//# sourceMappingURL=dag.d.ts.map