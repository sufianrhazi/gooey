import { Sentinel } from './sentinel';
export declare class DAG<Type extends object> {
    private maxId;
    private sentinelId;
    private idMap;
    nodes: Record<string, Type | Sentinel>;
    refCount: Record<string, number>;
    cullableSet: Record<string, true>;
    edgeMap: Record<string, Record<string, Type | Sentinel>>;
    reverseEdgeMap: Record<string, Record<string, Type | Sentinel>>;
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
     */
    visitTopological(callback: (node: Type) => void): void;
    garbageCollect(): Type[];
    /**
     * Generate a dot file structure of the graph
     */
    graphviz(makeName: (label: string, item: Type) => string): string;
}
//# sourceMappingURL=dag.d.ts.map