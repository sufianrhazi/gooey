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
 * - "cycle": set when the vertex is part of a cycle (more correctly: a strongly connected component with >1 vertex)
 * - "self cycle": set when the vertex has an edge pointing to itself (completely separate from "cycle")
 * - "cycle informed": set when the vertex has been processed as a cycle
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
 * - If it is part of a cycle, and is not cycle informed, emit a cycle, mark as informed, and conditionally propagate dirtiness
 * - If it ((is not part of a cycle) or (is part of a cycle and is cycle informed)), emit a recalculation and conditionally propagate dirtiness
 *
 * After processing a dirty vertex, perform any pending vertex/edge additions and removals caused by processing while
 * maintaining topological order. Proceed to the dirty vertex with lowest priority order. This ordering of dirty vertices
 * can be maintained with a priority queue that supports reassigning weights.
 *
 * Once all dirty vertices are processed, the operation is complete.
 *
 * It is possible for this algorithm to loop indefinitely. To avoid this, a process limit can be imposed (either per-vertex
 * or globally).
 *
 */
import * as log from '../common/log';
import { dead } from '../common/util';
import { tarjanStronglyConnected } from './tarjan';

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

const VERTEX_BIT_DIRTY /* ********** */ = 0b0001;
const VERTEX_BIT_CYCLE /* ********** */ = 0b0010;
const VERTEX_BIT_SELF_CYCLE /* ***** */ = 0b0100;
const VERTEX_BIT_CYCLE_INFORMED /* * */ = 0b1000;

interface DebugAttributes {
    isActive: boolean;
    name: string;
}

type DebugFormatter<TVertex> = (vertex: TVertex) => DebugAttributes;
type DebugSubscription = (graphviz: string, label: string) => void;

export class Graph<TVertex> {
    /** identifiers available for reuse */
    protected declare availableIds: number[];
    protected declare availableIndices: number[];
    protected declare nextId: number;

    /** Mapping of id -> vertex */
    protected declare vertexToId: Map<TVertex, number>;
    protected declare vertexById: (TVertex | undefined)[];

    /** Mapping of id -> bits */
    protected declare vertexBitsById: number[];

    /** Mapping of id -> CycleInfo */
    protected declare cycleInfoById: Record<number, CycleInfo | undefined>;

    /** Mapping of id -> edges in the forward direction */
    protected declare forwardAdjacency: number[][];

    /** Mapping of id -> edges in the reverse direction */
    protected declare reverseAdjacency: number[][];

    /** Mapping of id -> index into topologicalOrdering */
    protected declare topologicalIndexById: (number | undefined)[];

    /** Ordered list of vertex ids */
    protected declare topologicalOrdering: (number | undefined)[];

    /** The start index of process(), moves forward in each step, may move back as a result of dirty vertices being added / reordered */
    protected declare startVertexIndex: number;

    /** Set of vertex ids that need reordering */
    protected declare toReorderIds: Set<number>;

    private declare debugSubscriptions: Set<{
        formatter: DebugFormatter<TVertex>;
        subscription: DebugSubscription;
    }>;

    private declare _processHandler: (
        vertexGroup: Set<TVertex>,
        action: ProcessAction
    ) => void;

    constructor(
        processHandler: (
            vertexGroup: Set<TVertex>,
            action: ProcessAction
        ) => void
    ) {
        this._processHandler = processHandler;

        this.nextId = 1;
        this.availableIds = [];
        this.availableIndices = [];

        this.vertexById = [];
        this.vertexToId = new Map();

        this.vertexBitsById = [];
        this.cycleInfoById = {};
        this.topologicalIndexById = [];
        this.topologicalOrdering = [];

        this.forwardAdjacency = [];
        this.reverseAdjacency = [];

        this.startVertexIndex = 0;
        this.toReorderIds = new Set();

        this.debugSubscriptions = new Set();
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

        let index: number;
        if (this.availableIndices.length > 0) {
            index = this.availableIndices.pop() as number;
        } else {
            index = this.topologicalOrdering.length;
            this.topologicalOrdering.length += 1;
        }

        this.topologicalIndexById[id] = index;
        this.topologicalOrdering[index] = id;

        this.forwardAdjacency[id] = [];
        this.reverseAdjacency[id] = [];
    }

    removeVertex(vertex: TVertex) {
        const id = this.vertexToId.get(vertex);
        log.assert(id, 'double vertex removal');
        const index = this.topologicalIndexById[id];
        log.assert(index !== undefined, 'malformed graph');

        // Note: no need to clear edges as you can only remove vertices with no edges
        log.assert(
            this.forwardAdjacency[id].length === 0,
            'cannot remove vertex with forward edges'
        );
        log.assert(
            this.reverseAdjacency[id].length === 0,
            'cannot remove vertex with reverse edges'
        );

        this.topologicalIndexById[id] = undefined;
        this.topologicalOrdering[index] = undefined;

        this.clearVertexDirtyInner(id);
        this.vertexBitsById[id] = 0;
        delete this.cycleInfoById[id];
        this.vertexToId.delete(vertex);
        this.vertexById[id] = undefined;
        this.toReorderIds.delete(id);

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
            this.vertexBitsById[vertexId] &= ~VERTEX_BIT_CYCLE_INFORMED;
            this.processVertexIdAction(vertexId, ProcessAction.INVALIDATE);

            const index = this.topologicalIndexById[vertexId];
            if (index !== undefined && index < this.startVertexIndex) {
                this.startVertexIndex = index;
            }
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
        }
    }

    markVertexCycleInformed(vertex: TVertex) {
        const vertexId = this.vertexToId.get(vertex);
        log.assert(vertexId, 'markVertexCycleInformed on nonexistent vertex');
        this.vertexBitsById[vertexId] |= VERTEX_BIT_CYCLE_INFORMED;
    }

    private *cycleAwareAdjacency(
        vertexId: number,
        cycleInfo: CycleInfo | undefined,
        adjacencyList: number[][]
    ) {
        if (cycleInfo) {
            const yielded = new Set<number>();
            for (const cycleId of cycleInfo.vertexIds) {
                for (const toId of adjacencyList[cycleId]) {
                    if (!cycleInfo.vertexIds.has(toId) && !yielded.has(toId)) {
                        yielded.add(toId);
                        yield toId;
                    }
                }
            }
            return;
        }
        for (const toId of adjacencyList[vertexId]) {
            if (toId !== vertexId) yield toId;
        }
    }

    addEdge(fromVertex: TVertex, toVertex: TVertex) {
        const fromId = this.vertexToId.get(fromVertex);
        const toId = this.vertexToId.get(toVertex);
        log.assert(fromId, 'addEdge from vertex not found', { fromVertex });
        log.assert(toId, 'addEdge to vertex not found', { toVertex });

        DEBUG &&
            log.assert(
                !this.forwardAdjacency[fromId].includes(toId),
                'addEdge duplicate'
            );
        this.forwardAdjacency[fromId].push(toId);
        this.reverseAdjacency[toId].push(fromId);

        if (
            fromId === toId &&
            (this.vertexBitsById[fromId] & VERTEX_BIT_SELF_CYCLE) === 0
        ) {
            const isInformed =
                this.vertexBitsById[fromId] & VERTEX_BIT_CYCLE_INFORMED;
            if (!isInformed) {
                const vertex = this.vertexById[fromId];
                log.assert(vertex, 'missing vertex in self-cycle');
                this.processVertexIdAction(fromId, ProcessAction.CYCLE);
                this.vertexBitsById[fromId] |=
                    VERTEX_BIT_CYCLE_INFORMED | VERTEX_BIT_SELF_CYCLE;
            } else {
                this.vertexBitsById[fromId] |= VERTEX_BIT_SELF_CYCLE;
            }
        }

        const fromIndex = this.topologicalIndexById[fromId];
        const toIndex = this.topologicalIndexById[toId];
        log.assert(toIndex !== undefined, 'malformed graph');
        log.assert(fromIndex !== undefined, 'malformed graph');

        DEBUG &&
            log.info(
                `Add edge ${fromId} (idx=${fromIndex}) -> ${toId} (idx=${toIndex})`
            );
        // Check for out-of-order edge insertion and add to resort batch
        const badOrder = fromIndex > toIndex; // Note: equal is ok: you can't reorder a self-edge
        if (badOrder) {
            DEBUG &&
                log.info(
                    `- Out-of-order detected, reordering ${fromId} and ${toId}`
                );
            this.toReorderIds.add(fromId);
            this.toReorderIds.add(toId);
        }
    }

    hasEdge(fromVertex: TVertex, toVertex: TVertex) {
        const fromId = this.vertexToId.get(fromVertex);
        const toId = this.vertexToId.get(toVertex);
        log.assert(fromId, 'addEdge from vertex not found');
        log.assert(toId, 'addEdge to vertex not found');

        return this.forwardAdjacency[fromId].includes(toId);
    }

    removeEdge(fromVertex: TVertex, toVertex: TVertex) {
        const fromId = this.vertexToId.get(fromVertex);
        const toId = this.vertexToId.get(toVertex);
        log.assert(fromId, 'removeEdge from vertex not found');
        log.assert(toId, 'removeEdge to vertex not found');

        DEBUG &&
            log.assert(
                this.forwardAdjacency[fromId].includes(toId),
                'removeEdge on edge that does not exist'
            );

        removeUnordered(this.forwardAdjacency[fromId], toId);
        removeUnordered(this.reverseAdjacency[toId], fromId);

        // If we are removing a self-cycle, clear the self cycle bit
        if (fromId === toId) {
            this.vertexBitsById[fromId] =
                this.vertexBitsById[fromId] & ~VERTEX_BIT_SELF_CYCLE;
        }

        DEBUG && log.info(`Remove edge ${fromId} -> ${toId}`);
        // If the removed edge is between two nodes in a cycle, it _may_ break the cycle
        const fromCycleInfo = this.cycleInfoById[fromId];
        const toCycleInfo = this.cycleInfoById[toId];
        if (fromCycleInfo && toCycleInfo && fromCycleInfo === toCycleInfo) {
            DEBUG &&
                log.info(
                    `- Edge removal possibly broke cycle, reordering ${fromId} and ${toId}`
                );
            this.toReorderIds.add(fromId);
            this.toReorderIds.add(toId);
        }
    }

    private visitDfsForwardRecurse(
        vertexId: number,
        lowerBound: number,
        upperBound: number,
        visited: Set<number>
    ) {
        if (visited.has(vertexId)) return;
        visited.add(vertexId);
        for (const toId of this.forwardAdjacency[vertexId]) {
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

    private resort(toReorder: Set<number>) {
        DEBUG && log.info('Resort from', [...toReorder]);
        // Determine the bounds of the subgraph to reorder
        let lowerBound = Infinity;
        let upperBound = -Infinity;
        for (const vertexId of toReorder) {
            const cycleInfo = this.cycleInfoById[vertexId];
            if (cycleInfo) {
                DEBUG &&
                    log.info(
                        `- ${vertexId} is cycle with lower bound ${cycleInfo.lowerBound} & upper bound ${cycleInfo.upperBound}`
                    );
                if (cycleInfo.lowerBound < lowerBound)
                    lowerBound = cycleInfo.lowerBound;
                if (cycleInfo.upperBound > upperBound)
                    upperBound = cycleInfo.upperBound;
            } else {
                const index = this.topologicalIndexById[vertexId];
                DEBUG &&
                    log.info(`- ${vertexId} is vertex with index ${index}`);
                log.assert(index !== undefined, 'malformed graph');
                if (index < lowerBound) lowerBound = index;
                if (index > upperBound) upperBound = index;
            }
        }

        DEBUG && log.info(`- lower bound: ${lowerBound}`);
        DEBUG && log.info(`- upper bound: ${upperBound}`);

        // Determine "seed" vertices for Tarjan's algorithm (those that are reachable in reverse from the ones that need reordering, within bounds)
        const seedVertices = this.visitDfsForward(
            toReorder,
            lowerBound,
            upperBound
        );

        DEBUG && log.info(`- seed vertices: ${[...seedVertices].join(',')}`);

        // Use Tarjan's strongly connected algorithm (limited by the bound subgraph, sourced solely from the nodes we
        // want to reorder) to get topological order & strongly connected components
        const components = tarjanStronglyConnected(
            this.reverseAdjacency,
            this.topologicalIndexById,
            lowerBound,
            upperBound,
            seedVertices
        );

        DEBUG && log.info(`- components:`, components);

        // Grab the list of current indexes that we will reorder
        const allocatedIndexes: number[] = [];
        for (const component of components) {
            for (const vertexId of component) {
                const index = this.topologicalIndexById[vertexId];
                log.assert(index !== undefined, 'malformed graph');
                allocatedIndexes.push(index);
            }
        }

        DEBUG && log.info('Resort');
        DEBUG && this.debugLogTopology('before sort');

        // Sort the allocated indexes so we can incrementally assign vertices to these indexes
        allocatedIndexes.sort((a, b) => a - b);

        // Place the new topology ordering in order per the allocatedIndexes
        let i = 0;
        for (const component of components) {
            for (const vertexId of component) {
                const index = allocatedIndexes[i];
                this.topologicalOrdering[index] = vertexId;
                this.topologicalIndexById[vertexId] = index;
                i += 1;
            }
        }

        // Update cycleInfo and inform cycles / clear cycles in two passes
        //
        // 1. First to assign all the cycleInfoById pieces (and update the lower/upper bounds)
        // 2. Then to do the CYCLE informing / dirtying of cleared cycles
        //
        // This must be decoupled so that when a CYCLE is informed, it may react via invalidating / propagating with the full information of the graph
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
                if (cycle) {
                    this.cycleInfoById[vertexId] = cycle;
                    const index = this.topologicalIndexById[vertexId];
                    log.assert(index !== undefined, 'malformed graph');
                    if (index < cycle.lowerBound) cycle.lowerBound = index;
                    if (index > cycle.upperBound) cycle.upperBound = index;
                }
            }
        }

        for (const component of components) {
            for (const vertexId of component) {
                if (component.length > 1) {
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
                        this.processVertexIdAction(
                            vertexId,
                            ProcessAction.CYCLE
                        );
                        this.vertexBitsById[vertexId] |=
                            VERTEX_BIT_CYCLE_INFORMED;
                    }
                } else if (this.vertexBitsById[vertexId] & VERTEX_BIT_CYCLE) {
                    // Vertex no longer part of a cycle, clear the cycle bits and mark as dirty
                    this.vertexBitsById[vertexId] =
                        this.vertexBitsById[vertexId] &
                        ~(VERTEX_BIT_CYCLE | VERTEX_BIT_CYCLE_INFORMED);
                    delete this.cycleInfoById[vertexId];
                    this.markVertexDirtyInner(vertexId);
                }
            }
        }

        DEBUG && this.debugLogTopology('after sort');

        return lowerBound;
    }

    private debugLogTopology(msg: string, vertexIndex?: number) {
        log.assert(DEBUG, 'Do not call debugLogTopology when DEBUG not true');
        if (log.isAtLogLevel('info')) {
            DEBUG && log.info('Topology', msg);
            for (let i = 0; i < this.topologicalOrdering.length; ++i) {
                const vId = this.topologicalOrdering[i];
                const prefix = vertexIndex === i ? '->' : '--';
                if (vId === undefined) {
                    log.info(`${prefix} [idx=${i}] (empty)`);
                } else {
                    const v = this.vertexById[vId];
                    if (!v) {
                        log.info(
                            `${prefix} [idx=${i}] id=${vId} (no vertex?!)`
                        );
                    } else {
                        const isDirty = !!(
                            this.vertexBitsById[vId] & VERTEX_BIT_DIRTY
                        );
                        const cycleInfo = this.cycleInfoById[vId];
                        if (cycleInfo) {
                            log.info(
                                `${prefix} [idx=${i}] id=${vId} ${(v as any).__debugName}; out=${this.forwardAdjacency[vId]?.join(',')}; cycle=${[...cycleInfo.vertexIds].join(',')}; cycleRange=[${cycleInfo.lowerBound}, ${cycleInfo.upperBound}] ${isDirty ? 'dirty' : 'clean'}`
                            );
                        } else {
                            log.info(
                                `${prefix} [idx=${i}] id=${vId} ${(v as any).__debugName}; out=${this.forwardAdjacency[vId]?.join(',')} ${isDirty ? 'dirty' : 'clean'}`
                            );
                        }
                    }
                }
            }
        }
    }

    private processHandler(vertexGroup: Set<TVertex>, action: ProcessAction) {
        return this._processHandler(vertexGroup, action);
    }

    private processVertexIdAction(vertexId: number, action: ProcessAction) {
        const cycleInfo = this.cycleInfoById[vertexId];

        const vertexIds: number[] = [];
        const vertexGroup = new Set<TVertex>();
        if (cycleInfo) {
            for (const cycleVertexId of cycleInfo.vertexIds) {
                vertexIds.push(cycleVertexId);
                const vertex = this.vertexById[cycleVertexId];
                log.assert(vertex, 'malformed graph');
                vertexGroup.add(vertex);
            }
        } else {
            vertexIds.push(vertexId);
            const vertex = this.vertexById[vertexId];
            log.assert(vertex, 'malformed graph');
            vertexGroup.add(vertex);
        }

        DEBUG &&
            log.debug(
                `Processing vertex group action=${ProcessAction[action]}`,
                Object.fromEntries(
                    [...vertexGroup].map((vertex) => [
                        (vertex as any).__debugName,
                        vertex,
                    ])
                )
            );

        if (action === ProcessAction.CYCLE) {
            const anyDirty = vertexIds.some(
                (vertexId) => this.vertexBitsById[vertexId] & VERTEX_BIT_DIRTY
            );
            for (const vertexId of vertexIds) {
                const isInformed =
                    this.vertexBitsById[vertexId] & VERTEX_BIT_CYCLE_INFORMED;
                if (!isInformed) {
                    if (anyDirty) {
                        this.vertexBitsById[vertexId] |= VERTEX_BIT_DIRTY;
                    }
                    const index = this.topologicalIndexById[vertexId];
                    if (index !== undefined && index < this.startVertexIndex) {
                        this.startVertexIndex = index;
                    }
                    this.vertexBitsById[vertexId] |= VERTEX_BIT_CYCLE_INFORMED;
                }
            }
        }

        this._processHandler(vertexGroup, action);

        // Note: it's possible that vertices within a group are **removed**
        const aliveVertices: TVertex[] = [];
        for (const vertex of vertexGroup) {
            if (this.vertexToId.get(vertex) !== undefined) {
                aliveVertices.push(vertex);
            }
        }

        return aliveVertices;
    }

    process() {
        if (DEBUG) {
            this.debugSubscriptions.forEach(({ subscription, formatter }) => {
                const label = `Process start`;
                subscription(
                    this.debug(
                        (v) => ({
                            ...formatter(v),
                        }),
                        label
                    ),
                    label
                );
            });
        }
        if (this.toReorderIds.size > 0) {
            this.resort(this.toReorderIds);
            this.toReorderIds.clear();
        }

        for (;;) {
            const vertexIndex = this.startVertexIndex;
            if (vertexIndex >= this.vertexById.length) {
                this.startVertexIndex = 0;
                break;
            }
            this.startVertexIndex++;

            const vertexId = this.topologicalOrdering[vertexIndex];
            if (vertexId === undefined) {
                continue;
            }

            const isDirty = this.vertexBitsById[vertexId] & VERTEX_BIT_DIRTY;
            if (!isDirty) {
                continue;
            }

            DEBUG && this.debugLogTopology('Process step', vertexIndex);

            const vertex = this.vertexById[vertexId];
            log.assert(vertex, 'nonexistent vertex dirtied');

            const beforeCycleInfo = this.cycleInfoById[vertexId];

            // Process the vertex
            const vertexGroup = this.processVertexIdAction(
                vertexId,
                ProcessAction.RECALCULATE
            );
            // After recalculating, clear all of the vertices dirty bits
            for (const vertex of vertexGroup) {
                this.clearVertexDirty(vertex);
            }

            // Processing may cause changes in edges, which may cause changes
            // in cycles, so we must reorder and check for cycles
            if (this.toReorderIds.size > 0) {
                const lowerBound = this.resort(this.toReorderIds);
                if (lowerBound < this.startVertexIndex) {
                    this.startVertexIndex = lowerBound;
                }
                this.toReorderIds.clear();
            }

            // Now that we've reordered, we may have a different cycle
            const newCycleInfo = this.cycleInfoById[vertexId];

            // Handle cases where cycles have changed:
            if (!beforeCycleInfo && newCycleInfo) {
                // This vertex is part of a new cycle, notify the vertex of the cycle
                this.processVertexIdAction(vertexId, ProcessAction.CYCLE);
            } else if (beforeCycleInfo && !newCycleInfo) {
                // This vertex is no longer part of a new cycle
                // Do we need to do anything?
            } else if (newCycleInfo) {
                // This vertex is still part of a cycle; notify again
                this.processVertexIdAction(vertexId, ProcessAction.CYCLE);
            } else if (this.vertexBitsById[vertexId] & VERTEX_BIT_SELF_CYCLE) {
                // This vertex is still part of a self-cycle; must notify again
                this.processVertexIdAction(vertexId, ProcessAction.CYCLE);
            }
        }

        if (DEBUG) {
            this.debugSubscriptions.forEach(({ subscription, formatter }) => {
                const label = `Process end`;
                subscription(
                    this.debug(
                        (v) => ({
                            ...formatter(v),
                        }),
                        label
                    ),
                    label
                );
            });
        }
    }

    getOrderedDirty() {
        if (this.toReorderIds.size > 0) {
            this.resort(this.toReorderIds);
            this.toReorderIds.clear();
        }

        const vertices: TVertex[] = [];
        for (
            let vertexIndex = 0;
            vertexIndex < this.topologicalOrdering.length;
            ++vertexIndex
        ) {
            const vertexId = this.topologicalOrdering[vertexIndex];
            if (vertexId === undefined) {
                continue;
            }

            const isDirty = this.vertexBitsById[vertexId] & VERTEX_BIT_DIRTY;
            if (!isDirty) {
                continue;
            }

            const vertex = this.vertexById[vertexId];
            log.assert(vertex, 'nonexistent vertex dirtied');
            vertices.push(vertex);
        }
        return vertices;
    }

    private propagateDirty(
        vertexId: number,
        cycleVertexIds: null | Set<number>
    ) {
        this.clearVertexDirtyInner(vertexId);
        for (const toId of this.forwardAdjacency[vertexId]) {
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

    // TODO: rename get forward non-cycle dependencies
    *getForwardDependencies(vertex: TVertex) {
        const vertexId = this.vertexToId.get(vertex);
        log.assert(
            vertexId !== undefined,
            'attempted to get forward dependencies on nonexistent vertex',
            { vertex }
        );
        const cycleInfo = this.cycleInfoById[vertexId];
        for (const toId of this.forwardAdjacency[vertexId]) {
            const toVertex = this.vertexById[toId];
            log.assert(toVertex !== undefined, 'malformed graph');
            if (!cycleInfo || !cycleInfo.vertexIds.has(toId)) {
                yield toVertex;
            }
        }
    }

    debug(getAttrs: DebugFormatter<TVertex>, label?: string) {
        const lines = [];
        lines.push('digraph dependencies {');
        lines.push(`  graph [];`);
        lines.push(`  edge [penwidth=2.0];`);
        lines.push(`  node [penwidth=2.0];`);
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
            attrs.shape = 'ellipse';

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
            // - active: #485696
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
            if (this.forwardAdjacency[id]) {
                for (const toId of this.forwardAdjacency[id]) {
                    lines.push(`  v_${id} -> v_${toId};`);
                }
            }
        }
        lines.push('}');
        return lines.join('\n');
    }

    debugSubscribe(
        formatter: DebugFormatter<TVertex>,
        subscription: (graphviz: string, label: string) => void
    ) {
        const entry = {
            formatter,
            subscription,
        };
        this.debugSubscriptions.add(entry);
        return () => {
            this.debugSubscriptions.delete(entry);
        };
    }

    debugGetGraph() {
        const vertices: TVertex[] = [];
        for (let i = 0; i < this.vertexById.length; ++i) {
            const vertex = this.vertexById[i];
            if (vertex) {
                vertices.push(vertex);
            }
        }
        const edges: [TVertex, TVertex][] = [];
        for (let id = 0; id < this.vertexById.length; ++id) {
            if (this.forwardAdjacency[id]) {
                for (const toId of this.forwardAdjacency[id]) {
                    const source = this.vertexById[id];
                    const target = this.vertexById[toId];
                    if (source && target) {
                        edges.push([source, target]);
                    }
                }
            }
        }
        return { vertices, edges };
    }

    /**
     * Test-only interfaces; omitted in standard build
     */
    _test_getVertices(): TVertex[] {
        return dead();
    }
    _test_getDependencies(vertex: TVertex): TVertex[] {
        return dead();
    }
    _test_getVertexInfo(
        vertex: TVertex
    ): undefined | { id: number; index: number; bits: number } {
        return dead();
    }
}

/**
 * Inject test-only interfaces if we are in a test environment
 */
if (TEST) {
    Graph.prototype._test_getVertices = function _test_getVertices<TVertex>(
        this: Graph<TVertex>
    ) {
        return this.vertexById.filter((vertex) => !!vertex);
    };
    Graph.prototype._test_getDependencies = function _test_getDependencies<
        TVertex,
    >(this: Graph<TVertex>, vertex: TVertex) {
        const id = this.vertexToId.get(vertex);
        log.assert(id, 'getDependencies on nonexistent vertex');
        return this.forwardAdjacency[id].map((toId) => this.vertexById[toId]);
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

function removeUnordered(array: number[], value: number) {
    if (value === array[array.length - 1]) {
        array.pop();
        return;
    }
    const index = array.indexOf(value);
    array[index] = array[array.length - 1];
    array.pop();
}
