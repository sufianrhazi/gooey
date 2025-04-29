"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var src_exports = {};
__export(src_exports, {
  ArrayEventType: () => ArrayEventType,
  ClassComponent: () => ClassComponent,
  CycleError: () => CycleError,
  Dict: () => Dict,
  DictEventType: () => DictEventType,
  Fragment: () => Fragment2,
  IntrinsicObserver: () => IntrinsicObserver,
  IntrinsicObserverEventType: () => IntrinsicObserverEventType,
  InvariantError: () => InvariantError,
  ModelEventType: () => ModelEventType,
  VERSION: () => VERSION,
  applyArrayEvent: () => applyArrayEvent,
  calc: () => calc,
  collection: () => collection,
  createElement: () => createElement,
  debug: () => debug2,
  debugGetGraph: () => debugGetGraph,
  debugSubscribe: () => debugSubscribe,
  default: () => src_default,
  defineCustomElement: () => defineCustomElement,
  dict: () => dict,
  dynGet: () => dynGet,
  dynMap: () => dynMap,
  dynSet: () => dynSet,
  dynSubscribe: () => dynSubscribe,
  field: () => field,
  flush: () => flush,
  getLogLevel: () => getLogLevel,
  isDynamic: () => isDynamic,
  isDynamicMut: () => isDynamicMut,
  model: () => model,
  mount: () => mount,
  ref: () => ref,
  reset: () => reset,
  setLogLevel: () => setLogLevel,
  subscribe: () => subscribe
});
module.exports = __toCommonJS(src_exports);

// src/common/types.ts
var InvariantError = class extends Error {
  constructor(msg, detail) {
    super(msg);
    this.detail = detail;
  }
};

// src/common/log.ts
var levels = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3
};
var currentLevel = levels.warn;
function getLogLevel() {
  if (currentLevel >= levels.info)
    return "info";
  if (currentLevel >= levels.warn)
    return "warn";
  if (currentLevel >= levels.debug)
    return "debug";
  return "error";
}
function setLogLevel(logLevel) {
  invariant(() => logLevel in levels, logLevel);
  currentLevel = levels[logLevel];
}
function isAtLogLevel(logLevel) {
  return currentLevel >= levels[logLevel];
}
function debug(...items) {
  if (currentLevel >= levels.debug) {
    console.log(...items);
  }
}
function info(...items) {
  if (currentLevel >= levels.info) {
    console.log(...items);
  }
}
function warn(...items) {
  if (currentLevel >= levels.warn) {
    console.warn(...items);
  }
}
function error(...items) {
  if (currentLevel >= levels.error) {
    console.error(...items);
  }
}
function group(...items) {
  if (currentLevel >= levels.debug) {
    console.group(...items);
  }
}
function groupEnd() {
  if (currentLevel >= levels.debug) {
    console.groupEnd();
  }
}
function invariant(check, ...items) {
  if (!check()) {
    error("Invariant error", check.toString(), "is not truthy", ...items);
  }
}
function fail(msg, ...items) {
  error("Invariant error", msg, ...items);
  throw new InvariantError(`Invariant error: ${msg}`, items);
}
function assert(check, msg, ...items) {
  if (!check) {
    error(
      "Assertion failure",
      check === void 0 ? "undefined" : check === null ? "null" : check.toString(),
      "is not truthy",
      msg,
      ...items
    );
    throw new InvariantError(`Assertion failure: ${msg}`, items);
  }
}
function assertExhausted(context, ...items) {
  error("Assertion failure", context, "is not exhausted", ...items);
  throw new InvariantError("Assertion failure", { context, items });
}

// src/common/util.ts
var noop = () => {
};
var dead = () => {
  throw new Error("Cannot call dead function");
};
var uniqueid = (() => {
  let id = 1;
  return () => id++;
})();
function wrapError(e, msg) {
  if (e instanceof Error)
    return e;
  const err = new Error(msg ?? "Unknown error", { cause: e });
  return err;
}

// src/viewcontroller/commit.ts
var COMMIT_SEQUENCE = [
  0 /* COMMIT_UNMOUNT */,
  1 /* COMMIT_EMIT */,
  2 /* COMMIT_UPDATE */,
  3 /* COMMIT_MOUNT */
];
var commitPhases = {
  [0 /* COMMIT_UNMOUNT */]: /* @__PURE__ */ new Set(),
  [1 /* COMMIT_EMIT */]: /* @__PURE__ */ new Set(),
  [2 /* COMMIT_UPDATE */]: /* @__PURE__ */ new Set(),
  [3 /* COMMIT_MOUNT */]: /* @__PURE__ */ new Set()
};
var commitHandle;
var commitScheduler = defaultScheduler;
function defaultScheduler(callback) {
  if (window.queueMicrotask) {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled)
        return;
      callback();
    });
    return () => {
      cancelled = true;
    };
  }
  const handle = setTimeout(callback, 0);
  return () => clearTimeout(handle);
}
function commit() {
  while (commitHandle !== void 0) {
    commitHandle = void 0;
    performCommit();
  }
}
function performCommit() {
  let activeElement = null;
  for (const phase of COMMIT_SEQUENCE) {
    if (phase === 2 /* COMMIT_UPDATE */) {
      activeElement = document.activeElement;
    }
    const toCommit = Array.from(commitPhases[phase]).sort(
      (a, b) => b.getDepth() - a.getDepth()
    );
    commitPhases[phase] = /* @__PURE__ */ new Set();
    for (const renderNode of toCommit) {
      renderNode.commit(phase);
    }
    if (phase === 2 /* COMMIT_UPDATE */ && activeElement && document.documentElement.contains(activeElement)) {
      activeElement.focus();
    }
  }
}
function requestCommit(target, phase) {
  commitPhases[phase].add(target);
  if (!commitHandle) {
    commitHandle = commitScheduler(commit);
  }
}

// src/model/tarjan.ts
function tarjanStronglyConnected(reverseAdjacency, topologicalIndexById, lowerBound, upperBound, fromNodes) {
  let index = 0;
  const nodeVertex = {};
  const stack = [];
  const reverseTopoSort = [];
  function* getDepenencies(nodeId) {
    for (const toId of reverseAdjacency[nodeId]) {
      const toIndex = topologicalIndexById[toId];
      if (toIndex !== void 0 && lowerBound <= toIndex && toIndex <= upperBound) {
        yield toId;
      }
    }
  }
  const strongconnect = (vertex) => {
    vertex.index = index;
    vertex.lowlink = index;
    index = index + 1;
    stack.push(vertex);
    vertex.onStack = true;
    for (const toId of getDepenencies(vertex.nodeId)) {
      if (!nodeVertex[toId]) {
        nodeVertex[toId] = {
          nodeId: toId
        };
      }
      const toVertex = nodeVertex[toId];
      if (toVertex.index === void 0) {
        strongconnect(toVertex);
        vertex.lowlink = Math.min(
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          vertex.lowlink,
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          toVertex.lowlink
        );
      } else if (toVertex.onStack) {
        vertex.lowlink = Math.min(
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          vertex.lowlink,
          toVertex.index
        );
      }
    }
    if (vertex.lowlink === vertex.index) {
      const component = [];
      for (; ; ) {
        const toVertex = stack.pop();
        toVertex.onStack = false;
        component.push(toVertex.nodeId);
        if (toVertex === vertex) {
          break;
        }
      }
      reverseTopoSort.push(component);
    }
  };
  for (const nodeId of fromNodes) {
    if (!nodeVertex[nodeId]) {
      nodeVertex[nodeId] = {
        nodeId
      };
      strongconnect(nodeVertex[nodeId]);
    }
  }
  return reverseTopoSort;
}

// src/model/graph.ts
var ProcessAction = /* @__PURE__ */ ((ProcessAction2) => {
  ProcessAction2[ProcessAction2["INVALIDATE"] = 0] = "INVALIDATE";
  ProcessAction2[ProcessAction2["RECALCULATE"] = 1] = "RECALCULATE";
  ProcessAction2[ProcessAction2["CYCLE"] = 2] = "CYCLE";
  return ProcessAction2;
})(ProcessAction || {});
var VERTEX_BIT_DIRTY = 1;
var VERTEX_BIT_CYCLE = 2;
var VERTEX_BIT_SELF_CYCLE = 4;
var VERTEX_BIT_CYCLE_INFORMED = 8;
var Graph = class {
  constructor(processHandler2) {
    this._processHandler = processHandler2;
    this.nextId = 1;
    this.availableIds = [];
    this.availableIndices = [];
    this.vertexById = [];
    this.vertexToId = /* @__PURE__ */ new Map();
    this.vertexBitsById = [];
    this.cycleInfoById = {};
    this.topologicalIndexById = [];
    this.topologicalOrdering = [];
    this.forwardAdjacency = [];
    this.reverseAdjacency = [];
    this.startVertexIndex = 0;
    this.toReorderIds = /* @__PURE__ */ new Set();
    this.debugSubscriptions = /* @__PURE__ */ new Set();
  }
  /**
   * Vertex ids can be reused.
   *
   * If a vertex is added, it gets a new id
   * If a vertex is deleted, its id is removed
   * If a
   */
  addVertex(vertex) {
    assert(!this.vertexToId.has(vertex), "double vertex addition");
    let id;
    if (this.availableIds.length > 0) {
      id = this.availableIds.pop();
    } else {
      id = this.nextId++;
    }
    this.vertexToId.set(vertex, id);
    this.vertexById[id] = vertex;
    this.vertexBitsById[id] = 0;
    let index;
    if (this.availableIndices.length > 0) {
      index = this.availableIndices.pop();
    } else {
      index = this.topologicalOrdering.length;
      this.topologicalOrdering.length += 1;
    }
    this.topologicalIndexById[id] = index;
    this.topologicalOrdering[index] = id;
    this.forwardAdjacency[id] = [];
    this.reverseAdjacency[id] = [];
  }
  removeVertex(vertex) {
    const id = this.vertexToId.get(vertex);
    assert(id, "double vertex removal");
    const index = this.topologicalIndexById[id];
    assert(index !== void 0, "malformed graph");
    assert(
      this.forwardAdjacency[id].length === 0,
      "cannot remove vertex with forward edges"
    );
    assert(
      this.reverseAdjacency[id].length === 0,
      "cannot remove vertex with reverse edges"
    );
    this.topologicalIndexById[id] = void 0;
    this.topologicalOrdering[index] = void 0;
    this.clearVertexDirtyInner(id);
    this.vertexBitsById[id] = 0;
    delete this.cycleInfoById[id];
    this.vertexToId.delete(vertex);
    this.vertexById[id] = void 0;
    this.toReorderIds.delete(id);
    this.availableIds.push(id);
    this.availableIndices.push(index);
  }
  hasVertex(vertex) {
    return this.vertexToId.has(vertex);
  }
  markVertexDirty(vertex) {
    const vertexId = this.vertexToId.get(vertex);
    assert(vertexId, "markVertexDirty on nonexistent vertex");
    this.markVertexDirtyInner(vertexId);
  }
  markVertexDirtyInner(vertexId) {
    const vertex = this.vertexById[vertexId];
    if (vertex && !(this.vertexBitsById[vertexId] & VERTEX_BIT_DIRTY)) {
      this.vertexBitsById[vertexId] |= VERTEX_BIT_DIRTY;
      this.vertexBitsById[vertexId] &= ~VERTEX_BIT_CYCLE_INFORMED;
      this.processVertexIdAction(vertexId, 0 /* INVALIDATE */);
      const index = this.topologicalIndexById[vertexId];
      if (index !== void 0 && index < this.startVertexIndex) {
        this.startVertexIndex = index;
      }
    }
  }
  clearVertexDirty(vertex) {
    const vertexId = this.vertexToId.get(vertex);
    assert(vertexId, "markVertexDirty on nonexistent vertex");
    this.clearVertexDirtyInner(vertexId);
  }
  clearVertexDirtyInner(vertexId) {
    if (this.vertexBitsById[vertexId] & VERTEX_BIT_DIRTY) {
      this.vertexBitsById[vertexId] &= ~VERTEX_BIT_DIRTY;
    }
  }
  markVertexCycleInformed(vertex) {
    const vertexId = this.vertexToId.get(vertex);
    assert(vertexId, "markVertexCycleInformed on nonexistent vertex");
    this.vertexBitsById[vertexId] |= VERTEX_BIT_CYCLE_INFORMED;
  }
  *cycleAwareAdjacency(vertexId, cycleInfo, adjacencyList) {
    if (cycleInfo) {
      const yielded = /* @__PURE__ */ new Set();
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
      if (toId !== vertexId)
        yield toId;
    }
  }
  addEdge(fromVertex, toVertex) {
    const fromId = this.vertexToId.get(fromVertex);
    const toId = this.vertexToId.get(toVertex);
    assert(fromId, "addEdge from vertex not found", { fromVertex });
    assert(toId, "addEdge to vertex not found", { toVertex });
    assert(
      !this.forwardAdjacency[fromId].includes(toId),
      "addEdge duplicate"
    );
    this.forwardAdjacency[fromId].push(toId);
    this.reverseAdjacency[toId].push(fromId);
    if (fromId === toId && (this.vertexBitsById[fromId] & VERTEX_BIT_SELF_CYCLE) === 0) {
      const isInformed = this.vertexBitsById[fromId] & VERTEX_BIT_CYCLE_INFORMED;
      if (!isInformed) {
        const vertex = this.vertexById[fromId];
        assert(vertex, "missing vertex in self-cycle");
        this.processVertexIdAction(fromId, 2 /* CYCLE */);
        this.vertexBitsById[fromId] |= VERTEX_BIT_CYCLE_INFORMED | VERTEX_BIT_SELF_CYCLE;
      } else {
        this.vertexBitsById[fromId] |= VERTEX_BIT_SELF_CYCLE;
      }
    }
    const fromIndex = this.topologicalIndexById[fromId];
    const toIndex = this.topologicalIndexById[toId];
    assert(toIndex !== void 0, "malformed graph");
    assert(fromIndex !== void 0, "malformed graph");
    info(
      `Add edge ${fromId} (idx=${fromIndex}) -> ${toId} (idx=${toIndex})`
    );
    const badOrder = fromIndex > toIndex;
    if (badOrder) {
      info(
        `- Out-of-order detected, reordering ${fromId} and ${toId}`
      );
      this.toReorderIds.add(fromId);
      this.toReorderIds.add(toId);
    }
  }
  hasEdge(fromVertex, toVertex) {
    const fromId = this.vertexToId.get(fromVertex);
    const toId = this.vertexToId.get(toVertex);
    assert(fromId, "addEdge from vertex not found");
    assert(toId, "addEdge to vertex not found");
    return this.forwardAdjacency[fromId].includes(toId);
  }
  removeEdge(fromVertex, toVertex) {
    const fromId = this.vertexToId.get(fromVertex);
    const toId = this.vertexToId.get(toVertex);
    assert(fromId, "removeEdge from vertex not found");
    assert(toId, "removeEdge to vertex not found");
    assert(
      this.forwardAdjacency[fromId].includes(toId),
      "removeEdge on edge that does not exist"
    );
    removeUnordered(this.forwardAdjacency[fromId], toId);
    removeUnordered(this.reverseAdjacency[toId], fromId);
    if (fromId === toId) {
      this.vertexBitsById[fromId] = this.vertexBitsById[fromId] & ~VERTEX_BIT_SELF_CYCLE;
    }
    info(`Remove edge ${fromId} -> ${toId}`);
    const fromCycleInfo = this.cycleInfoById[fromId];
    const toCycleInfo = this.cycleInfoById[toId];
    if (fromCycleInfo && toCycleInfo && fromCycleInfo === toCycleInfo) {
      info(
        `- Edge removal possibly broke cycle, reordering ${fromId} and ${toId}`
      );
      this.toReorderIds.add(fromId);
      this.toReorderIds.add(toId);
    }
  }
  visitDfsForwardRecurse(vertexId, lowerBound, upperBound, visited) {
    if (visited.has(vertexId))
      return;
    visited.add(vertexId);
    for (const toId of this.forwardAdjacency[vertexId]) {
      const toIndex = this.topologicalIndexById[toId];
      assert(toIndex !== void 0, "malformed graph");
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
  visitDfsForward(startVertices, lowerBound, upperBound) {
    const visited = /* @__PURE__ */ new Set();
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
  resort(toReorder) {
    info("Resort from", [...toReorder]);
    let lowerBound = Infinity;
    let upperBound = -Infinity;
    for (const vertexId of toReorder) {
      const cycleInfo = this.cycleInfoById[vertexId];
      if (cycleInfo) {
        info(
          `- ${vertexId} is cycle with lower bound ${cycleInfo.lowerBound} & upper bound ${cycleInfo.upperBound}`
        );
        if (cycleInfo.lowerBound < lowerBound)
          lowerBound = cycleInfo.lowerBound;
        if (cycleInfo.upperBound > upperBound)
          upperBound = cycleInfo.upperBound;
      } else {
        const index = this.topologicalIndexById[vertexId];
        info(`- ${vertexId} is vertex with index ${index}`);
        assert(index !== void 0, "malformed graph");
        if (index < lowerBound)
          lowerBound = index;
        if (index > upperBound)
          upperBound = index;
      }
    }
    info(`- lower bound: ${lowerBound}`);
    info(`- upper bound: ${upperBound}`);
    const seedVertices = this.visitDfsForward(
      toReorder,
      lowerBound,
      upperBound
    );
    info(`- seed vertices: ${[...seedVertices].join(",")}`);
    const components = tarjanStronglyConnected(
      this.reverseAdjacency,
      this.topologicalIndexById,
      lowerBound,
      upperBound,
      seedVertices
    );
    info(`- components:`, components);
    const allocatedIndexes = [];
    for (const component of components) {
      for (const vertexId of component) {
        const index = this.topologicalIndexById[vertexId];
        assert(index !== void 0, "malformed graph");
        allocatedIndexes.push(index);
      }
    }
    info("Resort");
    this.debugLogTopology("before sort");
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
    for (const component of components) {
      let cycle;
      if (component.length > 1) {
        cycle = {
          upperBound: -Infinity,
          lowerBound: Infinity,
          vertexIds: new Set(component)
        };
      }
      for (const vertexId of component) {
        if (cycle) {
          this.cycleInfoById[vertexId] = cycle;
          const index = this.topologicalIndexById[vertexId];
          assert(index !== void 0, "malformed graph");
          if (index < cycle.lowerBound)
            cycle.lowerBound = index;
          if (index > cycle.upperBound)
            cycle.upperBound = index;
        }
      }
    }
    for (const component of components) {
      for (const vertexId of component) {
        if (component.length > 1) {
          if (!(this.vertexBitsById[vertexId] & VERTEX_BIT_CYCLE)) {
            this.vertexBitsById[vertexId] |= VERTEX_BIT_CYCLE;
          }
          if (!(this.vertexBitsById[vertexId] & VERTEX_BIT_CYCLE_INFORMED)) {
            const vertex = this.vertexById[vertexId];
            assert(vertex, "uninformed vertex missing");
            this.processVertexIdAction(
              vertexId,
              2 /* CYCLE */
            );
            this.vertexBitsById[vertexId] |= VERTEX_BIT_CYCLE_INFORMED;
          }
        } else if (this.vertexBitsById[vertexId] & VERTEX_BIT_CYCLE) {
          this.vertexBitsById[vertexId] = this.vertexBitsById[vertexId] & ~(VERTEX_BIT_CYCLE | VERTEX_BIT_CYCLE_INFORMED);
          delete this.cycleInfoById[vertexId];
          this.markVertexDirtyInner(vertexId);
        }
      }
    }
    this.debugLogTopology("after sort");
    return lowerBound;
  }
  debugLogTopology(msg, vertexIndex) {
    assert(true, "Do not call debugLogTopology when DEBUG not true");
    if (isAtLogLevel("info")) {
      info("Topology", msg);
      for (let i = 0; i < this.topologicalOrdering.length; ++i) {
        const vId = this.topologicalOrdering[i];
        const prefix = vertexIndex === i ? "->" : "--";
        if (vId === void 0) {
          info(`${prefix} [idx=${i}] (empty)`);
        } else {
          const v = this.vertexById[vId];
          if (!v) {
            info(
              `${prefix} [idx=${i}] id=${vId} (no vertex?!)`
            );
          } else {
            const isDirty = !!(this.vertexBitsById[vId] & VERTEX_BIT_DIRTY);
            const cycleInfo = this.cycleInfoById[vId];
            if (cycleInfo) {
              info(
                `${prefix} [idx=${i}] id=${vId} ${v.__debugName}; out=${this.forwardAdjacency[vId]?.join(",")}; cycle=${[...cycleInfo.vertexIds].join(",")}; cycleRange=[${cycleInfo.lowerBound}, ${cycleInfo.upperBound}] ${isDirty ? "dirty" : "clean"}`
              );
            } else {
              info(
                `${prefix} [idx=${i}] id=${vId} ${v.__debugName}; out=${this.forwardAdjacency[vId]?.join(",")} ${isDirty ? "dirty" : "clean"}`
              );
            }
          }
        }
      }
    }
  }
  processHandler(vertexGroup, action) {
    return this._processHandler(vertexGroup, action);
  }
  processVertexIdAction(vertexId, action) {
    const cycleInfo = this.cycleInfoById[vertexId];
    const vertexIds = [];
    const vertexGroup = /* @__PURE__ */ new Set();
    if (cycleInfo) {
      for (const cycleVertexId of cycleInfo.vertexIds) {
        vertexIds.push(cycleVertexId);
        const vertex = this.vertexById[cycleVertexId];
        assert(vertex, "malformed graph");
        vertexGroup.add(vertex);
      }
    } else {
      vertexIds.push(vertexId);
      const vertex = this.vertexById[vertexId];
      assert(vertex, "malformed graph");
      vertexGroup.add(vertex);
    }
    debug(
      `Processing vertex group action=${ProcessAction[action]}`,
      Object.fromEntries(
        [...vertexGroup].map((vertex) => [
          vertex.__debugName,
          vertex
        ])
      )
    );
    if (action === 2 /* CYCLE */) {
      const anyDirty = vertexIds.some(
        (vertexId2) => this.vertexBitsById[vertexId2] & VERTEX_BIT_DIRTY
      );
      for (const vertexId2 of vertexIds) {
        const isInformed = this.vertexBitsById[vertexId2] & VERTEX_BIT_CYCLE_INFORMED;
        if (!isInformed) {
          if (anyDirty) {
            this.vertexBitsById[vertexId2] |= VERTEX_BIT_DIRTY;
          }
          const index = this.topologicalIndexById[vertexId2];
          if (index !== void 0 && index < this.startVertexIndex) {
            this.startVertexIndex = index;
          }
          this.vertexBitsById[vertexId2] |= VERTEX_BIT_CYCLE_INFORMED;
        }
      }
    }
    this._processHandler(vertexGroup, action);
    const aliveVertices = [];
    for (const vertex of vertexGroup) {
      if (this.vertexToId.get(vertex) !== void 0) {
        aliveVertices.push(vertex);
      }
    }
    return aliveVertices;
  }
  process() {
    if (true) {
      this.debugSubscriptions.forEach(({ subscription, formatter }) => {
        const label = `Process start`;
        subscription(
          this.debug(
            (v) => ({
              ...formatter(v)
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
    for (; ; ) {
      const vertexIndex = this.startVertexIndex;
      if (vertexIndex >= this.vertexById.length) {
        this.startVertexIndex = 0;
        break;
      }
      this.startVertexIndex++;
      const vertexId = this.topologicalOrdering[vertexIndex];
      if (vertexId === void 0) {
        continue;
      }
      const isDirty = this.vertexBitsById[vertexId] & VERTEX_BIT_DIRTY;
      if (!isDirty) {
        continue;
      }
      this.debugLogTopology("Process step", vertexIndex);
      const vertex = this.vertexById[vertexId];
      assert(vertex, "nonexistent vertex dirtied");
      const beforeCycleInfo = this.cycleInfoById[vertexId];
      const vertexGroup = this.processVertexIdAction(
        vertexId,
        1 /* RECALCULATE */
      );
      for (const vertex2 of vertexGroup) {
        this.clearVertexDirty(vertex2);
      }
      if (this.toReorderIds.size > 0) {
        const lowerBound = this.resort(this.toReorderIds);
        if (lowerBound < this.startVertexIndex) {
          this.startVertexIndex = lowerBound;
        }
        this.toReorderIds.clear();
      }
      const newCycleInfo = this.cycleInfoById[vertexId];
      if (!beforeCycleInfo && newCycleInfo) {
        this.processVertexIdAction(vertexId, 2 /* CYCLE */);
      } else if (beforeCycleInfo && !newCycleInfo) {
      } else if (newCycleInfo) {
        this.processVertexIdAction(vertexId, 2 /* CYCLE */);
      } else if (this.vertexBitsById[vertexId] & VERTEX_BIT_SELF_CYCLE) {
        this.processVertexIdAction(vertexId, 2 /* CYCLE */);
      }
    }
    if (true) {
      this.debugSubscriptions.forEach(({ subscription, formatter }) => {
        const label = `Process end`;
        subscription(
          this.debug(
            (v) => ({
              ...formatter(v)
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
    const vertices = [];
    for (let vertexIndex = 0; vertexIndex < this.topologicalOrdering.length; ++vertexIndex) {
      const vertexId = this.topologicalOrdering[vertexIndex];
      if (vertexId === void 0) {
        continue;
      }
      const isDirty = this.vertexBitsById[vertexId] & VERTEX_BIT_DIRTY;
      if (!isDirty) {
        continue;
      }
      const vertex = this.vertexById[vertexId];
      assert(vertex, "nonexistent vertex dirtied");
      vertices.push(vertex);
    }
    return vertices;
  }
  propagateDirty(vertexId, cycleVertexIds) {
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
  *getForwardDependencies(vertex) {
    const vertexId = this.vertexToId.get(vertex);
    assert(
      vertexId !== void 0,
      "attempted to get forward dependencies on nonexistent vertex",
      { vertex }
    );
    const cycleInfo = this.cycleInfoById[vertexId];
    for (const toId of this.forwardAdjacency[vertexId]) {
      const toVertex = this.vertexById[toId];
      assert(toVertex !== void 0, "malformed graph");
      if (!cycleInfo || !cycleInfo.vertexIds.has(toId)) {
        yield toVertex;
      }
    }
  }
  debug(getAttrs, label) {
    const lines = [];
    lines.push("digraph dependencies {");
    lines.push(`  graph [];`);
    lines.push(`  edge [penwidth=2.0];`);
    lines.push(`  node [penwidth=2.0];`);
    if (label) {
      lines.push(`  graph [label=${JSON.stringify(label)};]`);
    }
    const emitVertex = (id) => {
      const vertex = this.vertexById[id];
      if (!vertex)
        return;
      const customAttrs = getAttrs(vertex);
      const attrs = {
        style: "filled",
        label: `${id}
${customAttrs.name}`
      };
      attrs.shape = "ellipse";
      if (this.vertexBitsById[id] & VERTEX_BIT_DIRTY) {
        attrs.style = "filled";
        attrs.fontcolor = "#FFFFFF";
        attrs.fillcolor = "#FC7A1E";
      } else {
        attrs.style = "filled";
        attrs.fontcolor = "#000000";
        attrs.fillcolor = "#FFFFFF";
      }
      if (customAttrs.isActive) {
        attrs.penwidth = 4;
        attrs.pencolor = "#485696";
      }
      const labelItems = [];
      for (const [attrName, attrVal] of Object.entries(attrs)) {
        labelItems.push(`${attrName}=${JSON.stringify(attrVal)}`);
      }
      lines.push(`  v_${id} [${labelItems.join(",")}]`);
    };
    const cycles = /* @__PURE__ */ new Set();
    for (let id = 0; id < this.vertexById.length; ++id) {
      const cycleInfo = this.cycleInfoById[id];
      if (cycleInfo) {
        cycles.add(cycleInfo);
      }
    }
    for (const cycle of cycles) {
      lines.push("  subgraph cluster_cycle {");
      lines.push(`  graph [label="cycle";]`);
      for (const cycleId of cycle.vertexIds) {
        emitVertex(cycleId);
      }
      lines.push("  }");
    }
    for (let id = 0; id < this.vertexById.length; ++id) {
      const cycleInfo = this.cycleInfoById[id];
      if (cycleInfo)
        continue;
      emitVertex(id);
    }
    for (let id = 0; id < this.vertexById.length; ++id) {
      if (this.forwardAdjacency[id]) {
        for (const toId of this.forwardAdjacency[id]) {
          lines.push(`  v_${id} -> v_${toId};`);
        }
      }
    }
    lines.push("}");
    return lines.join("\n");
  }
  debugSubscribe(formatter, subscription) {
    const entry = {
      formatter,
      subscription
    };
    this.debugSubscriptions.add(entry);
    return () => {
      this.debugSubscriptions.delete(entry);
    };
  }
  debugGetGraph() {
    const vertices = [];
    for (let i = 0; i < this.vertexById.length; ++i) {
      const vertex = this.vertexById[i];
      if (vertex) {
        vertices.push(vertex);
      }
    }
    const edges = [];
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
  _test_getVertices() {
    return dead();
  }
  _test_getDependencies(vertex) {
    return dead();
  }
  _test_getVertexInfo(vertex) {
    return dead();
  }
};
if (false) {
  Graph.prototype._test_getVertices = function _test_getVertices() {
    return this.vertexById.filter((vertex) => !!vertex);
  };
  Graph.prototype._test_getDependencies = function _test_getDependencies(vertex) {
    const id = this.vertexToId.get(vertex);
    assert(id, "getDependencies on nonexistent vertex");
    return this.forwardAdjacency[id].map((toId) => this.vertexById[toId]);
  };
  Graph.prototype._test_getVertexInfo = function _test_getVertexInfo(vertex) {
    const id = this.vertexToId.get(vertex);
    if (id === void 0)
      return void 0;
    const index = this.topologicalIndexById[id];
    assert(index !== void 0, "malformed graph");
    const bits = this.vertexBitsById[id];
    return {
      id,
      index,
      bits
    };
  };
}
function removeUnordered(array, value) {
  if (value === array[array.length - 1]) {
    array.pop();
    return;
  }
  const index = array.indexOf(value);
  array[index] = array[array.length - 1];
  array.pop();
}

// src/model/engine.ts
function isProcessable(val) {
  return val && val.__processable === true;
}
var globalDependencyGraph = new Graph(processHandler);
var trackReadCallbackStack = [];
var isFlushing = false;
var needsFlush = false;
var flushHandle = null;
var flushScheduler = defaultScheduler2;
var componentToReplaceSet = /* @__PURE__ */ new Map();
function noopScheduler(callback) {
  return noop;
}
function defaultScheduler2(callback) {
  if (window.queueMicrotask) {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled)
        return;
      callback();
    });
    return () => {
      cancelled = true;
    };
  }
  const handle = setTimeout(callback, 0);
  return () => clearTimeout(handle);
}
function reset() {
  globalDependencyGraph = new Graph(processHandler);
  trackReadCallbackStack = [];
  isFlushing = false;
  needsFlush = false;
  if (flushHandle)
    flushHandle();
  flushHandle = null;
  flushScheduler = defaultScheduler2;
  componentToReplaceSet = /* @__PURE__ */ new Map();
}
function registerComponentReload(component, reload) {
  let reloads = componentToReplaceSet.get(component);
  if (!reloads) {
    reloads = /* @__PURE__ */ new Set();
    componentToReplaceSet.set(component, reloads);
  }
  reloads.add(reload);
}
function unregisterComponentReload(component, reload) {
  const reloads = componentToReplaceSet.get(component);
  assert(
    reloads,
    "Internal error: unexpected unregisterComponentRenderNode, previously unseen",
    { component, reload }
  );
  reloads.delete(reload);
}
function replaceComponent(toReplace, newComponent) {
  const reloads = componentToReplaceSet.get(toReplace);
  if (reloads) {
    reloads.forEach((replace) => {
      replace(newComponent);
      registerComponentReload(newComponent, replace);
    });
  }
  componentToReplaceSet.delete(toReplace);
}
function scheduleFlush() {
  if (needsFlush)
    return;
  needsFlush = true;
  flushHandle = flushScheduler(() => {
    needsFlush = false;
    flushHandle = null;
    flushInner();
  });
}
function flush() {
  if (isFlushing) {
    return;
  }
  if (flushHandle) {
    flushHandle();
    flushHandle = null;
  }
  needsFlush = false;
  flushInner();
}
function subscribe(scheduler) {
  flushScheduler = scheduler ?? noopScheduler;
}
function retain(retainable) {
  debug(
    "retain",
    retainable.__debugName,
    "was",
    retainable.__refcount
  );
  retainable.__refcount += 1;
  if (retainable.__refcount === 1) {
    retainable.__alive();
  }
}
function release(retainable) {
  debug(
    "release",
    retainable.__debugName,
    "was",
    retainable.__refcount
  );
  assert(retainable.__refcount > 0, "double release");
  if (retainable.__refcount === 1) {
    retainable.__dead();
  }
  retainable.__refcount -= 1;
}
function processHandler(vertexGroup, action) {
  const toInvalidate = /* @__PURE__ */ new Set();
  for (const vertex of vertexGroup) {
    debug(
      "process",
      ProcessAction[action],
      vertex.__debugName,
      vertex
    );
    switch (action) {
      case 0 /* INVALIDATE */:
        vertex.__invalidate?.();
        break;
      case 1 /* RECALCULATE */:
        vertex.__recalculate?.(vertexGroup).forEach((v) => toInvalidate.add(v));
        break;
      case 2 /* CYCLE */:
        vertex.__cycle?.();
        for (const toVertex of getForwardDependencies(
          vertex
        )) {
          toInvalidate.add(toVertex);
        }
        break;
      default:
        assertExhausted(action, "unknown action");
    }
  }
  for (const vertex of vertexGroup) {
    toInvalidate.delete(vertex);
  }
  for (const vertex of toInvalidate) {
    debug("post-process invalidate", vertex.__debugName, vertex);
    markDirty(vertex);
  }
  return false;
}
function flushInner() {
  isFlushing = true;
  globalDependencyGraph.process();
  commit();
  isFlushing = false;
  if (needsFlush) {
    flush();
  }
}
function addVertex(vertex) {
  debug("addVertex", vertex.__debugName);
  globalDependencyGraph.addVertex(vertex);
}
function removeVertex(vertex) {
  debug("removeVertex", vertex.__debugName);
  globalDependencyGraph.removeVertex(vertex);
}
function addEdge(fromVertex, toVertex) {
  debug(
    "add edge",
    fromVertex.__debugName,
    "->",
    toVertex.__debugName
  );
  globalDependencyGraph.addEdge(fromVertex, toVertex);
}
function removeEdge(fromVertex, toVertex) {
  debug(
    "del edge",
    fromVertex.__debugName,
    "->",
    toVertex.__debugName
  );
  globalDependencyGraph.removeEdge(fromVertex, toVertex);
}
function markDirty(vertex) {
  debug("Vertex manually marked dirty", vertex.__debugName);
  globalDependencyGraph.markVertexDirty(vertex);
  scheduleFlush();
}
function markCycleInformed(vertex) {
  debug(
    "Vertex manually marked as cycle informed",
    vertex.__debugName
  );
  globalDependencyGraph.markVertexCycleInformed(vertex);
}
function trackReads(onRead, fn, debugName) {
  group("trackReads", debugName ?? "call");
  trackReadCallbackStack.push(onRead);
  try {
    return fn();
  } finally {
    groupEnd();
    assert(
      onRead === trackReadCallbackStack.pop(),
      "Calculation tracking consistency error"
    );
  }
}
function untrackReads(fn, debugName) {
  group("untrackReads", debugName ?? "call");
  trackReadCallbackStack.push(null);
  try {
    return fn();
  } finally {
    groupEnd();
    assert(
      null === trackReadCallbackStack.pop(),
      "Calculation tracking consistency error"
    );
  }
}
function notifyRead(dependency) {
  if (trackReadCallbackStack.length === 0)
    return void 0;
  const onRead = trackReadCallbackStack[trackReadCallbackStack.length - 1];
  if (onRead) {
    debug(
      "adding dependency",
      dependency.__debugName,
      "to active calculation"
    );
    return onRead(dependency);
  }
  return void 0;
}
function* getForwardDependencies(dependency) {
  yield* globalDependencyGraph.getForwardDependencies(dependency);
}
function debug2(activeVertex, label) {
  return globalDependencyGraph.debug((vertex) => {
    return {
      isActive: vertex === activeVertex,
      name: `${vertex.__debugName} (rc=${vertex.__refcount})`
    };
  }, label);
}
function debugSubscribe(fn) {
  return globalDependencyGraph.debugSubscribe((vertex) => {
    return {
      isActive: false,
      name: vertex.__debugName
    };
  }, fn);
}
function debugGetGraph() {
  const { vertices, edges } = globalDependencyGraph.debugGetGraph();
  const labels = /* @__PURE__ */ new Map();
  vertices.forEach((vertex) => {
    labels.set(vertex, vertex.__debugName);
  });
  return { vertices, edges, labels };
}

// src/model/calc.ts
function strictEqual(a, b) {
  return a === b;
}
var Calculation = class {
  ensureResult() {
    const result = this._result;
    if (result && !result.ok) {
      return { propagate: false, result };
    }
    if (result?.ok && !result.stale) {
      debug(`Reuse calc ${this.__debugName}`);
      return { propagate: false, result };
    }
    if (result?.ok && result.stale) {
      debug(`Recalculating calc (stale) ${this.__debugName}`);
      const lastValue = result.value;
      const newResult = this.recalc();
      if (newResult.ok && this._eq(lastValue, newResult.value)) {
        debug(`Stale recalculation reused ${this.__debugName}`);
        return {
          propagate: false,
          result: {
            ok: true,
            stale: false,
            value: lastValue
          }
        };
      }
      return { propagate: true, result: newResult };
    }
    debug(`Recalculating calc ${this.__debugName}`);
    return { propagate: true, result: this.recalc() };
  }
  get() {
    notifyRead(this);
    const { result } = this.ensureResult();
    if (!result.ok) {
      throw result.error;
    }
    return result.value;
  }
  recalc() {
    if (this._calculating) {
      throw new SynchronousCycleError(
        "Cycle error: calculation cycle reached itself",
        this
      );
    }
    this._calculating = true;
    let result;
    const newDependencies = /* @__PURE__ */ new Set();
    try {
      result = {
        ok: true,
        stale: false,
        value: trackReads(
          (dependency) => {
            if (!newDependencies.has(dependency)) {
              newDependencies.add(dependency);
              retain(dependency);
              if (!this._dependencies.has(dependency) && isProcessable(dependency) && this.__refcount > 0) {
                addEdge(dependency, this);
              }
            }
            return this;
          },
          () => this._fn(),
          this.__debugName
        )
      };
    } catch (e) {
      result = {
        ok: false,
        error: wrapError(e)
      };
    }
    this._calculating = false;
    for (const prevDependency of this._dependencies) {
      if (!newDependencies.has(prevDependency) && isProcessable(prevDependency) && this.__refcount > 0) {
        removeEdge(prevDependency, this);
      }
      release(prevDependency);
    }
    this._dependencies = newDependencies;
    const synchronousError = !result.ok && result.error instanceof SynchronousCycleError ? result.error : null;
    if (synchronousError) {
      if (this.__refcount > 0) {
        markCycleInformed(this);
      }
      if (synchronousError.sourceCalculation !== this) {
        synchronousError.passthruCalculations.add(this);
      } else {
        for (const calculation of synchronousError.passthruCalculations) {
          calculation.__invalidate();
        }
        const cycleDependencies = new Set(
          this._dependencies
        );
        for (const calculation of synchronousError.passthruCalculations) {
          for (const dependency of calculation.__cycle()) {
            cycleDependencies.add(dependency);
          }
        }
        for (const calculation of synchronousError.passthruCalculations) {
          cycleDependencies.delete(calculation);
        }
        cycleDependencies.delete(this);
      }
    }
    if (!result.ok) {
      let error2;
      if (result.error instanceof SynchronousCycleError && result.error.sourceCalculation === this) {
        error2 = new CycleError(
          "Cycle error: calculation cycle reached itself"
        );
      } else {
        error2 = result.error;
      }
      if (this._errorHandler) {
        try {
          result = {
            ok: true,
            stale: false,
            value: this._errorHandler(error2)
          };
        } catch (innerError) {
          result = {
            ok: false,
            error: wrapError(innerError)
          };
        }
      } else {
        result = {
          ok: false,
          error: error2
        };
      }
    }
    if (this.__refcount > 0) {
      this._result = result;
    }
    if (synchronousError && synchronousError.sourceCalculation !== this) {
      throw synchronousError;
    }
    return result;
  }
  constructor(fn, debugName) {
    this.__refcount = 0;
    this.__debugName = debugName ?? `calc:(${fn.name})`;
    this.__processable = true;
    this._result = void 0;
    this._fn = fn;
    this._errorHandler = void 0;
    this._calculating = false;
    this._eq = strictEqual;
    this._dependencies = /* @__PURE__ */ new Set();
    this._subscriptions = /* @__PURE__ */ new Set();
  }
  onError(handler) {
    this._errorHandler = handler;
    return this;
  }
  setCmp(eq) {
    this._eq = eq;
    return this;
  }
  subscribe(handler) {
    retain(this);
    let args;
    try {
      args = [void 0, this.get()];
    } catch (e) {
      args = [wrapError(e), void 0];
    }
    if (!this._subscriptions) {
      this._subscriptions = /* @__PURE__ */ new Set();
    }
    this._subscriptions.add(handler);
    const unsubscribe = () => {
      this._subscriptions?.delete(handler);
      release(this);
    };
    handler(...args);
    return unsubscribe;
  }
  retain() {
    retain(this);
  }
  release() {
    release(this);
  }
  __alive() {
    addVertex(this);
    this._dependencies.clear();
  }
  __dead() {
    this._result = void 0;
    for (const dependency of this._dependencies) {
      if (isProcessable(dependency)) {
        removeEdge(dependency, this);
      }
      release(dependency);
    }
    this._dependencies.clear();
    removeVertex(this);
  }
  __recalculate(vertexGroup) {
    const { propagate, result } = this.ensureResult();
    debug(
      `Recalculated ${this.__debugName} (propagate=${propagate}) {result=${JSON.stringify(result)}}`
    );
    this.notifySubscriptions(result);
    const toPropagate = [];
    if (propagate) {
      for (const dependency of getForwardDependencies(this)) {
        toPropagate.push(dependency);
      }
    }
    return toPropagate;
  }
  __invalidate() {
    if (this._result?.ok) {
      this._result = { ...this._result, stale: true };
    } else {
      this._result = void 0;
    }
  }
  __cycle() {
    const error2 = new MarkedCycleError(
      "Cycle error: calculation cycle reached itself"
    );
    if (this._errorHandler) {
      try {
        this._result = {
          ok: true,
          stale: false,
          value: this._errorHandler(error2)
        };
      } catch (e) {
        this._result = { ok: false, error: wrapError(e) };
      }
    } else {
      this._result = {
        ok: false,
        error: error2
      };
    }
    this.notifySubscriptions(this._result);
    return [...getForwardDependencies(this)];
  }
  notifySubscriptions(result) {
    for (const subscription of this._subscriptions) {
      if (result.ok) {
        subscription(void 0, result.value);
      } else {
        subscription(result.error, void 0);
      }
    }
  }
  map(fn) {
    return calc(() => fn(this.get()));
  }
};
var CycleError = class extends Error {
};
var MarkedCycleError = class extends CycleError {
};
var SynchronousCycleError = class extends CycleError {
  constructor(msg, sourceCalculation) {
    super(msg);
    this.sourceCalculation = sourceCalculation;
    this.passthruCalculations = /* @__PURE__ */ new Set();
  }
};
function calc(fn, debugName) {
  return new Calculation(fn, debugName);
}

// src/model/field.ts
var Field = class {
  constructor(val, debugName) {
    this._val = val;
    this._changeClock = 0;
    this.__processable = true;
    this.__refcount = 0;
    this.__debugName = debugName ?? "field";
  }
  get() {
    notifyRead(this);
    return this._val;
  }
  set(newVal) {
    if (newVal !== this._val) {
      if (this._subscribers) {
        this._changeClock += 1;
      }
      this._val = newVal;
      if (this.__refcount > 0) {
        markDirty(this);
      }
    }
  }
  subscribe(subscriber) {
    this.retain();
    if (!this._subscribers)
      this._subscribers = /* @__PURE__ */ new Map();
    this._subscribers.set(subscriber, this._changeClock);
    subscriber(void 0, this._val);
    return () => {
      if (this._subscribers?.has(subscriber)) {
        this._subscribers?.delete(subscriber);
        this.release();
      }
    };
  }
  retain() {
    retain(this);
  }
  release() {
    release(this);
  }
  __alive() {
    addVertex(this);
  }
  __dead() {
    removeVertex(this);
  }
  __recalculate() {
    assert(this.__refcount > 0, "cannot flush dead field");
    if (this._subscribers) {
      for (const [subscriber, observeClock] of this._subscribers) {
        if (observeClock < this._changeClock) {
          subscriber(void 0, this._val);
        }
        this._subscribers.set(subscriber, 0);
      }
      this._changeClock = 0;
    }
    return [...getForwardDependencies(this)];
  }
  map(fn) {
    return calc(() => fn(this.get()));
  }
};
function field(val, debugName) {
  return new Field(val, debugName);
}

// src/viewcontroller/jsx.ts
function isCustomJSXNode(node) {
  return !!(node && typeof node === "object" && "__renderNode" in node && typeof node.__renderNode === "function");
}
function attrBooleanToEmptyString(val) {
  if (!val)
    return void 0;
  return "";
}
function attrStringOrNumberToNumber(val) {
  if (val === void 0)
    return void 0;
  return typeof val === "number" ? val : parseInt(val);
}
function attrYesNo(val) {
  if (val === void 0)
    return void 0;
  return val === "no" ? false : true;
}
var attrBehavior = {
  "accept-charset": { idn: "acceptCharset" },
  "aria-atomic": { idn: "ariaAtomic" },
  "aria-autocomplete": { idn: "ariaAutoComplete" },
  "aria-busy": { idn: "ariaBusy" },
  "aria-checked": { idn: "ariaChecked" },
  "aria-colcount": { idn: "ariaColCount" },
  "aria-colindex": { idn: "ariaColIndex" },
  "aria-colindextext": { idn: "ariaColIndexText" },
  "aria-colspan": { idn: "ariaColSpan" },
  "aria-current": { idn: "ariaCurrent" },
  "aria-disabled": { idn: "ariaDisabled" },
  "aria-expanded": { idn: "ariaExpanded" },
  "aria-haspopup": { idn: "ariaHasPopup" },
  "aria-hidden": { idn: "ariaHidden" },
  "aria-invalid": { idn: "ariaInvalid" },
  "aria-keyshortcuts": { idn: "ariaKeyShortcuts" },
  "aria-label": { idn: "ariaLabel" },
  "aria-level": { idn: "ariaLevel" },
  "aria-live": { idn: "ariaLive" },
  "aria-modal": { idn: "ariaModal" },
  "aria-multiline": { idn: "ariaMultiLine" },
  "aria-multiselectable": { idn: "ariaMultiSelectable" },
  "aria-orientation": { idn: "ariaOrientation" },
  "aria-placeholder": { idn: "ariaPlaceholder" },
  "aria-posinset": { idn: "ariaPosInSet" },
  "aria-pressed": { idn: "ariaPressed" },
  "aria-readonly": { idn: "ariaReadOnly" },
  "aria-required": { idn: "ariaRequired" },
  "aria-roledescription": { idn: "ariaRoleDescription" },
  "aria-rowcount": { idn: "ariaRowCount" },
  "aria-rowindex": { idn: "ariaRowIndex" },
  "aria-rowindextext": { idn: "ariaRowIndexText" },
  "aria-rowspan": { idn: "ariaRowSpan" },
  "aria-selected": { idn: "ariaSelected" },
  "aria-setsize": { idn: "ariaSetSize" },
  "aria-sort": { idn: "ariaSort" },
  "aria-valuemax": { idn: "ariaValueMax" },
  "aria-valuemin": { idn: "ariaValueMin" },
  "aria-valuenow": { idn: "ariaValueNow" },
  "aria-valuetext": { idn: "ariaValueText" },
  "http-equiv": { idn: "httpEquiv" },
  abbr: {},
  accept: {},
  accesskey: { idn: "accessKey" },
  action: {},
  allow: {},
  allowfullscreen: { idn: "allowFullscreen" },
  alt: {},
  as: {},
  async: {},
  autocapitalize: {},
  autocomplete: {},
  autofocus: {},
  autoplay: {},
  charset: { idn: null },
  checked: {},
  cite: {},
  class: { idn: "className" },
  color: { idn: null },
  cols: { idv: attrStringOrNumberToNumber },
  colspan: { idn: "colSpan", idv: attrStringOrNumberToNumber },
  content: {},
  contenteditable: { idn: "contentEditable" },
  controls: {},
  coords: {},
  crossorigin: { idn: "crossOrigin" },
  data: {},
  datetime: { idn: "dateTime" },
  decoding: {},
  default: {},
  defer: {},
  dir: {},
  dirname: { idn: "dirName" },
  disabled: {},
  download: {},
  draggable: {},
  enctype: {},
  enterkeyhint: { idn: "enterKeyHint" },
  for: { idn: "htmlFor" },
  form: { idn: null },
  formaction: { idn: "formAction" },
  formenctype: { idn: "formEnctype" },
  formmethod: { idn: "formMethod" },
  formnovalidate: { idn: "formNoValidate" },
  formtarget: { idn: "formTarget" },
  headers: {},
  height: { idv: attrStringOrNumberToNumber },
  hidden: {},
  high: { idv: attrStringOrNumberToNumber },
  href: {},
  hreflang: {},
  id: {},
  imagesizes: { idn: "imageSizes" },
  imagesrcset: { idn: "imageSrcset" },
  indeterminate: { noa: true },
  inputmode: { idn: "inputMode" },
  integrity: {},
  is: { idn: null },
  ismap: { idn: "isMap" },
  itemid: { idn: null },
  itemprop: { idn: null },
  itemref: { idn: null },
  itemscope: { idn: null },
  itemtype: { idn: null },
  kind: {},
  label: {},
  lang: {},
  list: {},
  loading: {},
  loop: { idv: attrBooleanToEmptyString },
  low: { idv: attrStringOrNumberToNumber },
  max: { idv: attrStringOrNumberToNumber },
  maxlength: {
    idn: "maxLength",
    idv: attrStringOrNumberToNumber
  },
  media: {},
  method: {},
  min: { idv: attrStringOrNumberToNumber },
  minlength: {
    idn: "minLength",
    idv: attrStringOrNumberToNumber
  },
  multiple: {},
  muted: {},
  name: {},
  nomodule: { idn: "noModule" },
  nonce: {},
  novalidate: { idn: "noValidate" },
  open: {},
  optimum: { idv: attrStringOrNumberToNumber },
  pattern: {},
  ping: {},
  placeholder: {},
  playsinline: { idn: "playsInline" },
  popover: {
    idv: (val) => {
      if (val === true)
        return "auto";
      if (val === false)
        return void 0;
      return val;
    }
  },
  poster: {},
  preload: {},
  readonly: { idn: "readOnly" },
  referrerpolicy: { idn: "referrerPolicy" },
  rel: {},
  required: {},
  reversed: {},
  role: {},
  rows: { idv: attrStringOrNumberToNumber },
  rowspan: { idn: "rowSpan", idv: attrStringOrNumberToNumber },
  sandbox: {},
  scope: {},
  selected: {},
  shape: {},
  size: { idv: attrStringOrNumberToNumber },
  sizes: {},
  slot: {},
  span: { idv: attrStringOrNumberToNumber },
  spellcheck: {},
  src: {},
  srcdoc: {},
  srclang: {},
  srcset: {},
  start: { idv: attrStringOrNumberToNumber },
  step: { idv: attrStringOrNumberToNumber },
  style: {},
  tabindex: { idn: "tabIndex", idv: attrStringOrNumberToNumber },
  target: {},
  title: {},
  translate: { idv: attrYesNo },
  type: {},
  usemap: { idn: "useMap" },
  // value: {}, // NOTE: value is special and depends on the element
  width: { idv: attrStringOrNumberToNumber },
  wrap: {}
};
function setAttribute(element, attributeName, val) {
  if (val === void 0 || val === null || val === false) {
    element.removeAttribute(attributeName);
  } else if (val === true) {
    element.setAttribute(attributeName, "");
  } else if (typeof val === "string") {
    element.setAttribute(attributeName, val);
  } else if (typeof val === "number" || typeof val === "bigint") {
    element.setAttribute(attributeName, val.toString());
  }
}
function assignProp(element, attribute, value) {
  if (!(element instanceof HTMLElement)) {
    setAttribute(element, attribute, value);
    return;
  }
  if (attribute === "value") {
    switch (element.tagName) {
      case "PROGRESS":
      case "METER":
        setAttribute(element, attribute, value);
        element.value = attrStringOrNumberToNumber(value);
        break;
      case "SELECT":
        element.value = value;
        break;
      case "BUTTON":
      case "DATA":
      case "INPUT":
      case "LI":
      case "OPTION":
      case "PARAM":
      case "TEXTAREA":
        setAttribute(element, attribute, value);
        element.value = value;
        break;
      default:
        setAttribute(element, attribute, value);
    }
    return;
  }
  const behavior = attrBehavior[attribute];
  if (behavior) {
    if (!behavior.noa) {
      const attributeValue = value;
      setAttribute(element, attribute, attributeValue);
    }
    if (behavior.idn !== null) {
      const idlValue = behavior.idv ? behavior.idv(value) : value;
      element[behavior.idn ?? attribute] = idlValue;
    }
    return;
  }
  setAttribute(element, attribute, value);
}

// src/common/arrayevent.ts
var ArrayEventType = /* @__PURE__ */ ((ArrayEventType2) => {
  ArrayEventType2["SPLICE"] = "splice";
  ArrayEventType2["MOVE"] = "move";
  ArrayEventType2["SORT"] = "sort";
  return ArrayEventType2;
})(ArrayEventType || {});
var EMPTY_ARRAY = [];
function applySort(target, from, indexes) {
  const duped = target.slice(from, from + indexes.length);
  for (let i = 0; i < indexes.length; ++i) {
    target[i + from] = duped[indexes[i] - from];
  }
}
function applyMove(target, from, count, to) {
  const slice = target.splice(from, count);
  target.splice(to, 0, ...slice);
}
function applyArrayEvent(target, event) {
  switch (event.type) {
    case "splice" /* SPLICE */: {
      if (event.items) {
        return target.splice(event.index, event.count, ...event.items);
      } else {
        return target.splice(event.index, event.count);
      }
    }
    case "sort" /* SORT */: {
      applySort(target, event.from, event.indexes);
      break;
    }
    case "move" /* MOVE */: {
      applyMove(target, event.from, event.count, event.to);
      break;
    }
    default:
      assertExhausted(event);
  }
  return EMPTY_ARRAY;
}
function* mergeArrayEvents(events) {
  const iterator = events[Symbol.iterator]();
  const firstItem = iterator.next();
  if (firstItem.done) {
    return;
  }
  let lastEvent = firstItem.value;
  let mergedItems;
  while (true) {
    const nextItem = iterator.next();
    if (nextItem.done) {
      break;
    }
    const event = nextItem.value;
    if (event.type === "splice" /* SPLICE */ && lastEvent.type === "splice" /* SPLICE */ && lastEvent.index + (lastEvent.items?.length ?? 0) === event.index) {
      if (!mergedItems) {
        mergedItems = lastEvent.items?.slice() ?? [];
      }
      if (event.items) {
        mergedItems.push(...event.items);
      }
      if (mergedItems.length) {
        lastEvent = {
          type: "splice" /* SPLICE */,
          index: lastEvent.index,
          count: lastEvent.count + event.count,
          items: mergedItems
        };
      } else {
        lastEvent = {
          type: "splice" /* SPLICE */,
          index: lastEvent.index,
          count: lastEvent.count + event.count
        };
      }
    } else {
      yield lastEvent;
      lastEvent = event;
      mergedItems = void 0;
    }
  }
  yield lastEvent;
}

// src/common/sumarray.ts
var SumArray = class {
  constructor(bucketBits, items) {
    this.bucketBits = bucketBits;
    this.bucketSize = 1 << bucketBits;
    this.slots = items;
    this.buckets = this.recreate(this.slots);
  }
  recreate(items) {
    const buckets = [];
    for (let i = 0; i < items.length; i += this.bucketSize) {
      let bucket = 0;
      for (let j = 0; j < this.bucketSize && i + j < items.length; ++j) {
        bucket += items[i + j];
      }
      buckets.push(bucket);
    }
    return buckets;
  }
  updateBuckets(from, to) {
    const startBucket = from >> this.bucketBits;
    const endBucket = to >> this.bucketBits;
    for (let i = this.buckets.length; i < endBucket; ++i) {
      this.buckets.push(0);
    }
    for (let i = startBucket; i <= endBucket; ++i) {
      let bucket = 0;
      const shift = i << this.bucketBits;
      for (let j = 0; j < this.bucketSize && shift + j < this.slots.length; ++j) {
        bucket += this.slots[shift + j];
      }
      this.buckets[i] = bucket;
    }
  }
  splice(index, count, items) {
    this.slots.splice(index, count, ...items);
    this.updateBuckets(
      index,
      count === items.length ? index + count : this.slots.length
    );
    if (count - items.length > 0) {
      const bucketSize = this.slots.length >> this.bucketBits;
      if (this.buckets.length > bucketSize) {
        this.buckets.length = bucketSize;
      }
    }
  }
  move(fromIndex, count, toIndex) {
    applyMove(this.slots, fromIndex, count, toIndex);
    this.updateBuckets(
      Math.min(fromIndex, toIndex),
      Math.max(fromIndex, toIndex) + count
    );
  }
  sort(fromIndex, indices) {
    applySort(this.slots, fromIndex, indices);
    this.updateBuckets(fromIndex, fromIndex + indices.length);
  }
  getSum(index) {
    if (index === 0) {
      return 0;
    }
    let sum = 0;
    for (let bucketIndex = 0, i = this.bucketSize; bucketIndex < this.buckets.length && i <= index; ++bucketIndex, i += this.bucketSize) {
      sum += this.buckets[bucketIndex];
    }
    const start = index & ~(this.bucketSize - 1);
    for (let j = start; j < index && j < this.slots.length; ++j) {
      sum += this.slots[j];
    }
    return sum;
  }
  get(index) {
    return this.slots[index];
  }
  set(index, value) {
    const diff = value - this.slots[index];
    this.slots[index] = value;
    const bucketIndex = index >> this.bucketBits;
    this.buckets[bucketIndex] += diff;
  }
};

// src/common/slotsizes.ts
var SUMARRAY_BITS = 5;
var SlotSizes = class {
  constructor(items) {
    this.slots = new SumArray(
      SUMARRAY_BITS,
      items.map(() => 0)
    );
    this.items = items;
    this.indexes = /* @__PURE__ */ new Map();
    this.updateIndexes(0, items.length);
  }
  clearSlots() {
    this.slots = new SumArray(
      SUMARRAY_BITS,
      this.items.map(() => 0)
    );
  }
  updateIndexes(lo, hi) {
    for (let i = lo; i < hi; ++i) {
      this.indexes.set(this.items[i], i);
    }
  }
  get(index) {
    return this.items[index];
  }
  move(from, count, to) {
    const fromShift = this.slots.getSum(from);
    const countShift = this.slots.getSum(from + count) - fromShift;
    this.slots.move(from, count, to);
    applyMove(this.items, from, count, to);
    const toShift = this.slots.getSum(to);
    this.updateIndexes(Math.min(from, to), Math.max(from, to) + count);
    return {
      type: "move" /* MOVE */,
      from: fromShift,
      count: countShift,
      to: toShift
    };
  }
  sort(from, indexes) {
    let fromShift = 0;
    let totalIndex = 0;
    const indexedSlots = [];
    for (let i = 0; i < from + indexes.length; ++i) {
      const slotSize = this.slots.get(i);
      const indexedSlot = [];
      for (let j = 0; j < slotSize; ++j) {
        indexedSlot.push(totalIndex++);
      }
      indexedSlots.push(indexedSlot);
      if (i < from) {
        fromShift += this.slots.get(i);
      }
    }
    applySort(indexedSlots, from, indexes);
    const newIndexes = indexedSlots.slice(from).flat();
    this.slots.sort(from, indexes);
    applySort(this.items, from, indexes);
    this.updateIndexes(from, from + indexes.length);
    return {
      type: "sort" /* SORT */,
      from: fromShift,
      indexes: newIndexes
    };
  }
  splice(index, count, items) {
    const shiftIndex = this.slots.getSum(index);
    const shiftCount = this.slots.getSum(index + count) - shiftIndex;
    this.slots.splice(
      index,
      count,
      items.map(() => 0)
    );
    const removedItems = this.items.splice(index, count, ...items);
    for (const removedItem of removedItems) {
      this.indexes.delete(removedItem);
    }
    if (this.items.length === count) {
      this.updateIndexes(index, index + count);
    } else {
      this.updateIndexes(index, this.items.length);
    }
    return {
      removed: removedItems,
      event: {
        type: "splice" /* SPLICE */,
        index: shiftIndex,
        count: shiftCount,
        items: []
        // Note: added items are _always_ treated as if they are empty
      }
    };
  }
  applyEvent(source, event) {
    const sourceIndex = this.indexes.get(source);
    assert(
      sourceIndex !== void 0,
      "event from unknown SlotSizes source",
      source
    );
    const shift = this.slots.getSum(sourceIndex);
    switch (event.type) {
      case "splice" /* SPLICE */: {
        this.slots.set(
          sourceIndex,
          this.slots.get(sourceIndex) + (event.items?.length ?? 0) - event.count
        );
        return {
          type: "splice" /* SPLICE */,
          index: event.index + shift,
          count: event.count,
          items: event.items
        };
      }
      case "sort" /* SORT */: {
        return {
          type: "sort" /* SORT */,
          from: event.from + shift,
          indexes: event.indexes.map((index) => index + shift)
        };
      }
      case "move" /* MOVE */: {
        return {
          type: "move" /* MOVE */,
          from: event.from + shift,
          count: event.count,
          to: event.to + shift
        };
      }
      default:
        assertExhausted(event, "unknown ArrayEvent type");
    }
  }
};

// src/viewcontroller/rendernode/rendernode.ts
var SingleChildRenderNode = class {
  constructor(handlers, child, debugName) {
    this.handleEvent = (event) => {
      if (event.type === "splice" /* SPLICE */) {
        this.liveNodes += (event.items?.length ?? 0) - event.count;
      }
      if (!this.handlers.onEvent?.(event)) {
        assert(
          this.parentContext,
          "Unexpected event on detached RenderNode"
        );
        this.parentContext.nodeEmitter(event);
      }
    };
    this.handleError = (event) => {
      if (!this.handlers.onError?.(event)) {
        if (this.parentContext) {
          this.parentContext.errorEmitter(event);
        } else {
          warn("Unhandled error on detached RenderNode", event);
        }
      }
    };
    this.handlers = handlers;
    this.child = child;
    this._isMounted = false;
    this.parentContext = void 0;
    this.liveNodes = 0;
    this.depth = 0;
    this.__debugName = debugName ?? `custom`;
    this.__refcount = 0;
  }
  isAttached() {
    return !!this.parentContext;
  }
  isMounted() {
    return this._isMounted;
  }
  emitEvent(event) {
    assert(
      this.parentContext,
      "RenderNode attempted to emit event when detached"
    );
    this.parentContext.nodeEmitter(event);
  }
  emitError(error2) {
    assert(
      this.parentContext,
      "RenderNode attempted to emit error when detached"
    );
    this.parentContext.errorEmitter(error2);
  }
  commit(phase) {
    this.handlers.onCommit?.(phase);
  }
  requestCommit(phase) {
    requestCommit(this, phase);
  }
  clone(props, children) {
    if (this.handlers.clone) {
      return this.handlers.clone(props, children);
    }
    const clonedChild = this.child.clone();
    return new SingleChildRenderNode(this.handlers, clonedChild);
  }
  setChild(child) {
    console.log("setChild", child);
    const toRemove = this.child;
    this.child = child;
    if (this._isMounted) {
      toRemove.onUnmount();
    }
    if (this.parentContext) {
      if (this.liveNodes > 0) {
        this.parentContext.nodeEmitter({
          type: "splice" /* SPLICE */,
          index: 0,
          count: this.liveNodes
        });
      }
      toRemove.detach();
    }
    this.liveNodes = 0;
    this.disown(toRemove);
    this.own(this.child);
    if (this.parentContext) {
      this.child.attach({
        nodeEmitter: this.handleEvent,
        errorEmitter: this.handleError,
        xmlNamespace: this.parentContext.xmlNamespace
      });
    }
    if (this._isMounted) {
      this.child.onMount();
    }
  }
  detach() {
    assert(this.parentContext, "double detached");
    this.child.detach();
    this.parentContext = void 0;
    this.handlers.onDetach?.();
  }
  attach(parentContext) {
    assert(!this.parentContext, "Invariant: double attached");
    this.parentContext = parentContext;
    this.child.attach({
      nodeEmitter: this.handleEvent,
      errorEmitter: this.handleError,
      xmlNamespace: this.parentContext.xmlNamespace
    });
    this.handlers.onAttach?.(parentContext);
  }
  onMount() {
    this._isMounted = true;
    this.child.onMount();
    this.handlers.onMount?.();
  }
  onUnmount() {
    this._isMounted = false;
    this.child.onUnmount();
    this.handlers.onUnmount?.();
  }
  retain() {
    retain(this);
  }
  release() {
    release(this);
  }
  __alive() {
    this.own(this.child);
    this.handlers.onAlive?.();
  }
  __dead() {
    this.handlers.onDestroy?.();
    this.disown(this.child);
    this.parentContext = void 0;
  }
  own(child) {
    if (child === emptyRenderNode)
      return;
    child.setDepth(this.depth + 1);
    child.retain();
  }
  disown(child) {
    if (child === emptyRenderNode)
      return;
    child.release();
    child.setDepth(0);
  }
  getDepth() {
    return this.depth;
  }
  setDepth(depth) {
    this.depth = depth;
  }
};
var MultiChildRenderNode = class {
  constructor(handlers, children, debugName) {
    this.handleError = (event) => {
      if (!this.handlers.onError?.(event)) {
        if (this.parentContext) {
          this.parentContext.errorEmitter(event);
        } else {
          warn("Unhandled error on detached RenderNode", event);
        }
      }
    };
    this.depth = 0;
    this.handlers = handlers;
    this._isMounted = false;
    this.slotSizes = new SlotSizes(children);
    this.parentContext = void 0;
    this.pendingCommit = void 0;
    this.__debugName = debugName ?? `custom`;
    this.__refcount = 0;
  }
  isAttached() {
    return !!this.parentContext;
  }
  isMounted() {
    return this._isMounted;
  }
  emitEvent(event) {
    assert(
      this.parentContext,
      "RenderNode attempted to emit event when detached"
    );
    this.parentContext.nodeEmitter(event);
  }
  emitError(error2) {
    assert(
      this.parentContext,
      "RenderNode attempted to emit error when detached"
    );
    this.parentContext.errorEmitter(error2);
  }
  commit(phase) {
    this.handlers.onCommit?.(phase);
  }
  requestCommit(phase) {
    requestCommit(this, phase);
  }
  clone(props, children) {
    if (this.handlers.clone) {
      return this.handlers.clone(props, children);
    }
    const clonedChildren = this.slotSizes.items.map(
      (child) => child.clone()
    );
    return new MultiChildRenderNode(this.handlers, clonedChildren);
  }
  sortChildren(from, indexes) {
    const event = this.slotSizes.sort(from, indexes);
    this.parentContext?.nodeEmitter(event);
  }
  moveChildren(from, count, to) {
    const event = this.slotSizes.move(from, count, to);
    this.parentContext?.nodeEmitter(event);
  }
  spliceChildren(index, count, children) {
    for (let i = index; i < index + count; ++i) {
      const child = this.slotSizes.items[i];
      if (this._isMounted) {
        child.onUnmount();
      }
    }
    const { removed, event } = this.slotSizes.splice(
      index,
      count,
      children
    );
    if (this.parentContext && event.count > 0) {
      this.parentContext.nodeEmitter({
        type: "splice" /* SPLICE */,
        index: event.index,
        count: event.count
        // Note: we do *not* take the responsibility of emitting the new nodes -- the children do that on attach
      });
    }
    for (const child of removed) {
      if (this.parentContext) {
        child.detach();
      }
      this.disown(child);
    }
    for (const child of children) {
      this.own(child);
      if (this.parentContext) {
        child.attach({
          nodeEmitter: (event2) => this.handleChildEvent(child, event2),
          errorEmitter: this.handleError,
          xmlNamespace: this.parentContext.xmlNamespace
        });
      }
      if (this._isMounted) {
        child.onMount();
      }
    }
  }
  handleChildEvent(child, event) {
    if (!this.handlers.onChildEvent?.(child, event)) {
      const shifted = this.slotSizes.applyEvent(child, event);
      this.handleEvent(shifted);
    }
  }
  handleEvent(event) {
    if (!this.handlers.onEvent?.(event)) {
      assert(
        this.parentContext,
        "Unexpected event on detached RenderNode"
      );
      this.parentContext.nodeEmitter(event);
    }
  }
  detach() {
    assert(this.parentContext, "double detached");
    this.slotSizes.clearSlots();
    for (const child of this.slotSizes.items) {
      child.detach();
    }
    this.parentContext = void 0;
    this.handlers.onDetach?.();
  }
  attach(parentContext) {
    assert(!this.parentContext, "Invariant: double attached");
    this.parentContext = parentContext;
    for (const child of this.slotSizes.items) {
      child.attach({
        nodeEmitter: (event) => {
          this.handleChildEvent(child, event);
        },
        errorEmitter: this.handleError,
        xmlNamespace: this.parentContext.xmlNamespace
      });
    }
    this.handlers.onAttach?.(parentContext);
  }
  onMount() {
    this._isMounted = true;
    for (const child of this.slotSizes.items) {
      child.onMount();
    }
    this.handlers.onMount?.();
  }
  onUnmount() {
    this._isMounted = false;
    for (const child of this.slotSizes.items) {
      child.onUnmount();
    }
    this.handlers.onUnmount?.();
  }
  retain() {
    retain(this);
  }
  release() {
    release(this);
  }
  __alive() {
    for (const child of this.slotSizes.items) {
      this.own(child);
    }
    this.handlers.onAlive?.();
  }
  __dead() {
    this.handlers.onDestroy?.();
    for (const child of this.slotSizes.items) {
      this.disown(child);
    }
    this.parentContext = void 0;
  }
  own(child) {
    if (child === emptyRenderNode)
      return;
    child.setDepth(this.depth + 1);
    child.retain();
  }
  disown(child) {
    if (child === emptyRenderNode)
      return;
    child.release();
    child.setDepth(0);
  }
  getDepth() {
    return this.depth;
  }
  setDepth(depth) {
    this.depth = depth;
  }
};
var EmptyRenderNode = class {
  constructor() {
    this.__debugName = "<empty>";
    this.__refcount = 1;
  }
  detach() {
  }
  attach() {
  }
  onMount() {
  }
  onUnmount() {
  }
  retain() {
  }
  release() {
  }
  commit() {
  }
  getDepth() {
    return 0;
  }
  setDepth() {
  }
  clone() {
    return emptyRenderNode;
  }
  __alive() {
  }
  __dead() {
  }
};
var emptyRenderNode = new EmptyRenderNode();
function isRenderNode(obj) {
  return obj && (obj instanceof SingleChildRenderNode || obj instanceof MultiChildRenderNode || obj instanceof EmptyRenderNode);
}

// src/viewcontroller/rendernode/arrayrendernode.ts
function ArrayRenderNode(children, debugName) {
  if (children.length === 0) {
    return emptyRenderNode;
  }
  if (children.length === 1) {
    return children[0];
  }
  return new MultiChildRenderNode({}, children, debugName);
}

// src/viewcontroller/rendernode/dynamicrendernode.ts
function DynamicRenderNode(renderJSXNode2, dynamic, debugName) {
  let dynamicError;
  let dynamicSubscription;
  let renderValue;
  let syncSubscription = false;
  const subscribe2 = (error2, val) => {
    if (error2) {
      renderNode.setChild(emptyRenderNode);
      dynamicError = error2;
      if (renderNode.isAttached()) {
        renderNode.emitError(error2);
      } else {
        warn("Unhandled error on detached DynamicRenderNode", val);
      }
    } else if (syncSubscription) {
      renderNode.setChild(renderJSXNode2(val));
    } else {
      renderNode.setChild(emptyRenderNode);
      renderValue = val;
      renderNode.requestCommit(1 /* COMMIT_EMIT */);
    }
  };
  const renderNode = new SingleChildRenderNode(
    {
      onAttach: (parentContext) => {
        if (dynamicError) {
          parentContext.errorEmitter(dynamicError);
        }
      },
      onCommit: (phase) => {
        if (phase === 1 /* COMMIT_EMIT */) {
          renderNode.setChild(renderJSXNode2(renderValue));
        }
      },
      clone: () => {
        return DynamicRenderNode(renderJSXNode2, dynamic, debugName);
      },
      onAlive: () => {
        syncSubscription = true;
        dynamicSubscription = dynamic.subscribe(subscribe2);
        syncSubscription = false;
      },
      onDestroy: () => {
        dynamicError = void 0;
        dynamicSubscription?.();
        dynamicSubscription = void 0;
      }
    },
    emptyRenderNode,
    debugName ? `DynamicRenderNode(${debugName})` : `DynamicRenderNode`
  );
  return renderNode;
}

// src/viewcontroller/rendernode/foreignrendernode.ts
function ForeignRenderNode(node, debugName) {
  return new SingleChildRenderNode(
    {
      onAttach: (parentContext) => {
        parentContext.nodeEmitter({
          type: "splice" /* SPLICE */,
          index: 0,
          count: 0,
          items: [node]
        });
      },
      clone: () => {
        return ForeignRenderNode(node, debugName);
      }
    },
    emptyRenderNode,
    debugName ?? "foreign"
  );
}

// src/viewcontroller/rendernode/textrendernode.ts
function TextRenderNode(str, debugName) {
  const textNode = document.createTextNode(str);
  return new SingleChildRenderNode(
    {
      onAttach: (parentContext) => {
        parentContext.nodeEmitter({
          type: "splice" /* SPLICE */,
          index: 0,
          count: 0,
          items: [textNode]
        });
      },
      clone: () => {
        return TextRenderNode(str, debugName);
      }
    },
    emptyRenderNode,
    true ? debugName ?? `text(${JSON.stringify(str)})` : debugName ?? "text"
  );
}

// src/viewcontroller/renderjsx.ts
function renderJSXNode(jsxNode) {
  if (isRenderNode(jsxNode)) {
    return jsxNode;
  }
  if (isCustomJSXNode(jsxNode)) {
    return jsxNode.__renderNode(renderJSXNode);
  }
  if (jsxNode instanceof Node) {
    return ForeignRenderNode(jsxNode);
  }
  if (Array.isArray(jsxNode)) {
    return ArrayRenderNode(jsxNode.map((item) => renderJSXNode(item)));
  }
  if (jsxNode === null || jsxNode === void 0 || typeof jsxNode === "boolean") {
    return emptyRenderNode;
  }
  if (typeof jsxNode === "function") {
    warn("Rendering a function as JSX renders to nothing");
    return emptyRenderNode;
  }
  if (typeof jsxNode === "symbol") {
    warn("Rendering a symbol as JSX renders to nothing");
    return emptyRenderNode;
  }
  if (typeof jsxNode === "string") {
    return TextRenderNode(jsxNode);
  }
  if (typeof jsxNode === "number" || typeof jsxNode === "bigint") {
    return TextRenderNode(jsxNode.toString());
  }
  if (typeof jsxNode === "object" && "get" in jsxNode && typeof jsxNode.get === "function" && typeof jsxNode.subscribe === "function") {
    return DynamicRenderNode(renderJSXNode, jsxNode);
  }
  if (typeof jsxNode === "object" && "then" in jsxNode && typeof jsxNode.then === "function") {
    const promiseResult = field(null);
    const renderedValue = calc(() => {
      const result = promiseResult.get();
      if (!result) {
        return null;
      }
      if (result.type === "resolved") {
        return result.value;
      }
      throw result.error;
    });
    jsxNode.then(
      (val) => {
        console.log("OK");
        promiseResult.set({ type: "resolved", value: val });
      },
      (err) => {
        console.log("NOPE");
        promiseResult.set({ type: "error", error: wrapError(err) });
      }
    );
    return DynamicRenderNode(renderJSXNode, renderedValue);
  }
  warn("Unexpected JSX node type, rendering nothing", jsxNode);
  return emptyRenderNode;
}
function renderJSXChildren(children) {
  const childRenderNodes = [];
  if (children) {
    if (Array.isArray(children) && !isCustomJSXNode(children)) {
      for (const child of children) {
        childRenderNodes.push(renderJSXNode(child));
      }
    } else {
      childRenderNodes.push(renderJSXNode(children));
    }
  }
  return childRenderNodes;
}

// src/viewcontroller/rendernode/componentrendernode.ts
var ClassComponent = class {
  constructor(props) {
    this.props = props;
  }
};
function ComponentRenderNode(Component, props, children, debugName) {
  let result;
  let onMountCallbacks;
  let onUnmountCallbacks;
  let onDestroyCallbacks;
  let owned = /* @__PURE__ */ new Set();
  let errorHandler;
  let ActiveComponent = isClassComponent(Component) ? classComponentToFunctionComponent(Component) : Component;
  function ensureResult() {
    if (!result) {
      let callbacksAllowed = true;
      const lifecycle = {
        onMount: (handler) => {
          assert(
            callbacksAllowed,
            "onMount must be called in component body"
          );
          if (!onMountCallbacks)
            onMountCallbacks = [];
          onMountCallbacks.push(handler);
        },
        onUnmount: (handler) => {
          assert(
            callbacksAllowed,
            "onUnmount must be called in component body"
          );
          if (!onUnmountCallbacks)
            onUnmountCallbacks = [];
          onUnmountCallbacks.push(handler);
        },
        onDestroy: (handler) => {
          assert(
            callbacksAllowed,
            "onDestroy must be called in component body"
          );
          if (!onDestroyCallbacks)
            onDestroyCallbacks = [];
          onDestroyCallbacks.push(handler);
        },
        onError: (handler) => {
          assert(
            callbacksAllowed,
            "onError must be called in component body"
          );
          assert(!errorHandler, "onError called multiple times");
          errorHandler = handler;
        }
      };
      let componentProps;
      if (children.length === 0) {
        componentProps = props || {};
      } else if (children.length === 1) {
        componentProps = props ? { ...props, children: children[0] } : { children: children[0] };
      } else {
        componentProps = props ? { ...props, children } : { children };
      }
      let jsxResult;
      try {
        jsxResult = ActiveComponent(componentProps, lifecycle) || emptyRenderNode;
      } catch (e) {
        const error2 = wrapError(e, "Unknown error rendering component");
        if (errorHandler) {
          jsxResult = errorHandler(error2) ?? emptyRenderNode;
        } else {
          jsxResult = error2;
        }
      }
      callbacksAllowed = false;
      for (const item of owned) {
        retain(item);
      }
      if (!(jsxResult instanceof Error)) {
        result = renderJSXNode(jsxResult);
      } else {
        result = jsxResult;
      }
    }
    return result;
  }
  const cleanup = () => {
    if (result && !(result instanceof Error)) {
      renderNode.disown(result);
    }
    if (onDestroyCallbacks) {
      for (const callback of onDestroyCallbacks) {
        callback();
      }
    }
    for (const item of owned) {
      release(item);
    }
    owned = /* @__PURE__ */ new Set();
    onMountCallbacks = void 0;
    onUnmountCallbacks = void 0;
    onDestroyCallbacks = void 0;
    result = void 0;
    errorHandler = void 0;
  };
  const initialize = () => {
    const componentResult = ensureResult();
    if (componentResult instanceof Error) {
      warn("Unhandled exception on detached component", {
        error: componentResult,
        renderNode
      });
    } else {
      renderNode.own(componentResult);
    }
    return componentResult;
  };
  const replaceComponent2 = (newComponent) => {
    if (renderNode.isMounted() && onUnmountCallbacks) {
      for (const cb of onUnmountCallbacks) {
        cb();
      }
    }
    onUnmountCallbacks = void 0;
    renderNode.setChild(emptyRenderNode);
    cleanup();
    if (isClassComponent(newComponent)) {
      ActiveComponent = classComponentToFunctionComponent(newComponent);
    } else {
      ActiveComponent = newComponent;
    }
    const componentResult = initialize();
    if (renderNode.isAttached()) {
      if (componentResult instanceof Error) {
        renderNode.emitError(componentResult);
      } else {
        renderNode.setChild(componentResult);
      }
    }
    if (renderNode.isMounted() && onMountCallbacks) {
      renderNode.requestCommit(3 /* COMMIT_MOUNT */);
    }
    console.groupEnd();
  };
  const renderNode = new SingleChildRenderNode(
    {
      onAlive: () => {
        initialize();
        registerComponentReload(Component, replaceComponent2);
      },
      onDestroy: () => {
        unregisterComponentReload(Component, replaceComponent2);
        cleanup();
      },
      onAttach: (parentContext) => {
        if (result instanceof Error) {
          parentContext.errorEmitter(result);
        } else if (result) {
          renderNode.setChild(result);
        }
      },
      onDetach: () => {
        renderNode.setChild(emptyRenderNode);
      },
      onError: (error2) => {
        if (errorHandler) {
          const handledResult = errorHandler(error2);
          result = handledResult ? renderJSXNode(handledResult) : emptyRenderNode;
          renderNode.setChild(result);
          return true;
        }
      },
      onMount: () => {
        assert(result, "Invariant: missing result");
        if (result instanceof Error) {
          return;
        }
        renderNode.requestCommit(3 /* COMMIT_MOUNT */);
      },
      onUnmount: () => {
        assert(result, "Invariant: missing result");
        if (result instanceof Error) {
          return;
        }
        if (onUnmountCallbacks) {
          for (const callback of onUnmountCallbacks) {
            callback();
          }
        }
      },
      onCommit: (phase) => {
        if (phase === 3 /* COMMIT_MOUNT */ && onMountCallbacks) {
          for (const callback of onMountCallbacks) {
            const maybeOnUnmount = callback();
            if (typeof maybeOnUnmount === "function") {
              if (!onUnmountCallbacks) {
                onUnmountCallbacks = [];
              }
              const onUnmount = () => {
                maybeOnUnmount();
                if (onUnmountCallbacks) {
                  const index = onUnmountCallbacks.indexOf(onUnmount);
                  if (index >= 0) {
                    onUnmountCallbacks.splice(index, 1);
                  }
                }
              };
              onUnmountCallbacks.push(onUnmount);
            }
          }
        }
      },
      clone(newProps, newChildren) {
        return ComponentRenderNode(
          Component,
          props && newProps ? { ...props, ...newProps } : newProps || props,
          newChildren ?? children
        );
      }
    },
    emptyRenderNode,
    debugName ?? `component(${Component.name})`
  );
  return renderNode;
}

// src/common/dyn.ts
function dynGet(wrapper) {
  if (isDynamic(wrapper)) {
    return wrapper.get();
  }
  return wrapper;
}
function dynSet(wrapper, value) {
  if (isDynamicMut(wrapper)) {
    wrapper.set(value);
    return true;
  }
  return false;
}
function dynSubscribe(wrapper, callback) {
  if (isDynamic(wrapper)) {
    return wrapper.subscribe(callback);
  }
  callback(void 0, wrapper);
  return noop;
}
function isDynamic(val) {
  return !!(val && typeof val === "object" && "get" in val && "subscribe" in val && typeof val.get === "function" && typeof val.subscribe === "function");
}
function isDynamicMut(val) {
  return isDynamic(val) && "set" in val && typeof val.set === "function";
}
function dynMap(val, fn) {
  return calc(() => fn(dynGet(val)));
}

// src/viewcontroller/webcomponents.ts
var getWebComponentTagConstructors = () => ({
  a: HTMLAnchorElement,
  abbr: HTMLElement,
  address: HTMLElement,
  area: HTMLAreaElement,
  article: HTMLElement,
  aside: HTMLElement,
  audio: HTMLAudioElement,
  b: HTMLElement,
  base: HTMLBaseElement,
  bdi: HTMLElement,
  bdo: HTMLElement,
  blockquote: HTMLQuoteElement,
  body: HTMLBodyElement,
  br: HTMLBRElement,
  button: HTMLButtonElement,
  canvas: HTMLCanvasElement,
  caption: HTMLTableCaptionElement,
  cite: HTMLElement,
  code: HTMLElement,
  col: HTMLTableColElement,
  colgroup: HTMLTableColElement,
  data: HTMLDataElement,
  datalist: HTMLDataListElement,
  dd: HTMLElement,
  del: HTMLModElement,
  details: HTMLDetailsElement,
  dfn: HTMLElement,
  dialog: HTMLDialogElement,
  div: HTMLDivElement,
  dl: HTMLDListElement,
  dt: HTMLElement,
  em: HTMLElement,
  embed: HTMLEmbedElement,
  fieldset: HTMLFieldSetElement,
  figcaption: HTMLElement,
  figure: HTMLElement,
  footer: HTMLElement,
  form: HTMLFormElement,
  h1: HTMLHeadingElement,
  h2: HTMLHeadingElement,
  h3: HTMLHeadingElement,
  h4: HTMLHeadingElement,
  h5: HTMLHeadingElement,
  h6: HTMLHeadingElement,
  head: HTMLHeadElement,
  header: HTMLElement,
  hgroup: HTMLElement,
  hr: HTMLHRElement,
  html: HTMLHtmlElement,
  i: HTMLElement,
  iframe: HTMLIFrameElement,
  img: HTMLImageElement,
  input: HTMLInputElement,
  ins: HTMLModElement,
  kbd: HTMLElement,
  label: HTMLLabelElement,
  legend: HTMLLegendElement,
  li: HTMLLIElement,
  link: HTMLLinkElement,
  main: HTMLElement,
  map: HTMLMapElement,
  mark: HTMLElement,
  menu: HTMLMenuElement,
  meta: HTMLMetaElement,
  meter: HTMLMeterElement,
  nav: HTMLElement,
  noscript: HTMLElement,
  object: HTMLObjectElement,
  ol: HTMLOListElement,
  optgroup: HTMLOptGroupElement,
  option: HTMLOptionElement,
  output: HTMLOutputElement,
  p: HTMLParagraphElement,
  picture: HTMLPictureElement,
  pre: HTMLPreElement,
  progress: HTMLProgressElement,
  q: HTMLQuoteElement,
  rp: HTMLElement,
  rt: HTMLElement,
  ruby: HTMLElement,
  s: HTMLElement,
  samp: HTMLElement,
  script: HTMLScriptElement,
  section: HTMLElement,
  select: HTMLSelectElement,
  slot: HTMLSlotElement,
  small: HTMLElement,
  source: HTMLSourceElement,
  span: HTMLSpanElement,
  strong: HTMLElement,
  style: HTMLStyleElement,
  sub: HTMLElement,
  summary: HTMLElement,
  sup: HTMLElement,
  table: HTMLTableElement,
  tbody: HTMLTableSectionElement,
  td: HTMLTableCellElement,
  template: HTMLTemplateElement,
  textarea: HTMLTextAreaElement,
  tfoot: HTMLTableSectionElement,
  th: HTMLTableCellElement,
  thead: HTMLTableSectionElement,
  time: HTMLTimeElement,
  title: HTMLTitleElement,
  tr: HTMLTableRowElement,
  track: HTMLTrackElement,
  u: HTMLElement,
  ul: HTMLUListElement,
  var: HTMLElement,
  video: HTMLVideoElement,
  wbr: HTMLElement
});

// src/viewcontroller/xmlnamespace.ts
var HTML_NAMESPACE = "http://www.w3.org/1999/xhtml";
var SVG_NAMESPACE = "http://www.w3.org/2000/svg";
var MATHML_NAMESPACE = "http://www.w3.org/1998/Math/MathML";
var ELEMENT_NAMESPACE_GUESS = {
  // SVG Elements per https://developer.mozilla.org/en-US/docs/Web/SVG/Element
  //'a': SVG_NAMESPACE,
  animate: SVG_NAMESPACE,
  animateMotion: SVG_NAMESPACE,
  animateTransform: SVG_NAMESPACE,
  circle: SVG_NAMESPACE,
  clipPath: SVG_NAMESPACE,
  defs: SVG_NAMESPACE,
  desc: SVG_NAMESPACE,
  discard: SVG_NAMESPACE,
  ellipse: SVG_NAMESPACE,
  feBlend: SVG_NAMESPACE,
  feColorMatrix: SVG_NAMESPACE,
  feComponentTransfer: SVG_NAMESPACE,
  feComposite: SVG_NAMESPACE,
  feConvolveMatrix: SVG_NAMESPACE,
  feDiffuseLighting: SVG_NAMESPACE,
  feDisplacementMap: SVG_NAMESPACE,
  feDistantLight: SVG_NAMESPACE,
  feDropShadow: SVG_NAMESPACE,
  feFlood: SVG_NAMESPACE,
  feFuncA: SVG_NAMESPACE,
  feFuncB: SVG_NAMESPACE,
  feFuncG: SVG_NAMESPACE,
  feFuncR: SVG_NAMESPACE,
  feGaussianBlur: SVG_NAMESPACE,
  feImage: SVG_NAMESPACE,
  feMerge: SVG_NAMESPACE,
  feMergeNode: SVG_NAMESPACE,
  feMorphology: SVG_NAMESPACE,
  feOffset: SVG_NAMESPACE,
  fePointLight: SVG_NAMESPACE,
  feSpecularLighting: SVG_NAMESPACE,
  feSpotLight: SVG_NAMESPACE,
  feTile: SVG_NAMESPACE,
  feTurbulence: SVG_NAMESPACE,
  filter: SVG_NAMESPACE,
  foreignObject: SVG_NAMESPACE,
  g: SVG_NAMESPACE,
  hatch: SVG_NAMESPACE,
  hatchpath: SVG_NAMESPACE,
  image: SVG_NAMESPACE,
  line: SVG_NAMESPACE,
  linearGradient: SVG_NAMESPACE,
  marker: SVG_NAMESPACE,
  mask: SVG_NAMESPACE,
  metadata: SVG_NAMESPACE,
  mpath: SVG_NAMESPACE,
  path: SVG_NAMESPACE,
  pattern: SVG_NAMESPACE,
  polygon: SVG_NAMESPACE,
  polyline: SVG_NAMESPACE,
  radialGradient: SVG_NAMESPACE,
  rect: SVG_NAMESPACE,
  //'script': SVG_NAMESPACE,
  set: SVG_NAMESPACE,
  stop: SVG_NAMESPACE,
  //'style': SVG_NAMESPACE,
  svg: SVG_NAMESPACE,
  switch: SVG_NAMESPACE,
  symbol: SVG_NAMESPACE,
  text: SVG_NAMESPACE,
  textPath: SVG_NAMESPACE,
  //'title': SVG_NAMESPACE,
  tspan: SVG_NAMESPACE,
  use: SVG_NAMESPACE,
  view: SVG_NAMESPACE,
  // MATHML Elements per https://developer.mozilla.org/en-US/docs/Web/MathML/Element
  math: MATHML_NAMESPACE,
  maction: MATHML_NAMESPACE,
  annotation: MATHML_NAMESPACE,
  "annotation-xml": MATHML_NAMESPACE,
  menclose: MATHML_NAMESPACE,
  merror: MATHML_NAMESPACE,
  mfenced: MATHML_NAMESPACE,
  mfrac: MATHML_NAMESPACE,
  mi: MATHML_NAMESPACE,
  mmultiscripts: MATHML_NAMESPACE,
  mn: MATHML_NAMESPACE,
  none: MATHML_NAMESPACE,
  mo: MATHML_NAMESPACE,
  mover: MATHML_NAMESPACE,
  mpadded: MATHML_NAMESPACE,
  mphantom: MATHML_NAMESPACE,
  mprescripts: MATHML_NAMESPACE,
  mroot: MATHML_NAMESPACE,
  mrow: MATHML_NAMESPACE,
  ms: MATHML_NAMESPACE,
  semantics: MATHML_NAMESPACE,
  mspace: MATHML_NAMESPACE,
  msqrt: MATHML_NAMESPACE,
  mstyle: MATHML_NAMESPACE,
  msub: MATHML_NAMESPACE,
  msup: MATHML_NAMESPACE,
  msubsup: MATHML_NAMESPACE,
  mtable: MATHML_NAMESPACE,
  mtd: MATHML_NAMESPACE,
  mtext: MATHML_NAMESPACE,
  mtr: MATHML_NAMESPACE,
  munder: MATHML_NAMESPACE,
  munderover: MATHML_NAMESPACE
};
var elementNamespaceTransitionMap = {
  [HTML_NAMESPACE]: {
    svg: {
      node: SVG_NAMESPACE,
      children: SVG_NAMESPACE
    },
    math: {
      node: MATHML_NAMESPACE,
      children: MATHML_NAMESPACE
    }
  },
  [SVG_NAMESPACE]: {
    foreignObject: {
      node: SVG_NAMESPACE,
      children: HTML_NAMESPACE
    }
  }
};

// src/viewcontroller/ref.ts
var Ref = class {
  constructor(current) {
    this.current = current;
  }
};
function ref(val) {
  return new Ref(val);
}

// src/viewcontroller/rendernode/portalrendernode.ts
var moveOrInsertBeforeFunction = "moveBefore" in Element.prototype ? Element.prototype.moveBefore : Element.prototype.insertBefore;
function moveOrInsertBefore(element, node, target) {
  const destRoot = element.getRootNode();
  const srcRoot = node.getRootNode();
  if (destRoot === srcRoot) {
    moveOrInsertBeforeFunction.call(element, node, target);
  } else {
    element.insertBefore(node, target);
  }
}
function PortalRenderNode(element, childrenRenderNode, refProp, debugName) {
  let pendingEvents = [];
  let committedNodes = [];
  function getReferenceNode(index) {
    for (let i = index; i < committedNodes.length; ++i) {
      const node = committedNodes[i];
      if (node) {
        return node;
      }
    }
    return null;
  }
  const renderNode = new SingleChildRenderNode(
    {
      onEvent: (event) => {
        pendingEvents.push(event);
        renderNode.requestCommit(2 /* COMMIT_UPDATE */);
        return true;
      },
      onMount: () => {
        if (refProp) {
          renderNode.requestCommit(
            3 /* COMMIT_MOUNT */
          );
        }
      },
      onUnmount: () => {
        if (refProp) {
          renderNode.requestCommit(
            0 /* COMMIT_UNMOUNT */
          );
        }
      },
      onCommit: (phase) => {
        if (phase === 0 /* COMMIT_UNMOUNT */ && refProp) {
          if (refProp instanceof Ref) {
            refProp.current = void 0;
          } else if (typeof refProp === "function") {
            refProp(void 0);
          }
        }
        if (phase === 2 /* COMMIT_UPDATE */) {
          for (let i = 0, childIndex = 0; i < committedNodes.length; ++i) {
            const expectedNode = committedNodes[i];
            const realNode = element.childNodes[childIndex];
            if (expectedNode && expectedNode === realNode) {
              childIndex += 1;
            } else {
              committedNodes[i] = void 0;
            }
          }
          for (const event of mergeArrayEvents(pendingEvents)) {
            switch (event.type) {
              case "splice" /* SPLICE */: {
                if (event.index === 0 && event.count > 0 && event.count === committedNodes.length) {
                  element.replaceChildren();
                  committedNodes = [];
                } else {
                  for (let i = event.count - 1; i >= 0; --i) {
                    const toRemove = committedNodes[event.index + i];
                    if (toRemove) {
                      element.removeChild(toRemove);
                    }
                  }
                  committedNodes.splice(
                    event.index,
                    event.count
                  );
                }
                if (event.items) {
                  const referenceNode = getReferenceNode(
                    event.index
                  );
                  if (event.items.length > 1 && event.items.every(
                    (node) => node.parentNode === null
                  )) {
                    const fragment = document.createDocumentFragment();
                    fragment.replaceChildren(
                      ...event.items
                    );
                    moveOrInsertBefore(
                      element,
                      fragment,
                      referenceNode
                    );
                  } else {
                    for (const node of event.items) {
                      moveOrInsertBefore(
                        element,
                        node,
                        referenceNode
                      );
                    }
                  }
                  committedNodes.splice(
                    event.index,
                    0,
                    ...event.items
                  );
                }
                break;
              }
              case "sort" /* SORT */: {
                const toInsert = [];
                for (let i = 0; i < event.indexes.length; ++i) {
                  const node = committedNodes[event.indexes[i]];
                  if (node) {
                    toInsert.push(node);
                  }
                }
                const referenceNode = getReferenceNode(
                  event.from + event.indexes.length
                );
                for (const node of toInsert) {
                  moveOrInsertBefore(
                    element,
                    node,
                    referenceNode
                  );
                }
                applyArrayEvent(committedNodes, event);
                break;
              }
              case "move" /* MOVE */: {
                const toMove = [];
                for (let i = 0; i < event.count; ++i) {
                  const node = committedNodes[event.from + i];
                  if (node) {
                    toMove.push(node);
                  }
                }
                const referenceIndex = event.to > event.from ? event.to + event.count : event.to;
                const referenceNode = getReferenceNode(referenceIndex);
                for (const node of toMove) {
                  moveOrInsertBefore(
                    element,
                    node,
                    referenceNode
                  );
                }
                applyArrayEvent(committedNodes, event);
                break;
              }
            }
          }
          pendingEvents = [];
        }
        if (phase === 3 /* COMMIT_MOUNT */ && refProp) {
          if (refProp instanceof Ref) {
            refProp.current = element;
          } else if (typeof refProp === "function") {
            refProp(element);
          }
        }
      },
      clone() {
        assert(
          false,
          "Attempted to clone a PortalRenderNode -- this operation doesn't make sense"
        );
      },
      onDestroy: () => {
        pendingEvents = [];
        committedNodes = [];
      }
    },
    childrenRenderNode,
    `mount(${element instanceof Element ? element.tagName : `shadow(${element.host.tagName})`})`
  );
  return renderNode;
}

// src/viewcontroller/rendernode/intrinsicrendernode.ts
var EventProps = [
  { prefix: "on:", param: false },
  { prefix: "oncapture:", param: true },
  { prefix: "onpassive:", param: { passive: true } }
];
function IntrinsicRenderNode(tagName, props, childRenderNode, debugName) {
  let boundAttributes;
  let subscriptions;
  let element;
  let elementXmlNamespace;
  let portalRenderNode;
  let detachedError;
  function handleEvent(event) {
    assert(
      false,
      "unexpected event in IntrinsicRenderNode from PortalRenderNode"
    );
  }
  function handleError(error2) {
    if (renderNode.isAttached()) {
      renderNode.emitError(error2);
    } else {
      warn(
        "Unhandled error on detached IntrinsicRenderNode",
        debugName,
        error2
      );
      detachedError = error2;
      return true;
    }
  }
  function ensureElement(parentContext, xmlNamespace, childXmlNamespace) {
    if (!element || xmlNamespace !== elementXmlNamespace) {
      elementXmlNamespace = xmlNamespace;
      element = createElement2(xmlNamespace);
      if (portalRenderNode) {
        if (renderNode.isMounted()) {
          portalRenderNode.onUnmount();
        }
        portalRenderNode.detach();
        renderNode.disown(portalRenderNode);
      }
      portalRenderNode = PortalRenderNode(
        element,
        childRenderNode,
        props?.ref
      );
      renderNode.own(portalRenderNode);
      portalRenderNode.attach({
        nodeEmitter: handleEvent,
        errorEmitter: handleError,
        xmlNamespace: childXmlNamespace
      });
      if (renderNode.isMounted()) {
        portalRenderNode.onMount();
      }
    }
    return element;
  }
  function createElement2(xmlNamespace) {
    let element2;
    if (typeof props?.is === "string" && tagName in getWebComponentTagConstructors()) {
      element2 = document.createElement(tagName, {
        is: props.is
      });
    } else {
      element2 = document.createElementNS(xmlNamespace, tagName);
    }
    if (props) {
      for (const [prop, val] of Object.entries(props)) {
        if (prop === "ref")
          continue;
        if (prop === "is")
          continue;
        if (EventProps.some(({ prefix, param }) => {
          if (prop.startsWith(prefix)) {
            if (val) {
              element2.addEventListener(
                prop.slice(prefix.length),
                (e) => {
                  val(e, element2);
                  flush();
                },
                param
              );
            }
            return true;
          }
          return false;
        })) {
          continue;
        }
        if (isDynamic(val)) {
          if (!boundAttributes) {
            boundAttributes = /* @__PURE__ */ new Map();
          }
          boundAttributes.set(prop, val);
        } else {
          setProp(element2, prop, dynGet(val));
        }
      }
      if (boundAttributes) {
        if (!subscriptions) {
          subscriptions = /* @__PURE__ */ new Set();
        }
        for (const [prop, boundAttr] of boundAttributes.entries()) {
          subscriptions.add(
            dynSubscribe(boundAttr, (error2, updatedVal) => {
              if (error2) {
                error("Unhandled error in bound prop", {
                  prop,
                  element: element2,
                  error: updatedVal
                });
              } else {
                setProp(element2, prop, updatedVal);
              }
            })
          );
          const currentVal = dynGet(boundAttr);
          setProp(element2, prop, currentVal);
        }
      }
    }
    return element2;
  }
  function setProp(element2, prop, val) {
    if (prop.startsWith("prop:")) {
      const propName = prop.slice(5);
      element2[propName] = val;
      return;
    }
    if (prop.startsWith("attr:")) {
      const attrName = prop.slice(5);
      setAttribute(element2, attrName, val);
      return;
    }
    if ((element2 instanceof HTMLElement || element2 instanceof SVGElement) && (prop.startsWith("cssprop:") || prop.startsWith("style:"))) {
      const attrName = prop.startsWith("cssprop:") ? "--" + prop.slice(8) : prop.slice(6);
      if (val === void 0 || val === null || val === false) {
        element2.style.removeProperty(attrName);
      } else if (typeof val === "string") {
        element2.style.setProperty(attrName, val);
      } else if (typeof val === "number" || typeof val === "bigint") {
        element2.style.setProperty(attrName, val.toString());
      }
      return;
    }
    if (prop.startsWith("style:")) {
      const attrName = prop.slice(6);
      setAttribute(element2, attrName, val);
      return;
    }
    assignProp(element2, prop, val);
  }
  const renderNode = new SingleChildRenderNode(
    {
      onAttach: (parentContext) => {
        if (detachedError) {
          parentContext.errorEmitter(detachedError);
          return;
        }
        const namespaceTransition = elementNamespaceTransitionMap[parentContext.xmlNamespace]?.[tagName];
        const xmlNamespace = namespaceTransition?.node ?? parentContext.xmlNamespace;
        const childXmlNamespace = namespaceTransition?.children ?? parentContext.xmlNamespace;
        element = ensureElement(
          parentContext,
          xmlNamespace,
          childXmlNamespace
        );
        parentContext.nodeEmitter({
          type: "splice" /* SPLICE */,
          index: 0,
          count: 0,
          items: [element]
        });
      },
      onDetach: () => {
      },
      onMount: () => {
        portalRenderNode?.onMount();
      },
      onUnmount: () => {
        portalRenderNode?.onUnmount();
      },
      clone: (adjustedProps, newChildren) => {
        return IntrinsicRenderNode(
          tagName,
          adjustedProps ? { ...props, ...adjustedProps } : props,
          newChildren ? ArrayRenderNode(newChildren ?? []) : childRenderNode.clone()
        );
      },
      onAlive: () => {
        const xmlNamespaceGuess = ELEMENT_NAMESPACE_GUESS[tagName] ?? HTML_NAMESPACE;
        const childXmlNamespaceGuess = elementNamespaceTransitionMap[xmlNamespaceGuess]?.[tagName]?.children ?? xmlNamespaceGuess;
        element = ensureElement(
          {
            nodeEmitter: (nodeEvent) => {
              fail(
                "IntrinsicRenderNode got unexpected node event",
                nodeEvent
              );
            },
            errorEmitter: (err) => {
              fail(
                "IntrinsicRenderNode got unexpected error event",
                err
              );
            },
            xmlNamespace: xmlNamespaceGuess
          },
          xmlNamespaceGuess,
          childXmlNamespaceGuess
        );
      },
      onDestroy: () => {
        boundAttributes = void 0;
        if (subscriptions) {
          for (const unsubscribe of subscriptions) {
            unsubscribe();
          }
          subscriptions = void 0;
        }
        element = void 0;
        elementXmlNamespace = void 0;
        if (portalRenderNode) {
          renderNode.disown(portalRenderNode);
          portalRenderNode = void 0;
        }
        detachedError = void 0;
      }
    },
    emptyRenderNode,
    debugName ?? `intrinsic(${tagName})`
  );
  return renderNode;
}

// src/viewcontroller/createelement.ts
var Fragment = ({
  children
}) => ArrayRenderNode(renderJSXChildren(children));
function isClassComponent(val) {
  return val && val.prototype instanceof ClassComponent;
}
function classComponentToFunctionComponent(Component) {
  return (props, lifecycle) => {
    const instance = new Component(props);
    if (instance.onDestroy)
      lifecycle.onDestroy(instance.onDestroy.bind(instance));
    if (instance.onMount)
      lifecycle.onMount(instance.onMount.bind(instance));
    if (instance.onError)
      lifecycle.onError(instance.onError.bind(instance));
    if (instance.onUnmount)
      lifecycle.onUnmount(instance.onUnmount.bind(instance));
    if (!instance.render)
      return null;
    return instance.render();
  };
}
function createElement(type, props, ...children) {
  if (typeof type === "string") {
    return IntrinsicRenderNode(
      type,
      props,
      ArrayRenderNode(renderJSXChildren(children))
    );
  }
  return ComponentRenderNode(type, props, children);
}
createElement.Fragment = Fragment;
createElement.replaceComponent = replaceComponent;

// src/components/fragment.ts
var Fragment2 = ({
  children
}) => ArrayRenderNode(renderJSXChildren(children));

// src/viewcontroller/rendernode/intrinsicobserverrendernode.ts
var IntrinsicObserverEventType = /* @__PURE__ */ ((IntrinsicObserverEventType2) => {
  IntrinsicObserverEventType2["MOUNT"] = "mount";
  IntrinsicObserverEventType2["UNMOUNT"] = "unmount";
  return IntrinsicObserverEventType2;
})(IntrinsicObserverEventType || {});
function IntrinsicObserverRenderNode(nodeCallback, elementCallback, child, debugName) {
  const nodes = [];
  const pendingEvent = /* @__PURE__ */ new Map();
  function notify(node, eventType) {
    nodeCallback?.(node, eventType);
    if (node instanceof Element) {
      elementCallback?.(node, eventType);
    }
  }
  const renderNode = new SingleChildRenderNode(
    {
      onEvent: (event) => {
        for (const removedNode of applyArrayEvent(nodes, event)) {
          pendingEvent.set(
            removedNode,
            "unmount" /* UNMOUNT */
          );
          renderNode.requestCommit(
            3 /* COMMIT_MOUNT */
          );
          renderNode.requestCommit(
            0 /* COMMIT_UNMOUNT */
          );
        }
        if (event.type === "splice" /* SPLICE */ && event.items) {
          for (const addedNode of event.items) {
            pendingEvent.set(
              addedNode,
              "mount" /* MOUNT */
            );
          }
          renderNode.requestCommit(
            3 /* COMMIT_MOUNT */
          );
          renderNode.requestCommit(
            0 /* COMMIT_UNMOUNT */
          );
        }
      },
      clone: () => {
        return IntrinsicObserverRenderNode(
          nodeCallback,
          elementCallback,
          child.clone(),
          debugName
        );
      },
      onMount: () => {
        for (const node of nodes) {
          pendingEvent.set(node, "mount" /* MOUNT */);
          renderNode.requestCommit(
            3 /* COMMIT_MOUNT */
          );
          renderNode.requestCommit(
            0 /* COMMIT_UNMOUNT */
          );
        }
      },
      onUnmount: () => {
        for (const node of nodes) {
          pendingEvent.set(node, "unmount" /* UNMOUNT */);
          renderNode.requestCommit(
            3 /* COMMIT_MOUNT */
          );
          renderNode.requestCommit(
            0 /* COMMIT_UNMOUNT */
          );
        }
      },
      onCommit: (phase) => {
        switch (phase) {
          case 0 /* COMMIT_UNMOUNT */:
            for (const [node, event] of pendingEvent.entries()) {
              if (event === "unmount" /* UNMOUNT */) {
                notify(
                  node,
                  "unmount" /* UNMOUNT */
                );
              }
            }
            break;
          case 3 /* COMMIT_MOUNT */:
            for (const [node, event] of pendingEvent.entries()) {
              if (event === "mount" /* MOUNT */) {
                notify(node, "mount" /* MOUNT */);
              }
            }
            pendingEvent.clear();
            break;
        }
      }
    },
    child,
    debugName ?? "IntrinsicObserverRenderNode"
  );
  return renderNode;
}

// src/components/intrinsicobserver.ts
var IntrinsicObserver = ({ nodeCallback, elementCallback, children }) => {
  return IntrinsicObserverRenderNode(
    nodeCallback,
    elementCallback,
    ArrayRenderNode(renderJSXChildren(children))
  );
};

// src/modelview/collectionrendernode.ts
function CollectionRenderNode(renderJSXNode2, collection2, debugName) {
  let unsubscribe;
  function handleEvent(events) {
    for (const event of events) {
      switch (event.type) {
        case "splice" /* SPLICE */:
          renderNode.spliceChildren(
            event.index,
            event.count,
            event.items?.map((item) => renderJSXNode2(item)) ?? []
          );
          break;
        case "move" /* MOVE */:
          renderNode.moveChildren(event.from, event.count, event.to);
          break;
        case "sort" /* SORT */:
          renderNode.sortChildren(event.from, event.indexes);
          break;
      }
    }
  }
  const renderNode = new MultiChildRenderNode(
    {
      onAlive: () => {
        unsubscribe = collection2.subscribe(handleEvent);
      },
      onDestroy: () => {
        unsubscribe?.();
        untrackReads(() => {
          renderNode.spliceChildren(0, collection2.length, []);
        });
      }
    },
    [],
    debugName ?? `CollectionRenderNode(${collection2.__debugName})`
  );
  return renderNode;
}

// src/model/rangeassociation.ts
var RangeAssociation = class {
  constructor() {
    this.intervals = [];
  }
  setAssociation(start, end, value) {
    if (start >= end)
      return;
    const result = [];
    const left = this.findFirstOverlap(start);
    let i = left;
    while (i < this.intervals.length && this.intervals[i].start < end) {
      const current = this.intervals[i];
      if (start < current.start) {
        result.push({
          start,
          end: Math.min(current.start, end),
          value
        });
      }
      start = Math.max(start, current.end);
      result.push(current);
      i++;
    }
    if (start < end) {
      result.push({ start, end, value });
    }
    this.intervals.splice(left, i - left, ...result);
  }
  getAssociation(index) {
    if (isNaN(index)) {
      return null;
    }
    if (this.intervals.length === 0) {
      return null;
    }
    if (index < 0) {
      return null;
    }
    const highestIndex = this.intervals[this.intervals.length - 1];
    if (index >= highestIndex.end) {
      return null;
    }
    let lo = 0, hi = this.intervals.length - 1;
    while (lo <= hi) {
      const mid = lo + hi >>> 1;
      const { start, end, value } = this.intervals[mid];
      if (index < start)
        hi = mid - 1;
      else if (index >= end)
        lo = mid + 1;
      else
        return value;
    }
    return null;
  }
  findFirstOverlap(pos) {
    let lo = 0, hi = this.intervals.length;
    while (lo < hi) {
      const mid = lo + hi >>> 1;
      if (this.intervals[mid].end <= pos) {
        lo = mid + 1;
      } else {
        hi = mid;
      }
    }
    return lo;
  }
  clear() {
    this.intervals = [];
  }
};

// src/model/dirtyarray.ts
var DirtyArray = class {
  constructor() {
    this.rangeAssociation = new RangeAssociation();
    this.dirtyLength = null;
    this.clock = 0;
  }
  markDirty(key) {
    if (key === "length") {
      if (this.dirtyLength === null) {
        this.dirtyLength = this.clock;
      }
      return;
    }
    this.rangeAssociation.setAssociation(key.start, key.end, this.clock);
  }
  tickClock() {
    this.clock += 1;
  }
  clear() {
    this.dirtyLength = null;
    this.rangeAssociation.clear();
  }
  resetClock() {
    this.clock = 0;
  }
  getClock() {
    return this.clock;
  }
  get(key) {
    if (key === "length") {
      return this.dirtyLength;
    }
    return this.rangeAssociation.getAssociation(key);
  }
};

// src/model/trackedarray.ts
var TrackedArray = class {
  constructor(mergeEvents, lifecycle, debugName) {
    this.mergeEvents = mergeEvents;
    this.itemSubscriptions = /* @__PURE__ */ new Map();
    this.eventSubscriptions = [];
    this.dirtyArray = new DirtyArray();
    this.onAlive = lifecycle?.onAlive;
    this.onDead = lifecycle?.onDead;
    this.isDirty = false;
    this.__processable = true;
    this.__refcount = 0;
    this.__debugName = debugName ?? "arraysub";
  }
  tickClock() {
    this.dirtyArray.tickClock();
  }
  notifyRead(key) {
    const reader = notifyRead(this);
    if (reader && reader.__refcount > 0) {
      let subscriptions = this.itemSubscriptions.get(reader);
      if (!subscriptions) {
        subscriptions = /* @__PURE__ */ new Map();
        this.itemSubscriptions.set(reader, subscriptions);
      }
      if (!subscriptions.has(key)) {
        subscriptions.set(key, this.dirtyArray.getClock());
      }
    }
  }
  markDirty(key) {
    if (this.__refcount === 0) {
      return;
    }
    this.dirtyArray.markDirty(key);
    if (!this.isDirty) {
      markDirty(this);
      this.isDirty = true;
    }
  }
  addEvent(event) {
    if (this.__refcount === 0) {
      return;
    }
    if (this.eventSubscriptions.length > 0) {
      for (const subscription of this.eventSubscriptions) {
        subscription.events.push(event);
      }
      if (!this.isDirty) {
        markDirty(this);
        this.isDirty = true;
      }
    }
  }
  subscribe(handler) {
    this.retain();
    const subscription = {
      handler,
      events: []
    };
    this.eventSubscriptions.push(subscription);
    return () => {
      const index = this.eventSubscriptions.indexOf(subscription);
      if (index >= 0) {
        this.eventSubscriptions.splice(index, 1);
        this.release();
      }
    };
  }
  retain() {
    retain(this);
  }
  release() {
    release(this);
  }
  __alive() {
    addVertex(this);
    this.onAlive?.();
  }
  __dead() {
    this.onDead?.();
    removeVertex(this);
    this.itemSubscriptions.clear();
    this.eventSubscriptions = [];
    this.dirtyArray.clear();
    this.dirtyArray.resetClock();
  }
  __recalculate() {
    assert(this.__refcount > 0, "cannot flush dead trackedarray");
    const toPropagate = /* @__PURE__ */ new Set();
    for (const [
      reader,
      subscriptions
    ] of this.itemSubscriptions.entries()) {
      if (reader.__refcount > 0) {
        for (const [key, whenRead] of subscriptions.entries()) {
          const whenChanged = this.dirtyArray.get(key);
          if (whenChanged !== null && whenRead <= whenChanged) {
            toPropagate.add(reader);
          }
        }
      }
    }
    for (const reader of toPropagate) {
      this.itemSubscriptions.delete(reader);
    }
    this.eventSubscriptions.forEach((subscription) => {
      if (subscription.events.length) {
        subscription.handler(this.mergeEvents(subscription.events));
        subscription.events = [];
      }
    });
    this.dirtyArray.clear();
    this.isDirty = false;
    return [...toPropagate];
  }
};

// src/model/arraysub.ts
function defaultSort(x, y) {
  if (x === void 0 && y === void 0)
    return 0;
  if (x === void 0)
    return 1;
  if (y === void 0)
    return -1;
  const xStr = "" + x;
  const yStr = "" + y;
  if (xStr < yStr)
    return -1;
  if (xStr > yStr)
    return 1;
  return 0;
}
var ArraySub = class {
  constructor(init, debugName, lifecycle) {
    this.items = init ?? [];
    this.trackedArray = new TrackedArray(
      mergeArrayEvents,
      lifecycle,
      debugName
    );
    this.__debugName = debugName ?? "arraysub";
  }
  getItemsUnsafe() {
    return this.items;
  }
  get(index) {
    this.trackedArray.notifyRead(index);
    return this.items[index];
  }
  set(index, value) {
    if (index >= this.items.length) {
      warn("Assigning to out-of-bounds index");
      const items = [];
      for (let i = this.items.length; i < index; ++i) {
        items.push(void 0);
      }
      items.push(value);
      this.splice(this.items.length, 0, items);
      return;
    }
    if (this.items[index] === value) {
      return;
    }
    this.items[index] = value;
    this.trackedArray.markDirty({ start: index, end: index + 1 });
    this.trackedArray.addEvent({
      type: "splice" /* SPLICE */,
      index,
      count: 1,
      items: [value]
    });
    this.trackedArray.tickClock();
  }
  setLength(newLength) {
    if (newLength < this.items.length) {
      this.splice(newLength, this.items.length - newLength, []);
    } else if (newLength > this.items.length) {
      const items = [];
      for (let i = this.items.length; i < newLength; ++i) {
        items.push(void 0);
      }
      this.splice(this.items.length, 0, items);
    }
  }
  getLength() {
    this.trackedArray.notifyRead("length");
    return this.items.length;
  }
  /**
   * Implement a splice, dirtying the affected fields, but do not queue a
   * splice event
   */
  spliceInner(index, count, items) {
    const startLength = this.items.length;
    const removed = Array.prototype.splice.call(
      this.items,
      index,
      count,
      ...items
    );
    const endLength = this.items.length;
    if (startLength === endLength) {
      this.trackedArray.markDirty({
        start: index,
        end: index + items.length
      });
    } else {
      this.trackedArray.markDirty({ start: index, end: endLength });
      this.trackedArray.markDirty({ start: endLength, end: startLength });
      this.trackedArray.markDirty("length");
    }
    return removed;
  }
  splice(index, count, items) {
    if (count === 0 && items.length === 0) {
      return [];
    }
    let fixedIndex;
    if (index < -this.items.length) {
      fixedIndex = 0;
    } else if (index < 0) {
      fixedIndex = this.items.length - index;
    } else if (index > this.items.length) {
      fixedIndex = this.items.length;
    } else {
      fixedIndex = index;
    }
    const removed = this.spliceInner(fixedIndex, count, items);
    this.trackedArray.addEvent({
      type: "splice" /* SPLICE */,
      index: fixedIndex,
      count,
      items
    });
    this.trackedArray.tickClock();
    return removed;
  }
  sort(sortFn = defaultSort) {
    const indexes = this.items.map((_unused, index) => index).sort((a, b) => sortFn(this.items[a], this.items[b]));
    this.items.sort(sortFn);
    this.trackedArray.addEvent({
      type: "sort" /* SORT */,
      from: 0,
      indexes
    });
    this.trackedArray.markDirty({ start: 0, end: this.items.length });
    this.trackedArray.tickClock();
    return this;
  }
  reverse() {
    const indexes = [];
    for (let i = this.items.length - 1; i >= 0; --i) {
      indexes.push(i);
    }
    this.items.reverse();
    this.trackedArray.addEvent({
      type: "sort" /* SORT */,
      from: 0,
      indexes
    });
    this.trackedArray.markDirty({ start: 0, end: this.items.length });
    this.trackedArray.tickClock();
    return this;
  }
  moveSlice(fromIndex, count, toIndex) {
    const removed = this.items.splice(fromIndex, count);
    this.items.splice(toIndex, 0, ...removed);
    const lowerBound = Math.min(fromIndex, toIndex);
    const upperBound = Math.max(fromIndex, toIndex) + count;
    this.trackedArray.markDirty({ start: lowerBound, end: upperBound });
    this.trackedArray.addEvent({
      type: "move" /* MOVE */,
      from: fromIndex,
      count,
      to: toIndex
    });
    this.trackedArray.tickClock();
  }
  subscribe(handler) {
    this.retain();
    const unsubscribe = this.trackedArray.subscribe(handler);
    handler([
      {
        type: "splice" /* SPLICE */,
        index: 0,
        count: 0,
        items: this.items.slice()
      }
    ]);
    return () => {
      unsubscribe();
      this.release();
    };
  }
  retain() {
    this.trackedArray.retain();
  }
  release() {
    this.trackedArray.release();
  }
};
var DerivedArraySub = class {
  constructor(source, eventTransform, debugName) {
    this.source = source;
    this.eventTransform = eventTransform;
    this.items = [];
    this.trackedArray = new TrackedArray(
      mergeArrayEvents,
      {
        onAlive: () => {
          this.source.retain();
          this.sourceUnsubscribe = this.source.subscribe((events) => {
            this.ingestEvents(events);
          });
        },
        onDead: () => {
          this.sourceUnsubscribe?.();
          this.items = [];
          this.source.release();
        }
      },
      debugName
    );
    this.__debugName = debugName ?? "arraysub";
  }
  get(index) {
    assert(
      index >= 0 && index < this.items.length,
      "Out-of-bounds ArraySub read"
    );
    this.trackedArray.notifyRead(index);
    return this.items[index];
  }
  getItemsUnsafe() {
    return this.items;
  }
  set(index, value) {
    throw new Error("Read-only");
  }
  getLength() {
    this.trackedArray.notifyRead("length");
    return this.items.length;
  }
  subscribe(handler) {
    this.retain();
    const unsubscribe = this.trackedArray.subscribe(handler);
    handler([
      {
        type: "splice" /* SPLICE */,
        index: 0,
        count: 0,
        items: this.items.slice()
      }
    ]);
    return () => {
      unsubscribe();
      this.release();
    };
  }
  ingestEvents(events) {
    const transformedEvents = mergeArrayEvents(this.eventTransform(events));
    for (const transformed of transformedEvents) {
      const lengthBefore = this.items.length;
      applyArrayEvent(this.items, transformed);
      const lengthAfter = this.items.length;
      switch (transformed.type) {
        case "splice" /* SPLICE */: {
          this.trackedArray.markDirty({
            start: transformed.index,
            end: transformed.index + transformed.count
          });
          if (lengthBefore !== lengthAfter) {
            const dirtyEnd = Math.max(lengthBefore, lengthAfter);
            this.trackedArray.markDirty({
              start: transformed.index + transformed.count,
              end: dirtyEnd
            });
            this.trackedArray.markDirty("length");
          }
          break;
        }
        case "move" /* MOVE */: {
          const startIndex = Math.min(
            transformed.from,
            transformed.to
          );
          const endIndex = Math.max(transformed.from, transformed.to) + transformed.count;
          this.trackedArray.markDirty({
            start: startIndex,
            end: endIndex
          });
          break;
        }
        case "sort" /* SORT */: {
          this.trackedArray.markDirty({
            start: transformed.from,
            end: transformed.from + transformed.indexes.length
          });
          break;
        }
      }
      this.trackedArray.addEvent(transformed);
    }
    this.trackedArray.tickClock();
  }
  retain() {
    this.trackedArray.retain();
  }
  release() {
    this.trackedArray.release();
  }
};
function mapView(source, mapFn) {
  return new DerivedArraySub(source, function* (events) {
    for (const event of events) {
      switch (event.type) {
        case "splice" /* SPLICE */:
          yield {
            type: event.type,
            index: event.index,
            count: event.count,
            items: event.items?.map((val) => mapFn(val))
          };
          break;
        default:
          yield event;
      }
    }
  });
}
function flatMapView(source, mapFn) {
  const slotSizes = new SlotSizes([]);
  return new DerivedArraySub(source, function* (events) {
    for (const event of events) {
      switch (event.type) {
        case "splice" /* SPLICE */: {
          const mappedItems = event.items?.map((item) => mapFn(item)) ?? [];
          yield slotSizes.splice(
            event.index,
            event.count,
            mappedItems
          ).event;
          for (const item of mappedItems) {
            yield slotSizes.applyEvent(item, {
              type: "splice" /* SPLICE */,
              index: 0,
              count: 0,
              items: item
            });
          }
          break;
        }
        case "sort" /* SORT */: {
          yield slotSizes.sort(event.from, event.indexes);
          break;
        }
        case "move" /* MOVE */: {
          yield slotSizes.move(event.from, event.count, event.to);
          break;
        }
      }
    }
  });
}
function filterView(source, mapFn) {
  return flatMapView(source, (item) => mapFn(item) ? [item] : []);
}

// src/model/collection.ts
var collectionSymbol = Symbol("collection");
function makeCollectionOrView(dynamicArray, additionalPrototypeProps, isWritable, setFn) {
  const values = dynamicArray.getItemsUnsafe();
  const pseudoPrototype = {
    dispose: () => {
      revoke();
    },
    retain: () => {
      dynamicArray.retain();
    },
    release: () => {
      dynamicArray.release();
    },
    mapView: (fn, debugName) => view(mapView(dynamicArray, fn), debugName),
    filterView: (fn, debugName) => view(filterView(dynamicArray, fn), debugName),
    flatMapView: (fn, debugName) => view(flatMapView(dynamicArray, fn), debugName),
    subscribe: (handler) => dynamicArray.subscribe(handler),
    ...additionalPrototypeProps
  };
  const getPropertyDescriptor = (prop) => {
    if (prop === collectionSymbol) {
      return {
        value: true,
        writable: false,
        enumerable: false,
        configurable: false
      };
    }
    if (prop in pseudoPrototype) {
      return {
        value: pseudoPrototype[prop],
        writable: false,
        enumerable: false,
        configurable: false
      };
    }
    if (prop === "length") {
      return {
        value: dynamicArray.getLength(),
        writable: false,
        enumerable: true,
        configurable: false
      };
    }
    const numericProp = typeof prop === "string" ? parseInt(prop) : null;
    if (numericProp !== null && numericProp.toString() === prop) {
      return {
        value: dynamicArray.get(numericProp),
        writable: isWritable,
        enumerable: true,
        configurable: true
      };
    }
    return void 0;
  };
  const { proxy, revoke } = Proxy.revocable(values, {
    get: (target, prop, receiver) => {
      const descriptor = getPropertyDescriptor(prop);
      if (!descriptor) {
        return target[prop];
      }
      return descriptor.value;
    },
    set: (target, prop, value, receiver) => {
      if (prop === collectionSymbol) {
        return false;
      }
      if (prop in pseudoPrototype) {
        warn(
          "Reassigning built-in methods not supported on collections/views"
        );
        return false;
      }
      if (prop === "length") {
        return setFn(prop, value);
      }
      const numericProp = typeof prop === "string" ? parseInt(prop) : null;
      if (numericProp !== null && numericProp.toString() === prop) {
        return setFn(numericProp, value);
      }
      warn(
        "Cannot assign to unsupported values on collections/views",
        { prop }
      );
      return false;
    },
    has: (target, prop) => {
      return getPropertyDescriptor(prop) !== void 0;
    },
    ownKeys: (target) => {
      const keys = [];
      const length = dynamicArray.getLength();
      for (let i = 0; i < length; ++i) {
        keys.push(i.toString());
      }
      keys.push("length");
      return keys;
    },
    defineProperty: () => {
      warn("defineProperty not supported on collections");
      return false;
    },
    deleteProperty: () => {
      warn("delete not supported on collections");
      return false;
    },
    getOwnPropertyDescriptor: (target, prop) => {
      return getPropertyDescriptor(prop);
    },
    setPrototypeOf: () => {
      warn("setPrototypeOf not supported on collections");
      return false;
    }
  });
  return proxy;
}
function collection(values = [], debugName = "collection") {
  const arraySub = new ArraySub(values);
  const coll = makeCollectionOrView(
    arraySub,
    {
      reject(predicate) {
        const removed = [];
        for (let i = arraySub.getLength() - 1; i >= 0; --i) {
          if (predicate(arraySub.get(i))) {
            removed.push(arraySub.splice(i, 1, [])[0]);
          }
        }
        return removed.reverse();
      },
      moveSlice(from, count, to) {
        arraySub.moveSlice(from, count, to);
      },
      splice(index, count, ...items) {
        return arraySub.splice(index, count, items);
      },
      sort(fn) {
        arraySub.sort(fn);
        return this;
      },
      reverse() {
        arraySub.reverse();
        return this;
      },
      pop() {
        const length = arraySub.getItemsUnsafe().length;
        if (length === 0) {
          return void 0;
        }
        return arraySub.splice(length - 1, 1, [])[0];
      },
      shift() {
        const length = arraySub.getItemsUnsafe().length;
        if (length === 0) {
          return void 0;
        }
        return arraySub.splice(0, 1, [])[0];
      },
      unshift(...items) {
        arraySub.splice(0, 0, items);
        return arraySub.getItemsUnsafe().length;
      },
      push(...items) {
        arraySub.splice(Infinity, 0, items);
        return arraySub.getItemsUnsafe().length;
      },
      asView() {
        return view(arraySub);
      },
      __renderNode: (renderJsxNode) => {
        return CollectionRenderNode(renderJsxNode, coll, debugName);
      },
      __debugName: debugName
    },
    true,
    (prop, value) => {
      if (prop === "length") {
        arraySub.setLength(value);
      } else {
        arraySub.set(prop, value);
      }
      return true;
    }
  );
  return coll;
}
function view(arraySub, debugName = `view(${arraySub.__debugName})`) {
  function unsupported() {
    throw new Error("Cannot mutate readonly view");
  }
  const v = makeCollectionOrView(
    arraySub,
    {
      push: unsupported,
      unshift: unsupported,
      pop: unsupported,
      shift: unsupported,
      __renderNode: (renderJsxNode) => {
        return CollectionRenderNode(renderJsxNode, v, debugName);
      },
      __debugName: debugName
    },
    false,
    unsupported
  );
  return v;
}

// src/model/trackeddata.ts
var TrackedData = class {
  constructor(mergeEvents, lifecycle, debugName) {
    this.mergeEvents = mergeEvents;
    this.itemSubscriptions = /* @__PURE__ */ new Map();
    this.eventSubscriptions = [];
    this.dirtyKeys = /* @__PURE__ */ new Map();
    this.clock = 0;
    this.onAlive = lifecycle?.onAlive;
    this.onDead = lifecycle?.onDead;
    this.isDirty = false;
    this.__processable = true;
    this.__refcount = 0;
    this.__debugName = debugName ?? "arraysub";
  }
  tickClock() {
    this.clock += 1;
  }
  notifyRead(key) {
    const reader = notifyRead(this);
    if (reader && reader.__refcount > 0) {
      let subscriptions = this.itemSubscriptions.get(reader);
      if (!subscriptions) {
        subscriptions = /* @__PURE__ */ new Map();
        this.itemSubscriptions.set(reader, subscriptions);
      }
      if (!subscriptions.has(key)) {
        subscriptions.set(key, this.clock);
      }
    }
  }
  markDirty(key) {
    if (this.__refcount === 0) {
      return;
    }
    if (!this.dirtyKeys.has(key)) {
      this.dirtyKeys.set(key, this.clock);
    }
    if (!this.isDirty) {
      markDirty(this);
      this.isDirty = true;
    }
  }
  addEvent(event) {
    if (this.__refcount === 0) {
      return;
    }
    if (this.eventSubscriptions.length > 0) {
      for (const subscription of this.eventSubscriptions) {
        subscription.events.push(event);
      }
      if (!this.isDirty) {
        markDirty(this);
        this.isDirty = true;
      }
    }
  }
  subscribe(handler) {
    this.retain();
    const subscription = {
      handler,
      events: []
    };
    this.eventSubscriptions.push(subscription);
    return () => {
      const index = this.eventSubscriptions.indexOf(subscription);
      if (index >= 0) {
        this.eventSubscriptions.splice(index, 1);
        this.release();
      }
    };
  }
  retain() {
    retain(this);
  }
  release() {
    release(this);
  }
  __alive() {
    addVertex(this);
    this.onAlive?.();
  }
  __dead() {
    this.onDead?.();
    removeVertex(this);
    this.itemSubscriptions.clear();
    this.eventSubscriptions = [];
    this.dirtyKeys.clear();
    this.clock = 0;
  }
  __recalculate() {
    assert(this.__refcount > 0, "cannot flush dead trackeddata");
    const toPropagate = /* @__PURE__ */ new Set();
    for (const [
      reader,
      subscriptions
    ] of this.itemSubscriptions.entries()) {
      if (reader.__refcount > 0) {
        for (const [key, whenRead] of subscriptions.entries()) {
          const whenChanged = this.dirtyKeys.get(key);
          if (whenChanged !== void 0 && whenRead <= whenChanged) {
            toPropagate.add(reader);
          }
        }
      }
    }
    for (const reader of toPropagate) {
      this.itemSubscriptions.delete(reader);
    }
    this.eventSubscriptions.forEach((subscription) => {
      if (subscription.events.length) {
        subscription.handler(this.mergeEvents(subscription.events));
        subscription.events = [];
      }
    });
    this.dirtyKeys.clear();
    this.isDirty = false;
    return [...toPropagate];
  }
};

// src/model/dict.ts
var DictEventType = /* @__PURE__ */ ((DictEventType2) => {
  DictEventType2["ADD"] = "add";
  DictEventType2["SET"] = "set";
  DictEventType2["DEL"] = "del";
  return DictEventType2;
})(DictEventType || {});
function* mergeDictEvents(events) {
  if (events.length === 0) {
    return;
  }
  let lastEvent = events[0];
  for (let i = 1; i < events.length; ++i) {
    const event = events[i];
    if (lastEvent?.prop === event.prop) {
      switch (lastEvent.type) {
        case "add" /* ADD */:
        case "set" /* SET */:
          if (event.type === "set" /* SET */) {
            lastEvent = {
              type: lastEvent.type,
              // ADD/SET followed by SET overwrites with the new value
              prop: event.prop,
              value: event.value
              // Use overridden value
            };
            return;
          }
          if (event.type === "del" /* DEL */) {
            lastEvent = void 0;
            return;
          }
          break;
        case "del" /* DEL */:
          if (event.type === "add" /* ADD */) {
            lastEvent = {
              type: "set" /* SET */,
              // DEL followed by ADD is a SET
              prop: event.prop,
              value: event.value
            };
          }
          break;
      }
    } else {
      if (lastEvent) {
        yield lastEvent;
      }
      lastEvent = event;
    }
  }
  if (lastEvent) {
    yield lastEvent;
  }
}
var sizeSymbol = Symbol("dictSize");
var keysSymbol = Symbol("dictKeys");
var Dict = class {
  constructor(init, debugName) {
    this.items = new Map(init ?? []);
    this.trackedData = new TrackedData(mergeDictEvents, {}, debugName);
    this.__refcount = 0;
    this.__debugName = debugName ?? "arraysub";
  }
  getItemsUnsafe() {
    return this.items;
  }
  get(key) {
    this.trackedData.notifyRead(key);
    return this.items.get(key);
  }
  has(key) {
    this.trackedData.notifyRead(key);
    return this.items.has(key);
  }
  set(key, value) {
    if (this.items.get(key) === value) {
      return;
    }
    const hasKey = this.items.has(key);
    this.items.set(key, value);
    this.trackedData.markDirty(key);
    if (!hasKey) {
      this.trackedData.markDirty(sizeSymbol);
      this.trackedData.markDirty(keysSymbol);
    }
    this.trackedData.addEvent({
      type: hasKey ? "set" /* SET */ : "add" /* ADD */,
      prop: key,
      value
    });
    this.trackedData.tickClock();
  }
  delete(key) {
    if (!this.items.has(key)) {
      return;
    }
    this.items.delete(key);
    this.trackedData.markDirty(key);
    this.trackedData.markDirty(sizeSymbol);
    this.trackedData.markDirty(keysSymbol);
    this.trackedData.addEvent({
      type: "del" /* DEL */,
      prop: key
    });
    this.trackedData.tickClock();
  }
  clear() {
    if (this.items.size === 0) {
      return;
    }
    const keys = Array.from(this.items.keys());
    this.items.clear();
    for (const key of keys) {
      this.trackedData.markDirty(key);
      this.trackedData.addEvent({
        type: "del" /* DEL */,
        prop: key
      });
    }
    this.trackedData.markDirty(sizeSymbol);
    this.trackedData.tickClock();
  }
  forEach(fn) {
    for (const [key, value] of this.entries()) {
      fn(value, key);
    }
  }
  keysView(debugName) {
    let subscription;
    const arrSub = new ArraySub([], debugName, {
      onAlive: () => {
        subscription = this.subscribe((events) => {
          for (const event of events) {
            switch (event.type) {
              case "add" /* ADD */:
                arrSub.splice(Infinity, 0, [event.prop]);
                break;
              case "set" /* SET */:
                break;
              case "del" /* DEL */: {
                const items = arrSub.getItemsUnsafe();
                const index = items.indexOf(event.prop);
                if (index !== -1) {
                  arrSub.splice(index, 1, []);
                }
                break;
              }
            }
          }
        });
      },
      onDead: () => {
        subscription?.();
        subscription = void 0;
      }
    });
    const keysView = view(arrSub, debugName);
    return keysView;
  }
  *keys() {
    this.trackedData.notifyRead(keysSymbol);
    const keys = Array.from(this.items.keys());
    for (const key of keys) {
      yield key;
    }
  }
  *values() {
    this.trackedData.notifyRead(keysSymbol);
    const keys = Array.from(this.items.keys());
    const values = [];
    for (const key of keys) {
      this.trackedData.notifyRead(key);
      values.push(this.items.get(key));
    }
    for (const value of values) {
      yield value;
    }
  }
  *entries() {
    this.trackedData.notifyRead(keysSymbol);
    const keys = Array.from(this.items.keys());
    const entries = [];
    for (const key of keys) {
      this.trackedData.notifyRead(key);
      entries.push([key, this.items.get(key)]);
    }
    for (const entry of entries) {
      yield entry;
    }
  }
  get size() {
    this.trackedData.notifyRead(sizeSymbol);
    return this.items.size;
  }
  subscribe(handler) {
    this.retain();
    const initialEvents = mergeDictEvents(
      Array.from(this.items.entries()).map(([key, value]) => ({
        type: "add" /* ADD */,
        prop: key,
        value
      }))
    );
    handler(initialEvents);
    const unsubscribe = this.trackedData.subscribe(handler);
    return () => {
      unsubscribe();
      this.release();
    };
  }
  retain() {
    retain(this);
  }
  release() {
    release(this);
  }
  __alive() {
    this.trackedData.retain();
  }
  __dead() {
    this.trackedData.release();
  }
};
function dict(entries = [], debugName) {
  return new Dict(entries, debugName);
}

// src/model/model.ts
var ModelEventType = /* @__PURE__ */ ((ModelEventType2) => {
  ModelEventType2["SET"] = "set";
  return ModelEventType2;
})(ModelEventType || {});
var modelDictSymbol = Symbol("modelDict");
function getModelDict(model2) {
  const dict2 = model2[modelDictSymbol];
  assert(dict2, "Unable to retrieve internal model dict");
  return dict2;
}
function model(target, debugName) {
  const modelDict = dict(Object.entries(target), debugName);
  const modelObj = { ...target };
  Object.keys(target).forEach((key) => {
    Object.defineProperty(modelObj, key, {
      get: () => {
        return modelDict.get(key);
      },
      set: (newValue) => {
        modelDict.set(key, newValue);
      }
    });
  });
  Object.defineProperty(modelObj, modelDictSymbol, { get: () => modelDict });
  return modelObj;
}
model.subscribe = function modelSubscribe(sourceModel, handler, debugName) {
  const modelDict = getModelDict(sourceModel);
  return modelDict.subscribe((events) => {
    const transformed = [];
    for (const event of events) {
      if (event.type === "set" /* SET */ || event.type === "add" /* ADD */) {
        transformed.push({
          type: "set" /* SET */,
          prop: event.prop,
          value: event.value
        });
      }
    }
    if (transformed.length) {
      handler(transformed);
    }
  });
};
model.field = function modelField(sourceModel, field2) {
  return {
    get: () => sourceModel[field2],
    set: (newValue) => {
      sourceModel[field2] = newValue;
    },
    subscribe: (handler) => {
      return model.subscribe(sourceModel, (events) => {
        for (const event of events) {
          if (event.prop === field2) {
            handler(void 0, event.value);
          }
        }
      });
    }
  };
};

// src/viewcontroller/rendernode/webcomponentrendernode.ts
function WebComponentRenderNode(host, shadowRoot, elementInternals, options, childrenField, fields, debugName) {
  let result;
  let onMountCallbacks;
  let onUnmountCallbacks;
  let onDestroyCallbacks;
  const owned = /* @__PURE__ */ new Set();
  let errorHandler;
  function ensureResult() {
    if (!result) {
      let callbacksAllowed = true;
      const lifecycle = {
        onMount: (handler) => {
          assert(
            callbacksAllowed,
            "onMount must be called in component body"
          );
          if (!onMountCallbacks)
            onMountCallbacks = [];
          onMountCallbacks.push(handler);
        },
        onUnmount: (handler) => {
          assert(
            callbacksAllowed,
            "onUnmount must be called in component body"
          );
          if (!onUnmountCallbacks)
            onUnmountCallbacks = [];
          onUnmountCallbacks.push(handler);
        },
        onDestroy: (handler) => {
          assert(
            callbacksAllowed,
            "onDestroy must be called in component body"
          );
          if (!onDestroyCallbacks)
            onDestroyCallbacks = [];
          onDestroyCallbacks.push(handler);
        },
        onError: (handler) => {
          assert(
            callbacksAllowed,
            "onError must be called in component body"
          );
          assert(!errorHandler, "onError called multiple times");
          errorHandler = handler;
        },
        host,
        elementInternals,
        shadowRoot,
        addEventListener: (name, handler, options2) => {
          const listener = (event) => {
            handler.call(host, event, host);
          };
          host.addEventListener(name, listener, options2);
          const unsubscribe = () => {
            host.removeEventListener(name, listener, options2);
          };
          if (!onDestroyCallbacks)
            onDestroyCallbacks = [];
          onDestroyCallbacks.push(unsubscribe);
          return unsubscribe;
        },
        bindElementInternalsAttribute: (param, value) => {
          elementInternals[param] = dynGet(value);
          const unsubscribe = dynSubscribe(value, (err, newValue) => {
            if (err === void 0) {
              elementInternals[param] = newValue;
            } else {
            }
          });
          if (!onDestroyCallbacks)
            onDestroyCallbacks = [];
          onDestroyCallbacks.push(unsubscribe);
          return unsubscribe;
        },
        bindFormValue: (formValue) => {
          if (!elementInternals) {
            throw new Error(
              `ElementInternals not available on custom element ${options.tagName}`
            );
          }
          const update = (formValue2) => {
            if (typeof formValue2 === "string" || formValue2 instanceof File || formValue2 instanceof FormData) {
              elementInternals?.setFormValue(formValue2);
            } else {
              const { value, state } = formValue2;
              if (state === void 0) {
                elementInternals?.setFormValue(value);
              } else {
                elementInternals?.setFormValue(value, state);
              }
            }
          };
          update(dynGet(formValue));
          const unsubscribe = dynSubscribe(
            formValue,
            (err, newVal) => {
              if (err === void 0) {
                update(newVal);
              } else {
              }
            }
          );
          if (!onDestroyCallbacks)
            onDestroyCallbacks = [];
          onDestroyCallbacks.push(unsubscribe);
          return unsubscribe;
        },
        bindValidity: (validity) => {
          if (!elementInternals) {
            throw new Error(
              `ElementInternals not available on custom element ${options.tagName}`
            );
          }
          const update = (validity2) => {
            const { flags, message, anchor } = validity2;
            elementInternals?.setValidity(flags, message, anchor);
          };
          const val = dynGet(validity);
          update(val);
          const unsubscribe = dynSubscribe(validity, (err, val2) => {
            if (err === void 0) {
              update(val2);
            } else {
            }
          });
          if (!onDestroyCallbacks)
            onDestroyCallbacks = [];
          onDestroyCallbacks.push(unsubscribe);
          return unsubscribe;
        },
        checkValidity: () => {
          if (!elementInternals) {
            throw new Error(
              `ElementInternals not available on custom element ${options.tagName}`
            );
          }
          elementInternals?.checkValidity();
        },
        reportValidity: () => {
          if (!elementInternals) {
            throw new Error(
              `ElementInternals not available on custom element ${options.tagName}`
            );
          }
          elementInternals?.reportValidity();
        }
      };
      const componentProps = options.shadowMode === void 0 ? {
        ...fields,
        children: renderJSXNode(childrenField)
      } : {
        ...fields
      };
      const Component = options.Component;
      let jsxResult;
      try {
        jsxResult = Component(componentProps, lifecycle) || emptyRenderNode;
      } catch (e) {
        const error2 = wrapError(e, "Unknown error rendering component");
        if (errorHandler) {
          jsxResult = errorHandler(error2) ?? emptyRenderNode;
        } else {
          jsxResult = error2;
        }
      }
      callbacksAllowed = false;
      for (const item of owned) {
        retain(item);
      }
      if (!(jsxResult instanceof Error)) {
        result = renderJSXNode(jsxResult);
      } else {
        result = jsxResult;
      }
    }
    return result;
  }
  const renderNode = new SingleChildRenderNode(
    {
      onAlive: () => {
        const result2 = ensureResult();
        if (result2 instanceof Error) {
          warn("Unhandled exception on detached component", {
            error: result2,
            renderNode
          });
        } else {
          renderNode.setChild(result2);
        }
      },
      onDestroy: () => {
        if (onDestroyCallbacks) {
          for (const callback of onDestroyCallbacks) {
            callback();
          }
        }
        result = void 0;
        onMountCallbacks = void 0;
        onUnmountCallbacks = void 0;
        onDestroyCallbacks = void 0;
        errorHandler = void 0;
        for (const item of owned) {
          release(item);
        }
        owned.clear();
      },
      onAttach: (parentContext) => {
        if (result instanceof Error) {
          parentContext.errorEmitter(result);
        }
      },
      onError: (error2) => {
        if (errorHandler) {
          const handledResult = errorHandler(error2);
          result = handledResult ? renderJSXNode(handledResult) : emptyRenderNode;
          renderNode.setChild(result);
          return true;
        }
      },
      onMount() {
        assert(result, "Invariant: missing result");
        if (result instanceof Error) {
          return;
        }
        renderNode.requestCommit(3 /* COMMIT_MOUNT */);
      },
      onUnmount() {
        assert(result, "Invariant: missing result");
        if (result instanceof Error) {
          return;
        }
        if (onUnmountCallbacks) {
          for (const callback of onUnmountCallbacks) {
            callback();
          }
        }
      },
      onCommit(phase) {
        if (phase === 3 /* COMMIT_MOUNT */ && onMountCallbacks) {
          for (const callback of onMountCallbacks) {
            const maybeOnUnmount = callback();
            if (typeof maybeOnUnmount === "function") {
              if (!onUnmountCallbacks) {
                onUnmountCallbacks = [];
              }
              const onUnmount = () => {
                maybeOnUnmount();
                if (onUnmountCallbacks) {
                  const index = onUnmountCallbacks.indexOf(onUnmount);
                  if (index >= 0) {
                    onUnmountCallbacks.splice(index, 1);
                  }
                }
              };
              onUnmountCallbacks.push(onUnmount);
            }
          }
        }
      },
      clone() {
        assert(
          false,
          "Attempted to clone a WebComponentRenderNode -- this operation doesn't make sense"
        );
      }
    },
    emptyRenderNode,
    debugName ?? `web-component(${options.tagName})`
  );
  return renderNode;
}

// src/viewcontroller/definecustomelement.ts
function defineCustomElement(options) {
  const Superclass = options.extends ? getWebComponentTagConstructors()[options.extends] : HTMLElement;
  class GooeyCustomElement extends Superclass {
    constructor() {
      super();
      const shadowRoot = options.shadowMode ? this.attachShadow({
        delegatesFocus: options.delegatesFocus,
        mode: options.shadowMode
      }) : void 0;
      const elementInternals = options.extends ? void 0 : this.attachInternals();
      this._childrenField = field(void 0);
      this._fields = {};
      options.observedAttributes?.forEach((attr) => {
        this._fields[attr] = field(void 0);
      });
      this._renderNode = WebComponentRenderNode(
        this,
        shadowRoot,
        elementInternals,
        options,
        this._childrenField,
        this._fields
      );
      this._portalRenderNode = PortalRenderNode(
        shadowRoot || this,
        this._renderNode,
        void 0
      );
      this._originalChildren = null;
      this.__debugName = `custom:${options.tagName}`;
      this.__refcount = 0;
    }
    __dead() {
      this._portalRenderNode?.release();
      if (this._originalChildren) {
        this.replaceChildren(...this._originalChildren);
      }
    }
    __alive() {
      if (options.hydrateTemplateChild !== false && this.children.length === 1 && this.children[0] instanceof HTMLTemplateElement) {
        this._originalChildren = Array.from(this.childNodes);
        this.replaceChildren(
          ...this._originalChildren.map(
            (node) => node instanceof HTMLTemplateElement ? node.content : node
          )
        );
      }
      let children = [];
      if (!options.shadowMode) {
        children = Array.from(this.childNodes);
        this.replaceChildren();
        this._childrenField.set(children);
      }
      this._portalRenderNode?.retain();
      this._portalRenderNode?.attach({
        nodeEmitter: (event) => {
          assert(false, "Unexpected event from Portal", event);
        },
        errorEmitter: (error2) => {
          error("Unhandled web component mount error", error2);
        },
        xmlNamespace: this.namespaceURI ?? HTML_NAMESPACE
      });
    }
    retain() {
      retain(this);
    }
    release() {
      release(this);
    }
    connectedCallback() {
      this.retain();
      this._portalRenderNode?.onMount();
    }
    disconnectedCallback() {
      this._portalRenderNode?.onUnmount();
      this.release();
    }
    adoptedCallback() {
    }
    attributeChangedCallback(name, oldValue, newValue) {
      this._fields[name].set(newValue);
    }
  }
  GooeyCustomElement.formAssociated = options.formAssociated || false;
  GooeyCustomElement.observedAttributes = options.observedAttributes ?? [];
  if (options.extends) {
    customElements.define(options.tagName, GooeyCustomElement, {
      extends: options.extends
    });
  } else {
    customElements.define(options.tagName, GooeyCustomElement);
  }
}

// src/viewcontroller/mount.ts
function mount(target, node) {
  const skipNodes = target.childNodes.length;
  const children = [];
  for (let i = 0; i < target.childNodes.length; ++i) {
    children.push(ForeignRenderNode(target.childNodes[i]));
  }
  children.push(renderJSXNode(node));
  const root = PortalRenderNode(
    target,
    ArrayRenderNode(children),
    null,
    "root"
  );
  root.retain();
  let syncError;
  root.attach({
    nodeEmitter: (event) => {
      assert(false, "Unexpected event emitted by Portal", event);
    },
    errorEmitter: (error2) => {
      syncError = error2;
      error("Unhandled mount error", error2);
    },
    xmlNamespace: (target instanceof Element ? target.namespaceURI : target.host.namespaceURI) ?? HTML_NAMESPACE
  });
  if (syncError) {
    root.release();
    throw syncError;
  }
  root.onMount();
  flush();
  return () => {
    const nodesToKeep = Array.from(target.childNodes).slice(0, skipNodes);
    root.onUnmount();
    flush();
    target.replaceChildren(...nodesToKeep);
    root.detach();
    root.release();
  };
}

// src/index.ts
var src_default = createElement;
var VERSION = true ? "0.23.0" : "development";
//# sourceMappingURL=index.debug.cjs.map
