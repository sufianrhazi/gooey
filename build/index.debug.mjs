var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => {
  __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
  return value;
};

// src/types.ts
var InvariantError = class extends Error {
  constructor(msg, detail) {
    super(msg);
    __publicField(this, "detail");
    this.detail = detail;
  }
};

// src/log.ts
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
function debug(...items) {
  if (currentLevel >= levels.debug) {
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
  throw new InvariantError(`Invariant error: ${msg}`);
}
function assert(check, msg) {
  if (!check) {
    error("Assertion failure", check === void 0 ? "undefined" : check === null ? "null" : check.toString(), "is not truthy", msg);
    throw new InvariantError(`Assertion failure: ${msg}`);
  }
}
function assertExhausted(context, ...items) {
  error("Assertion failure", context, "is not exhausted", ...items);
  throw new InvariantError("Assertion failure", { context, items });
}

// src/util.ts
var noop = () => {
};
var uniqueid = (() => {
  let id = 1;
  return () => id++;
})();

// src/tarjan.ts
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
        vertex.lowlink = Math.min(vertex.lowlink, toVertex.lowlink);
      } else if (toVertex.onStack) {
        vertex.lowlink = Math.min(vertex.lowlink, toVertex.index);
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

// src/graph.ts
var ProcessAction = /* @__PURE__ */ ((ProcessAction2) => {
  ProcessAction2[ProcessAction2["INVALIDATE"] = 0] = "INVALIDATE";
  ProcessAction2[ProcessAction2["RECALCULATE"] = 1] = "RECALCULATE";
  ProcessAction2[ProcessAction2["CYCLE"] = 2] = "CYCLE";
  return ProcessAction2;
})(ProcessAction || {});
var VERTEX_BIT_DIRTY = 1;
var VERTEX_BIT_ROOT = 2;
var VERTEX_BIT_REACHES_ROOT = 4;
var VERTEX_BIT_CYCLE = 8;
var VERTEX_BIT_SELF_CYCLE = 16;
var VERTEX_BIT_CYCLE_INFORMED = 32;
var Graph = class {
  constructor(processHandler2) {
    __publicField(this, "availableIds");
    __publicField(this, "availableIndices");
    __publicField(this, "nextId");
    __publicField(this, "vertexToId");
    __publicField(this, "vertexById");
    __publicField(this, "vertexBitsById");
    __publicField(this, "cycleInfoById");
    __publicField(this, "forwardAdjacencySoft");
    __publicField(this, "forwardAdjacencyHard");
    __publicField(this, "forwardAdjacencyEither");
    __publicField(this, "reverseAdjacencySoft");
    __publicField(this, "reverseAdjacencyHard");
    __publicField(this, "reverseAdjacencyEither");
    __publicField(this, "topologicalIndexById");
    __publicField(this, "topologicalOrdering");
    __publicField(this, "dirtyVertexIds");
    __publicField(this, "toReorderIds");
    __publicField(this, "debugSubscriptions");
    __publicField(this, "_processHandler");
    this._processHandler = processHandler2;
    this.nextId = 1;
    this.availableIds = [];
    this.availableIndices = [];
    this.vertexById = [];
    this.vertexToId = /* @__PURE__ */ new Map();
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
    this.toReorderIds = /* @__PURE__ */ new Set();
    this.debugSubscriptions = /* @__PURE__ */ new Set();
  }
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
    this.cycleInfoById[id] = void 0;
    let index;
    if (this.availableIndices.length > 0) {
      index = this.availableIndices.pop();
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
  removeVertex(vertex) {
    const id = this.vertexToId.get(vertex);
    assert(id, "double vertex removal");
    const index = this.topologicalIndexById[id];
    assert(index !== void 0, "malformed graph");
    assert((this.vertexBitsById[id] & VERTEX_BIT_ROOT) === 0, "cannot remove root vertex");
    assert(this.forwardAdjacencyEither[id].length === 0, "cannot remove vertex with forward edges");
    assert(this.reverseAdjacencyEither[id].length === 0, "cannot remove vertex with reverse edges");
    this.topologicalIndexById[id] = void 0;
    this.topologicalOrdering[index] = void 0;
    this.vertexBitsById[id] = 0;
    this.cycleInfoById[id] = void 0;
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
      this.dirtyVertexIds.push(vertexId);
      this.processHandler(vertex, 0 /* INVALIDATE */);
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
      const index = this.dirtyVertexIds.indexOf(vertexId);
      this.dirtyVertexIds[index] = this.dirtyVertexIds[this.dirtyVertexIds.length - 1];
      this.dirtyVertexIds.pop();
    }
  }
  markVertexRoot(vertex) {
    const vertexId = this.vertexToId.get(vertex);
    assert(vertexId, "markVertexRoot on nonexistent vertex");
    assert(!(this.vertexBitsById[vertexId] & VERTEX_BIT_ROOT), "markVertexRoot double marked");
    this.vertexBitsById[vertexId] |= VERTEX_BIT_ROOT;
    this.markReachesRootRecursive(vertexId);
  }
  markVertexCycleInformed(vertex) {
    const vertexId = this.vertexToId.get(vertex);
    assert(vertexId, "markVertexCycleInformed on nonexistent vertex");
    this.vertexBitsById[vertexId] |= VERTEX_BIT_CYCLE_INFORMED;
  }
  markReachesRootRecursive(vertexId) {
    if (this.vertexBitsById[vertexId] & VERTEX_BIT_REACHES_ROOT) {
      return;
    }
    this.vertexBitsById[vertexId] |= VERTEX_BIT_REACHES_ROOT;
    for (const fromId of this.reverseAdjacencyHard[vertexId]) {
      this.markReachesRootRecursive(fromId);
    }
    for (const fromId of this.reverseAdjacencySoft[vertexId]) {
      this.markReachesRootRecursive(fromId);
    }
  }
  clearVertexRoot(vertex) {
    const vertexId = this.vertexToId.get(vertex);
    assert(vertexId, "clearVertexRoot on nonexistent vertex");
    assert(this.vertexBitsById[vertexId] & VERTEX_BIT_ROOT, "clearVertexRoot on non-root vertex");
    this.vertexBitsById[vertexId] &= ~VERTEX_BIT_ROOT;
    this.checkReachesRootRecursive(vertexId);
  }
  reachesRoot(vertexId) {
    const cycleInfo = this.cycleInfoById[vertexId];
    if (cycleInfo) {
      for (const cycleId of cycleInfo.vertexIds) {
        if (this.vertexBitsById[cycleId] & VERTEX_BIT_REACHES_ROOT) {
          return true;
        }
      }
      return false;
    }
    return !!(this.vertexBitsById[vertexId] & VERTEX_BIT_REACHES_ROOT);
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
  checkReachesRootRecursive(vertexId) {
    if (!this.reachesRoot(vertexId)) {
      return;
    }
    const cycleInfo = this.cycleInfoById[vertexId];
    for (const toId of this.cycleAwareAdjacency(vertexId, cycleInfo, this.forwardAdjacencyEither)) {
      if (this.reachesRoot(toId))
        return;
    }
    if (cycleInfo) {
      for (const cycleId of cycleInfo.vertexIds) {
        this.vertexBitsById[cycleId] &= ~VERTEX_BIT_REACHES_ROOT;
      }
    } else {
      this.vertexBitsById[vertexId] &= ~VERTEX_BIT_REACHES_ROOT;
    }
    for (const fromId of this.cycleAwareAdjacency(vertexId, cycleInfo, this.reverseAdjacencyEither)) {
      this.checkReachesRootRecursive(fromId);
    }
  }
  addEdge(fromVertex, toVertex, kind) {
    const fromId = this.vertexToId.get(fromVertex);
    const toId = this.vertexToId.get(toVertex);
    assert(fromId, "addEdge from vertex not found");
    assert(toId, "addEdge to vertex not found");
    let forwardList;
    let reverseList;
    switch (kind) {
      case 1 /* EDGE_SOFT */:
        forwardList = this.forwardAdjacencySoft[fromId];
        reverseList = this.reverseAdjacencySoft[toId];
        break;
      case 2 /* EDGE_HARD */:
        forwardList = this.forwardAdjacencyHard[fromId];
        reverseList = this.reverseAdjacencyHard[toId];
        break;
      default:
        assertExhausted(kind, "invalid kind");
    }
    assert(!this.forwardAdjacencyEither[fromId].includes(toId), "addEdge duplicate");
    this.forwardAdjacencyEither[fromId].push(toId);
    forwardList.push(toId);
    this.reverseAdjacencyEither[toId].push(fromId);
    reverseList.push(fromId);
    if (fromId === toId && (this.vertexBitsById[fromId] & VERTEX_BIT_SELF_CYCLE) === 0) {
      const isInformed = this.vertexBitsById[fromId] & VERTEX_BIT_CYCLE_INFORMED;
      if (!isInformed) {
        const vertex = this.vertexById[fromId];
        assert(vertex, "missing vertex in self-cycle");
        this.processHandler(vertex, 2 /* CYCLE */);
        this.vertexBitsById[fromId] |= VERTEX_BIT_CYCLE_INFORMED | VERTEX_BIT_SELF_CYCLE;
      } else {
        this.vertexBitsById[fromId] |= VERTEX_BIT_SELF_CYCLE;
      }
    }
    if ((this.vertexBitsById[fromId] & VERTEX_BIT_REACHES_ROOT) === 0 && this.vertexBitsById[toId] & VERTEX_BIT_REACHES_ROOT) {
      this.markReachesRootRecursive(fromId);
    }
    const fromIndex = this.topologicalIndexById[fromId];
    const toIndex = this.topologicalIndexById[toId];
    assert(toIndex !== void 0, "malformed graph");
    assert(fromIndex !== void 0, "malformed graph");
    const badOrder = fromIndex > toIndex;
    if (badOrder) {
      this.toReorderIds.add(fromId);
      this.toReorderIds.add(toId);
    }
  }
  hasEdge(fromVertex, toVertex, kind) {
    const fromId = this.vertexToId.get(fromVertex);
    const toId = this.vertexToId.get(toVertex);
    assert(fromId, "addEdge from vertex not found");
    assert(toId, "addEdge to vertex not found");
    return this.forwardAdjacencyEither[fromId].includes(toId);
  }
  removeEdge(fromVertex, toVertex, kind) {
    const fromId = this.vertexToId.get(fromVertex);
    const toId = this.vertexToId.get(toVertex);
    assert(fromId, "removeEdge from vertex not found");
    assert(toId, "removeEdge to vertex not found");
    let forwardList;
    let reverseList;
    switch (kind) {
      case 1 /* EDGE_SOFT */:
        forwardList = this.forwardAdjacencySoft[fromId];
        reverseList = this.reverseAdjacencySoft[toId];
        break;
      case 2 /* EDGE_HARD */:
        forwardList = this.forwardAdjacencyHard[fromId];
        reverseList = this.reverseAdjacencyHard[toId];
        break;
      default:
        assertExhausted(kind, "invalid kind");
    }
    assert(this.forwardAdjacencyEither[fromId].includes(toId), "removeEdge on edge that does not exist");
    this.forwardAdjacencyEither[fromId].splice(this.forwardAdjacencyEither[fromId].indexOf(toId), 1);
    forwardList.splice(forwardList.indexOf(toId), 1);
    this.reverseAdjacencyEither[toId].splice(this.reverseAdjacencyEither[toId].indexOf(fromId), 1);
    reverseList.splice(reverseList.indexOf(fromId), 1);
    const fromCycleInfo = this.cycleInfoById[fromId];
    const toCycleInfo = this.cycleInfoById[toId];
    if (fromCycleInfo && toCycleInfo && fromCycleInfo === toCycleInfo) {
      this.toReorderIds.add(fromId);
      this.toReorderIds.add(toId);
    }
    this.checkReachesRootRecursive(fromId);
  }
  visitDfsForwardRecurse(vertexId, lowerBound, upperBound, visited) {
    if (visited.has(vertexId))
      return;
    visited.add(vertexId);
    for (const toId of this.forwardAdjacencyEither[vertexId]) {
      const toIndex = this.topologicalIndexById[toId];
      assert(toIndex !== void 0, "malformed graph");
      if (lowerBound <= toIndex && toIndex <= upperBound) {
        this.visitDfsForwardRecurse(toId, lowerBound, upperBound, visited);
      }
    }
  }
  visitDfsForward(startVertices, lowerBound, upperBound) {
    const visited = /* @__PURE__ */ new Set();
    for (const vertexId of startVertices) {
      this.visitDfsForwardRecurse(vertexId, lowerBound, upperBound, visited);
    }
    return visited;
  }
  resort(toReorder) {
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
        assert(index !== void 0, "malformed graph");
        if (index < lowerBound)
          lowerBound = index;
        if (index > upperBound)
          upperBound = index;
      }
    }
    const seedVertices = this.visitDfsForward(toReorder, lowerBound, upperBound);
    const components = tarjanStronglyConnected(this.reverseAdjacencyEither, this.topologicalIndexById, lowerBound, upperBound, seedVertices);
    const allocatedIndexes = [];
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
        const index = this.topologicalIndexById[vertexId];
        assert(index !== void 0, "malformed graph");
        if (cycle) {
          if (index < cycle.lowerBound)
            cycle.lowerBound = index;
          if (index > cycle.upperBound)
            cycle.upperBound = index;
          if (!(this.vertexBitsById[vertexId] & VERTEX_BIT_CYCLE)) {
            this.vertexBitsById[vertexId] |= VERTEX_BIT_CYCLE;
          }
          if (!(this.vertexBitsById[vertexId] & VERTEX_BIT_CYCLE_INFORMED)) {
            const vertex = this.vertexById[vertexId];
            assert(vertex, "uninformed vertex missing");
            this.processHandler(vertex, 2 /* CYCLE */);
            this.vertexBitsById[vertexId] |= VERTEX_BIT_CYCLE_INFORMED;
          }
          this.cycleInfoById[vertexId] = cycle;
        } else if (this.vertexBitsById[vertexId] & VERTEX_BIT_CYCLE) {
          this.vertexBitsById[vertexId] = this.vertexBitsById[vertexId] & ~(VERTEX_BIT_CYCLE | VERTEX_BIT_CYCLE_INFORMED);
          this.cycleInfoById[vertexId] = void 0;
          this.markVertexDirtyInner(vertexId);
        }
        allocatedIndexes.push(index);
      }
    }
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
  processHandler(vertex, action) {
    if (true) {
      this.debugSubscriptions.forEach(({ subscription, formatter }) => {
        const name = formatter(vertex).name;
        const label = `${ProcessAction[action]}: ${name}`;
        subscription(this.debug((v) => ({
          ...formatter(v),
          isActive: v === vertex
        }), label), label);
      });
    }
    return this._processHandler(vertex, action);
  }
  processVertex(vertexId) {
    const reachesRoot = this.vertexBitsById[vertexId] & VERTEX_BIT_REACHES_ROOT;
    const vertex = this.vertexById[vertexId];
    assert(vertex, "nonexistent vertex dirtied");
    if (!reachesRoot) {
      this.clearVertexDirtyInner(vertexId);
      return this.processHandler(vertex, 0 /* INVALIDATE */);
    }
    return this.processHandler(vertex, 1 /* RECALCULATE */);
  }
  process() {
    if (true) {
      this.debugSubscriptions.forEach(({ subscription, formatter }) => {
        const label = `Process start`;
        subscription(this.debug((v) => ({
          ...formatter(v)
        }), label), label);
      });
    }
    if (this.toReorderIds.size > 0) {
      this.resort(this.toReorderIds);
      this.toReorderIds.clear();
    }
    for (let i = 0; i < this.topologicalOrdering.length; ++i) {
      const vertexId = this.topologicalOrdering[i];
      if (vertexId === void 0)
        continue;
      const isDirty = this.vertexBitsById[vertexId] & VERTEX_BIT_DIRTY;
      if (!isDirty)
        continue;
      const vertex = this.vertexById[vertexId];
      assert(vertex, "nonexistent vertex dirtied");
      const cycleInfo = this.cycleInfoById[vertexId];
      let shouldPropagate = false;
      const recheckIds = cycleInfo || this.vertexBitsById[vertexId] & VERTEX_BIT_SELF_CYCLE ? [] : null;
      if (cycleInfo) {
        for (const cycleId of cycleInfo.vertexIds) {
          if (!this.vertexById[cycleId])
            continue;
          const isInformed = this.vertexBitsById[cycleId] & VERTEX_BIT_CYCLE_INFORMED;
          if (isInformed) {
            recheckIds.push(cycleId);
          }
          shouldPropagate = this.processVertex(cycleId) || shouldPropagate;
        }
      } else {
        const isInformed = this.vertexBitsById[vertexId] & VERTEX_BIT_CYCLE_INFORMED;
        if (isInformed && recheckIds) {
          recheckIds.push(vertexId);
        }
        shouldPropagate = this.processVertex(vertexId) || shouldPropagate;
      }
      if (this.toReorderIds.size > 0) {
        i = this.resort(this.toReorderIds) - 1;
        this.toReorderIds.clear();
      }
      if (cycleInfo || this.vertexBitsById[vertexId] & VERTEX_BIT_SELF_CYCLE) {
        for (const cycleId of recheckIds) {
          const isStillCycle = this.vertexBitsById[cycleId] & (VERTEX_BIT_CYCLE | VERTEX_BIT_SELF_CYCLE);
          if (isStillCycle) {
            const cycleVertex = this.vertexById[cycleId];
            assert(cycleVertex, "nonexistent vertex in cycle");
            shouldPropagate = this.processHandler(cycleVertex, 2 /* CYCLE */) || shouldPropagate;
          }
        }
      }
      const newCycleInfo = this.cycleInfoById[vertexId];
      if (!cycleInfo && newCycleInfo) {
        shouldPropagate = true;
      }
      if (cycleInfo && newCycleInfo && newCycleInfo.vertexIds !== cycleInfo.vertexIds) {
        shouldPropagate = true;
      }
      if (shouldPropagate) {
        const toPropagate = /* @__PURE__ */ new Set();
        toPropagate.add(vertexId);
        if (cycleInfo) {
          for (const oldVertexId of cycleInfo.vertexIds) {
            toPropagate.add(oldVertexId);
          }
        }
        if (newCycleInfo) {
          for (const newVertexId of newCycleInfo.vertexIds) {
            toPropagate.add(newVertexId);
          }
        }
        for (const cycleId of toPropagate) {
          if (!this.vertexById[cycleId])
            continue;
          this.propagateDirty(cycleId, toPropagate);
        }
      } else {
        this.vertexBitsById[vertexId] &= ~VERTEX_BIT_DIRTY;
      }
    }
    if (true) {
      this.debugSubscriptions.forEach(({ subscription, formatter }) => {
        const label = `Process end`;
        subscription(this.debug((v) => ({
          ...formatter(v)
        }), label), label);
      });
    }
  }
  propagateDirty(vertexId, cycleVertexIds) {
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
      if (this.vertexBitsById[id] & VERTEX_BIT_ROOT) {
        attrs.shape = "box";
      } else {
        attrs.shape = "ellipse";
      }
      if (this.vertexBitsById[id] & VERTEX_BIT_DIRTY) {
        attrs.style = "filled";
        attrs.fontcolor = "#FFFFFF";
        attrs.fillcolor = "#FC7A1E";
      } else {
        attrs.style = "filled";
        attrs.fontcolor = "#000000";
        attrs.fillcolor = "#FFFFFF";
      }
      if ((this.vertexBitsById[id] & VERTEX_BIT_REACHES_ROOT) === 0) {
        attrs.style = "filled,dashed";
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
};
__publicField(Graph, "EDGE_SOFT", 1 /* EDGE_SOFT */);
__publicField(Graph, "EDGE_HARD", 2 /* EDGE_HARD */);
if (false) {
  Graph.prototype._test_getVertices = function _test_getVertices() {
    return this.vertexById.filter((vertex) => !!vertex);
  };
  Graph.prototype._test_getDependencies = function _test_getDependencies(vertex) {
    const id = this.vertexToId.get(vertex);
    assert(id, "getDependencies on nonexistent vertex");
    return this.forwardAdjacencyEither[id].map((toId) => this.vertexById[toId]);
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

// src/engine.ts
var SymDebugName = Symbol("debugName");
var SymRefcount = Symbol("refcount");
var SymAlive = Symbol("alive");
var SymDead = Symbol("dead");
var SymRecalculate = Symbol("recalculate");
var SymCycle = Symbol("cycle");
var SymInvalidate = Symbol("invalidate");
var SymProcessable = Symbol("processable");
function isProcessable(val) {
  return val && val[SymProcessable] === true;
}
var globalDependencyGraph = new Graph(processHandler);
var trackReadSets = [];
var trackCreateSets = [];
var isFlushing = false;
var afterFlushCallbacks = [];
var needsFlush = false;
var flushHandle = null;
var flushScheduler = defaultScheduler;
function noopScheduler(callback) {
  return noop;
}
function defaultScheduler(callback) {
  const handle = setTimeout(callback, 0);
  return () => clearTimeout(handle);
}
function reset() {
  globalDependencyGraph = new Graph(processHandler);
  trackReadSets = [];
  trackCreateSets = [];
  isFlushing = false;
  afterFlushCallbacks = [];
  needsFlush = false;
  if (flushHandle)
    flushHandle();
  flushHandle = null;
  flushScheduler = defaultScheduler;
}
function scheduleFlush() {
  if (needsFlush)
    return;
  needsFlush = true;
  flushHandle = flushScheduler(() => {
    needsFlush = false;
    flushHandle = null;
    flush();
  });
}
function subscribe(scheduler) {
  flushScheduler = scheduler ?? noopScheduler;
}
function retain(retainable) {
  debug("retain", retainable[SymDebugName], "was", retainable[SymRefcount]);
  retainable[SymRefcount] += 1;
  if (retainable[SymRefcount] === 1) {
    retainable[SymAlive]();
  }
}
function release(retainable) {
  debug("release", retainable[SymDebugName], "was", retainable[SymRefcount]);
  assert(retainable[SymRefcount] > 0, "double release");
  if (retainable[SymRefcount] === 1) {
    retainable[SymDead]();
  }
  retainable[SymRefcount] -= 1;
}
function processHandler(vertex, action) {
  debug("process", ProcessAction[action], vertex[SymDebugName], vertex);
  switch (action) {
    case 0 /* INVALIDATE */:
      return vertex[SymInvalidate]?.() ?? false;
    case 1 /* RECALCULATE */:
      return vertex[SymRecalculate]?.() ?? false;
    case 2 /* CYCLE */:
      return vertex[SymCycle]?.() ?? false;
    default:
      assertExhausted(action, "unknown action");
  }
}
function flush() {
  isFlushing = true;
  globalDependencyGraph.process();
  isFlushing = false;
  for (const callback of afterFlushCallbacks) {
    callback();
  }
  afterFlushCallbacks.splice(0, afterFlushCallbacks.length);
}
function afterFlush(fn) {
  if (isFlushing) {
    afterFlushCallbacks.push(fn);
  } else {
    fn();
  }
}
function addVertex(vertex) {
  debug("addVertex", vertex[SymDebugName]);
  globalDependencyGraph.addVertex(vertex);
}
function removeVertex(vertex) {
  debug("removeVertex", vertex[SymDebugName]);
  globalDependencyGraph.removeVertex(vertex);
}
function addHardEdge(fromVertex, toVertex) {
  debug("add edge:hard", fromVertex[SymDebugName], "->", toVertex[SymDebugName]);
  globalDependencyGraph.addEdge(fromVertex, toVertex, Graph.EDGE_HARD);
}
function addSoftEdge(fromVertex, toVertex) {
  debug("add edge:soft", fromVertex[SymDebugName], "->", toVertex[SymDebugName]);
  globalDependencyGraph.addEdge(fromVertex, toVertex, Graph.EDGE_SOFT);
}
function removeHardEdge(fromVertex, toVertex) {
  debug("del edge:hard", fromVertex[SymDebugName], "->", toVertex[SymDebugName]);
  globalDependencyGraph.removeEdge(fromVertex, toVertex, Graph.EDGE_HARD);
}
function removeSoftEdge(fromVertex, toVertex) {
  debug("del edge:soft", fromVertex[SymDebugName], "->", toVertex[SymDebugName]);
  globalDependencyGraph.removeEdge(fromVertex, toVertex, Graph.EDGE_SOFT);
}
function markDirty(vertex) {
  debug("dirty", vertex[SymDebugName]);
  globalDependencyGraph.markVertexDirty(vertex);
  scheduleFlush();
}
function unmarkDirty(vertex) {
  debug("clean", vertex[SymDebugName]);
  globalDependencyGraph.clearVertexDirty(vertex);
}
function markRoot(vertex) {
  debug("mark root", vertex[SymDebugName]);
  globalDependencyGraph.markVertexRoot(vertex);
}
function unmarkRoot(vertex) {
  debug("clear root", vertex[SymDebugName]);
  globalDependencyGraph.clearVertexRoot(vertex);
}
function markCycleInformed(vertex) {
  debug("cycle informed", vertex[SymDebugName]);
  globalDependencyGraph.markVertexCycleInformed(vertex);
}
function trackReads(set, fn, debugName) {
  group("trackReads", debugName ?? "call");
  trackReadSets.push(set);
  try {
    return fn();
  } finally {
    groupEnd();
    assert(set === trackReadSets.pop(), "Calculation tracking consistency error");
  }
}
function untrackReads(fn, debugName) {
  group("untrackReads", debugName ?? "call");
  trackReadSets.push(null);
  try {
    return fn();
  } finally {
    groupEnd();
    assert(trackReadSets.pop() === null, "Calculation tracking consistency error");
  }
}
function trackCreates(set, fn, debugName) {
  group("trackCreates", debugName ?? "call");
  trackCreateSets.push(set);
  try {
    return fn();
  } finally {
    groupEnd();
    assert(set === trackCreateSets.pop(), "Calculation tracking consistency error");
  }
}
function notifyCreate(retainable) {
  if (trackCreateSets.length === 0)
    return;
  const createSet = trackCreateSets[trackCreateSets.length - 1];
  if (createSet) {
    debug("notifying dependency", retainable[SymDebugName], "to was created");
    if (!createSet.has(retainable)) {
      createSet.add(retainable);
    }
  }
}
function notifyRead(dependency) {
  if (trackReadSets.length === 0)
    return;
  const calculationReads = trackReadSets[trackReadSets.length - 1];
  if (calculationReads) {
    debug("adding dependency", dependency[SymDebugName], "to active calculation");
    if (!calculationReads.has(dependency)) {
      retain(dependency);
      calculationReads.add(dependency);
    }
  }
}
function debug2(activeVertex, label) {
  return globalDependencyGraph.debug((vertex) => {
    return {
      isActive: vertex === activeVertex,
      group: void 0,
      name: `${vertex[SymDebugName]} (rc=${vertex[SymRefcount]})`
    };
  }, label);
}
function debugSubscribe(fn) {
  return globalDependencyGraph.debugSubscribe((vertex) => {
    return {
      isActive: false,
      group: void 0,
      name: vertex[SymDebugName]
    };
  }, fn);
}

// src/ref.ts
var RefObject = class {
  constructor(current) {
    __publicField(this, "current");
    this.current = current;
  }
};
function ref(val) {
  return new RefObject(val);
}

// src/sentinel.ts
var Sentinel = Symbol("sentinel");

// src/calc.ts
var CalculationErrorType = /* @__PURE__ */ ((CalculationErrorType2) => {
  CalculationErrorType2[CalculationErrorType2["CYCLE"] = 0] = "CYCLE";
  CalculationErrorType2[CalculationErrorType2["EXCEPTION"] = 1] = "EXCEPTION";
  return CalculationErrorType2;
})(CalculationErrorType || {});
var CalculationSymbol = Symbol("calculation");
var CalculationUnsubscribeSymbol = Symbol("calculationUnsubscribe");
function isCalculation(val) {
  return val && val._type === CalculationSymbol;
}
function isCalcUnsubscribe(val) {
  return val && val._type === CalculationUnsubscribeSymbol;
}
function strictEqual(a, b) {
  return a === b;
}
function calcSetError(handler) {
  this._errorHandler = handler;
  return this;
}
function calcSetCmp(eq) {
  this._eq = eq;
  return this;
}
function calcOnRecalc(handler) {
  if (!this._subscriptions) {
    this._subscriptions = /* @__PURE__ */ new Set();
  }
  this._subscriptions.add(handler);
  const unsubscribe = () => {
    this._subscriptions?.delete(handler);
  };
  const unsubscribeData = {
    _type: CalculationUnsubscribeSymbol,
    calculation: this
  };
  return Object.assign(unsubscribe, unsubscribeData);
}
var CycleError = class extends Error {
  constructor(msg, sourceCalculation) {
    super(msg);
    __publicField(this, "sourceCalculation");
    this.sourceCalculation = sourceCalculation;
  }
};
function calculationCall(calculation) {
  if (!calculation._isEffect) {
    notifyRead(calculation);
  }
  const state = calculation._state;
  switch (state) {
    case 4 /* DEAD */:
      return calculation._fn();
    case 2 /* CACHED */:
      return calculation._val;
    case 1 /* CALLING */:
      calculation._state = 3 /* ERROR */;
      calculation._error = new CycleError("Cycle reached: calculation reached itself", calculation);
      throw calculation._error;
    case 3 /* ERROR */:
      if (calculation._error === Sentinel) {
        throw new Error("Cycle reached: calculation reached itself");
      } else {
        throw new Error("Calculation in error state: " + calculation._error.message);
      }
      break;
    case 0 /* READY */: {
      const calculationReads = /* @__PURE__ */ new Set();
      let result = Sentinel;
      let exception;
      calculation._state = 1 /* CALLING */;
      try {
        result = trackReads(calculationReads, () => calculation._fn(), calculation[SymDebugName]);
      } catch (e) {
        exception = e;
      }
      if (calculation._state === 4 /* DEAD */) {
        for (const retained of calculationReads) {
          release(retained);
        }
        if (result === Sentinel)
          throw exception;
        return result;
      }
      if (calculation._state === 3 /* ERROR */) {
        exception = calculation._error;
      }
      let isActiveCycle = false;
      let isActiveCycleRoot = false;
      if (exception) {
        if (exception instanceof CycleError) {
          isActiveCycle = true;
          isActiveCycleRoot = exception.sourceCalculation === calculation;
        }
        const errorHandler = calculation._errorHandler;
        if (errorHandler) {
          result = untrackReads(() => errorHandler(isActiveCycle ? 0 /* CYCLE */ : 1 /* EXCEPTION */), calculation[SymDebugName]);
        }
        if (isActiveCycle) {
          markCycleInformed(calculation);
        }
      }
      if (result === Sentinel) {
        if ("_val" in calculation) {
          delete calculation._val;
        }
        calculation._error = exception;
        calculation._state = 3 /* ERROR */;
      } else {
        calculation._val = result;
        if ("_error" in calculation) {
          delete calculation._error;
        }
        calculation._state = 2 /* CACHED */;
        unmarkDirty(calculation);
      }
      if (calculation._retained) {
        for (const priorDependency of calculation._retained) {
          if (isProcessable(priorDependency) && !calculationReads.has(priorDependency)) {
            removeHardEdge(priorDependency, calculation);
          }
          release(priorDependency);
        }
      }
      for (const dependency of calculationReads) {
        if (isProcessable(dependency)) {
          if (!calculation._retained || !calculation._retained.has(dependency)) {
            addHardEdge(dependency, calculation);
          }
        }
      }
      calculation._retained = calculationReads;
      if (result === Sentinel) {
        throw exception;
      } else if (isActiveCycle && !isActiveCycleRoot) {
        throw exception;
      } else {
        return result;
      }
    }
    default:
      assertExhausted(state, "Calculation in unknown state");
  }
}
function calculationAlive() {
  addVertex(this);
  this._state = 0 /* READY */;
}
function calculationDead() {
  if (this._retained) {
    for (const retained of this._retained) {
      if (isProcessable(retained)) {
        removeHardEdge(retained, this);
      }
      release(retained);
    }
  }
  delete this._retained;
  removeVertex(this);
  this._state = 4 /* DEAD */;
  delete this._val;
}
function calculationRecalculate() {
  switch (this._state) {
    case 4 /* DEAD */:
      fail("cannot recalculate dead calculation");
      break;
    case 1 /* CALLING */:
      fail("cannot recalculate calculation being tracked");
      break;
    case 0 /* READY */:
    case 3 /* ERROR */:
    case 2 /* CACHED */: {
      const priorResult = "_val" in this ? this._val : Sentinel;
      this._state = 0 /* READY */;
      let newResult;
      try {
        newResult = calculationCall(this);
      } catch (e) {
        this._state = 3 /* ERROR */;
        this._error = e;
        return true;
      }
      if (priorResult !== Sentinel && this._eq(priorResult, newResult)) {
        this._val = priorResult;
        return false;
      }
      if (this._subscriptions) {
        for (const subscription of this._subscriptions) {
          subscription(newResult);
        }
      }
      return true;
    }
    default:
      assertExhausted(this._state, "Calculation in unknown state");
  }
}
function calculationInvalidate() {
  switch (this._state) {
    case 4 /* DEAD */:
      fail("cannot invalidate dead calculation");
      break;
    case 1 /* CALLING */:
      fail("cannot invalidate calculation being tracked");
      break;
    case 0 /* READY */:
      return false;
    case 3 /* ERROR */:
      this._state = 0 /* READY */;
      return false;
    case 2 /* CACHED */:
      this._state = 0 /* READY */;
      return true;
    default:
      assertExhausted(this._state, "Calculation in unknown state");
  }
}
function calculationCycle() {
  switch (this._state) {
    case 4 /* DEAD */:
      fail("cannot trigger cycle on dead calculation");
      break;
    case 1 /* CALLING */:
      fail("cannot trigger cycle on calculation being tracked");
      break;
    case 3 /* ERROR */:
    case 2 /* CACHED */:
    case 0 /* READY */: {
      const priorResult = "_val" in this ? this._val : Sentinel;
      this._state = 0 /* READY */;
      const errorHandler = this._errorHandler;
      if (errorHandler) {
        this._val = untrackReads(() => errorHandler(0 /* CYCLE */), this[SymDebugName]);
        this._state = 2 /* CACHED */;
        unmarkDirty(this);
      } else {
        this._state = 3 /* ERROR */;
        this._error = Sentinel;
        return true;
      }
      if (priorResult !== Sentinel && this._eq(priorResult, this._val)) {
        this._val = priorResult;
        return false;
      }
      if (this._subscriptions) {
        for (const subscription of this._subscriptions) {
          subscription(this._val);
        }
      }
      return true;
    }
    default:
      assertExhausted(this._state, "Calculation in unknown state");
  }
}
function calc(fn, debugName) {
  const calculationData = {
    _fn: fn,
    _isEffect: false,
    _state: 4 /* DEAD */,
    _call: calculationCall,
    _eq: strictEqual,
    _type: CalculationSymbol,
    onError: calcSetError,
    setCmp: calcSetCmp,
    onRecalc: calcOnRecalc,
    [SymAlive]: calculationAlive,
    [SymDead]: calculationDead,
    [SymRefcount]: 0,
    [SymProcessable]: true,
    [SymDebugName]: debugName ?? fn.name,
    [SymRecalculate]: calculationRecalculate,
    [SymCycle]: calculationCycle,
    [SymInvalidate]: calculationInvalidate
  };
  const calculation = Object.assign(() => calculationCall(calculation), calculationData);
  notifyCreate(calculation);
  return calculation;
}
function effect(fn, debugName) {
  const calculationData = {
    _fn: fn,
    _isEffect: true,
    _state: 4 /* DEAD */,
    _call: calculationCall,
    _eq: strictEqual,
    _type: CalculationSymbol,
    onError: calcSetError,
    setCmp: calcSetCmp,
    onRecalc: calcOnRecalc,
    [SymAlive]: calculationAlive,
    [SymDead]: calculationDead,
    [SymRefcount]: 0,
    [SymProcessable]: true,
    [SymDebugName]: debugName ?? fn.name,
    [SymRecalculate]: calculationRecalculate,
    [SymCycle]: calculationCycle,
    [SymInvalidate]: calculationInvalidate
  };
  const calculation = Object.assign(() => calculationCall(calculation), calculationData);
  notifyCreate(calculation);
  return calculation;
}

// src/jsx.ts
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
var HTMLElementMap = {
  accesskey: {
    idlName: "accessKey"
  },
  "aria-atomic": {
    idlName: "ariaAtomic"
  },
  "aria-autocomplete": {
    idlName: "ariaAutoComplete"
  },
  "aria-busy": {
    idlName: "ariaBusy"
  },
  "aria-checked": {
    idlName: "ariaChecked"
  },
  "aria-colcount": {
    idlName: "ariaColCount"
  },
  "aria-colindex": {
    idlName: "ariaColIndex"
  },
  "aria-colindextext": {
    idlName: "ariaColIndexText"
  },
  "aria-colspan": {
    idlName: "ariaColSpan"
  },
  "aria-current": {
    idlName: "ariaCurrent"
  },
  "aria-disabled": {
    idlName: "ariaDisabled"
  },
  "aria-expanded": {
    idlName: "ariaExpanded"
  },
  "aria-haspopup": {
    idlName: "ariaHasPopup"
  },
  "aria-hidden": {
    idlName: "ariaHidden"
  },
  "aria-invalid": {
    idlName: "ariaInvalid"
  },
  "aria-keyshortcuts": {
    idlName: "ariaKeyShortcuts"
  },
  "aria-label": {
    idlName: "ariaLabel"
  },
  "aria-level": {
    idlName: "ariaLevel"
  },
  "aria-live": {
    idlName: "ariaLive"
  },
  "aria-modal": {
    idlName: "ariaModal"
  },
  "aria-multiline": {
    idlName: "ariaMultiLine"
  },
  "aria-multiselectable": {
    idlName: "ariaMultiSelectable"
  },
  "aria-orientation": {
    idlName: "ariaOrientation"
  },
  "aria-placeholder": {
    idlName: "ariaPlaceholder"
  },
  "aria-posinset": {
    idlName: "ariaPosInSet"
  },
  "aria-pressed": {
    idlName: "ariaPressed"
  },
  "aria-readonly": {
    idlName: "ariaReadOnly"
  },
  "aria-required": {
    idlName: "ariaRequired"
  },
  "aria-roledescription": {
    idlName: "ariaRoleDescription"
  },
  "aria-rowcount": {
    idlName: "ariaRowCount"
  },
  "aria-rowindex": {
    idlName: "ariaRowIndex"
  },
  "aria-rowindextext": {
    idlName: "ariaRowIndexText"
  },
  "aria-rowspan": {
    idlName: "ariaRowSpan"
  },
  "aria-selected": {
    idlName: "ariaSelected"
  },
  "aria-setsize": {
    idlName: "ariaSetSize"
  },
  "aria-sort": {
    idlName: "ariaSort"
  },
  "aria-valuemax": {
    idlName: "ariaValueMax"
  },
  "aria-valuemin": {
    idlName: "ariaValueMin"
  },
  "aria-valuenow": {
    idlName: "ariaValueNow"
  },
  "aria-valuetext": {
    idlName: "ariaValueText"
  },
  autocapitalize: {},
  autofocus: {},
  class: {
    idlName: "className"
  },
  contenteditable: {
    idlName: "contentEditable"
  },
  dir: {},
  draggable: {},
  enterkeyhint: {
    idlName: "enterKeyHint"
  },
  hidden: {},
  id: {},
  inputmode: {
    idlName: "inputMode"
  },
  is: { idlName: null },
  itemid: { idlName: null },
  itemprop: { idlName: null },
  itemref: { idlName: null },
  itemscope: { idlName: null },
  itemtype: { idlName: null },
  lang: {},
  nonce: {},
  role: {},
  slot: {},
  spellcheck: {},
  style: {},
  tabindex: {
    idlName: "tabIndex",
    makeIdlValue: attrStringOrNumberToNumber
  },
  title: {},
  translate: {
    makeIdlValue: attrYesNo
  }
};
var HTMLAnchorElementMap = {
  ...HTMLElementMap,
  href: {},
  target: {},
  download: {},
  ping: {},
  rel: {},
  hreflang: {},
  type: {},
  referrerpolicy: {
    idlName: "referrerPolicy"
  }
};
var HTMLAreaElementMap = {
  ...HTMLElementMap,
  alt: {},
  coords: {},
  shape: {},
  href: {},
  target: {},
  download: {},
  ping: {},
  rel: {},
  referrerpolicy: {
    idlName: "referrerPolicy"
  }
};
var HTMLAudioElementMap = {
  ...HTMLElementMap,
  src: {},
  crossorigin: {
    idlName: "crossOrigin"
  },
  preload: {},
  autoplay: {},
  loop: {
    makeIdlValue: attrBooleanToEmptyString
  },
  muted: {},
  controls: {}
};
var HTMLBRElementMap = {
  ...HTMLElementMap
};
var HTMLBaseElementMap = {
  ...HTMLElementMap,
  href: {},
  target: {}
};
var HTMLBodyElementMap = {
  ...HTMLElementMap
};
var HTMLButtonElementMap = {
  ...HTMLElementMap,
  disabled: {},
  form: { idlName: null },
  formaction: {
    idlName: "formAction"
  },
  formenctype: {
    idlName: "formEnctype"
  },
  formmethod: {
    idlName: "formMethod"
  },
  formnovalidate: {
    idlName: "formNoValidate"
  },
  formtarget: {
    idlName: "formTarget"
  },
  name: {},
  type: {},
  value: {}
};
var HTMLCanvasElementMap = {
  ...HTMLElementMap,
  width: {
    makeIdlValue: attrStringOrNumberToNumber
  },
  height: {
    makeIdlValue: attrStringOrNumberToNumber
  }
};
var HTMLDListElementMap = {
  ...HTMLElementMap
};
var HTMLDataElementMap = {
  ...HTMLElementMap,
  value: {}
};
var HTMLDataListElementMap = {
  ...HTMLElementMap
};
var HTMLDetailsElementMap = {
  ...HTMLElementMap,
  open: {}
};
var HTMLDialogElementMap = {
  ...HTMLElementMap,
  open: {}
};
var HTMLDivElementMap = {
  ...HTMLElementMap
};
var HTMLEmbedElementMap = {
  ...HTMLElementMap,
  src: {},
  type: {},
  width: {
    makeIdlValue: attrStringOrNumberToNumber
  },
  height: {
    makeIdlValue: attrStringOrNumberToNumber
  }
};
var HTMLFieldSetElementMap = {
  ...HTMLElementMap,
  disabled: {},
  form: { idlName: null },
  name: {}
};
var HTMLFormElementMap = {
  ...HTMLElementMap,
  "accept-charset": {
    idlName: "acceptCharset"
  },
  action: {},
  autocomplete: {},
  enctype: {},
  method: {},
  name: {},
  novalidate: {
    idlName: "noValidate"
  },
  target: {},
  rel: {}
};
var HTMLHeadingElementMap = {
  ...HTMLElementMap
};
var HTMLHeadElementMap = {
  ...HTMLElementMap
};
var HTMLHRElementMap = {
  ...HTMLElementMap
};
var HTMLHtmlElementMap = {
  ...HTMLElementMap
};
var HTMLIFrameElementMap = {
  ...HTMLElementMap,
  src: {},
  srcdoc: {},
  name: {},
  sandbox: {},
  allow: {},
  allowfullscreen: {
    idlName: "allowFullscreen"
  },
  width: {
    makeIdlValue: attrStringOrNumberToNumber
  },
  height: {
    makeIdlValue: attrStringOrNumberToNumber
  },
  referrerpolicy: {
    idlName: "referrerPolicy"
  },
  loading: {}
};
var HTMLImageElementMap = {
  ...HTMLElementMap,
  alt: {},
  src: {},
  srcset: {},
  sizes: {},
  crossorigin: {
    idlName: "crossOrigin"
  },
  usemap: {
    idlName: "useMap"
  },
  ismap: {
    idlName: "isMap"
  },
  width: {
    makeIdlValue: attrStringOrNumberToNumber
  },
  height: {
    makeIdlValue: attrStringOrNumberToNumber
  },
  referrerpolicy: {
    idlName: "referrerPolicy"
  },
  decoding: {},
  loading: {}
};
var HTMLInputElementMap = {
  ...HTMLElementMap,
  accept: {},
  alt: {},
  autocomplete: {},
  checked: {},
  dirname: {
    idlName: "dirName"
  },
  disabled: {},
  form: {},
  formaction: {
    idlName: "formAction"
  },
  formenctype: {
    idlName: "formEnctype"
  },
  formmethod: {
    idlName: "formMethod"
  },
  formnovalidate: {
    idlName: "formNoValidate"
  },
  formtarget: {
    idlName: "formTarget"
  },
  height: {
    makeIdlValue: attrStringOrNumberToNumber
  },
  indeterminate: {
    makeAttrValue: null
  },
  list: {},
  max: {},
  maxlength: {},
  min: {},
  minlength: {
    idlName: "minLength"
  },
  multiple: {},
  name: {},
  pattern: {},
  placeholder: {},
  readonly: {
    idlName: "readOnly"
  },
  required: {},
  size: {},
  src: {},
  step: {},
  type: {},
  value: {},
  width: {
    makeIdlValue: attrStringOrNumberToNumber
  }
};
var HTMLModElementMap = {
  ...HTMLElementMap,
  cite: {},
  datetime: {
    idlName: "dateTime"
  }
};
var HTMLLabelElementMap = {
  ...HTMLElementMap,
  for: {
    idlName: "htmlFor"
  }
};
var HTMLLegendElementMap = {
  ...HTMLElementMap
};
var HTMLLIElementMap = {
  ...HTMLElementMap,
  value: {}
};
var HTMLLinkElementMap = {
  ...HTMLElementMap,
  href: {},
  crossorigin: {
    idlName: "crossOrigin"
  },
  rel: {},
  media: {},
  integrity: {},
  hreflang: {},
  type: {},
  referrerpolicy: {
    idlName: "referrerPolicy"
  },
  sizes: {},
  imagesrcset: {
    idlName: "imageSrcset"
  },
  imagesizes: {
    idlName: "imageSizes"
  },
  as: {},
  color: {
    idlName: null
  },
  disabled: {}
};
var HTMLMapElementMap = {
  ...HTMLElementMap,
  name: {}
};
var HTMLMenuElementMap = {
  ...HTMLElementMap
};
var HTMLMetaElementMap = {
  ...HTMLElementMap,
  name: {},
  "http-equiv": {
    idlName: "httpEquiv"
  },
  content: {},
  charset: {
    idlName: null
  },
  media: {}
};
var HTMLMeterElementMap = {
  ...HTMLElementMap,
  value: {},
  min: {},
  max: {},
  low: {},
  high: {},
  optimum: {}
};
var HTMLObjectElementMap = {
  ...HTMLElementMap,
  data: {},
  type: {},
  name: {},
  form: {
    idlName: null
  },
  width: {
    makeIdlValue: attrStringOrNumberToNumber
  },
  height: {
    makeIdlValue: attrStringOrNumberToNumber
  }
};
var HTMLOListElementMap = {
  ...HTMLElementMap,
  reversed: {},
  start: {},
  type: {}
};
var HTMLOptGroupElementMap = {
  ...HTMLElementMap,
  disabled: {},
  label: {}
};
var HTMLOptionElementMap = {
  ...HTMLElementMap,
  disabled: {},
  label: {},
  selected: {},
  value: {}
};
var HTMLOutputElementMap = {
  ...HTMLElementMap,
  for: {
    idlName: "htmlFor"
  },
  form: { idlName: null },
  name: {}
};
var HTMLParagraphElementMap = {
  ...HTMLElementMap
};
var HTMLParamElementMap = {
  ...HTMLElementMap,
  name: {},
  value: {}
};
var HTMLPictureElementMap = {
  ...HTMLElementMap
};
var HTMLPreElementMap = {
  ...HTMLElementMap
};
var HTMLProgressElementMap = {
  ...HTMLElementMap,
  value: {},
  max: {}
};
var HTMLQuoteElementMap = {
  ...HTMLElementMap,
  cite: {}
};
var HTMLScriptElementMap = {
  ...HTMLElementMap,
  src: {},
  type: {},
  nomodule: {
    idlName: "noModule"
  },
  async: {},
  defer: {},
  crossorigin: {
    idlName: "crossOrigin"
  },
  integrity: {},
  referrerpolicy: {
    idlName: "referrerPolicy"
  }
};
var HTMLSelectElementMap = {
  ...HTMLElementMap,
  autocomplete: {},
  disabled: {},
  form: { idlName: null },
  multiple: {},
  name: {},
  required: {},
  size: {},
  value: { makeAttrValue: null }
};
var HTMLSlotElementMap = {
  ...HTMLElementMap,
  name: {}
};
var HTMLSourceElementMap = {
  ...HTMLElementMap,
  type: {},
  src: {},
  srcset: {},
  sizes: {},
  media: {},
  width: {
    makeIdlValue: attrStringOrNumberToNumber
  },
  height: {
    makeIdlValue: attrStringOrNumberToNumber
  }
};
var HTMLSpanElementMap = {
  ...HTMLElementMap
};
var HTMLStyleElementMap = {
  ...HTMLElementMap,
  media: {}
};
var HTMLTableElementMap = {
  ...HTMLElementMap
};
var HTMLTableCaptionElementMap = {
  ...HTMLElementMap
};
var HTMLTableSectionElementMap = {
  ...HTMLElementMap
};
var HTMLTableCellElementMap = {
  ...HTMLElementMap,
  colspan: {
    idlName: "colSpan"
  },
  rowspan: {
    idlName: "rowSpan"
  },
  headers: {}
};
var HTMLTableHeaderElementMap = {
  ...HTMLTableCellElementMap,
  scope: {},
  abbr: {}
};
var HTMLTableColElementMap = {
  ...HTMLElementMap,
  span: {}
};
var HTMLTemplateElementMap = {
  ...HTMLElementMap
};
var HTMLTextAreaElementMap = {
  ...HTMLElementMap,
  autocomplete: {},
  cols: {},
  dirname: {
    idlName: "dirName"
  },
  disabled: {},
  form: { idlName: null },
  maxlength: {
    idlName: "maxLength"
  },
  minlength: {
    idlName: "minLength"
  },
  name: {},
  placeholder: {},
  readonly: {
    idlName: "readOnly"
  },
  required: {},
  rows: {},
  wrap: {}
};
var HTMLTimeElementMap = {
  ...HTMLElementMap,
  datetime: {
    idlName: "dateTime"
  }
};
var HTMLTitleElementMap = {
  ...HTMLElementMap
};
var HTMLTableRowElementMap = {
  ...HTMLElementMap
};
var HTMLTrackElementMap = {
  ...HTMLElementMap,
  kind: {},
  src: {},
  srclang: {},
  label: {},
  default: {}
};
var HTMLUListElementMap = {
  ...HTMLElementMap
};
var HTMLVideoElementMap = {
  ...HTMLElementMap,
  src: {},
  crossorigin: {
    idlName: "crossOrigin"
  },
  preload: {},
  autoplay: {},
  loop: {
    makeIdlValue: attrBooleanToEmptyString
  },
  muted: {},
  controls: {},
  poster: {},
  playsinline: {
    idlName: "playsInline"
  },
  width: {
    makeIdlValue: attrStringOrNumberToNumber
  },
  height: {
    makeIdlValue: attrStringOrNumberToNumber
  }
};
var ElementTypeMapping = {
  a: HTMLAnchorElementMap,
  abbr: HTMLElementMap,
  address: HTMLElementMap,
  area: HTMLAreaElementMap,
  article: HTMLElementMap,
  aside: HTMLElementMap,
  audio: HTMLAudioElementMap,
  b: HTMLElementMap,
  base: HTMLBaseElementMap,
  bdi: HTMLElementMap,
  bdo: HTMLElementMap,
  blockquote: HTMLElementMap,
  body: HTMLBodyElementMap,
  br: HTMLBRElementMap,
  button: HTMLButtonElementMap,
  canvas: HTMLCanvasElementMap,
  caption: HTMLTableCaptionElementMap,
  cite: HTMLElementMap,
  code: HTMLElementMap,
  col: HTMLTableColElementMap,
  colgroup: HTMLTableColElementMap,
  data: HTMLDataElementMap,
  datalist: HTMLDataListElementMap,
  dd: HTMLElementMap,
  del: HTMLModElementMap,
  details: HTMLDetailsElementMap,
  dfn: HTMLElementMap,
  dialog: HTMLDialogElementMap,
  div: HTMLDivElementMap,
  dl: HTMLDListElementMap,
  dt: HTMLElementMap,
  em: HTMLElementMap,
  embed: HTMLEmbedElementMap,
  fieldset: HTMLFieldSetElementMap,
  figcaption: HTMLElementMap,
  figure: HTMLElementMap,
  footer: HTMLElementMap,
  form: HTMLFormElementMap,
  h1: HTMLElementMap,
  h2: HTMLElementMap,
  h3: HTMLElementMap,
  h4: HTMLElementMap,
  h5: HTMLElementMap,
  h6: HTMLElementMap,
  head: HTMLHeadElementMap,
  header: HTMLElementMap,
  heading: HTMLHeadingElementMap,
  hgroup: HTMLElementMap,
  hr: HTMLHRElementMap,
  html: HTMLHtmlElementMap,
  i: HTMLElementMap,
  iframe: HTMLIFrameElementMap,
  img: HTMLImageElementMap,
  input: HTMLInputElementMap,
  ins: HTMLModElementMap,
  kbd: HTMLElementMap,
  label: HTMLLabelElementMap,
  legend: HTMLLegendElementMap,
  li: HTMLLIElementMap,
  link: HTMLLinkElementMap,
  main: HTMLElementMap,
  map: HTMLMapElementMap,
  mark: HTMLElementMap,
  menu: HTMLMenuElementMap,
  meta: HTMLMetaElementMap,
  meter: HTMLMeterElementMap,
  nav: HTMLElementMap,
  noscript: HTMLElementMap,
  object: HTMLObjectElementMap,
  ol: HTMLOListElementMap,
  optgroup: HTMLOptGroupElementMap,
  option: HTMLOptionElementMap,
  output: HTMLOutputElementMap,
  p: HTMLParagraphElementMap,
  param: HTMLParamElementMap,
  picture: HTMLPictureElementMap,
  pre: HTMLPreElementMap,
  progress: HTMLProgressElementMap,
  quote: HTMLQuoteElementMap,
  rp: HTMLElementMap,
  rt: HTMLElementMap,
  ruby: HTMLElementMap,
  s: HTMLElementMap,
  samp: HTMLElementMap,
  script: HTMLScriptElementMap,
  section: HTMLElementMap,
  select: HTMLSelectElementMap,
  slot: HTMLSlotElementMap,
  small: HTMLElementMap,
  source: HTMLSourceElementMap,
  span: HTMLSpanElementMap,
  strong: HTMLElementMap,
  style: HTMLStyleElementMap,
  sub: HTMLElementMap,
  summary: HTMLElementMap,
  sup: HTMLElementMap,
  table: HTMLTableElementMap,
  tbody: HTMLTableSectionElementMap,
  td: HTMLTableCellElementMap,
  template: HTMLTemplateElementMap,
  textarea: HTMLTextAreaElementMap,
  tfoot: HTMLTableSectionElementMap,
  th: HTMLTableHeaderElementMap,
  thead: HTMLTableSectionElementMap,
  time: HTMLTimeElementMap,
  title: HTMLTitleElementMap,
  tr: HTMLTableRowElementMap,
  track: HTMLTrackElementMap,
  u: HTMLElementMap,
  ul: HTMLUListElementMap,
  var: HTMLElementMap,
  video: HTMLVideoElementMap,
  wbr: HTMLElementMap
};
function getElementTypeMapping(elementName, property) {
  return ElementTypeMapping[elementName]?.[property];
}

// src/arrayevent.ts
function shiftEvent(slotSizes, slotIndex, event) {
  let shiftAmount = 0;
  for (let i = 0; i < slotIndex; ++i) {
    shiftAmount += slotSizes[i];
  }
  switch (event.type) {
    case 0 /* SPLICE */: {
      slotSizes[slotIndex] += (event.items?.length ?? 0) - event.count;
      event.index += shiftAmount;
      break;
    }
    case 2 /* SORT */: {
      event.from += shiftAmount;
      for (let i = 0; i < event.indexes.length; ++i) {
        event.indexes[i] += shiftAmount;
      }
      break;
    }
    case 1 /* MOVE */: {
      event.from += shiftAmount;
      event.to += shiftAmount;
      break;
    }
    default:
      assertExhausted(event);
  }
}
function applyEvent(target, event) {
  switch (event.type) {
    case 0 /* SPLICE */: {
      if (event.items) {
        target.splice(event.index, event.count, ...event.items);
      } else {
        target.splice(event.index, event.count);
      }
      break;
    }
    case 2 /* SORT */: {
      const duped = target.slice(event.from);
      for (let i = 0; i < event.indexes.length; ++i) {
        target[i] = duped[event.indexes[i] - event.from];
      }
      break;
    }
    case 1 /* MOVE */: {
      const slice = target.splice(event.from, event.count);
      target.splice(event.to, 0, ...slice);
      break;
    }
    default:
      assertExhausted(event);
  }
}
function* arrayEventFlatMap(slotSizes, flatMap, target, event) {
  switch (event.type) {
    case 0 /* SPLICE */: {
      let fromIndex = 0;
      let count = 0;
      for (let i = 0; i < event.index; ++i) {
        fromIndex += i < slotSizes.length ? slotSizes[i] : 0;
      }
      for (let i = 0; i < event.count; ++i) {
        const slotIndex = event.index + i;
        count += slotIndex < slotSizes.length ? slotSizes[slotIndex] : 0;
      }
      const slotItems = [];
      const items = [];
      if (event.items) {
        for (const item of event.items) {
          const slot = flatMap(item);
          slotItems.push(slot.length);
          items.push(...slot);
        }
      }
      target.splice(fromIndex, count, ...items);
      slotSizes.splice(event.index, event.count, ...slotItems);
      yield {
        type: 0 /* SPLICE */,
        index: fromIndex,
        count,
        items
      };
      break;
    }
    case 2 /* SORT */: {
      const slotStartIndex = [];
      let realIndex = 0;
      for (const slotSize of slotSizes) {
        slotStartIndex.push(realIndex);
        realIndex += slotSize;
      }
      const copiedSlotSizes = slotSizes.slice();
      const copiedSource = target.slice();
      const newIndexes = [];
      let destSlotIndex = 0;
      let destIndex = 0;
      for (const sourceIndex of event.indexes) {
        const realCount = copiedSlotSizes[sourceIndex];
        const realIndex2 = slotStartIndex[sourceIndex];
        for (let i = 0; i < realCount; ++i) {
          newIndexes.push(realIndex2 + i);
          target[destIndex] = copiedSource[realIndex2 + i];
          destIndex += 1;
        }
        slotSizes[destSlotIndex] = copiedSlotSizes[sourceIndex];
        destSlotIndex += 1;
      }
      yield {
        type: 2 /* SORT */,
        from: slotStartIndex[event.from],
        indexes: newIndexes
      };
      break;
    }
    case 1 /* MOVE */: {
      let fromIndex = 0;
      let toIndex = 0;
      let count = 0;
      for (let i = 0; i < event.from; ++i) {
        fromIndex += slotSizes[i];
      }
      for (let i = 0; i < event.count; ++i) {
        count += slotSizes[event.from + i];
      }
      const movedSlots = slotSizes.splice(event.from, event.count);
      const movedItems = target.splice(fromIndex, count);
      for (let i = 0; i < event.to; ++i) {
        toIndex += slotSizes[i];
      }
      slotSizes.splice(event.to, 0, ...movedSlots);
      target.splice(toIndex, 0, ...movedItems);
      yield {
        type: 1 /* MOVE */,
        from: fromIndex,
        count,
        to: toIndex
      };
      break;
    }
    default:
      assertExhausted(event);
  }
}

// src/field.ts
function field(name, val, debugName) {
  const field2 = {
    _name: name,
    _val: val,
    _isAlive: false,
    get: fieldGet,
    set: fieldSet,
    update: fieldUpdate,
    observe: fieldObserve,
    [SymProcessable]: true,
    [SymRefcount]: 0,
    [SymAlive]: fieldAlive,
    [SymDead]: fieldDead,
    [SymDebugName]: debugName ?? name,
    [SymRecalculate]: fieldFlush
  };
  return field2;
}
function fieldGet() {
  notifyRead(this);
  return this._val;
}
function fieldSet(newVal) {
  if (newVal !== this._val) {
    this._val = newVal;
    if (this._isAlive) {
      markDirty(this);
    }
  }
}
function fieldUpdate(updater) {
  const newVal = updater(this._val);
  if (newVal !== this._val) {
    this._val = newVal;
    if (this._isAlive) {
      markDirty(this);
    }
  }
}
function fieldObserve(observer) {
  if (!this._observers)
    this._observers = /* @__PURE__ */ new Set();
  this._observers.add(observer);
  return () => this._observers?.delete(observer);
}
function fieldAlive() {
  this._isAlive = true;
  addVertex(this);
}
function fieldDead() {
  removeVertex(this);
  this._isAlive = false;
}
function fieldFlush() {
  assert(this._isAlive, "cannot flush dead field");
  if (this._observers) {
    for (const observer of this._observers) {
      observer(this._val);
    }
  }
  return true;
}

// src/trackeddata.ts
var SymTDHandle = Symbol("tdHandle");
var _a, _b, _c;
var SubscriptionEmitter = class {
  constructor(fieldMap, debugName) {
    __publicField(this, "subscribers");
    __publicField(this, "subscriberOffset");
    __publicField(this, "events");
    __publicField(this, "fieldMap");
    __publicField(this, "isActive");
    __publicField(this, _a);
    __publicField(this, _b);
    __publicField(this, _c);
    this.subscribers = [];
    this.subscriberOffset = [];
    this.events = [];
    this.fieldMap = fieldMap;
    this.isActive = false;
    this[SymRefcount] = 0;
    this[SymProcessable] = true;
    this[SymDebugName] = `emitter:${debugName}`;
  }
  [(_a = SymProcessable, _b = SymDebugName, SymRecalculate)]() {
    for (let i = 0; i < this.subscribers.length; ++i) {
      const subscriber = this.subscribers[i];
      subscriber(this.events, this.subscriberOffset[i]);
      this.subscriberOffset[i] = 0;
    }
    this.events.splice(0, this.events.length);
    return true;
  }
  [(_c = SymRefcount, SymAlive)]() {
    this.isActive = true;
    addVertex(this);
    for (const field2 of this.fieldMap.values()) {
      retain(field2);
      addSoftEdge(field2, this);
    }
  }
  [SymDead]() {
    assert(this.subscribers.length === 0, "released subscription emitter that had subscribers");
    assert(this.subscriberOffset.length === 0, "released subscription emitter that had subscribers");
    this.events.splice(0, this.events.length);
    for (const field2 of this.fieldMap.values()) {
      removeSoftEdge(field2, this);
      release(field2);
    }
    removeVertex(this);
    this.isActive = false;
  }
  addEvent(event) {
    if (!this.isActive)
      return;
    const length = this.events.push(event);
    if (length === 1) {
      markDirty(this);
    }
  }
  addField(field2) {
    if (this.isActive) {
      retain(field2);
      addSoftEdge(field2, this);
    }
  }
  subscribe(handler) {
    if (this.subscribers.length === 0) {
      markRoot(this);
    }
    this.subscribers.push(handler);
    this.subscriberOffset.push(this.events.length);
    return () => {
      const index = this.subscribers.indexOf(handler);
      if (index === -1)
        return;
      this.subscribers.splice(index, 1);
      this.subscriberOffset.splice(index, 1);
      if (this.subscribers.length === 0) {
        unmarkRoot(this);
      }
    };
  }
};
var _a2, _b2, _c2;
var SubscriptionConsumer = class {
  constructor(target, fieldMap, sourceEmitter, transformEmitter, handler, debugName) {
    __publicField(this, "target");
    __publicField(this, "handler");
    __publicField(this, "events");
    __publicField(this, "fieldMap");
    __publicField(this, "isActive");
    __publicField(this, "sourceEmitter");
    __publicField(this, "transformEmitter");
    __publicField(this, "unsubscribe");
    __publicField(this, _a2);
    __publicField(this, _b2);
    __publicField(this, _c2);
    this.target = target;
    this.handler = handler;
    this.events = [];
    this.fieldMap = fieldMap;
    this.isActive = false;
    this.sourceEmitter = sourceEmitter;
    this.transformEmitter = transformEmitter;
    this[SymRefcount] = 0;
    this[SymProcessable] = true;
    this[SymDebugName] = `consumer:${debugName}`;
  }
  [(_a2 = SymProcessable, _b2 = SymDebugName, SymRecalculate)]() {
    for (const event of this.events) {
      for (const emitEvent of this.handler(this.target, event)) {
        this.transformEmitter.addEvent(emitEvent);
      }
    }
    this.events.splice(0, this.events.length);
    return false;
  }
  [(_c2 = SymRefcount, SymAlive)]() {
    this.isActive = true;
    addVertex(this);
    markRoot(this);
    for (const field2 of this.fieldMap.values()) {
      retain(field2);
      addSoftEdge(this, field2);
    }
    retain(this.sourceEmitter);
    addHardEdge(this.sourceEmitter, this);
    this.unsubscribe = this.sourceEmitter.subscribe((events, offset) => {
      for (let i = offset; i < events.length; ++i) {
        this.addEvent(events[i]);
      }
    });
  }
  [SymDead]() {
    if (this.unsubscribe) {
      this.unsubscribe();
      removeHardEdge(this.sourceEmitter, this);
      release(this.sourceEmitter);
    }
    this.events.splice(0, this.events.length);
    for (const field2 of this.fieldMap.values()) {
      removeSoftEdge(this, field2);
      release(field2);
    }
    unmarkRoot(this);
    removeVertex(this);
    this.isActive = false;
  }
  addEvent(event) {
    if (!this.isActive)
      return;
    const length = this.events.push(event);
    if (length === 1) {
      markDirty(this);
    }
  }
  addField(field2) {
    if (this.isActive) {
      retain(field2);
      addSoftEdge(this, field2);
    }
  }
};
function getTrackedDataHandle(trackedData) {
  return trackedData[SymTDHandle];
}
function makeTrackedData(target, proxyHandler, methods, derivedEmitter, handleEvent, _debugName) {
  const debugName = _debugName ?? "trackeddata";
  const fieldMap = /* @__PURE__ */ new Map();
  const keys = new Set(Object.keys(target));
  const keysField = field(`${debugName}:@keys`, keys.size);
  const emitter = new SubscriptionEmitter(fieldMap, debugName);
  let consumer = null;
  if (derivedEmitter && handleEvent) {
    consumer = new SubscriptionConsumer(target, fieldMap, derivedEmitter, emitter, handleEvent, debugName);
  }
  const emitEvent = (event) => {
    emitter.addEvent(event);
  };
  const dataAccessor = {
    get: (prop, receiver) => {
      if (prop === SymTDHandle) {
        return tdHandle;
      }
      if (prop === SymRefcount || prop === SymAlive || prop === SymDead) {
        return methods[prop];
      }
      if (typeof prop === "symbol") {
        return Reflect.get(target, prop, receiver);
      }
      if (prop in methods) {
        return methods[prop];
      }
      const value = Reflect.get(target, prop, receiver);
      const field2 = getOrMakeField(debugName, fieldMap, consumer, emitter, prop, value);
      notifyRead(field2);
      return value;
    },
    peekHas: (prop) => {
      return Reflect.has(target, prop);
    },
    has: (prop) => {
      if (prop === SymRefcount || prop === SymAlive || prop === SymDead) {
        return prop in methods;
      }
      if (typeof prop === "symbol") {
        return Reflect.has(target, prop);
      }
      if (prop in methods) {
        return true;
      }
      const value = Reflect.has(target, prop);
      const field2 = getOrMakeField(debugName, fieldMap, consumer, emitter, prop, value);
      notifyRead(field2);
      return value;
    },
    set: (prop, value, receiver) => {
      if (prop === SymRefcount) {
        methods[prop] = value;
        return true;
      }
      if (typeof prop === "symbol") {
        return Reflect.set(target, prop, value, receiver);
      }
      if (prop in methods) {
        return false;
      }
      const hadProp = Reflect.has(target, prop);
      const field2 = getOrMakeField(debugName, fieldMap, consumer, emitter, prop, value);
      field2.set(value);
      if (!hadProp) {
        keys.add(prop);
        keysField.set(keys.size);
      }
      return Reflect.set(target, prop, value, revocable.proxy);
    },
    delete: (prop) => {
      if (prop === SymRefcount || prop === SymAlive || prop === SymDead) {
        return false;
      }
      if (typeof prop === "symbol") {
        return Reflect.deleteProperty(target, prop);
      }
      if (prop in methods) {
        return false;
      }
      const hadProp = Reflect.has(target, prop);
      const result = Reflect.deleteProperty(target, prop);
      if (hadProp) {
        keys.delete(prop);
        keysField.set(keys.size);
      }
      return result;
    }
  };
  const revocable = Proxy.revocable(target, {
    get: (target2, prop, receiver) => proxyHandler.get(dataAccessor, emitEvent, prop, receiver),
    has: (target2, prop) => proxyHandler.has(dataAccessor, emitEvent, prop),
    set: (target2, prop, value, receiver) => proxyHandler.set(dataAccessor, emitEvent, prop, value, receiver),
    deleteProperty: (target2, prop) => proxyHandler.delete(dataAccessor, emitEvent, prop),
    ownKeys: () => {
      const keys2 = tdHandle.keys;
      tdHandle.keysField.get();
      return [...keys2];
    }
  });
  const tdHandle = {
    fieldMap,
    keysField,
    keys,
    target,
    revocable,
    emitter,
    consumer
  };
  notifyCreate(revocable.proxy);
  return tdHandle;
}
function getOrMakeField(debugPrefix, fieldMap, consumer, emitter, prop, value) {
  let field2 = fieldMap.get(prop);
  if (!field2) {
    field2 = field(`${debugPrefix}:${prop}`, value);
    fieldMap.set(prop, field2);
    consumer?.addField(field2);
    emitter.addField(field2);
  }
  return field2;
}

// src/collection.ts
function makeCollectionPrototype() {
  return {
    _type: "collection",
    splice: collectionSplice,
    push: collectionPush,
    pop: collectionPop,
    shift: collectionShift,
    unshift: collectionUnshift,
    sort: collectionSort,
    reverse: collectionReverse,
    reject: collectionReject,
    moveSlice: collectionMoveSlice,
    mapView,
    filterView,
    flatMapView,
    subscribe: collectionSubscribe,
    [SymRefcount]: 0,
    [SymAlive]: collectionAlive,
    [SymDead]: collectionDead,
    [SymDebugName]: "collection"
  };
}
function makeViewPrototype() {
  return {
    _type: "view",
    splice: viewSplice,
    push: viewPush,
    pop: viewPop,
    shift: viewShift,
    unshift: viewUnshift,
    sort: viewSort,
    reverse: viewReverse,
    mapView,
    filterView,
    flatMapView,
    subscribe: collectionSubscribe,
    [SymRefcount]: 0,
    [SymAlive]: viewAlive,
    [SymDead]: viewDead,
    [SymDebugName]: "collection"
  };
}
function isCollection(val) {
  return val && val._type === "collection";
}
function isView(val) {
  return val && val._type === "view";
}
var CollectionHandler = {
  get: (dataAccessor, emitter, prop, receiver) => {
    return dataAccessor.get(prop, receiver);
  },
  has: (dataAccessor, emitter, prop) => {
    return dataAccessor.has(prop);
  },
  set: (dataAccessor, emitter, prop, value, receiver) => {
    if (typeof prop === "string") {
      const numericProp = parseInt(prop, 10);
      if (!isNaN(numericProp)) {
        emitter({
          type: 0 /* SPLICE */,
          index: numericProp,
          count: 1,
          items: [value]
        });
      }
    }
    return dataAccessor.set(prop, value, receiver);
  },
  delete: (dataAccessor, emitter, prop) => {
    return dataAccessor.delete(prop);
  }
};
var ViewHandler = {
  get: (dataAccessor, emitter, prop, receiver) => {
    return dataAccessor.get(prop, receiver);
  },
  has: (dataAccessor, emitter, prop) => {
    return dataAccessor.has(prop);
  },
  set: (dataAccessor, emitter, prop, value, receiver) => {
    if (prop === SymRefcount) {
      return dataAccessor.set(prop, value, receiver);
    }
    fail("Cannot mutate readonly view");
  },
  delete: (dataAccessor, emitter, prop) => {
    fail("Cannot mutate readonly view");
  }
};
function collection(items, debugName) {
  const handle = makeTrackedData(items, CollectionHandler, makeCollectionPrototype(), null, null, debugName);
  return handle.revocable.proxy;
}
function viewSplice(index, count, ...items) {
  fail("Cannot mutate readonly view");
}
function collectionSplice(index, count = 0, ...items) {
  const tdHandle = getTrackedDataHandle(this);
  assert(tdHandle, "splice operation lacking tdHandle");
  const startLength = this.length;
  const removed = Array.prototype.splice.call(tdHandle.target, index, count, ...items);
  const endLength = this.length;
  if (startLength === endLength) {
    for (let i = index; i < index + items.length; ++i) {
      const field2 = tdHandle.fieldMap.get(i.toString());
      field2?.set(tdHandle.target[i]);
    }
  } else {
    for (let i = index; i < endLength; ++i) {
      const field3 = tdHandle.fieldMap.get(i.toString());
      field3?.set(tdHandle.target[i]);
    }
    for (let i = endLength; i < startLength; ++i) {
      const field3 = tdHandle.fieldMap.get(i.toString());
      field3?.set(void 0);
    }
    const field2 = tdHandle.fieldMap.get("length");
    field2?.set(endLength);
  }
  tdHandle.emitter.addEvent({
    type: 0 /* SPLICE */,
    index,
    count,
    items
  });
  return removed;
}
function viewPush(...items) {
  fail("Cannot mutate readonly view");
}
function collectionPush(...items) {
  collectionSplice.call(this, this.length, 0, ...items);
  return this.length;
}
function viewPop() {
  fail("Cannot mutate readonly view");
}
function collectionPop() {
  return collectionSplice.call(this, this.length - 1, 1)[0];
}
function viewShift() {
  fail("Cannot mutate readonly view");
}
function collectionShift() {
  return collectionSplice.call(this, 0, 1)[0];
}
function viewUnshift(...items) {
  fail("Cannot mutate readonly view");
}
function collectionUnshift(...items) {
  collectionSplice.call(this, 0, 0, ...items);
  return this.length;
}
function collectionReject(pred) {
  let start = null;
  let length = this.length;
  let toRemove = false;
  const removed = [];
  for (let i = 0; i < length; ++i) {
    toRemove = pred(this[i]);
    if (toRemove && start === null) {
      start = i;
    }
    if (!toRemove && start !== null) {
      const count = i - start;
      removed.push(...this.splice(start, count));
      length -= count;
      i -= count;
      start = null;
    }
  }
  if (start !== null) {
    const count = length - start;
    removed.push(...this.splice(start, count));
  }
  return removed;
}
function collectionMoveSlice(fromIndex, count, toIndex) {
  const tdHandle = getTrackedDataHandle(this);
  assert(tdHandle, "moveSlice missing tdHandle");
  const removed = tdHandle.target.splice(fromIndex, count);
  tdHandle.target.splice(toIndex, 0, ...removed);
  tdHandle.emitter.addEvent({
    type: 1 /* MOVE */,
    from: fromIndex,
    count,
    to: toIndex
  });
}
function collectionSubscribe(handler) {
  const tdHandle = getTrackedDataHandle(this);
  assert(tdHandle, "subscribe missing tdHandle");
  retain(tdHandle.emitter);
  const unsubscribe = tdHandle.emitter.subscribe((events, offset) => {
    for (let i = offset; i < events.length; ++i) {
      handler(events[i]);
    }
  });
  return () => {
    unsubscribe();
    release(tdHandle.emitter);
  };
}
function collectionAlive() {
}
function collectionDead() {
}
function viewSort(sortFn) {
  fail("Cannot mutate readonly view");
}
function viewReverse() {
  fail("Cannot mutate readonly view");
}
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
function collectionSort(sortFn = defaultSort) {
  const tdHandle = getTrackedDataHandle(this);
  assert(tdHandle, "collectionSort missing tdHandle");
  let indexes = null;
  if (tdHandle.emitter) {
    indexes = tdHandle.target.map((_unused, index) => index).sort((a, b) => sortFn(tdHandle.target[a], tdHandle.target[b]));
  }
  tdHandle.target.sort(sortFn);
  if (indexes) {
    tdHandle.emitter.addEvent({
      type: 2 /* SORT */,
      from: 0,
      indexes
    });
  }
  for (let i = 0; i < tdHandle.target.length; ++i) {
    const field2 = tdHandle.fieldMap.get(i.toString());
    field2?.set(tdHandle.target[i]);
  }
  return this;
}
function collectionReverse() {
  const tdHandle = getTrackedDataHandle(this);
  assert(tdHandle, "collectionReverse missing tdHandle");
  tdHandle.target.reverse();
  if (tdHandle.emitter) {
    const indexes = [];
    for (let i = tdHandle.target.length - 1; i >= 0; --i) {
      indexes.push(i);
    }
    tdHandle.emitter.addEvent({
      type: 2 /* SORT */,
      from: 0,
      indexes
    });
  }
  for (let i = 0; i < tdHandle.target.length; ++i) {
    const field2 = tdHandle.fieldMap.get(i.toString());
    field2?.set(tdHandle.target[i]);
  }
  return this;
}
function mapView(fn, debugName) {
  return makeFlatMapView(this, (item) => [fn(item)], debugName);
}
function filterView(fn, debugName) {
  return makeFlatMapView(this, (item) => fn(item) ? [item] : [], debugName);
}
function flatMapView(fn, debugName) {
  return makeFlatMapView(this, fn, debugName);
}
function makeFlatMapView(sourceCollection, flatMap, debugName) {
  const sourceTDHandle = getTrackedDataHandle(sourceCollection);
  assert(sourceTDHandle, "missing tdHandle");
  const slotSizes = [];
  const initialTransform = [];
  untrackReads(() => {
    for (const item of sourceCollection) {
      const slot = flatMap(item);
      slotSizes.push(slot.length);
      initialTransform.push(...slot);
    }
  });
  const derivedCollection = makeTrackedData(initialTransform, ViewHandler, makeViewPrototype(), sourceTDHandle.emitter, (target, event) => arrayEventFlatMap(slotSizes, flatMap, initialTransform, event), debugName ?? "derived");
  return derivedCollection.revocable.proxy;
}
function viewAlive() {
  const tdHandle = getTrackedDataHandle(this);
  assert(tdHandle, "missing tdHandle");
  assert(tdHandle.consumer, "missing tdHandle consumer");
  retain(tdHandle.consumer);
}
function viewDead() {
  const tdHandle = getTrackedDataHandle(this);
  assert(tdHandle, "missing tdHandle");
  assert(tdHandle.consumer, "missing tdHandle consumer");
  release(tdHandle.consumer);
}

// src/rendernode.tsx
var ContextType = Symbol("context");
function createContext(val) {
  const contextBody = {
    _type: ContextType,
    _get: () => val
  };
  const context = Object.assign(({
    value,
    children
  }) => {
    return new ContextRenderNode(context, value, renderJSXChildren(children));
  }, contextBody);
  return context;
}
function readContext(contextMap, context) {
  if (contextMap.has(context))
    return contextMap.get(context);
  return context._get();
}
var RenderNodeType = Symbol("rendernode");
var _a3, _b3, _c3, _d;
var EmptyRenderNode = class {
  constructor() {
    __publicField(this, "_type", RenderNodeType);
    __publicField(this, "detach", noop);
    __publicField(this, "attach", noop);
    __publicField(this, "setContext", noop);
    __publicField(this, "onMount", noop);
    __publicField(this, "onUnmount", noop);
    __publicField(this, _a3);
    __publicField(this, _b3);
    __publicField(this, _c3, noop);
    __publicField(this, _d, noop);
    this[SymDebugName] = "empty";
    this[SymRefcount] = 0;
  }
  retain() {
    retain(this);
  }
  release() {
    release(this);
  }
};
_a3 = SymDebugName, _b3 = SymRefcount, _c3 = SymAlive, _d = SymDead;
var emptyRenderNode = new EmptyRenderNode();
var _a4, _b4, _c4, _d2;
var TextRenderNode = class {
  constructor(string, debugName) {
    __publicField(this, "_type", RenderNodeType);
    __publicField(this, "text");
    __publicField(this, "isAttached");
    __publicField(this, "setContext", noop);
    __publicField(this, "onMount", noop);
    __publicField(this, "onUnmount", noop);
    __publicField(this, _a4);
    __publicField(this, _b4);
    __publicField(this, _c4, noop);
    __publicField(this, _d2, noop);
    this.text = document.createTextNode(string);
    this.isAttached = false;
    this[SymDebugName] = debugName ?? "text";
    this[SymRefcount] = 0;
  }
  detach(emitter) {
    emitter({ type: 0 /* SPLICE */, index: 0, count: 1 });
    this.isAttached = false;
  }
  attach(emitter) {
    assert(!this.isAttached, "Invariant: TextRenderNode 0 double attached");
    emitter({
      type: 0 /* SPLICE */,
      index: 0,
      count: 0,
      items: [this.text]
    });
    this.isAttached = true;
  }
  retain() {
    retain(this);
  }
  release() {
    release(this);
  }
};
_a4 = SymDebugName, _b4 = SymRefcount, _c4 = SymAlive, _d2 = SymDead;
var _a5, _b5, _c5, _d3;
var ForeignRenderNode = class {
  constructor(node, debugName) {
    __publicField(this, "_type", RenderNodeType);
    __publicField(this, "node");
    __publicField(this, "setContext", noop);
    __publicField(this, "onMount", noop);
    __publicField(this, "onUnmount", noop);
    __publicField(this, _a5);
    __publicField(this, _b5);
    __publicField(this, _c5, noop);
    __publicField(this, _d3, noop);
    this.node = node;
    this[SymDebugName] = debugName ?? "foreign";
    this[SymRefcount] = 0;
  }
  detach(emitter) {
    emitter({ type: 0 /* SPLICE */, index: 0, count: 1 });
  }
  attach(emitter) {
    emitter({
      type: 0 /* SPLICE */,
      index: 0,
      count: 0,
      items: [this.node]
    });
  }
  retain() {
    retain(this);
  }
  release() {
    release(this);
  }
};
_a5 = SymDebugName, _b5 = SymRefcount, _c5 = SymAlive, _d3 = SymDead;
var _a6, _b6;
var ArrayRenderNode = class {
  constructor(children, debugName) {
    __publicField(this, "_type", RenderNodeType);
    __publicField(this, "children");
    __publicField(this, "slotSizes");
    __publicField(this, _a6);
    __publicField(this, _b6);
    this.children = children;
    this.slotSizes = children.map(() => 0);
    this[SymDebugName] = debugName ?? "array";
    this[SymRefcount] = 0;
  }
  detach(emitter) {
    for (const [index, child] of this.children.entries()) {
      child.detach((event) => {
        shiftEvent(this.slotSizes, index, event);
        emitter(event);
      });
    }
  }
  attach(emitter) {
    for (const [index, child] of this.children.entries()) {
      child.attach((event) => {
        shiftEvent(this.slotSizes, index, event);
        emitter(event);
      });
    }
  }
  setContext(context) {
    for (const child of this.children) {
      child.setContext(context);
    }
  }
  onMount() {
    for (const child of this.children) {
      child.onMount();
    }
  }
  onUnmount() {
    for (const child of this.children) {
      child.onUnmount();
    }
  }
  retain() {
    retain(this);
  }
  release() {
    release(this);
  }
  [(_a6 = SymDebugName, _b6 = SymRefcount, SymAlive)]() {
    for (const child of this.children) {
      retain(child);
    }
  }
  [SymDead]() {
    for (const child of this.children) {
      release(child);
    }
  }
};
var HTML_NAMESPACE = "http://www.w3.org/1999/xhtml";
var SVG_NAMESPACE = "http://www.w3.org/2000/svg";
var MATHML_NAMESPACE = "http://www.w3.org/1998/Math/MathML";
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
var XmlNamespaceContext = createContext(HTML_NAMESPACE);
var _a7, _b7;
var IntrinsicRenderNode = class {
  constructor(elementOrTagName, props, children, debugName) {
    __publicField(this, "_type", RenderNodeType);
    __publicField(this, "tagName");
    __publicField(this, "element");
    __publicField(this, "isPreexisting");
    __publicField(this, "isPreexistingPopulated");
    __publicField(this, "emitter");
    __publicField(this, "xmlNamespace");
    __publicField(this, "childXmlNamespace");
    __publicField(this, "existingOffset");
    __publicField(this, "props");
    __publicField(this, "arrayRenderNode");
    __publicField(this, "calculations");
    __publicField(this, "calculationSubscriptions");
    __publicField(this, "handleEvent", (event) => {
      assert(this.element, "missing element");
      switch (event.type) {
        case 0 /* SPLICE */: {
          for (let i = 0; i < event.count; ++i) {
            this.element.removeChild(this.element.childNodes[this.existingOffset + event.index]);
          }
          const referenceNode = event.index < this.element.childNodes.length ? this.element.childNodes[this.existingOffset + event.index] : null;
          if (event.items) {
            for (let i = event.items.length - 1; i >= 0; --i) {
              this.element.insertBefore(event.items[i], referenceNode);
            }
          }
          break;
        }
        case 1 /* MOVE */: {
          const toMove = [];
          for (let i = 0; i < event.count; ++i) {
            const node = this.element.childNodes[this.existingOffset + event.from];
            this.element.removeChild(node);
            toMove.push(node);
          }
          const referenceNode = event.to < this.element.childNodes.length ? this.element.childNodes[this.existingOffset + event.to] : null;
          for (const node of toMove) {
            this.element.insertBefore(node, referenceNode);
          }
          break;
        }
        case 2 /* SORT */: {
          const unsorted = [];
          for (let i = 0; i < event.indexes.length; ++i) {
            const node = this.element.childNodes[this.existingOffset + event.from];
            this.element.removeChild(node);
            unsorted.push(node);
          }
          const referenceNode = event.from < this.element.childNodes.length ? this.element.childNodes[this.existingOffset + event.from] : null;
          for (const index of event.indexes) {
            this.element.insertBefore(unsorted[index - event.from], referenceNode);
          }
          break;
        }
        default:
          assertExhausted(event);
      }
    });
    __publicField(this, _a7);
    __publicField(this, _b7);
    this.emitter = null;
    this.props = props;
    this.arrayRenderNode = new ArrayRenderNode(children);
    if (typeof elementOrTagName !== "string") {
      this.isPreexisting = true;
      this.isPreexistingPopulated = false;
      this.element = elementOrTagName;
      this.tagName = this.element.tagName;
      this.existingOffset = elementOrTagName.childNodes.length;
    } else {
      this.isPreexisting = false;
      this.isPreexistingPopulated = false;
      this.element = null;
      this.tagName = elementOrTagName;
      this.existingOffset = 0;
    }
    this.xmlNamespace = null;
    this.childXmlNamespace = null;
    this[SymDebugName] = debugName ?? `intrinsic:${this.tagName}`;
    this[SymRefcount] = 0;
  }
  createElement(xmlNamespace) {
    const element = document.createElementNS(xmlNamespace, this.tagName);
    if (this.props) {
      for (const [prop, val] of Object.entries(this.props)) {
        if (prop === "ref")
          continue;
        if (prop.startsWith("on:capture:")) {
          element.addEventListener(prop.slice(3), val, {
            capture: true
          });
          continue;
        }
        if (prop.startsWith("on:passive:")) {
          element.addEventListener(prop.slice(3), val, {
            passive: true
          });
          continue;
        }
        if (prop.startsWith("on:")) {
          element.addEventListener(prop.slice(3), val);
          continue;
        }
        if (isCalcUnsubscribe(val) || isCalculation(val)) {
          if (!this.calculations) {
            this.calculations = /* @__PURE__ */ new Map();
          }
          this.calculations.set(prop, isCalculation(val) ? val : val.calculation);
        } else {
          this.setProp(element, prop, val);
        }
      }
      if (this.calculations) {
        if (!this.calculationSubscriptions) {
          this.calculationSubscriptions = /* @__PURE__ */ new Set();
        }
        for (const [prop, calculation] of this.calculations.entries()) {
          retain(calculation);
          markRoot(calculation);
          const currentVal = calculation();
          this.setProp(element, prop, currentVal);
          this.calculationSubscriptions.add(calculation.onRecalc((updatedVal) => {
            this.setProp(element, prop, updatedVal);
          }));
        }
      }
    }
    return element;
  }
  setProp(element, prop, val) {
    const mapping = getElementTypeMapping(this.tagName, prop);
    if (mapping) {
      if (mapping.makeAttrValue !== null) {
        const attributeValue = mapping.makeAttrValue ? mapping.makeAttrValue(val) : val;
        if (attributeValue === void 0 || attributeValue === null || attributeValue === false) {
          element.removeAttribute(prop);
        } else if (attributeValue === true) {
          element.setAttribute(prop, "");
        } else {
          element.setAttribute(prop, attributeValue);
        }
      }
      if (mapping.idlName !== null) {
        const idlValue = mapping.makeIdlValue ? mapping.makeIdlValue(val) : val;
        element[mapping.idlName ?? prop] = idlValue;
      }
    } else if (val === false || val === void 0 || val === null) {
      element.removeAttribute(prop);
    } else if (val === true) {
      element.setAttribute(prop, "");
    } else if (typeof val === "string" || typeof val === "number") {
      element.setAttribute(prop, val.toString());
    }
  }
  detach(emitter) {
    emitter({
      type: 0 /* SPLICE */,
      index: 0,
      count: 1
    });
    this.emitter = null;
  }
  attach(emitter) {
    assert(!this.emitter, "Invariant: RenderNode 0 double attached");
    this.emitter = emitter;
    assert(this.element, "Invariant: attached without context");
    emitter({
      type: 0 /* SPLICE */,
      index: 0,
      count: 0,
      items: [this.element]
    });
  }
  setContext(context) {
    const parentXmlNamespace = readContext(context, XmlNamespaceContext);
    const namespaceTransition = elementNamespaceTransitionMap[parentXmlNamespace]?.[this.tagName];
    const xmlNamespace = namespaceTransition?.node ?? parentXmlNamespace;
    const childXmlNamespace = namespaceTransition?.children ?? parentXmlNamespace;
    const needsNewElement = !this.isPreexisting && (!this.element || xmlNamespace !== this.xmlNamespace);
    if (needsNewElement) {
      this.xmlNamespace = xmlNamespace;
      const element = this.createElement(xmlNamespace);
      if (this.element) {
        const length = this.element.childNodes.length;
        for (let i = this.existingOffset; i < length; ++i) {
          const node = this.element.childNodes[i];
          this.element.removeChild(node);
          element.appendChild(node);
        }
        if (this.emitter) {
          this.emitter({
            type: 0 /* SPLICE */,
            index: 0,
            count: 1
          });
        }
      }
      this.element = element;
      this.existingOffset = 0;
      if (this.emitter) {
        this.emitter({
          type: 0 /* SPLICE */,
          index: 0,
          count: 0,
          items: [this.element]
        });
      }
    }
    if (needsNewElement || this.isPreexisting && !this.isPreexistingPopulated) {
      let subContext = context;
      if (parentXmlNamespace !== childXmlNamespace) {
        subContext = new Map(context);
        subContext.set(XmlNamespaceContext, childXmlNamespace);
      }
      this.arrayRenderNode.setContext(subContext);
      this.arrayRenderNode.attach(this.handleEvent);
      if (this.isPreexisting) {
        this.isPreexistingPopulated = true;
      }
    }
  }
  onMount() {
    this.arrayRenderNode.onMount();
    const ref2 = this.props?.ref;
    if (ref2) {
      if (ref2 instanceof RefObject) {
        ref2.current = this.element;
      } else if (typeof ref2 === "function") {
        ref2(this.element);
      }
    }
  }
  onUnmount() {
    const ref2 = this.props?.ref;
    if (ref2) {
      if (ref2 instanceof RefObject) {
        ref2.current = void 0;
      } else if (typeof ref2 === "function") {
        ref2(void 0);
      }
    }
    this.arrayRenderNode.onUnmount();
  }
  retain() {
    retain(this);
  }
  release() {
    release(this);
  }
  [(_a7 = SymDebugName, _b7 = SymRefcount, SymAlive)]() {
    retain(this.arrayRenderNode);
  }
  [SymDead]() {
    if (this.calculations) {
      for (const calculation of this.calculations.values()) {
        unmarkRoot(calculation);
        release(calculation);
      }
    }
    if (this.calculationSubscriptions) {
      for (const unsubscribe of this.calculationSubscriptions) {
        unsubscribe();
      }
      this.calculationSubscriptions.clear();
    }
    this.arrayRenderNode.detach(this.handleEvent);
    release(this.arrayRenderNode);
    if (!this.isPreexisting) {
      this.element = null;
    }
  }
};
var _a8, _b8;
var CalculationRenderNode = class {
  constructor(calculation, debugName) {
    __publicField(this, "_type", RenderNodeType);
    __publicField(this, "renderNode");
    __publicField(this, "calculation");
    __publicField(this, "calculationSubscription");
    __publicField(this, "context");
    __publicField(this, "isMounted");
    __publicField(this, "emitter");
    __publicField(this, "isCalculatedPendingAdd");
    __publicField(this, "renderCalculation", (val) => {
      this.cleanPrior();
      const renderNode = renderJSXNode(val);
      this.isCalculatedPendingAdd = true;
      afterFlush(() => {
        this.isCalculatedPendingAdd = false;
        this.renderNode = renderNode;
        retain(this.renderNode);
        if (this.context) {
          renderNode.setContext(this.context);
        }
        if (this.emitter) {
          renderNode.attach(this.emitter);
        }
        if (this.isMounted) {
          renderNode.onMount();
        }
      });
    });
    __publicField(this, _a8);
    __publicField(this, _b8);
    this.calculation = calculation;
    this.calculationSubscription = null;
    this.renderNode = null;
    this.context = null;
    this.isMounted = false;
    this.emitter = null;
    this.isCalculatedPendingAdd = false;
    this[SymDebugName] = debugName ?? `rendercalc:${calculation[SymDebugName]}`;
    this[SymRefcount] = 0;
  }
  detach(emitter) {
    assert(this.renderNode, "Invariant: missing calculation result");
    this.renderNode.detach(emitter);
    this.emitter = null;
  }
  attach(emitter) {
    assert(this.renderNode || this.isCalculatedPendingAdd, "Invariant: missing calculation result");
    this.emitter = emitter;
    if (this.renderNode) {
      this.renderNode.attach(emitter);
    }
  }
  setContext(context) {
    this.context = context;
    if (!this.renderNode && !this.isCalculatedPendingAdd) {
      this.renderCalculation(this.calculation());
      this.calculationSubscription = this.calculation.onRecalc(this.renderCalculation);
    } else if (this.renderNode) {
      this.renderNode.setContext(context);
    }
  }
  onMount() {
    assert(this.renderNode || this.isCalculatedPendingAdd, "Invariant: missing calculation result");
    this.isMounted = true;
    if (this.renderNode) {
      this.renderNode.onMount();
    }
  }
  onUnmount() {
    assert(this.renderNode, "Invariant: missing calculation result");
    this.renderNode.onUnmount();
    this.isMounted = false;
  }
  retain() {
    retain(this);
  }
  release() {
    release(this);
  }
  cleanPrior() {
    if (this.renderNode) {
      if (this.isMounted) {
        this.renderNode.onUnmount();
      }
      if (this.emitter) {
        this.renderNode.detach(this.emitter);
      }
      release(this.renderNode);
      this.renderNode = null;
    }
  }
  [(_a8 = SymDebugName, _b8 = SymRefcount, SymAlive)]() {
    retain(this.calculation);
    markRoot(this.calculation);
  }
  [SymDead]() {
    unmarkRoot(this.calculation);
    release(this.calculation);
    this.cleanPrior();
    this.emitter = null;
  }
};
var _a9, _b9;
var CollectionRenderNode = class {
  constructor(collection2, debugName) {
    __publicField(this, "_type", RenderNodeType);
    __publicField(this, "children");
    __publicField(this, "childIndex");
    __publicField(this, "childrenNodes");
    __publicField(this, "slotSizes");
    __publicField(this, "collection");
    __publicField(this, "unsubscribe");
    __publicField(this, "context");
    __publicField(this, "isMounted");
    __publicField(this, "emitter");
    __publicField(this, "handleCollectionEvent", (event) => {
      assert(this.context, "Invariant: missing context");
      switch (event.type) {
        case 0 /* SPLICE */: {
          const newChildren = [];
          if (event.items) {
            for (const [index, item] of event.items.entries()) {
              const child = renderJSXNode(item);
              newChildren.push(child);
              this.childIndex.set(child, event.index + index);
            }
          }
          const removed = this.children.splice(event.index, event.count, ...newChildren);
          for (const child of removed) {
            if (this.isMounted) {
              child.onUnmount();
            }
            if (this.emitter) {
              const emitter = this.emitter;
              child.detach((event2) => this.handleChildEvent(emitter, event2, child));
            }
            release(child);
          }
          this.slotSizes.splice(event.index, event.count, ...newChildren.map(() => 0));
          for (const child of newChildren) {
            retain(child);
            if (this.emitter) {
              const emitter = this.emitter;
              child.setContext(this.context);
              child.attach((event2) => this.handleChildEvent(emitter, event2, child));
            }
            if (this.isMounted) {
              child.onMount();
            }
          }
          if (newChildren.length !== event.count) {
            for (let i = event.index + newChildren.length; i < this.children.length; ++i) {
              this.childIndex.set(this.children[i], i);
            }
          }
          break;
        }
        case 1 /* MOVE */: {
          if (!this.emitter)
            return;
          const slotStartIndex = [];
          let realIndex = 0;
          for (const slotSize of this.slotSizes) {
            slotStartIndex.push(realIndex);
            realIndex += slotSize;
          }
          let realCount = 0;
          for (let i = 0; i < event.count; ++i) {
            realCount += this.slotSizes[event.from + i];
          }
          applyEvent(this.slotSizes, event);
          event.from = slotStartIndex[event.from];
          event.count = realCount;
          event.to = slotStartIndex[event.to];
          this.emitter(event);
          break;
        }
        case 2 /* SORT */: {
          if (!this.emitter)
            return;
          let realFrom = 0;
          for (let i = 0; i < event.from; ++i) {
            realFrom += this.slotSizes[i];
          }
          const nestedIndexes = [];
          let index = 0;
          for (let i = 0; i < this.slotSizes.length; ++i) {
            const slotIndexes = [];
            for (let j = 0; j < this.slotSizes[i]; ++j) {
              slotIndexes.push(index);
              index += 1;
            }
            nestedIndexes.push(slotIndexes);
          }
          applyEvent(this.slotSizes, event);
          applyEvent(nestedIndexes, event);
          const sortedIndexes = nestedIndexes.slice(event.from).flat();
          event.from = realFrom;
          event.indexes = sortedIndexes;
          this.emitter(event);
          break;
        }
      }
    });
    __publicField(this, _a9);
    __publicField(this, _b9);
    this.collection = collection2;
    this.children = [];
    this.childIndex = /* @__PURE__ */ new Map();
    this.childrenNodes = [];
    this.slotSizes = [];
    this.context = null;
    this.isMounted = false;
    this.emitter = null;
    this[SymDebugName] = debugName ?? `rendercoll`;
    this[SymRefcount] = 0;
  }
  detach(emitter) {
    for (const child of this.children) {
      child.detach((event) => {
        this.handleChildEvent(emitter, event, child);
      });
    }
    this.emitter = null;
  }
  attach(emitter) {
    this.emitter = emitter;
    for (const child of this.children) {
      child.attach((event) => {
        this.handleChildEvent(emitter, event, child);
      });
    }
  }
  handleChildEvent(emitter, event, child) {
    const index = this.childIndex.get(child);
    shiftEvent(this.slotSizes, index, event);
    applyEvent(this.childrenNodes, event);
    emitter(event);
  }
  setContext(context) {
    this.context = context;
    untrackReads(() => {
      for (const [index, item] of this.collection.entries()) {
        this.slotSizes.push(0);
        const child = renderJSXNode(item);
        retain(child);
        this.children.push(child);
        this.childIndex.set(child, index);
      }
    });
    for (const child of this.children) {
      child.setContext(context);
    }
  }
  onMount() {
    this.isMounted = true;
    for (const child of this.children) {
      child.onMount();
    }
  }
  onUnmount() {
    for (const child of this.children) {
      child.onUnmount();
    }
    this.isMounted = false;
  }
  retain() {
    retain(this);
  }
  release() {
    release(this);
  }
  [(_a9 = SymDebugName, _b9 = SymRefcount, SymAlive)]() {
    retain(this.collection);
    this.unsubscribe = this.collection.subscribe(this.handleCollectionEvent);
  }
  [SymDead]() {
    this.unsubscribe?.();
    release(this.collection);
  }
};
function isCalculationRenderNode(val) {
  return isCalculation(val);
}
function isCollectionOrViewRenderNode(val) {
  return isCollection(val) || isView(val);
}
function isRenderNode(val) {
  return val && val._type === RenderNodeType;
}
function renderJSXNode(jsxNode) {
  if (isRenderNode(jsxNode)) {
    return jsxNode;
  }
  if (isCalculationRenderNode(jsxNode)) {
    return new CalculationRenderNode(jsxNode);
  }
  if (isCollectionOrViewRenderNode(jsxNode)) {
    return new CollectionRenderNode(jsxNode);
  }
  if (jsxNode instanceof Element) {
    return new ForeignRenderNode(jsxNode);
  }
  if (Array.isArray(jsxNode)) {
    return new ArrayRenderNode(jsxNode.map((item) => renderJSXNode(item)));
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
    return new TextRenderNode(jsxNode);
  }
  if (typeof jsxNode === "number" || typeof jsxNode === "bigint") {
    return new TextRenderNode(jsxNode.toString());
  }
  warn("Unexpected JSX node type, rendering nothing", jsxNode);
  return emptyRenderNode;
}
function renderJSXChildren(children) {
  const childRenderNodes = [];
  if (children) {
    if (Array.isArray(children) && !isCollection(children) && !isView(children)) {
      for (const child of children) {
        childRenderNodes.push(renderJSXNode(child));
      }
    } else {
      childRenderNodes.push(renderJSXNode(children));
    }
  }
  return childRenderNodes;
}
function mount(target, node) {
  const root = new IntrinsicRenderNode(target, void 0, [node], "root");
  const context = /* @__PURE__ */ new Map();
  retain(root);
  root.setContext(context);
  root.attach(noop);
  root.onMount();
  return () => {
    root.onUnmount();
    root.detach(noop);
    release(root);
  };
}
var _a10, _b10;
var LifecycleObserverRenderNode = class {
  constructor(nodeCallback, elementCallback, children, debugName) {
    __publicField(this, "_type", RenderNodeType);
    __publicField(this, "nodeCallback");
    __publicField(this, "elementCallback");
    __publicField(this, "child");
    __publicField(this, "childNodes");
    __publicField(this, _a10);
    __publicField(this, _b10);
    this.nodeCallback = nodeCallback;
    this.elementCallback = elementCallback;
    this.child = new ArrayRenderNode(children);
    this.childNodes = [];
    this[SymDebugName] = debugName ?? `lifecycleobserver`;
    this[SymRefcount] = 0;
  }
  handleEvent(emitter, event) {
    if (event.type === 0 /* SPLICE */) {
      for (let i = 0; i < event.count; ++i) {
        const node = this.childNodes[event.index + i];
        this.nodeCallback?.(node, "remove" /* REMOVE */);
        if (node instanceof Element) {
          this.elementCallback?.(node, "remove" /* REMOVE */);
        }
      }
      if (event.items) {
        for (const node of event.items) {
          this.nodeCallback?.(node, "add" /* ADD */);
          if (node instanceof Element) {
            this.elementCallback?.(node, "add" /* ADD */);
          }
        }
      }
    }
    applyEvent(this.childNodes, event);
    emitter(event);
  }
  detach(emitter) {
    this.child.detach((event) => {
      this.handleEvent(emitter, event);
    });
  }
  attach(emitter) {
    this.child.attach((event) => {
      this.handleEvent(emitter, event);
    });
  }
  setContext(context) {
    this.child.setContext(context);
  }
  onMount() {
    this.child.onMount();
  }
  onUnmount() {
    this.child.onUnmount();
  }
  retain() {
    retain(this);
  }
  release() {
    release(this);
  }
  [(_a10 = SymDebugName, _b10 = SymRefcount, SymAlive)]() {
    retain(this.child);
  }
  [SymDead]() {
    release(this.child);
  }
};
function LifecycleObserver({
  nodeCallback,
  elementCallback,
  children
}) {
  return new LifecycleObserverRenderNode(nodeCallback, elementCallback, renderJSXChildren(children));
}
var _a11, _b11, _c6;
var ComponentRenderNode = class {
  constructor(Component2, props, children, debugName) {
    __publicField(this, "_type", RenderNodeType);
    __publicField(this, "Component");
    __publicField(this, "props");
    __publicField(this, "children");
    __publicField(this, "result");
    __publicField(this, "onMountCallbacks");
    __publicField(this, "onUnmountCallbacks");
    __publicField(this, "onContextCallbacks");
    __publicField(this, "owned");
    __publicField(this, "effects");
    __publicField(this, _a11);
    __publicField(this, _b11);
    __publicField(this, _c6, noop);
    this.Component = Component2;
    this.props = props;
    this.children = children;
    this.owned = /* @__PURE__ */ new Set();
    this.result = null;
    this[SymDebugName] = debugName ?? `component`;
    this[SymRefcount] = 0;
  }
  detach(emitter) {
    assert(this.result, "Invariant: missing context");
    this.result.detach(emitter);
  }
  attach(emitter) {
    assert(this.result, "Invariant: missing context");
    this.result.attach(emitter);
  }
  setContext(contextMap) {
    assert(this[SymRefcount] > 0, "Invariant: dead ComponentRenderNode called setContext");
    if (!this.result) {
      let callbacksAllowed = true;
      const lifecycle = {
        onMount: (handler) => {
          assert(callbacksAllowed, "onMount must be called in component body");
          if (!this.onMountCallbacks)
            this.onMountCallbacks = [];
          this.onMountCallbacks.push(handler);
        },
        onUnmount: (handler) => {
          assert(callbacksAllowed, "onUnmount must be called in component body");
          if (!this.onUnmountCallbacks)
            this.onUnmountCallbacks = [];
          this.onUnmountCallbacks.push(handler);
        },
        onEffect: (handler, debugName) => {
          assert(callbacksAllowed, "onUnmount must be called in component body");
          if (!this.effects)
            this.effects = [];
          this.effects.push(effect(handler, debugName));
        },
        onContext: (context, handler) => {
          assert(callbacksAllowed, "onContext must be called in component body");
          if (!this.onContextCallbacks)
            this.onContextCallbacks = /* @__PURE__ */ new Map();
          let callbacks = this.onContextCallbacks.get(context);
          if (!callbacks) {
            callbacks = [];
            this.onContextCallbacks.set(context, callbacks);
          }
          callbacks.push(handler);
        }
      };
      let componentProps;
      const Component2 = this.Component;
      const children = this.children;
      const props = this.props;
      if (children.length === 0) {
        componentProps = props || {};
      } else if (children.length === 1) {
        componentProps = props ? { ...props, children: children[0] } : { children: children[0] };
      } else {
        componentProps = props ? { ...props, children } : { children };
      }
      const jsxResult = trackCreates(this.owned, () => Component2(componentProps, lifecycle) || emptyRenderNode);
      callbacksAllowed = false;
      this.result = renderJSXNode(jsxResult);
      retain(this.result);
      for (const item of this.owned) {
        retain(item);
      }
      if (this.effects) {
        for (const eff of this.effects) {
          markRoot(eff);
          eff();
        }
      }
    }
    this.result.setContext(contextMap);
    if (this.onContextCallbacks) {
      for (const [
        Context,
        callbacks
      ] of this.onContextCallbacks.entries()) {
        const value = contextMap.has(Context) ? contextMap.get(Context) : Context._get();
        for (const callback of callbacks) {
          callback(value);
        }
      }
    }
  }
  onMount() {
    assert(this.result, "Invariant: missing context");
    this.result.onMount();
    if (this.onMountCallbacks) {
      for (const callback of this.onMountCallbacks) {
        callback();
      }
    }
  }
  onUnmount() {
    assert(this.result, "Invariant: missing context");
    this.result.onUnmount();
    if (this.onUnmountCallbacks) {
      for (const callback of this.onUnmountCallbacks) {
        callback();
      }
    }
  }
  retain() {
    retain(this);
  }
  release() {
    release(this);
  }
  [(_a11 = SymDebugName, _b11 = SymRefcount, _c6 = SymAlive, SymDead)]() {
    assert(this.result, "Invariant: missing context");
    release(this.result);
    if (this.effects) {
      for (const eff of this.effects) {
        unmarkRoot(eff);
      }
    }
    for (const item of this.owned) {
      release(item);
    }
  }
};
var _a12, _b12;
var ContextRenderNode = class {
  constructor(context, value, children, debugName) {
    __publicField(this, "_type", RenderNodeType);
    __publicField(this, "child");
    __publicField(this, "context");
    __publicField(this, "value");
    __publicField(this, _a12);
    __publicField(this, _b12);
    this.context = context;
    this.value = value;
    this.child = new ArrayRenderNode(children);
    this[SymDebugName] = debugName ?? `context`;
    this[SymRefcount] = 0;
  }
  detach(emitter) {
    this.child.detach(emitter);
  }
  attach(emitter) {
    this.child.attach(emitter);
  }
  setContext(context) {
    const derivedContext = new Map(context);
    derivedContext.set(this.context, this.value);
    this.child.setContext(derivedContext);
  }
  onMount() {
    this.child.onMount();
  }
  onUnmount() {
    this.child.onUnmount();
  }
  retain() {
    retain(this);
  }
  release() {
    release(this);
  }
  [(_a12 = SymDebugName, _b12 = SymRefcount, SymAlive)]() {
    retain(this.child);
  }
  [SymDead]() {
    release(this.child);
  }
};

// src/view.ts
var Fragment = ({
  children
}) => new ArrayRenderNode(renderJSXChildren(children));
function createElement(type, props, ...children) {
  if (typeof type === "string") {
    const childNodes = [];
    for (const jsxNode of children) {
      childNodes.push(renderJSXNode(jsxNode));
    }
    return new IntrinsicRenderNode(type, props, childNodes);
  }
  return new ComponentRenderNode(type, props, children);
}
createElement.Fragment = Fragment;

// src/model.ts
var ModelPrototype = {
  [SymDebugName]: "",
  [SymRefcount]: 0,
  [SymAlive]: noop,
  [SymDead]: noop
};
function model(target, debugName) {
  const proxyHandler = {
    get: (dataAccessor, emitter, prop, receiver) => dataAccessor.get(prop, receiver),
    has: (dataAccessor, emitter, prop) => dataAccessor.has(prop),
    set: (dataAccessor, emitter, prop, value, receiver) => {
      if (typeof prop === "string") {
        if (dataAccessor.peekHas(prop)) {
          emitter({ type: 1 /* SET */, prop, value });
        } else {
          emitter({ type: 0 /* ADD */, prop, value });
        }
      }
      return dataAccessor.set(prop, value, receiver);
    },
    delete: (dataAccessor, emitter, prop) => {
      if (typeof prop === "string" && dataAccessor.peekHas(prop)) {
        emitter({ type: 2 /* DEL */, prop });
      }
      return dataAccessor.delete(prop);
    }
  };
  const modelInterface = makeTrackedData(target, proxyHandler, ModelPrototype, null, null, debugName);
  return modelInterface.revocable.proxy;
}
model.keys = function modelKeys(sourceModel, debugName) {
  const sourceTDHandle = getTrackedDataHandle(sourceModel);
  assert(sourceTDHandle, "missing tdHandle");
  const initialKeys = Object.keys(sourceModel);
  const derivedCollection = makeTrackedData(initialKeys, ViewHandler, makeViewPrototype(), sourceTDHandle.emitter, keysHandler, debugName);
  return derivedCollection.revocable.proxy;
};
function* keysHandler(target, event) {
  switch (event.type) {
    case 2 /* DEL */: {
      const index = target.indexOf(event.prop);
      if (index !== -1) {
        target.splice(index, 1);
        yield {
          type: 0 /* SPLICE */,
          index,
          count: 1,
          items: []
        };
      }
      break;
    }
    case 0 /* ADD */: {
      const length = target.length;
      target.push(event.prop);
      yield {
        type: 0 /* SPLICE */,
        index: length,
        count: 0,
        items: [event.prop]
      };
      break;
    }
    case 1 /* SET */:
      break;
    default:
      assertExhausted(event);
  }
}

// src/index.ts
var src_default = createElement;
var VERSION = true ? "0.6.6" : "development";
export {
  CalculationErrorType,
  Fragment,
  InvariantError,
  LifecycleObserver,
  VERSION,
  calc,
  collection,
  createContext,
  createElement,
  debug2 as debug,
  debugSubscribe,
  src_default as default,
  effect,
  flush,
  getLogLevel,
  markRoot,
  model,
  mount,
  ref,
  release,
  reset,
  retain,
  setLogLevel,
  subscribe,
  unmarkRoot
};
//# sourceMappingURL=index.debug.mjs.map
