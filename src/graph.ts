/*
 * The Directed Graph
 * ==================
 *
 * The directed graph is a fully dynamic directed graph: vertices and edges may be added and removed at any time.
 *
 * Main challenge: maintain the topological ordering after each batch of vertex/edge additions/removals.
 *
 * Each vertex has a set of flags which may be set/cleared:
 * - "dirty": which is set when the vertex’s underlying data is modified/invalidated.
 * - "root": set when the vertex is actively used by the system
 * - "reaches root": set when it reaches a "root" vertex (all "root" vertices are also "reaches root")
 * - "cycle": set when the vertex is part of a cycle (more correctly: a strongly connected component with >1 vertex)
 * - "self cycle": set when the vertex has an edge pointing to itself (completely separate from "cycle")
 * - "cycle informed": set when the vertex has been processed as a cycle
 *
 * Edges in the graph have two colors:
 * - “hard”: represent data dependencies that propagate
 * - “soft”: exist solely to maintain topological ordering
 *
 * When a dirty vertex is processed, its dirtiness is cleared. Depending on the result of processing the vertex,
 * dirtiness may be propagated to destination vertices, which have their dirty bit set.
 *
 *
 * Topological Ordering
 * --------------------
 *
 * Our primary goal is to process the dirty vertices in this graph in topological order. One hitch is that during the
 * processing of dirty vertices, edges may be added and vertices may be marked as dirty.
 *
 * Since a topological ordering means arrows go from left to right, the only thing that could possibly break a
 * topological ordering is the addition of an edge that goes in the opposite direction.
 *
 * When we add an edge that goes in the opposite direction, we add the vertices to a set that need to be reordered.
 *
 * It's important to note that if topological order is maintained, a cycle can only occur if an edge is added in the
 * incorrect order (or to itself).
 *
 * This graph uses a variation on the Pearce Kelly algorithm to maintain the topological ordering in this case
 * (https://whileydave.com/publications/pk07_jea/) while supporting cycles.
 *
 * The general structure of this variation is:
 * - Get the lower and upper index bounds of the set of out of order vertices
 * - Instead of using DFS to determine the correct order of the subgraph within the upper/lower bounds, use Tarjan's
 *   strongly connected component algorithm to both determine the order and obtain strongly connected components
 *
 *
 * Handling Cycles
 * ---------------
 *
 * One edge case not explicitly handled by the Pearce Kelly algorithm is how to handle cycles/strongly connected
 * components. This directed graph allows for cycles in the directed graph to exist.
 *
 * Note: The term cycle to mean a set of vertices that can all reach each other. This set may have a size of one.
 *
 * In this case, for the purposes of the graph, all nodes in a cycle are treated as a single unit:
 * - If any of the cycle vertices are marked as “dirty” they all are marked as “dirty”
 * - If any of the cycle vertices are processed, they are all processed (in arbitrary order) and dirtiness is propagated
 *   only to vertices that are not members of the cycle.
 *
 * When an edge is added that introduces a cycle, that edge will go from right to left. We will identify these cycles
 * when reordering. In every cycle there is at least one edge that goes in the wrong direction.
 *
 * If an edge that connects two vertices in a cycle is removed there are two cases to consider:
 *
 * Case 1) If the removed edge goes in the correct direction, the cycle may be broken. If broken, there exists at least
 * one edge in the cycle that goes in the wrong direction. In this case, the topological order of the subgraph
 * reachable/that reaches the vertices needs to be reordered. Tarjan’s strongly connected components algorithm is used
 * to reorder the reachable subgraph in this case: identify the subgraph via a DFS traversal forward and backward, then
 * perform the algorithm on the subgraph.
 *
 * Case 2) If the edge goes in the wrong direction, no adjustments to the topological ordering need to be performed.
 * (This is a bold statement. Can a proof be demonstrated? Does this apply if edges are added to vertices in the middle
 * of a cycle?)
 *
 * **Open question**: when sorting and assigning vertices in a cycle, do we ever put anything in the middle of a cycle? We
 * should not.
 *
 * Given:
 * - a b c d e
 * - a->b->d->e->a
 * - And an addition: c->d
 * - We should place c before a as in: c a b d e
 * - This is since the component really “lives” at the first index of a cycle.
 *
 *
 * Graph Processing
 * ----------------
 *
 * The goal of graph processing is to visit all of the vertices marked as dirty and get them marked as not dirty.
 * Processing the graph is a coroutine operation, where a set of actions is produced and in response a Boolean is returned,
 * which indicates whether or not dirtiness should be propagated.
 *
 * When visiting a dirty node, one of three things happens:
 * - If the vertex does not reach a root vertex, it emits an invalidation action.
 * - If the vertex is part of a cycle, it emits a cycle action.
 * - Otherwise, a recalculate action is emitted.
 *
 * While the graph doesn't concern itself with what these actions perform, in practice:
 * - Invalidation events clear cached data associated with the vertex. These always propagate dirtiness.
 * - Cycle events raise an error. These propagate dirtiness if the error is caught and the value produced is equal to the
 *   prior value.
 * - Recalculation events cause the calculation associated with the vertex to be re-executed. Propagation occurs if the
 *   value produced is equal to the prior value.
 *
 * The naive procedure of processing the graph is to iterate through the dirty vertices in topological order of the graph.
 * Upon discovering a dirty vertex:
 * - If it cannot reach a root, emit an invalidation and propagate dirtiness
 * - If it reaches a root, is part of a cycle, and is not cycle informed, emit a cycle, mark as informed, and conditionally propagate dirtiness
 * - If it reaches a root and ((is not part of a cycle) or (is part of a cycle and is cycle informed)), emit a recalculation and conditionally propagate dirtiness
 *
 * After processing a dirty vertex, perform any pending vertex/edge additions and removals caused by processing while
 * maintaining topological order. Proceed to the dirty vertex with lowest priority order. This ordering of dirty vertices
 * can be maintained with a priority queue that supports reassigning weights.
 *
 * It is possible to pre-calculate and maintain the “reaches root” bit on all vertices:
 * - When a vertex is marked as root, mark the vertex also as reaching root. Mark all vertices reaching this vertex as
 *   reaching root via reverse DFS (abort if the DFS reaches a vertex that has the “reaches root” bit set)
 * - When a edge is added to a vertex marked as “reaches root”, perform the same mark as “reaches root” DFS.
 * - When a vertex is unmarked as root or an edge is removed from a vertex that reaches root. Perform the following:
 *     - If it is not “root” and none of the vertices it immediately reaches have “reaches root” set, clear the “reaches
 *       root” state. Repeat this recursively for all vertices that immediately reach that vertex.
 * - As a precaution, prevent vertices from being removed if they have the “root” bit set.
 *
 * Once all dirty vertices are processed, the operation is complete.
 *
 * It is possible for this algorithm to loop indefinitely. To avoid this, a process limit can be imposed (either per-vertex
 * or globally).
 *
 */
import { tarjanStronglyConnected } from './tarjan';
import * as log from './log';

export enum EdgeColor {
    EDGE_SOFT = 0b01,
    EDGE_HARD = 0b10,
}

interface CycleInfo {
    lowerBound: number;
    upperBound: number;
    vertexIds: Set<number>;
}

export enum ProcessAction {
    INVALIDATE,
    RECALCULATE,
    CYCLE,
}

const VERTEX_BIT_DIRTY /* ********** */ = 0b000001;
const VERTEX_BIT_ROOT /* *********** */ = 0b000010;
const VERTEX_BIT_REACHES_ROOT /* *** */ = 0b000100;
const VERTEX_BIT_CYCLE /* ********** */ = 0b001000;
const VERTEX_BIT_SELF_CYCLE /* ***** */ = 0b010000;
const VERTEX_BIT_CYCLE_INFORMED /* * */ = 0b100000;

interface DebugAttributes {
    isActive: boolean;
    group?: {};
    name: string;
}

export class Graph<TVertex> {
    static EDGE_SOFT = EdgeColor.EDGE_SOFT;
    static EDGE_HARD = EdgeColor.EDGE_HARD;

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
    protected cycleInfoById: (CycleInfo | undefined)[];

    /** Mapping of id -> soft edges in the forward direction */
    protected forwardAdjacencySoft: number[][];

    /** Mapping of id -> hard edges in the forward direction */
    protected forwardAdjacencyHard: number[][];

    /** Mapping of id -> hard|soft edges in the forward direction */
    protected forwardAdjacencyEither: number[][];

    /** Mapping of id -> soft edges in the reverse direction */
    protected reverseAdjacencySoft: number[][];

    /** Mapping of id -> hard edges in the reverse direction */
    protected reverseAdjacencyHard: number[][];

    /** Mapping of id -> hard|soft edges in the reverse direction */
    protected reverseAdjacencyEither: number[][];

    /** Mapping of id -> index into topologicalOrdering */
    protected topologicalIndexById: (number | undefined)[];

    /** Ordered list of vertex ids */
    protected topologicalOrdering: (number | undefined)[];

    /** Unordered list of dirty vertices */
    protected dirtyVertexIds: number[];

    /** Set of vertex ids that need reordering */
    protected toReorderIds: Set<number>;

    private processHandler: (vertex: TVertex, action: ProcessAction) => boolean;

    constructor(
        processHandler: (vertex: TVertex, action: ProcessAction) => boolean
    ) {
        this.processHandler = processHandler;

        this.nextId = 1;
        this.availableIds = [];
        this.availableIndices = [];

        this.vertexById = [];
        this.vertexToId = new Map();

        this.vertexBitsById = [];
        this.cycleInfoById = [];
        this.topologicalIndexById = [];
        this.topologicalOrdering = [];

        this.forwardAdjacencySoft = [];
        this.forwardAdjacencyHard = [];
        this.forwardAdjacencyEither = [];
        this.reverseAdjacencySoft = [];
        this.reverseAdjacencyHard = [];
        this.reverseAdjacencyEither = [];

        this.dirtyVertexIds = [];
        this.toReorderIds = new Set();
    }

    /**
     * Vertex ids can be reused.
     *
     * If a vertex is added, it gets a new id
     * If a vertex is deleted, its id is removed
     * If a
     */
    addVertex(vertex: TVertex) {
        log.assert(!this.vertexToId.has(vertex), 'double vertex addition');

        let id: number;
        if (this.availableIds.length > 0) {
            id = this.availableIds.pop() as number;
        } else {
            id = this.nextId++;
        }

        this.vertexToId.set(vertex, id);
        this.vertexById[id] = vertex;
        this.vertexBitsById[id] = 0;
        this.cycleInfoById[id] = undefined;

        let index: number;
        if (this.availableIndices.length > 0) {
            index = this.availableIndices.pop() as number;
        } else {
            index = this.topologicalOrdering.length;
            this.topologicalOrdering.length += 1;
        }

        this.topologicalIndexById[id] = index;
        this.topologicalOrdering[index] = id;

        this.forwardAdjacencySoft[id] = [];
        this.forwardAdjacencyHard[id] = [];
        this.forwardAdjacencyEither[id] = [];
        this.reverseAdjacencySoft[id] = [];
        this.reverseAdjacencyHard[id] = [];
        this.reverseAdjacencyEither[id] = [];
    }

    removeVertex(vertex: TVertex) {
        const id = this.vertexToId.get(vertex);
        log.assert(id, 'double vertex removal');
        const index = this.topologicalIndexById[id];
        log.assert(index !== undefined, 'malformed graph');

        // TODO: do we need to confirm that you cannot remove a root vertex
        log.assert(
            (this.vertexBitsById[id] & VERTEX_BIT_ROOT) === 0,
            'cannot remove root vertex'
        );

        // Note: no need to clear edges as you can only remove vertices with no edges
        log.assert(
            this.forwardAdjacencyEither[id].length === 0,
            'cannot remove vertex with forward edges'
        );
        log.assert(
            this.reverseAdjacencyEither[id].length === 0,
            'cannot remove vertex with reverse edges'
        );

        this.topologicalIndexById[id] = undefined;
        this.topologicalOrdering[index] = undefined;

        this.vertexBitsById[id] = 0;
        this.cycleInfoById[id] = undefined;
        this.vertexToId.delete(vertex);
        this.vertexById[id] = undefined;

        // Mark vertices as available for reuse
        this.availableIds.push(id);
        this.availableIndices.push(index);
    }

    hasVertex(vertex: TVertex) {
        return this.vertexToId.has(vertex);
    }

    markVertexDirty(vertex: TVertex) {
        const vertexId = this.vertexToId.get(vertex);
        log.assert(vertexId, 'markVertexDirty on nonexistent vertex');
        this.markVertexDirtyInner(vertexId);
    }

    private markVertexDirtyInner(vertexId: number) {
        const vertex = this.vertexById[vertexId];
        if (vertex && !(this.vertexBitsById[vertexId] & VERTEX_BIT_DIRTY)) {
            this.vertexBitsById[vertexId] |= VERTEX_BIT_DIRTY;
            this.dirtyVertexIds.push(vertexId);
            this.processHandler(vertex, ProcessAction.INVALIDATE);
        }
    }

    clearVertexDirty(vertex: TVertex) {
        const vertexId = this.vertexToId.get(vertex);
        log.assert(vertexId, 'markVertexDirty on nonexistent vertex');
        this.clearVertexDirtyInner(vertexId);
    }

    private clearVertexDirtyInner(vertexId: number) {
        if (this.vertexBitsById[vertexId] & VERTEX_BIT_DIRTY) {
            this.vertexBitsById[vertexId] &= ~VERTEX_BIT_DIRTY;
            const index = this.dirtyVertexIds.indexOf(vertexId);
            this.dirtyVertexIds[index] =
                this.dirtyVertexIds[this.dirtyVertexIds.length - 1];
            this.dirtyVertexIds.pop();
        }
    }

    markVertexRoot(vertex: TVertex) {
        const vertexId = this.vertexToId.get(vertex);
        log.assert(vertexId, 'markVertexRoot on nonexistent vertex');
        log.assert(
            !(this.vertexBitsById[vertexId] & VERTEX_BIT_ROOT),
            'markVertexRoot double marked'
        );
        this.vertexBitsById[vertexId] |= VERTEX_BIT_ROOT;
        this.markReachesRootRecursive(vertexId);
    }

    markVertexCycleInformed(vertex: TVertex) {
        const vertexId = this.vertexToId.get(vertex);
        log.assert(vertexId, 'markVertexCycleInformed on nonexistent vertex');
        this.vertexBitsById[vertexId] |= VERTEX_BIT_CYCLE_INFORMED;
    }

    private markReachesRootRecursive(vertexId: number) {
        if (this.vertexBitsById[vertexId] & VERTEX_BIT_REACHES_ROOT) {
            return;
        }
        this.vertexBitsById[vertexId] |= VERTEX_BIT_REACHES_ROOT;

        // Recurse to forward edges
        for (const fromId of this.reverseAdjacencyHard[vertexId]) {
            this.markReachesRootRecursive(fromId);
        }
        for (const fromId of this.reverseAdjacencySoft[vertexId]) {
            this.markReachesRootRecursive(fromId);
        }
    }

    clearVertexRoot(vertex: TVertex) {
        const vertexId = this.vertexToId.get(vertex);
        log.assert(vertexId, 'clearVertexRoot on nonexistent vertex');
        log.assert(
            this.vertexBitsById[vertexId] & VERTEX_BIT_ROOT,
            'clearVertexRoot on non-root vertex'
        );
        this.checkReachesRootRecursive(vertexId);
    }

    private checkReachesRootRecursive(vertexId: number) {
        if ((this.vertexBitsById[vertexId] & VERTEX_BIT_REACHES_ROOT) === 0) {
            return;
        }

        const reachesRoot = this.forwardAdjacencyEither[vertexId].some(
            (toId) => this.vertexBitsById[toId] & VERTEX_BIT_REACHES_ROOT
        );
        if (reachesRoot) return;

        // This vertex no longer reaches root; clear
        this.vertexBitsById[vertexId] &= ~VERTEX_BIT_REACHES_ROOT;

        // Recurse to reverse edges
        for (const fromId of this.reverseAdjacencyEither[vertexId]) {
            this.checkReachesRootRecursive(fromId);
        }
    }

    addEdge(fromVertex: TVertex, toVertex: TVertex, kind: EdgeColor) {
        const fromId = this.vertexToId.get(fromVertex);
        const toId = this.vertexToId.get(toVertex);
        log.assert(fromId, 'addEdge from vertex not found');
        log.assert(toId, 'addEdge to vertex not found');

        let forwardList: number[];
        let reverseList: number[];
        switch (kind) {
            case EdgeColor.EDGE_SOFT:
                forwardList = this.forwardAdjacencySoft[fromId];
                reverseList = this.reverseAdjacencySoft[toId];
                break;
            case EdgeColor.EDGE_HARD:
                forwardList = this.forwardAdjacencyHard[fromId];
                reverseList = this.reverseAdjacencyHard[toId];
                break;
            default:
                log.assertExhausted(kind, 'invalid kind');
        }
        DEBUG &&
            log.assert(
                !this.forwardAdjacencyEither[fromId].includes(toId),
                'addEdge duplicate'
            );
        this.forwardAdjacencyEither[fromId].push(toId);
        forwardList.push(toId);
        this.reverseAdjacencyEither[toId].push(fromId);
        reverseList.push(fromId);

        if (
            fromId === toId &&
            (this.vertexBitsById[fromId] & VERTEX_BIT_SELF_CYCLE) === 0
        ) {
            const isInformed =
                this.vertexBitsById[fromId] & VERTEX_BIT_CYCLE_INFORMED;
            if (!isInformed) {
                const vertex = this.vertexById[fromId];
                log.assert(vertex, 'missing vertex in self-cycle');
                this.processHandler(vertex, ProcessAction.CYCLE);
                this.vertexBitsById[fromId] |=
                    VERTEX_BIT_CYCLE_INFORMED | VERTEX_BIT_SELF_CYCLE;
            } else {
                this.vertexBitsById[fromId] |= VERTEX_BIT_SELF_CYCLE;
            }
        }

        // Adding an edge may mean fromVertex now reaches root
        if (
            (this.vertexBitsById[fromId] & VERTEX_BIT_REACHES_ROOT) === 0 &&
            this.vertexBitsById[toId] & VERTEX_BIT_REACHES_ROOT
        ) {
            this.markReachesRootRecursive(fromId);
        }

        const fromIndex = this.topologicalIndexById[fromId];
        const toIndex = this.topologicalIndexById[toId];
        log.assert(toIndex !== undefined, 'malformed graph');
        log.assert(fromIndex !== undefined, 'malformed graph');

        // Check for out-of-order edge insertion and add to resort batch
        const badOrder = fromIndex > toIndex; // Note: equal is ok: you can't reorder a self-edge
        if (badOrder) {
            this.toReorderIds.add(fromId);
            this.toReorderIds.add(toId);
        }
    }

    hasEdge(fromVertex: TVertex, toVertex: TVertex, kind: EdgeColor) {
        const fromId = this.vertexToId.get(fromVertex);
        const toId = this.vertexToId.get(toVertex);
        log.assert(fromId, 'addEdge from vertex not found');
        log.assert(toId, 'addEdge to vertex not found');

        return this.forwardAdjacencyEither[fromId].includes(toId);
    }

    removeEdge(fromVertex: TVertex, toVertex: TVertex, kind: EdgeColor) {
        const fromId = this.vertexToId.get(fromVertex);
        const toId = this.vertexToId.get(toVertex);
        log.assert(fromId, 'removeEdge from vertex not found');
        log.assert(toId, 'removeEdge to vertex not found');

        let forwardList: number[];
        let reverseList: number[];
        switch (kind) {
            case EdgeColor.EDGE_SOFT:
                forwardList = this.forwardAdjacencySoft[fromId];
                reverseList = this.reverseAdjacencySoft[toId];
                break;
            case EdgeColor.EDGE_HARD:
                forwardList = this.forwardAdjacencyHard[fromId];
                reverseList = this.reverseAdjacencyHard[toId];
                break;
            default:
                log.assertExhausted(kind, 'invalid kind');
        }
        DEBUG &&
            log.assert(
                this.forwardAdjacencyEither[fromId].includes(toId),
                'removeEdge on edge that does not exist'
            );

        this.forwardAdjacencyEither[fromId].splice(
            this.forwardAdjacencyEither[fromId].indexOf(toId),
            1
        );
        forwardList.splice(forwardList.indexOf(toId), 1);
        this.reverseAdjacencyEither[toId].splice(
            this.reverseAdjacencyEither[toId].indexOf(fromId),
            1
        );
        reverseList.splice(reverseList.indexOf(fromId), 1);

        // If the removed edge is between two nodes in a cycle, it _may_ break the cycle
        const fromCycleInfo = this.cycleInfoById[fromId];
        const toCycleInfo = this.cycleInfoById[toId];
        if (fromCycleInfo && toCycleInfo && fromCycleInfo === toCycleInfo) {
            this.toReorderIds.add(fromId);
            this.toReorderIds.add(toId);
        }

        // Removing an edge may mean fromVertex no longer reaches root
        this.checkReachesRootRecursive(fromId);
    }

    private visitDfsForwardRecurse(
        vertexId: number,
        lowerBound: number,
        upperBound: number,
        visited: Set<number>
    ) {
        if (visited.has(vertexId)) return;
        visited.add(vertexId);
        for (const toId of this.forwardAdjacencyEither[vertexId]) {
            const toIndex = this.topologicalIndexById[toId];
            log.assert(toIndex !== undefined, 'malformed graph');
            if (lowerBound <= toIndex && toIndex <= upperBound) {
                this.visitDfsForwardRecurse(
                    toId,
                    lowerBound,
                    upperBound,
                    visited
                );
            }
        }
    }

    private visitDfsForward(
        startVertices: Iterable<number>,
        lowerBound: number,
        upperBound: number
    ) {
        const visited = new Set<number>();
        for (const vertexId of startVertices) {
            this.visitDfsForwardRecurse(
                vertexId,
                lowerBound,
                upperBound,
                visited
            );
        }
        return visited;
    }

    private resort(toReorder: Iterable<number>) {
        // Determine the bounds of the subgraph to reorder
        let lowerBound = Infinity;
        let upperBound = -Infinity;
        for (const vertexId of toReorder) {
            const cycleInfo = this.cycleInfoById[vertexId];
            if (cycleInfo) {
                if (cycleInfo.lowerBound < lowerBound)
                    lowerBound = cycleInfo.lowerBound;
                if (cycleInfo.upperBound > upperBound)
                    upperBound = cycleInfo.upperBound;
            } else {
                const index = this.topologicalIndexById[vertexId];
                log.assert(index !== undefined, 'malformed graph');
                if (index < lowerBound) lowerBound = index;
                if (index > upperBound) upperBound = index;
            }
        }

        // Determine the "seed" vertices for Tarjan's algorithm
        const seedVertices = this.visitDfsForward(
            toReorder,
            lowerBound,
            upperBound
        );

        // Use Tarjan's strongly connected algorithm (limited by the bound subgraph, sourced solely from the nodes we
        // want to reorder) to get topological order & strongly connected components
        const components = tarjanStronglyConnected(
            this.reverseAdjacencyEither,
            this.topologicalIndexById,
            lowerBound,
            upperBound,
            seedVertices
        );

        // Mark cycles and grab the list of current indexes that will be overwritten
        const allocatedIndexes: number[] = [];
        for (const component of components) {
            let cycle: CycleInfo | undefined;
            if (component.length > 1) {
                cycle = {
                    upperBound: -Infinity,
                    lowerBound: Infinity,
                    vertexIds: new Set(component),
                };
            }

            for (const vertexId of component) {
                const index = this.topologicalIndexById[vertexId];
                log.assert(index !== undefined, 'malformed graph');
                if (cycle) {
                    if (index < cycle.lowerBound) cycle.lowerBound = index;
                    if (index > cycle.upperBound) cycle.upperBound = index;

                    if (!(this.vertexBitsById[vertexId] & VERTEX_BIT_CYCLE)) {
                        this.vertexBitsById[vertexId] |= VERTEX_BIT_CYCLE;
                    }
                    if (
                        !(
                            this.vertexBitsById[vertexId] &
                            VERTEX_BIT_CYCLE_INFORMED
                        )
                    ) {
                        // A vertex is discovered to be part of a cycle, inform it
                        const vertex = this.vertexById[vertexId];
                        log.assert(vertex, 'uninformed vertex missing');
                        this.processHandler(vertex, ProcessAction.CYCLE);
                        this.vertexBitsById[vertexId] |=
                            VERTEX_BIT_CYCLE_INFORMED;
                    }

                    this.cycleInfoById[vertexId] = cycle;
                } else if (this.vertexBitsById[vertexId] & VERTEX_BIT_CYCLE) {
                    // Vertex no longer part of a cycle, clear the cycle bits and mark as dirty
                    this.vertexBitsById[vertexId] =
                        this.vertexBitsById[vertexId] &
                        ~(VERTEX_BIT_CYCLE | VERTEX_BIT_CYCLE_INFORMED);
                    this.cycleInfoById[vertexId] = undefined;
                    this.markVertexDirtyInner(vertexId);
                }
                allocatedIndexes.push(index);
            }
        }

        // Sort the allocated indexes so we can incrementally assign vertices to these indexes
        allocatedIndexes.sort((a, b) => a - b);
        let i = 0;
        for (const component of components) {
            for (const vertexId of component) {
                const index = allocatedIndexes[i];
                this.topologicalOrdering[index] = vertexId;
                this.topologicalIndexById[vertexId] = index;
                i += 1;
            }
        }

        return lowerBound;
    }

    private processVertex(vertexId: number) {
        const reachesRoot =
            this.vertexBitsById[vertexId] & VERTEX_BIT_REACHES_ROOT;
        const vertex = this.vertexById[vertexId];
        log.assert(vertex, 'nonexistent vertex dirtied');
        if (!reachesRoot) {
            this.clearVertexDirtyInner(vertexId);
            // TODO: we are already invalidating vertices actively, do we need to invalidate if they do not reach root?
            return this.processHandler(vertex, ProcessAction.INVALIDATE);
        }
        return this.processHandler(vertex, ProcessAction.RECALCULATE);
    }

    process() {
        if (this.toReorderIds.size > 0) {
            this.resort(this.toReorderIds);
            this.toReorderIds.clear();
        }

        for (let i = 0; i < this.topologicalOrdering.length; ++i) {
            const vertexId = this.topologicalOrdering[i];
            if (vertexId === undefined) continue; // vertex was deleted

            const isDirty = this.vertexBitsById[vertexId] & VERTEX_BIT_DIRTY;
            if (!isDirty) continue;

            const vertex = this.vertexById[vertexId];
            log.assert(vertex, 'nonexistent vertex dirtied');

            const cycleInfo = this.cycleInfoById[vertexId];

            let shouldPropagate = false;
            const recheckIds: null | number[] =
                cycleInfo ||
                this.vertexBitsById[vertexId] & VERTEX_BIT_SELF_CYCLE
                    ? []
                    : null;
            if (cycleInfo) {
                for (const cycleId of cycleInfo.vertexIds) {
                    const isInformed =
                        this.vertexBitsById[cycleId] &
                        VERTEX_BIT_CYCLE_INFORMED;
                    if (isInformed) {
                        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                        recheckIds!.push(cycleId);
                    }
                    shouldPropagate =
                        this.processVertex(cycleId) || shouldPropagate;
                }
            } else {
                const isInformed =
                    this.vertexBitsById[vertexId] & VERTEX_BIT_CYCLE_INFORMED;
                if (isInformed && recheckIds) {
                    recheckIds.push(vertexId);
                }
                shouldPropagate =
                    this.processVertex(vertexId) || shouldPropagate;
            }

            if (this.toReorderIds.size > 0) {
                i = this.resort(this.toReorderIds) - 1;
                this.toReorderIds.clear();
            }

            // If cycles remain after recalculating an informed cycle, the recalculation failed to break the cycle, so
            // we need to call the process handler with CYCLE actions to correctly set their error state
            if (
                cycleInfo ||
                this.vertexBitsById[vertexId] & VERTEX_BIT_SELF_CYCLE
            ) {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                for (const cycleId of recheckIds!) {
                    const isStillCycle =
                        this.vertexBitsById[cycleId] &
                        (VERTEX_BIT_CYCLE | VERTEX_BIT_SELF_CYCLE);
                    if (isStillCycle) {
                        const cycleVertex = this.vertexById[cycleId];
                        log.assert(cycleVertex, 'nonexistent vertex in cycle');
                        shouldPropagate =
                            this.processHandler(
                                cycleVertex,
                                ProcessAction.CYCLE
                            ) || shouldPropagate;
                    }
                }
            }

            // Check if we gained new cycle nodes which need to be propagated
            const newCycleInfo = this.cycleInfoById[vertexId];
            if (!cycleInfo && newCycleInfo) {
                shouldPropagate = true;
            }
            if (
                cycleInfo &&
                newCycleInfo &&
                newCycleInfo.vertexIds !== cycleInfo.vertexIds
            ) {
                shouldPropagate = true;
            }

            if (shouldPropagate) {
                // 3 sets of vertices to union + propagate:
                // - the vertexId we are processing
                // - the vertexIds that were part of the cycle prior to recalculating
                // - the vertexIds that were part of the cycle after to recalculating
                const toPropagate: Set<number> = new Set();
                toPropagate.add(vertexId);
                if (cycleInfo) {
                    for (const oldVertexId of cycleInfo.vertexIds)
                        toPropagate.add(oldVertexId);
                }
                if (newCycleInfo) {
                    for (const newVertexId of newCycleInfo.vertexIds)
                        toPropagate.add(newVertexId);
                }

                for (const cycleId of toPropagate) {
                    this.propagateDirty(cycleId, toPropagate);
                }
            }
        }
    }

    private propagateDirty(
        vertexId: number,
        cycleVertexIds: null | Set<number>
    ) {
        this.vertexBitsById[vertexId] &= ~VERTEX_BIT_DIRTY;
        for (const toId of this.forwardAdjacencyHard[vertexId]) {
            const toCycleInfo = this.cycleInfoById[toId];
            if (toCycleInfo) {
                for (const toCycleId of toCycleInfo.vertexIds) {
                    if (!cycleVertexIds || !cycleVertexIds.has(toCycleId)) {
                        this.markVertexDirtyInner(toCycleId);
                    }
                }
            } else {
                if (!cycleVertexIds || !cycleVertexIds.has(toId)) {
                    this.markVertexDirtyInner(toId);
                }
            }
        }
    }

    debug(getAttrs: (vertex: TVertex) => DebugAttributes, label?: string) {
        const lines = [];
        lines.push('digraph dependencies {');
        lines.push(`  graph [fontname="helvetica bold"];`);
        lines.push(`  edge [fontname="helvetica bold",penwidth=2.0];`);
        lines.push(`  node [fontname="helvetica bold",penwidth=2.0];`);
        if (label) {
            lines.push(`  graph [label=${JSON.stringify(label)};]`);
        }

        const emitVertex = (id: number) => {
            const vertex = this.vertexById[id];
            if (!vertex) return;
            const customAttrs = getAttrs(vertex);
            const attrs: Record<string, string | number> = {
                style: 'filled',
                label: `${id}\n${customAttrs.name}`,
            };

            // Shapes:
            // - normal: ellipse
            // - root: box
            if (this.vertexBitsById[id] & VERTEX_BIT_ROOT) {
                attrs.shape = 'box';
            } else {
                attrs.shape = 'ellipse';
            }

            // Fill colors:
            // - dirty: black / #F9C784
            // - clean: black / white
            if (this.vertexBitsById[id] & VERTEX_BIT_DIRTY) {
                attrs.style = 'filled';
                attrs.fontcolor = '#FFFFFF';
                attrs.fillcolor = '#FC7A1E';
            } else {
                attrs.style = 'filled';
                attrs.fontcolor = '#000000';
                attrs.fillcolor = '#FFFFFF';
            }

            // Border:
            // - detached: dashed
            // - active: #485696
            if ((this.vertexBitsById[id] & VERTEX_BIT_REACHES_ROOT) === 0) {
                attrs.style = 'filled,dashed';
            }
            if (customAttrs.isActive) {
                attrs.penwidth = 4.0;
                attrs.pencolor = '#485696';
            }

            const labelItems: string[] = [];
            for (const [attrName, attrVal] of Object.entries(attrs)) {
                labelItems.push(`${attrName}=${JSON.stringify(attrVal)}`);
            }

            lines.push(`  v_${id} [${labelItems.join(',')}]`);
        };

        const cycles = new Set<CycleInfo>();
        for (let id = 0; id < this.vertexById.length; ++id) {
            const cycleInfo = this.cycleInfoById[id];
            if (cycleInfo) {
                cycles.add(cycleInfo);
            }
        }
        for (const cycle of cycles) {
            lines.push('  subgraph cluster_cycle {');
            lines.push(`  graph [label="cycle";]`);
            for (const cycleId of cycle.vertexIds) {
                emitVertex(cycleId);
            }
            lines.push('  }');
        }

        for (let id = 0; id < this.vertexById.length; ++id) {
            const cycleInfo = this.cycleInfoById[id];
            if (cycleInfo) continue;
            emitVertex(id);
        }

        for (let id = 0; id < this.vertexById.length; ++id) {
            if (this.forwardAdjacencySoft[id]) {
                for (const toId of this.forwardAdjacencySoft[id]) {
                    lines.push(`  v_${id} -> v_${toId} [style="dotted"];`);
                }
            }
            if (this.forwardAdjacencyHard[id]) {
                for (const toId of this.forwardAdjacencyHard[id]) {
                    lines.push(`  v_${id} -> v_${toId};`);
                }
            }
        }
        lines.push('}');
        return lines.join('\n');
    }
}

/**
 * Test-only interfaces; omitted in build
 */
export interface Graph<TVertex> {
    _test_getDependencies(vertex: TVertex): TVertex[];
    _test_getVertexInfo(
        vertex: TVertex
    ): undefined | { id: number; index: number; bits: number };
}

/**
 * Inject test-only interfaces if we are in a test environment
 */
if (TEST) {
    Graph.prototype._test_getDependencies = function _test_getDependencies<
        TVertex
    >(this: Graph<TVertex>, vertex: TVertex) {
        const id = this.vertexToId.get(vertex);
        log.assert(id, 'getDependencies on nonexistent vertex');
        return this.forwardAdjacencyEither[id].map(
            (toId) => this.vertexById[toId]
        );
    };

    Graph.prototype._test_getVertexInfo = function _test_getVertexInfo<TVertex>(
        this: Graph<TVertex>,
        vertex: TVertex
    ) {
        const id = this.vertexToId.get(vertex);
        if (id === undefined) return undefined;
        const index = this.topologicalIndexById[id];
        log.assert(index !== undefined, 'malformed graph');
        const bits = this.vertexBitsById[id];
        return {
            id,
            index,
            bits,
        };
    };
}
