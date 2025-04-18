interface CycleInfo {
    lowerBound: number;
    upperBound: number;
    vertexIds: Set<number>;
}
export declare enum ProcessAction {
    INVALIDATE = 0,
    RECALCULATE = 1,
    CYCLE = 2
}
interface DebugAttributes {
    isActive: boolean;
    name: string;
}
type DebugFormatter<TVertex> = (vertex: TVertex) => DebugAttributes;
export declare class Graph<TVertex> {
    /** identifiers available for reuse */
    protected availableIds: number[];
    protected availableIndices: number[];
    protected nextId: number;
    /** Mapping of id -> vertex */
    protected vertexToId: Map<TVertex, number>;
    protected vertexById: (TVertex | undefined)[];
    /** Mapping of id -> bits */
    protected vertexBitsById: number[];
    /** Mapping of id -> CycleInfo */
    protected cycleInfoById: Record<number, CycleInfo | undefined>;
    /** Mapping of id -> edges in the forward direction */
    protected forwardAdjacency: number[][];
    /** Mapping of id -> edges in the reverse direction */
    protected reverseAdjacency: number[][];
    /** Mapping of id -> index into topologicalOrdering */
    protected topologicalIndexById: (number | undefined)[];
    /** Ordered list of vertex ids */
    protected topologicalOrdering: (number | undefined)[];
    /** The start index of process(), moves forward in each step, may move back as a result of dirty vertices being added / reordered */
    protected startVertexIndex: number;
    /** Set of vertex ids that need reordering */
    protected toReorderIds: Set<number>;
    private debugSubscriptions;
    private _processHandler;
    constructor(processHandler: (vertexGroup: Set<TVertex>, action: ProcessAction) => void);
    /**
     * Vertex ids can be reused.
     *
     * If a vertex is added, it gets a new id
     * If a vertex is deleted, its id is removed
     * If a
     */
    addVertex(vertex: TVertex): void;
    removeVertex(vertex: TVertex): void;
    hasVertex(vertex: TVertex): boolean;
    markVertexDirty(vertex: TVertex): void;
    private markVertexDirtyInner;
    clearVertexDirty(vertex: TVertex): void;
    private clearVertexDirtyInner;
    markVertexCycleInformed(vertex: TVertex): void;
    private cycleAwareAdjacency;
    addEdge(fromVertex: TVertex, toVertex: TVertex): void;
    hasEdge(fromVertex: TVertex, toVertex: TVertex): boolean;
    removeEdge(fromVertex: TVertex, toVertex: TVertex): void;
    private visitDfsForwardRecurse;
    private visitDfsForward;
    private resort;
    private debugLogTopology;
    private processHandler;
    private processVertexIdAction;
    process(): void;
    getOrderedDirty(): TVertex[];
    private propagateDirty;
    getForwardDependencies(vertex: TVertex): Generator<TVertex & ({} | null), void, unknown>;
    debug(getAttrs: DebugFormatter<TVertex>, label?: string): string;
    debugSubscribe(formatter: DebugFormatter<TVertex>, subscription: (graphviz: string, label: string) => void): () => void;
    debugGetGraph(): {
        vertices: TVertex[];
        edges: [TVertex, TVertex][];
    };
    /**
     * Test-only interfaces; omitted in standard build
     */
    _test_getVertices(): TVertex[];
    _test_getDependencies(vertex: TVertex): TVertex[];
    _test_getVertexInfo(vertex: TVertex): undefined | {
        id: number;
        index: number;
        bits: number;
    };
}
export {};
//# sourceMappingURL=graph.d.ts.map