export declare enum EdgeColor {
    EDGE_SOFT = 1,
    EDGE_HARD = 2
}
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
    static EDGE_SOFT: EdgeColor;
    static EDGE_HARD: EdgeColor;
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
    /** Mapping of id -> hard edges in the forward direction */
    protected forwardAdjacencyHard: number[][];
    /** Mapping of id -> hard|soft edges in the forward direction */
    protected forwardAdjacencyEither: number[][];
    /** Mapping of id -> hard|soft edges in the reverse direction */
    protected reverseAdjacencyEither: number[][];
    /** Mapping of id -> index into topologicalOrdering */
    protected topologicalIndexById: (number | undefined)[];
    /** Ordered list of vertex ids */
    protected topologicalOrdering: (number | undefined)[];
    /** The start index of process(), moves forward in each step, may move back as a result of dirty vertices being added / reordered */
    protected startVertexIndex: number;
    /** Set of vertex ids that need reordering */
    protected toReorderIds: Set<number>;
    private debugSubscriptions;
    private postActions;
    private _processHandler;
    constructor(processHandler: (vertex: TVertex, action: ProcessAction, addPostAction: (postAction: () => void) => void) => boolean);
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
    addEdge(fromVertex: TVertex, toVertex: TVertex, kind: EdgeColor): void;
    hasEdge(fromVertex: TVertex, toVertex: TVertex, kind: EdgeColor): boolean;
    removeEdge(fromVertex: TVertex, toVertex: TVertex, kind: EdgeColor): void;
    private visitDfsForwardRecurse;
    private visitDfsForward;
    private resort;
    private addPostAction;
    private processHandler;
    private processVertex;
    process(): void;
    getOrderedDirty(): TVertex[];
    private propagateDirty;
    debug(getAttrs: DebugFormatter<TVertex>, label?: string): string;
    debugSubscribe(formatter: DebugFormatter<TVertex>, subscription: (graphviz: string, label: string) => void): () => void;
    debugGetGraph(): {
        vertices: TVertex[];
        edges: [TVertex, TVertex][];
    };
}
/**
 * Test-only interfaces; omitted in build
 */
export interface Graph<TVertex> {
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