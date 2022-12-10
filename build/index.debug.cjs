var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __markAsModule = (target) => __defProp(target, "__esModule", { value: true });
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __reExport = (target, module2, copyDefault, desc) => {
  if (module2 && typeof module2 === "object" || typeof module2 === "function") {
    for (let key of __getOwnPropNames(module2))
      if (!__hasOwnProp.call(target, key) && (copyDefault || key !== "default"))
        __defProp(target, key, { get: () => module2[key], enumerable: !(desc = __getOwnPropDesc(module2, key)) || desc.enumerable });
  }
  return target;
};
var __toCommonJS = /* @__PURE__ */ ((cache) => {
  return (module2, temp) => {
    return cache && cache.get(module2) || (temp = __reExport(__markAsModule({}), module2, 1), cache && cache.set(module2, temp), temp);
  };
})(typeof WeakMap !== "undefined" ? /* @__PURE__ */ new WeakMap() : 0);

// src/index.ts
var src_exports = {};
__export(src_exports, {
  ArrayEventType: () => ArrayEventType,
  CalculationErrorType: () => CalculationErrorType,
  ClassComponent: () => ClassComponent,
  Fragment: () => Fragment,
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
  debugSubscribe: () => debugSubscribe,
  default: () => src_default,
  field: () => field,
  flush: () => flush,
  getLogLevel: () => getLogLevel,
  model: () => model,
  mount: () => mount,
  ref: () => ref,
  reset: () => reset,
  setLogLevel: () => setLogLevel,
  subscribe: () => subscribe
});

// src/types.ts
var InvariantError = class extends Error {
  constructor(msg, detail) {
    super(msg);
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
function wrapError(e, msg) {
  if (e instanceof Error)
    return e;
  const err = new Error(msg ?? "Unknown error", { cause: e });
  return err;
}

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
var VERTEX_BIT_CYCLE = 2;
var VERTEX_BIT_SELF_CYCLE = 4;
var VERTEX_BIT_CYCLE_INFORMED = 8;
var Graph = class {
  constructor(processHandler2) {
    this.addPostAction = (action) => {
      this.postActions.push(action);
    };
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
    this.forwardAdjacencyHard = [];
    this.forwardAdjacencyEither = [];
    this.reverseAdjacencyEither = [];
    this.postActions = [];
    this.startVertexIndex = 0;
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
    let index;
    if (this.availableIndices.length > 0) {
      index = this.availableIndices.pop();
    } else {
      index = this.topologicalOrdering.length;
      this.topologicalOrdering.length += 1;
    }
    this.topologicalIndexById[id] = index;
    this.topologicalOrdering[index] = id;
    this.forwardAdjacencyHard[id] = [];
    this.forwardAdjacencyEither[id] = [];
    this.reverseAdjacencyEither[id] = [];
  }
  removeVertex(vertex) {
    const id = this.vertexToId.get(vertex);
    assert(id, "double vertex removal");
    const index = this.topologicalIndexById[id];
    assert(index !== void 0, "malformed graph");
    assert(this.forwardAdjacencyEither[id].length === 0, "cannot remove vertex with forward edges");
    assert(this.reverseAdjacencyEither[id].length === 0, "cannot remove vertex with reverse edges");
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
      this.processHandler(vertex, 0 /* INVALIDATE */);
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
  addEdge(fromVertex, toVertex, kind) {
    const fromId = this.vertexToId.get(fromVertex);
    const toId = this.vertexToId.get(toVertex);
    assert(fromId, "addEdge from vertex not found");
    assert(toId, "addEdge to vertex not found");
    assert(!this.forwardAdjacencyEither[fromId].includes(toId), "addEdge duplicate");
    this.forwardAdjacencyEither[fromId].push(toId);
    this.reverseAdjacencyEither[toId].push(fromId);
    if (kind === 2 /* EDGE_HARD */) {
      this.forwardAdjacencyHard[fromId].push(toId);
    }
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
    assert(this.forwardAdjacencyEither[fromId].includes(toId), "removeEdge on edge that does not exist");
    removeUnordered(this.forwardAdjacencyEither[fromId], toId);
    removeUnordered(this.reverseAdjacencyEither[toId], fromId);
    if (kind === 2 /* EDGE_HARD */) {
      removeUnordered(this.forwardAdjacencyHard[fromId], toId);
    }
    if (fromId === toId) {
      this.vertexBitsById[fromId] = this.vertexBitsById[fromId] & ~VERTEX_BIT_SELF_CYCLE;
    }
    const fromCycleInfo = this.cycleInfoById[fromId];
    const toCycleInfo = this.cycleInfoById[toId];
    if (fromCycleInfo && toCycleInfo && fromCycleInfo === toCycleInfo) {
      this.toReorderIds.add(fromId);
      this.toReorderIds.add(toId);
    }
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
          delete this.cycleInfoById[vertexId];
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
    return this._processHandler(vertex, action, this.addPostAction);
  }
  processVertex(vertexId) {
    const vertex = this.vertexById[vertexId];
    assert(vertex, "nonexistent vertex dirtied");
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
    for (; ; ) {
      const vertexIndex = this.startVertexIndex;
      if (vertexIndex >= this.vertexById.length) {
        const postActions = this.postActions;
        this.postActions = [];
        for (const postAction of postActions) {
          postAction();
        }
        if (vertexIndex !== this.startVertexIndex) {
          continue;
        }
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
        const lowerBound = this.resort(this.toReorderIds);
        if (lowerBound < this.startVertexIndex) {
          this.startVertexIndex = lowerBound;
        }
        this.toReorderIds.clear();
      }
      if (recheckIds) {
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
      if (cycleInfo && !newCycleInfo) {
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
        this.clearVertexDirtyInner(vertexId);
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
      const hard = new Set(this.forwardAdjacencyHard[id] || []);
      if (this.forwardAdjacencyEither[id]) {
        for (const toId of this.forwardAdjacencyEither[id]) {
          if (hard.has(toId)) {
            lines.push(`  v_${id} -> v_${toId};`);
          } else {
            lines.push(`  v_${id} -> v_${toId} [style="dotted"];`);
          }
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
Graph.EDGE_SOFT = 1 /* EDGE_SOFT */;
Graph.EDGE_HARD = 2 /* EDGE_HARD */;
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
function removeUnordered(array, value) {
  if (value === array[array.length - 1]) {
    array.pop();
    return;
  }
  const index = array.indexOf(value);
  array[index] = array[array.length - 1];
  array.pop();
}

// src/engine.ts
function isProcessable(val) {
  return val && val.__processable === true;
}
var globalDependencyGraph = new Graph(processHandler);
var renderNodesToCommit = /* @__PURE__ */ new Set();
var trackReadSets = [];
var trackCreateSets = [];
var isFlushing = false;
var needsFlush = false;
var flushHandle = null;
var flushScheduler = defaultScheduler;
function noopScheduler(callback) {
  return noop;
}
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
function reset() {
  globalDependencyGraph = new Graph(processHandler);
  renderNodesToCommit = /* @__PURE__ */ new Set();
  trackReadSets = [];
  trackCreateSets = [];
  isFlushing = false;
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
    flushInner();
  });
}
function flush() {
  if (!needsFlush || isFlushing)
    return;
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
  debug("retain", retainable.__debugName, "was", retainable.__refcount);
  retainable.__refcount += 1;
  if (retainable.__refcount === 1) {
    retainable.__alive();
  }
}
function release(retainable) {
  debug("release", retainable.__debugName, "was", retainable.__refcount);
  assert(retainable.__refcount > 0, "double release");
  if (retainable.__refcount === 1) {
    retainable.__dead();
  }
  retainable.__refcount -= 1;
}
function processHandler(vertex, action, addPostAction) {
  debug("process", ProcessAction[action], vertex.__debugName, vertex);
  switch (action) {
    case 0 /* INVALIDATE */:
      return vertex.__invalidate?.() ?? false;
    case 1 /* RECALCULATE */:
      return vertex.__recalculate?.(addPostAction) ?? false;
    case 2 /* CYCLE */:
      return vertex.__cycle?.(addPostAction) ?? false;
    default:
      assertExhausted(action, "unknown action");
  }
}
function flushInner() {
  isFlushing = true;
  globalDependencyGraph.process();
  for (const renderNode of renderNodesToCommit) {
    renderNode.commit?.(0 /* COMMIT_UNMOUNT */);
  }
  const prevFocus = document.activeElement;
  for (const renderNode of renderNodesToCommit) {
    renderNode.commit?.(1 /* COMMIT_DEL */);
  }
  for (const renderNode of renderNodesToCommit) {
    renderNode.commit?.(2 /* COMMIT_INS */);
  }
  if (prevFocus && (prevFocus instanceof HTMLElement || prevFocus instanceof SVGElement) && document.documentElement.contains(prevFocus)) {
    prevFocus.focus();
  }
  for (const renderNode of renderNodesToCommit) {
    renderNode.commit?.(3 /* COMMIT_MOUNT */);
  }
  renderNodesToCommit.clear();
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
function removeRenderNode(vertex) {
  renderNodesToCommit.delete(vertex);
}
function dirtyRenderNode(renderNode) {
  debug("dirty renderNode", renderNode.__debugName);
  renderNodesToCommit.add(renderNode);
  scheduleFlush();
}
function addHardEdge(fromVertex, toVertex) {
  debug("add edge:hard", fromVertex.__debugName, "->", toVertex.__debugName);
  globalDependencyGraph.addEdge(fromVertex, toVertex, Graph.EDGE_HARD);
}
function addSoftEdge(fromVertex, toVertex) {
  debug("add edge:soft", fromVertex.__debugName, "->", toVertex.__debugName);
  globalDependencyGraph.addEdge(fromVertex, toVertex, Graph.EDGE_SOFT);
}
function removeHardEdge(fromVertex, toVertex) {
  debug("del edge:hard", fromVertex.__debugName, "->", toVertex.__debugName);
  globalDependencyGraph.removeEdge(fromVertex, toVertex, Graph.EDGE_HARD);
}
function removeSoftEdge(fromVertex, toVertex) {
  debug("del edge:soft", fromVertex.__debugName, "->", toVertex.__debugName);
  globalDependencyGraph.removeEdge(fromVertex, toVertex, Graph.EDGE_SOFT);
}
function markDirty(vertex) {
  debug("dirty", vertex.__debugName);
  globalDependencyGraph.markVertexDirty(vertex);
  scheduleFlush();
}
function unmarkDirty(vertex) {
  debug("clean", vertex.__debugName);
  globalDependencyGraph.clearVertexDirty(vertex);
}
function markCycleInformed(vertex) {
  debug("cycle informed", vertex.__debugName);
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
    debug("notifying dependency", retainable.__debugName, "to was created");
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
    debug("adding dependency", dependency.__debugName, "to active calculation");
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

// src/ref.ts
var Ref = class {
  constructor(current) {
    this.current = current;
  }
};
function ref(val) {
  return new Ref(val);
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

// src/arrayevent.ts
var ArrayEventType = /* @__PURE__ */ ((ArrayEventType2) => {
  ArrayEventType2["SPLICE"] = "splice";
  ArrayEventType2["MOVE"] = "move";
  ArrayEventType2["SORT"] = "sort";
  return ArrayEventType2;
})(ArrayEventType || {});
function shiftEventBy(shiftAmount, event) {
  switch (event.type) {
    case "splice" /* SPLICE */: {
      event.index += shiftAmount;
      break;
    }
    case "sort" /* SORT */: {
      event.from += shiftAmount;
      for (let i = 0; i < event.indexes.length; ++i) {
        event.indexes[i] += shiftAmount;
      }
      break;
    }
    case "move" /* MOVE */: {
      event.from += shiftAmount;
      event.to += shiftAmount;
      break;
    }
    default:
      assertExhausted(event);
  }
}
function shiftEvent(slotSizes, slotIndex, event) {
  let shiftAmount = 0;
  for (let i = 0; i < slotIndex; ++i) {
    shiftAmount += slotSizes[i];
  }
  shiftEventBy(shiftAmount, event);
  if (event.type === "splice" /* SPLICE */) {
    slotSizes[slotIndex] += (event.items?.length ?? 0) - event.count;
  }
}
var EMPTY_ARRAY = [];
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
      const duped = target.slice(event.from);
      for (let i = 0; i < event.indexes.length; ++i) {
        target[i] = duped[event.indexes[i] - event.from];
      }
      break;
    }
    case "move" /* MOVE */: {
      const slice = target.splice(event.from, event.count);
      target.splice(event.to, 0, ...slice);
      break;
    }
    default:
      assertExhausted(event);
  }
  return EMPTY_ARRAY;
}
function* arrayEventFlatMap(slotSizes, flatMap, target, event) {
  switch (event.type) {
    case "splice" /* SPLICE */: {
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
        type: "splice" /* SPLICE */,
        index: fromIndex,
        count,
        items
      };
      break;
    }
    case "sort" /* SORT */: {
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
        type: "sort" /* SORT */,
        from: slotStartIndex[event.from],
        indexes: newIndexes
      };
      break;
    }
    case "move" /* MOVE */: {
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
        type: "move" /* MOVE */,
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
function addArrayEvent(events, event) {
  const lastEvent = events.length > 0 ? events[events.length - 1] : null;
  if (lastEvent && event.type === "splice" /* SPLICE */ && lastEvent.type === "splice" /* SPLICE */) {
    const lastEventSpliceEnd = lastEvent.index + (lastEvent.items?.length ?? 0);
    if (lastEventSpliceEnd === event.index) {
      lastEvent.count += event.count;
      if (lastEvent.items && event.items) {
        lastEvent.items.push(...event.items);
      } else if (event.items) {
        lastEvent.items = event.items;
      }
      return;
    }
  }
  events.push(event);
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
function calcSubscribe(handler) {
  retain(this);
  try {
    this();
  } catch (e) {
  }
  if (!this._subscriptions) {
    this._subscriptions = /* @__PURE__ */ new Set();
  }
  this._subscriptions.add(handler);
  const unsubscribe = () => {
    this._subscriptions?.delete(handler);
    release(this);
  };
  const unsubscribeData = {
    _type: CalculationUnsubscribeSymbol,
    calculation: this
  };
  return Object.assign(unsubscribe, unsubscribeData);
}
function calcRetain() {
  retain(this);
}
function calcRelease() {
  retain(this);
}
var CycleError = class extends Error {
  constructor(msg, sourceCalculation) {
    super(msg);
    this.sourceCalculation = sourceCalculation;
  }
};
function calculationCall(calculation) {
  notifyRead(calculation);
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
        result = trackReads(calculationReads, () => calculation._fn(), calculation.__debugName);
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
          result = untrackReads(() => isActiveCycle ? errorHandler(0 /* CYCLE */, new Error("Cycle")) : errorHandler(1 /* EXCEPTION */, exception), calculation.__debugName);
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
function calculationRecalculate(addPostAction) {
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
        if (this._subscriptions) {
          const error2 = wrapError(e, "Unknown error in calculation");
          for (const subscription of this._subscriptions) {
            subscription(1 /* EXCEPTION */, error2, addPostAction);
          }
        }
        return true;
      }
      if (priorResult !== Sentinel && this._eq(priorResult, newResult)) {
        this._val = priorResult;
        return false;
      }
      if (this._subscriptions) {
        for (const subscription of this._subscriptions) {
          subscription(void 0, newResult, addPostAction);
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
function calculationCycle(addPostAction) {
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
        this._val = untrackReads(() => errorHandler(0 /* CYCLE */, new Error("Cycle")), this.__debugName);
        this._state = 2 /* CACHED */;
        unmarkDirty(this);
      } else {
        this._state = 3 /* ERROR */;
        this._error = Sentinel;
        if (this._subscriptions) {
          for (const subscription of this._subscriptions) {
            subscription(0 /* CYCLE */, new Error("Cycle"), addPostAction);
          }
        }
        return true;
      }
      if (priorResult !== Sentinel && this._eq(priorResult, this._val)) {
        this._val = priorResult;
        return false;
      }
      if (this._subscriptions) {
        for (const subscription of this._subscriptions) {
          subscription(void 0, this._val, addPostAction);
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
    _state: 4 /* DEAD */,
    _call: calculationCall,
    _eq: strictEqual,
    _type: CalculationSymbol,
    onError: calcSetError,
    setCmp: calcSetCmp,
    subscribe: calcSubscribe,
    retain: calcRetain,
    release: calcRelease,
    __alive: calculationAlive,
    __dead: calculationDead,
    __refcount: 0,
    __processable: true,
    __debugName: debugName ?? fn.name,
    __recalculate: calculationRecalculate,
    __cycle: calculationCycle,
    __invalidate: calculationInvalidate
  };
  const calculation = Object.assign(() => calculationCall(calculation), calculationData);
  notifyCreate(calculation);
  return calculation;
}

// src/field.ts
var Field = class {
  constructor(val, debugName) {
    this._val = val;
    this._isAlive = false;
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
      if (this._isAlive) {
        markDirty(this);
      }
    }
  }
  subscribe(subscriber) {
    if (!this._subscribers)
      this._subscribers = /* @__PURE__ */ new Map();
    this._subscribers.set(subscriber, this._changeClock);
    return () => this._subscribers?.delete(subscriber);
  }
  __alive() {
    this._isAlive = true;
    addVertex(this);
  }
  __dead() {
    removeVertex(this);
    this._isAlive = false;
  }
  __recalculate() {
    assert(this._isAlive, "cannot flush dead field");
    if (this._subscribers) {
      for (const [subscriber, observeClock] of this._subscribers) {
        if (observeClock < this._changeClock) {
          subscriber(this._val);
        }
        this._subscribers.set(subscriber, 0);
      }
      this._changeClock = 0;
    }
    return true;
  }
};
function field(val, debugName) {
  return new Field(val, debugName);
}

// src/fieldmap.ts
var FieldMap = class {
  constructor(keysField, consumer, emitter, debugName) {
    this.__refcount = 0;
    this.__debugName = debugName ?? "fieldmap";
    this.keysField = keysField;
    this.fieldMap = /* @__PURE__ */ new Map();
    this.consumer = consumer;
    this.emitter = emitter;
  }
  getOrMake(prop, val) {
    let field2 = this.fieldMap.get(prop);
    if (!field2) {
      field2 = new Field(val, `${this.__debugName}:${prop}`);
      this.fieldMap.set(prop, field2);
      if (this.__refcount > 0) {
        retain(field2);
        if (this.consumer)
          addSoftEdge(this.consumer, field2);
        if (this.emitter)
          addSoftEdge(field2, this.emitter);
      }
    }
    return field2;
  }
  set(prop, val) {
    const field2 = this.getOrMake(prop, val);
    return field2.set(val);
  }
  delete(prop) {
    const field2 = this.fieldMap.get(prop);
    if (field2) {
      field2.set(void 0);
      this.fieldMap.delete(prop);
      if (this.__refcount > 0) {
        if (this.emitter)
          removeSoftEdge(field2, this.emitter);
        if (this.consumer)
          removeSoftEdge(this.consumer, field2);
        release(field2);
      }
    }
  }
  __dead() {
    for (const field2 of this.fieldMap.values()) {
      if (this.emitter)
        removeSoftEdge(field2, this.emitter);
      if (this.consumer)
        removeSoftEdge(this.consumer, field2);
      release(field2);
    }
    if (this.emitter)
      removeSoftEdge(this.keysField, this.emitter);
    if (this.consumer)
      removeSoftEdge(this.consumer, this.keysField);
    release(this.keysField);
    if (this.emitter)
      release(this.emitter);
    if (this.consumer)
      release(this.consumer);
  }
  __alive() {
    if (this.emitter)
      retain(this.emitter);
    if (this.consumer)
      retain(this.consumer);
    retain(this.keysField);
    if (this.emitter)
      addSoftEdge(this.keysField, this.emitter);
    if (this.consumer)
      addSoftEdge(this.consumer, this.keysField);
    for (const field2 of this.fieldMap.values()) {
      retain(field2);
      if (this.emitter)
        addSoftEdge(field2, this.emitter);
      if (this.consumer)
        addSoftEdge(this.consumer, field2);
    }
  }
};

// src/subscriptionemitter.ts
var SubscriptionEmitter = class {
  __recalculate() {
    for (const subscriber of this.subscribers) {
      subscriber.handler(subscriber.events);
      subscriber.events = [];
    }
    return true;
  }
  __alive() {
    this.isActive = true;
    addVertex(this);
  }
  __dead() {
    assert(this.subscribers.length === 0, "released subscription emitter that had subscribers");
    removeVertex(this);
    this.isActive = false;
  }
  constructor(appendEvent, debugName) {
    this.appendEvent = appendEvent;
    this.subscribers = [];
    this.isActive = false;
    this.__refcount = 0;
    this.__processable = true;
    this.__debugName = `emitter:${debugName}`;
  }
  addEvent(event) {
    if (!this.isActive)
      return;
    let firstAdded = false;
    for (const subscriber of this.subscribers) {
      if (subscriber.events.length === 0)
        firstAdded = true;
      this.appendEvent(subscriber.events, event);
    }
    if (firstAdded) {
      markDirty(this);
    }
  }
  subscribe(handler) {
    this.subscribers.push({ handler, events: [] });
    return () => {
      const index = this.subscribers.findIndex((subscriber) => subscriber.handler === handler);
      if (index === -1)
        return;
      this.subscribers.splice(index, 1);
    };
  }
};

// src/subscriptionconsumer.ts
var SubscriptionConsumer = class {
  __recalculate() {
    for (const emitEvent of this.handler(this.target, this.events)) {
      this.transformEmitter.addEvent(emitEvent);
    }
    this.events.splice(0, this.events.length);
    return false;
  }
  __alive() {
    this.isActive = true;
    addVertex(this);
    retain(this.sourceEmitter);
    addHardEdge(this.sourceEmitter, this);
    this.unsubscribe = this.sourceEmitter.subscribe((events) => {
      for (const event of events) {
        this.addEvent(event);
      }
    });
  }
  __dead() {
    if (this.unsubscribe) {
      this.unsubscribe();
      removeHardEdge(this.sourceEmitter, this);
      release(this.sourceEmitter);
    }
    this.events.splice(0, this.events.length);
    removeVertex(this);
    this.isActive = false;
  }
  constructor(target, sourceEmitter, transformEmitter, handler, appendEvent, debugName) {
    this.target = target;
    this.handler = handler;
    this.events = [];
    this.isActive = false;
    this.sourceEmitter = sourceEmitter;
    this.transformEmitter = transformEmitter;
    this.appendEvent = appendEvent;
    this.__refcount = 0;
    this.__processable = true;
    this.__debugName = `consumer:${debugName}`;
  }
  addEvent(event) {
    if (!this.isActive)
      return;
    const firstEvent = this.events.length === 0;
    this.appendEvent(this.events, event);
    if (firstEvent) {
      markDirty(this);
    }
  }
  addField(field2) {
    if (this.isActive) {
      retain(field2);
      addSoftEdge(this, field2);
    }
  }
  removeField(field2) {
    if (this.isActive) {
      removeSoftEdge(this, field2);
      release(field2);
    }
  }
};

// src/trackeddata.ts
var TrackedDataHandle = class {
  constructor(target, proxyHandler, methods, derivedEmitter, handleEvents, appendEmitEvent, appendConsumeEvent, debugName = "trackeddata") {
    this.target = target;
    this.methods = methods;
    this.emitter = new SubscriptionEmitter(appendEmitEvent, debugName);
    if (derivedEmitter && handleEvents) {
      this.consumer = new SubscriptionConsumer(target, derivedEmitter, this.emitter, handleEvents, appendConsumeEvent, debugName);
    } else {
      this.consumer = null;
    }
    this.keys = new Set(Object.keys(target));
    this.keysField = new Field(this.keys.size, `${debugName}:@keys`);
    this.fieldMap = new FieldMap(this.keysField, this.consumer, this.emitter, debugName);
    const emitEvent = (event) => {
      this.emitter.addEvent(event);
    };
    this.dataAccessor = {
      get: (prop, receiver) => {
        if (prop === "__tdHandle") {
          return this;
        }
        if (prop === "__debugName") {
          return debugName;
        }
        if (prop === "__processable") {
          return false;
        }
        if (prop === "__refcount" || prop === "__alive" || prop === "__dead") {
          return methods[prop];
        }
        if (typeof prop === "symbol") {
          return Reflect.get(this.target, prop, receiver);
        }
        if (prop in methods) {
          return methods[prop];
        }
        const value = Reflect.get(this.target, prop, receiver);
        const field2 = this.fieldMap.getOrMake(prop, value);
        notifyRead(this.revocable.proxy);
        notifyRead(field2);
        return value;
      },
      peekHas: (prop) => {
        return Reflect.has(target, prop);
      },
      has: (prop) => {
        if (prop === "__refcount" || prop === "__alive" || prop === "__dead") {
          return prop in methods;
        }
        if (prop === "__processable") {
          return true;
        }
        if (prop in methods) {
          return true;
        }
        if (typeof prop === "symbol") {
          return Reflect.has(this.target, prop);
        }
        const value = Reflect.has(target, prop);
        const field2 = this.fieldMap.getOrMake(prop, value);
        notifyRead(this.revocable.proxy);
        notifyRead(field2);
        return value;
      },
      set: (prop, value, receiver) => {
        if (prop === "__refcount") {
          methods[prop] = value;
          return true;
        }
        if (prop in methods) {
          return false;
        }
        if (typeof prop === "symbol") {
          return Reflect.set(this.target, prop, value, receiver);
        }
        const hadProp = Reflect.has(target, prop);
        const field2 = this.fieldMap.getOrMake(prop, value);
        field2.set(value);
        if (!hadProp) {
          this.keys.add(prop);
          this.keysField.set(this.keys.size);
        }
        return Reflect.set(target, prop, value, this.revocable.proxy);
      },
      delete: (prop) => {
        if (prop === "__refcount" || prop === "__alive" || prop === "__dead" || prop === "__processable") {
          return false;
        }
        if (prop in methods) {
          return false;
        }
        if (typeof prop === "symbol") {
          return Reflect.deleteProperty(this.target, prop);
        }
        const hadProp = Reflect.has(target, prop);
        const result = Reflect.deleteProperty(target, prop);
        if (hadProp) {
          this.keys.delete(prop);
          this.keysField.set(this.keys.size);
          this.fieldMap.delete(prop);
        }
        return result;
      }
    };
    this.revocable = Proxy.revocable(target, {
      get: (target2, prop, receiver) => proxyHandler.get(this.dataAccessor, emitEvent, prop, receiver),
      has: (target2, prop) => proxyHandler.has(this.dataAccessor, emitEvent, prop),
      set: (target2, prop, value, receiver) => proxyHandler.set(this.dataAccessor, emitEvent, prop, value, receiver),
      deleteProperty: (target2, prop) => proxyHandler.delete(this.dataAccessor, emitEvent, prop),
      ownKeys: () => {
        const keys = this.keys;
        this.keysField.get();
        return [...keys];
      }
    });
    notifyCreate(this.revocable.proxy);
  }
};
function getTrackedDataHandle(trackedData) {
  return trackedData.__tdHandle;
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
    __refcount: 0,
    __alive: collectionAlive,
    __dead: collectionDead,
    __debugName: "collection"
  };
}
function makeViewPrototype(sourceCollection) {
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
    __refcount: 0,
    __alive() {
      retain(sourceCollection);
      const tdHandle = getTrackedDataHandle(this);
      assert(tdHandle, "missing tdHandle");
      retain(tdHandle.fieldMap);
    },
    __dead() {
      const tdHandle = getTrackedDataHandle(this);
      assert(tdHandle, "missing tdHandle");
      release(tdHandle.fieldMap);
      release(sourceCollection);
    },
    __debugName: "collection"
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
          type: "splice" /* SPLICE */,
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
    if (prop === "__refcount") {
      return dataAccessor.set(prop, value, receiver);
    }
    fail("Cannot mutate readonly view");
  },
  delete: (dataAccessor, emitter, prop) => {
    fail("Cannot mutate readonly view");
  }
};
function collection(items, debugName) {
  const handle = new TrackedDataHandle(items, CollectionHandler, makeCollectionPrototype(), null, null, addArrayEvent, addArrayEvent, debugName);
  return handle.revocable.proxy;
}
function viewSplice(index, count, ...items) {
  fail("Cannot mutate readonly view");
}
function spliceInner(tdHandle, index, count, ...items) {
  const startLength = tdHandle.target.length;
  const removed = Array.prototype.splice.call(tdHandle.target, index, count, ...items);
  const endLength = tdHandle.target.length;
  if (startLength === endLength) {
    for (let i = index; i < index + items.length; ++i) {
      tdHandle.fieldMap.set(i.toString(), tdHandle.target[i]);
    }
  } else {
    for (let i = index; i < endLength; ++i) {
      tdHandle.fieldMap.set(i.toString(), tdHandle.target[i]);
    }
    for (let i = endLength; i < startLength; ++i) {
      tdHandle.fieldMap.delete(i.toString());
    }
    tdHandle.fieldMap.set("length", endLength);
  }
  tdHandle.emitter.addEvent({
    type: "splice" /* SPLICE */,
    index,
    count,
    items
  });
  return removed;
}
function collectionSplice(index, count = 0, ...items) {
  const tdHandle = getTrackedDataHandle(this);
  assert(tdHandle, "missing tdHandle");
  return spliceInner(tdHandle, index, count, ...items);
}
function viewPush(...items) {
  fail("Cannot mutate readonly view");
}
function collectionPush(...items) {
  const tdHandle = getTrackedDataHandle(this);
  assert(tdHandle, "missing tdHandle");
  spliceInner(tdHandle, tdHandle.target.length, 0, ...items);
  return tdHandle.target.length;
}
function viewPop() {
  fail("Cannot mutate readonly view");
}
function collectionPop() {
  const tdHandle = getTrackedDataHandle(this);
  assert(tdHandle, "missing tdHandle");
  return spliceInner(tdHandle, tdHandle.target.length - 1, 1)[0];
}
function viewShift() {
  fail("Cannot mutate readonly view");
}
function collectionShift() {
  const tdHandle = getTrackedDataHandle(this);
  assert(tdHandle, "missing tdHandle");
  return spliceInner(tdHandle, 0, 1)[0];
}
function viewUnshift(...items) {
  fail("Cannot mutate readonly view");
}
function collectionUnshift(...items) {
  const tdHandle = getTrackedDataHandle(this);
  assert(tdHandle, "missing tdHandle");
  spliceInner(tdHandle, 0, 0, ...items);
  return tdHandle.target.length;
}
function collectionReject(pred) {
  const tdHandle = getTrackedDataHandle(this);
  assert(tdHandle, "missing tdHandle");
  let start = null;
  let length = tdHandle.target.length;
  let toRemove = false;
  const removed = [];
  for (let i = 0; i < length; ++i) {
    toRemove = pred(tdHandle.target[i]);
    if (toRemove && start === null) {
      start = i;
    }
    if (!toRemove && start !== null) {
      const count = i - start;
      removed.push(...spliceInner(tdHandle, start, count));
      length -= count;
      i -= count;
      start = null;
    }
  }
  if (start !== null) {
    const count = length - start;
    removed.push(...spliceInner(tdHandle, start, count));
  }
  return removed;
}
function collectionMoveSlice(fromIndex, count, toIndex) {
  const tdHandle = getTrackedDataHandle(this);
  assert(tdHandle, "moveSlice missing tdHandle");
  const removed = tdHandle.target.splice(fromIndex, count);
  tdHandle.target.splice(toIndex, 0, ...removed);
  tdHandle.emitter.addEvent({
    type: "move" /* MOVE */,
    from: fromIndex,
    count,
    to: toIndex
  });
}
function collectionSubscribe(handler) {
  const tdHandle = getTrackedDataHandle(this);
  assert(tdHandle, "subscribe missing tdHandle");
  retain(tdHandle.emitter);
  const unsubscribe = tdHandle.emitter.subscribe((events) => {
    handler(events);
  });
  return () => {
    unsubscribe();
    release(tdHandle.emitter);
  };
}
function collectionAlive() {
  const tdHandle = getTrackedDataHandle(this);
  assert(tdHandle, "missing tdHandle");
  retain(tdHandle.fieldMap);
}
function collectionDead() {
  const tdHandle = getTrackedDataHandle(this);
  assert(tdHandle, "missing tdHandle");
  release(tdHandle.fieldMap);
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
      type: "sort" /* SORT */,
      from: 0,
      indexes
    });
  }
  for (let i = 0; i < tdHandle.target.length; ++i) {
    tdHandle.fieldMap.set(i.toString(), tdHandle.target[i]);
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
      type: "sort" /* SORT */,
      from: 0,
      indexes
    });
  }
  for (let i = 0; i < tdHandle.target.length; ++i) {
    tdHandle.fieldMap.set(i.toString(), tdHandle.target[i]);
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
  const derivedCollection = new TrackedDataHandle(initialTransform, ViewHandler, makeViewPrototype(sourceCollection), sourceTDHandle.emitter, function* (target, events) {
    for (const event of events) {
      const lengthStart = initialTransform.length;
      yield* arrayEventFlatMap(slotSizes, flatMap, initialTransform, event);
      switch (event.type) {
        case "splice" /* SPLICE */: {
          const lengthEnd = initialTransform.length;
          if (lengthStart === lengthEnd) {
            for (let i = event.index; i < event.index + event.count; ++i) {
              derivedCollection.fieldMap.set(i.toString(), initialTransform[i]);
            }
          } else {
            for (let i = event.index; i < lengthEnd; ++i) {
              derivedCollection.fieldMap.set(i.toString(), initialTransform[i]);
            }
            for (let i = lengthEnd; i < lengthStart; ++i) {
              derivedCollection.fieldMap.delete(i.toString());
            }
            derivedCollection.fieldMap.set("length", lengthEnd);
          }
          break;
        }
        case "move" /* MOVE */: {
          const lowerBound = Math.min(event.from, event.to);
          const upperBound = Math.max(event.from + event.count, event.to + event.count);
          for (let i = lowerBound; i < upperBound; ++i) {
            derivedCollection.fieldMap.set(i.toString(), initialTransform[i]);
          }
          break;
        }
        case "sort" /* SORT */:
          for (let i = event.from; i < event.from + event.indexes.length; ++i) {
            derivedCollection.fieldMap.set(i.toString(), initialTransform[i]);
          }
          break;
      }
    }
  }, addArrayEvent, addArrayEvent, debugName ?? "derived");
  return derivedCollection.revocable.proxy;
}

// src/rendernode.tsx
function isClassComponent(val) {
  return val && val.prototype instanceof ClassComponent;
}
var ClassComponent = class {
  constructor(props) {
    this.props = props;
  }
};
var RenderNodeType = Symbol("rendernode");
function isNextRenderNodeCommitPhase(commitPhase, nextPhase) {
  return commitPhase === 3 /* COMMIT_MOUNT */ && nextPhase === 0 /* COMMIT_UNMOUNT */ || commitPhase === 0 /* COMMIT_UNMOUNT */ && nextPhase === 1 /* COMMIT_DEL */ || commitPhase === 1 /* COMMIT_DEL */ && nextPhase === 2 /* COMMIT_INS */ || commitPhase === 2 /* COMMIT_INS */ && nextPhase === 3 /* COMMIT_MOUNT */;
}
function own(parent, child) {
  if (child === emptyRenderNode)
    return;
  retain(child);
}
function disown(parent, child) {
  if (child === emptyRenderNode)
    return;
  release(child);
}
var EmptyRenderNode = class {
  constructor() {
    this._type = RenderNodeType;
    this._commitPhase = 3 /* COMMIT_MOUNT */;
    this.__debugName = "empty";
    this.__refcount = 0;
  }
  detach() {
  }
  attach() {
  }
  setMounted() {
  }
  retain() {
    retain(this);
  }
  release() {
    release(this);
  }
  commit() {
  }
  __alive() {
  }
  __dead() {
    removeRenderNode(this);
  }
};
var emptyRenderNode = new EmptyRenderNode();
var TextRenderNode = class {
  constructor(string, debugName) {
    this._type = RenderNodeType;
    this._commitPhase = 3 /* COMMIT_MOUNT */;
    this.text = document.createTextNode(string);
    this.__debugName = debugName ?? "text";
    this.__refcount = 0;
  }
  detach() {
    this.emitter?.({ type: "splice" /* SPLICE */, index: 0, count: 1 });
    this.emitter = void 0;
  }
  attach(emitter) {
    assert(!this.emitter, "Invariant: Text node double attached");
    this.emitter = emitter;
    this.emitter?.({
      type: "splice" /* SPLICE */,
      index: 0,
      count: 0,
      items: [this.text]
    });
  }
  setMounted() {
  }
  retain() {
    retain(this);
  }
  release() {
    release(this);
  }
  commit() {
  }
  __alive() {
  }
  __dead() {
    this.emitter = void 0;
    removeRenderNode(this);
  }
};
var ForeignRenderNode = class {
  constructor(node, debugName) {
    this._type = RenderNodeType;
    this._commitPhase = 3 /* COMMIT_MOUNT */;
    this.node = node;
    this.__debugName = debugName ?? "foreign";
    this.__refcount = 0;
  }
  detach() {
    this.emitter?.({ type: "splice" /* SPLICE */, index: 0, count: 1 });
    this.emitter = void 0;
  }
  attach(emitter) {
    assert(!this.emitter, "Invariant: Foreign node double attached");
    this.emitter = emitter;
    this.emitter?.({
      type: "splice" /* SPLICE */,
      index: 0,
      count: 0,
      items: [this.node]
    });
  }
  setMounted() {
  }
  retain() {
    retain(this);
  }
  release() {
    release(this);
  }
  commit() {
  }
  __alive() {
  }
  __dead() {
    this.emitter = void 0;
    removeRenderNode(this);
  }
};
var ArrayRenderNode = class {
  constructor(children, debugName) {
    this._type = RenderNodeType;
    this._commitPhase = 3 /* COMMIT_MOUNT */;
    this.children = children;
    this.slotSizes = children.map(() => 0);
    this.attached = children.map(() => false);
    this.__debugName = debugName ?? "array";
    this.__refcount = 0;
  }
  detach() {
    for (const [index, child] of this.children.entries()) {
      if (this.attached[index]) {
        child.detach();
        this.attached[index] = false;
      }
    }
    this.emitter = void 0;
  }
  attach(emitter, parentXmlNamespace) {
    this.emitter = emitter;
    for (const [index, child] of this.children.entries()) {
      child.attach((event) => {
        if (this.emitter) {
          if (event instanceof Error) {
            this.emitter(event);
          } else {
            shiftEvent(this.slotSizes, index, event);
            this.emitter(event);
          }
        }
      }, parentXmlNamespace);
      this.attached[index] = true;
    }
  }
  setMounted(isMounted) {
    for (const child of this.children) {
      child.setMounted(isMounted);
    }
  }
  retain() {
    retain(this);
  }
  release() {
    release(this);
  }
  commit(phase) {
    if (isNextRenderNodeCommitPhase(this._commitPhase, phase)) {
      for (const child of this.children) {
        child.commit(phase);
      }
      this._commitPhase = phase;
    }
  }
  __alive() {
    for (const child of this.children) {
      own(this, child);
    }
  }
  __dead() {
    for (const child of this.children) {
      disown(this, child);
    }
    removeRenderNode(this);
    this.emitter = void 0;
  }
};
var HTML_NAMESPACE = "http://www.w3.org/1999/xhtml";
var SVG_NAMESPACE = "http://www.w3.org/2000/svg";
var MATHML_NAMESPACE = "http://www.w3.org/1998/Math/MathML";
var ELEMENT_NAMESPACE_GUESS = {
  a: HTML_NAMESPACE,
  abbr: HTML_NAMESPACE,
  address: HTML_NAMESPACE,
  area: HTML_NAMESPACE,
  article: HTML_NAMESPACE,
  aside: HTML_NAMESPACE,
  audio: HTML_NAMESPACE,
  b: HTML_NAMESPACE,
  base: HTML_NAMESPACE,
  bdi: HTML_NAMESPACE,
  bdo: HTML_NAMESPACE,
  blockquote: HTML_NAMESPACE,
  body: HTML_NAMESPACE,
  br: HTML_NAMESPACE,
  button: HTML_NAMESPACE,
  canvas: HTML_NAMESPACE,
  caption: HTML_NAMESPACE,
  cite: HTML_NAMESPACE,
  code: HTML_NAMESPACE,
  col: HTML_NAMESPACE,
  colgroup: HTML_NAMESPACE,
  data: HTML_NAMESPACE,
  datalist: HTML_NAMESPACE,
  dd: HTML_NAMESPACE,
  del: HTML_NAMESPACE,
  details: HTML_NAMESPACE,
  dfn: HTML_NAMESPACE,
  dialog: HTML_NAMESPACE,
  div: HTML_NAMESPACE,
  dl: HTML_NAMESPACE,
  dt: HTML_NAMESPACE,
  em: HTML_NAMESPACE,
  embed: HTML_NAMESPACE,
  fieldset: HTML_NAMESPACE,
  figcaption: HTML_NAMESPACE,
  figure: HTML_NAMESPACE,
  footer: HTML_NAMESPACE,
  form: HTML_NAMESPACE,
  h1: HTML_NAMESPACE,
  h2: HTML_NAMESPACE,
  h3: HTML_NAMESPACE,
  h4: HTML_NAMESPACE,
  h5: HTML_NAMESPACE,
  h6: HTML_NAMESPACE,
  head: HTML_NAMESPACE,
  header: HTML_NAMESPACE,
  hgroup: HTML_NAMESPACE,
  hr: HTML_NAMESPACE,
  html: HTML_NAMESPACE,
  i: HTML_NAMESPACE,
  iframe: HTML_NAMESPACE,
  img: HTML_NAMESPACE,
  input: HTML_NAMESPACE,
  ins: HTML_NAMESPACE,
  kbd: HTML_NAMESPACE,
  label: HTML_NAMESPACE,
  legend: HTML_NAMESPACE,
  li: HTML_NAMESPACE,
  link: HTML_NAMESPACE,
  main: HTML_NAMESPACE,
  map: HTML_NAMESPACE,
  mark: HTML_NAMESPACE,
  menu: HTML_NAMESPACE,
  meta: HTML_NAMESPACE,
  meter: HTML_NAMESPACE,
  nav: HTML_NAMESPACE,
  noscript: HTML_NAMESPACE,
  object: HTML_NAMESPACE,
  ol: HTML_NAMESPACE,
  optgroup: HTML_NAMESPACE,
  option: HTML_NAMESPACE,
  output: HTML_NAMESPACE,
  p: HTML_NAMESPACE,
  picture: HTML_NAMESPACE,
  pre: HTML_NAMESPACE,
  progress: HTML_NAMESPACE,
  q: HTML_NAMESPACE,
  rp: HTML_NAMESPACE,
  rt: HTML_NAMESPACE,
  ruby: HTML_NAMESPACE,
  s: HTML_NAMESPACE,
  samp: HTML_NAMESPACE,
  script: HTML_NAMESPACE,
  section: HTML_NAMESPACE,
  select: HTML_NAMESPACE,
  slot: HTML_NAMESPACE,
  small: HTML_NAMESPACE,
  source: HTML_NAMESPACE,
  span: HTML_NAMESPACE,
  strong: HTML_NAMESPACE,
  style: HTML_NAMESPACE,
  sub: HTML_NAMESPACE,
  summary: HTML_NAMESPACE,
  sup: HTML_NAMESPACE,
  table: HTML_NAMESPACE,
  tbody: HTML_NAMESPACE,
  td: HTML_NAMESPACE,
  template: HTML_NAMESPACE,
  textarea: HTML_NAMESPACE,
  tfoot: HTML_NAMESPACE,
  th: HTML_NAMESPACE,
  thead: HTML_NAMESPACE,
  time: HTML_NAMESPACE,
  title: HTML_NAMESPACE,
  tr: HTML_NAMESPACE,
  track: HTML_NAMESPACE,
  u: HTML_NAMESPACE,
  ul: HTML_NAMESPACE,
  var: HTML_NAMESPACE,
  video: HTML_NAMESPACE,
  wbr: HTML_NAMESPACE,
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
  set: SVG_NAMESPACE,
  stop: SVG_NAMESPACE,
  svg: SVG_NAMESPACE,
  switch: SVG_NAMESPACE,
  symbol: SVG_NAMESPACE,
  text: SVG_NAMESPACE,
  textPath: SVG_NAMESPACE,
  tspan: SVG_NAMESPACE,
  use: SVG_NAMESPACE,
  view: SVG_NAMESPACE,
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
var EventProps = [
  { prefix: "on:", param: false },
  { prefix: "oncapture:", param: true },
  { prefix: "onpassive:", param: { passive: true } }
];
var IntrinsicRenderNode = class {
  constructor(tagName, props, children, debugName) {
    this.handleEvent = (event) => {
      if (event instanceof Error) {
        if (this.emitter) {
          this.emitter(event);
        } else {
          warn("Unhandled error on detached IntrinsicRenderNode", this.__debugName, event);
          this.detachedError = event;
        }
        return;
      }
      assert(false, "unexpected event from IntrinsicRenderNode");
    };
    this._type = RenderNodeType;
    this._commitPhase = 3 /* COMMIT_MOUNT */;
    this.props = props;
    this.children = new ArrayRenderNode(children);
    this.tagName = tagName;
    this.__debugName = debugName ?? `intrinsic:${this.tagName}`;
    this.__refcount = 0;
  }
  createElement(xmlNamespace) {
    const element = document.createElementNS(xmlNamespace, this.tagName);
    if (this.props) {
      for (const [prop, val] of Object.entries(this.props)) {
        if (prop === "ref")
          continue;
        if (EventProps.some(({ prefix, param }) => {
          if (prop.startsWith(prefix)) {
            element.addEventListener(prop.slice(prefix.length), (e) => {
              try {
                val(e, element);
              } finally {
                flush();
              }
            }, param);
            return true;
          }
          return false;
        })) {
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
          const currentVal = calculation();
          this.setProp(element, prop, currentVal);
          this.calculationSubscriptions.add(calculation.subscribe((error2, updatedVal) => {
            if (error2) {
              error("Unhandled error in bound prop", {
                prop,
                element,
                error: updatedVal
              });
            } else {
              this.setProp(element, prop, updatedVal);
            }
          }));
        }
      }
    }
    return element;
  }
  setProp(element, prop, val) {
    if (prop.startsWith("prop:")) {
      const propName = prop.slice(5);
      element[propName] = val;
      return;
    }
    if (prop.startsWith("attr:")) {
      const attrName = prop.slice(5);
      setAttribute(element, attrName, val);
      return;
    }
    assignProp(element, prop, val);
  }
  detach() {
    this.emitter?.({
      type: "splice" /* SPLICE */,
      index: 0,
      count: 1
    });
    this.emitter = void 0;
  }
  ensureElement(xmlNamespace, childXmlNamespace) {
    if (!this.element || xmlNamespace !== this.xmlNamespace) {
      this.xmlNamespace = xmlNamespace;
      this.element = this.createElement(xmlNamespace);
      if (this.portalRenderNode) {
        this.portalRenderNode.detach();
        disown(this, this.portalRenderNode);
      }
      this.portalRenderNode = new PortalRenderNode(this.element, this.children, this.props?.ref);
      own(this, this.portalRenderNode);
      this.portalRenderNode.attach(this.handleEvent, childXmlNamespace);
    }
    return this.element;
  }
  attach(emitter, parentXmlNamespace) {
    assert(!this.emitter, "Invariant: Intrinsic node double attached");
    this.emitter = emitter;
    if (this.detachedError) {
      this.emitter(this.detachedError);
      return;
    }
    const namespaceTransition = elementNamespaceTransitionMap[parentXmlNamespace]?.[this.tagName];
    const xmlNamespace = namespaceTransition?.node ?? parentXmlNamespace;
    const childXmlNamespace = namespaceTransition?.children ?? parentXmlNamespace;
    const element = this.ensureElement(xmlNamespace, childXmlNamespace);
    this.emitter?.({
      type: "splice" /* SPLICE */,
      index: 0,
      count: 0,
      items: [element]
    });
  }
  setMounted(isMounted) {
    this.portalRenderNode?.setMounted(isMounted);
  }
  retain() {
    retain(this);
  }
  release() {
    release(this);
  }
  commit(phase) {
    if (isNextRenderNodeCommitPhase(this._commitPhase, phase)) {
      this.portalRenderNode?.commit(phase);
      this._commitPhase = phase;
    }
  }
  __alive() {
    const xmlNamespaceGuess = ELEMENT_NAMESPACE_GUESS[this.tagName] || HTML_NAMESPACE;
    if (this.portalRenderNode) {
      own(this, this.portalRenderNode);
    }
    this.ensureElement(xmlNamespaceGuess, this.tagName === "foreignObject" ? HTML_NAMESPACE : xmlNamespaceGuess);
  }
  __dead() {
    if (this.calculations) {
      for (const calculation of this.calculations.values()) {
        release(calculation);
      }
    }
    if (this.calculationSubscriptions) {
      for (const unsubscribe of this.calculationSubscriptions) {
        unsubscribe();
      }
      this.calculationSubscriptions.clear();
    }
    this.element = void 0;
    if (this.portalRenderNode) {
      disown(this, this.portalRenderNode);
      this.portalRenderNode = void 0;
    }
    removeRenderNode(this);
    this.emitter = void 0;
  }
};
var fragment = document.createDocumentFragment();
var PortalRenderNode = class {
  constructor(element, children, refProp, debugName) {
    this.handleEvent = (event) => {
      if (event instanceof Error) {
        if (this.emitter) {
          this.emitter(event);
        } else {
          warn("Unhandled error on detached PortalRenderNode");
        }
        return;
      }
      addArrayEvent(this.childEvents, event);
      dirtyRenderNode(this);
    };
    this._type = RenderNodeType;
    this._commitPhase = 3 /* COMMIT_MOUNT */;
    this.arrayRenderNode = children;
    this.childEvents = [];
    this.committedNodes = [];
    this.liveNodes = [];
    this.liveNodeSet = /* @__PURE__ */ new Set();
    this.deadNodeSet = /* @__PURE__ */ new Set();
    this.element = element;
    if (refProp) {
      this.refProp = refProp;
      this.mountState = 3 /* UNMOUNTED */;
    }
    this.tagName = this.element.tagName;
    this.existingOffset = element.childNodes.length;
    this.__debugName = debugName ?? `mount:${this.tagName}`;
    this.__refcount = 0;
  }
  detach() {
    this.emitter = void 0;
    this.arrayRenderNode.detach();
  }
  attach(emitter, parentXmlNamespace) {
    assert(!this.emitter, "Invariant: Intrinsic node double attached");
    this.emitter = emitter;
    this.arrayRenderNode.attach(this.handleEvent, parentXmlNamespace);
  }
  setMounted(isMounted) {
    if (isMounted) {
      this.arrayRenderNode.setMounted(true);
      if (this.refProp) {
        dirtyRenderNode(this);
        this.mountState = 1 /* NOTIFY_MOUNT */;
      }
    } else {
      if (this.refProp) {
        dirtyRenderNode(this);
        this.mountState = 2 /* NOTIFY_UNMOUNT */;
      }
      this.arrayRenderNode.setMounted(false);
    }
  }
  commit(phase) {
    if (!isNextRenderNodeCommitPhase(this._commitPhase, phase)) {
      return;
    }
    this.arrayRenderNode.commit(phase);
    this._commitPhase = phase;
    if (phase === 0 /* COMMIT_UNMOUNT */ && this.childEvents.length > 0) {
      const childEvents = this.childEvents;
      this.childEvents = [];
      for (const childEvent of childEvents) {
        const removed = applyArrayEvent(this.liveNodes, childEvent);
        for (const toRemove of removed) {
          if (this.liveNodeSet.has(toRemove)) {
            this.deadNodeSet.add(toRemove);
          }
        }
      }
    }
    if (phase === 0 /* COMMIT_UNMOUNT */ && this.refProp && this.mountState === 2 /* NOTIFY_UNMOUNT */) {
      if (this.refProp instanceof Ref) {
        this.refProp.current = void 0;
      } else if (typeof this.refProp === "function") {
        this.refProp(void 0);
      }
      this.mountState = 3 /* UNMOUNTED */;
    }
    if (phase === 1 /* COMMIT_DEL */ && this.deadNodeSet.size > 0) {
      if (this.deadNodeSet.size === this.liveNodeSet.size && this.existingOffset === 0) {
        this.element.replaceChildren();
        this.liveNodeSet.clear();
        this.committedNodes = [];
      } else {
        for (const toRemove of this.deadNodeSet) {
          this.liveNodeSet.delete(toRemove);
          this.element.removeChild(toRemove);
        }
        this.committedNodes = this.committedNodes.filter((node) => !this.deadNodeSet.has(node));
      }
      this.deadNodeSet.clear();
    }
    if (phase === 2 /* COMMIT_INS */ && this.liveNodes.length > 0) {
      let toInsert = [];
      let liveIndex = 0;
      let currIndex = 0;
      while (liveIndex < this.liveNodes.length) {
        if (this.committedNodes[currIndex] === this.liveNodes[liveIndex]) {
          this.insertBefore(toInsert, liveIndex);
          toInsert = [];
          liveIndex += 1;
          currIndex += 1;
        } else {
          toInsert.push(this.liveNodes[liveIndex]);
          liveIndex += 1;
        }
      }
      this.insertBefore(toInsert, this.liveNodes.length);
    }
    if (phase === 3 /* COMMIT_MOUNT */ && this.refProp && this.mountState === 1 /* NOTIFY_MOUNT */) {
      if (this.refProp instanceof Ref) {
        this.refProp.current = this.element;
      } else if (typeof this.refProp === "function") {
        this.refProp(this.element);
      }
      this.mountState = 0 /* MOUNTED */;
    }
  }
  insertBefore(nodes, targetIndex) {
    let toInsert;
    if (nodes.length === 1) {
      toInsert = nodes[0];
      this.liveNodeSet.add(nodes[0]);
      this.committedNodes.splice(targetIndex, 0, toInsert);
    } else if (nodes.length > 1) {
      for (const node of nodes) {
        this.liveNodeSet.add(node);
        fragment.appendChild(node);
      }
      this.committedNodes.splice(targetIndex, 0, ...nodes);
      toInsert = fragment;
    }
    if (toInsert) {
      this.element.insertBefore(toInsert, this.liveNodes[targetIndex] || null);
    }
  }
  retain() {
    retain(this);
  }
  release() {
    release(this);
  }
  __alive() {
    own(this, this.arrayRenderNode);
  }
  __dead() {
    if (this.calculations) {
      for (const calculation of this.calculations.values()) {
        release(calculation);
      }
    }
    if (this.calculationSubscriptions) {
      for (const unsubscribe of this.calculationSubscriptions) {
        unsubscribe();
      }
      this.calculationSubscriptions.clear();
    }
    disown(this, this.arrayRenderNode);
    removeRenderNode(this);
    this.emitter = void 0;
  }
};
var CalculationRenderNode = class {
  constructor(calculation, debugName) {
    this._type = RenderNodeType;
    this._commitPhase = 3 /* COMMIT_MOUNT */;
    this.calculation = calculation;
    this.isMounted = false;
    this.__debugName = debugName ?? `rendercalc:${calculation.__debugName}`;
    this.__refcount = 0;
    this.subscribe = this.subscribe.bind(this);
  }
  detach() {
    this.renderNode?.detach();
    this.emitter = void 0;
  }
  attach(emitter, parentXmlNamespace) {
    this.emitter = emitter;
    this.parentXmlNamespace = parentXmlNamespace;
    if (this.error) {
      emitter(this.error);
    } else {
      this.renderNode?.attach(emitter, parentXmlNamespace);
    }
  }
  setMounted(isMounted) {
    this.isMounted = isMounted;
    this.renderNode?.setMounted(isMounted);
  }
  retain() {
    retain(this);
  }
  release() {
    release(this);
  }
  cleanPrior() {
    if (this.renderNode) {
      if (this.emitter) {
        if (this.isMounted) {
          this.renderNode.setMounted(false);
        }
        this.renderNode.detach();
      }
      disown(this, this.renderNode);
      this.error = void 0;
      this.renderNode = void 0;
    }
  }
  subscribe(errorType, val, addPostAction) {
    this.cleanPrior();
    if (errorType) {
      this.error = val;
      if (this.emitter) {
        this.emitter(val);
      } else {
        warn("Unhandled error on detached CalculationRenderNode", val);
      }
    } else {
      addPostAction(() => {
        const renderNode = renderJSXNode(val);
        own(this, renderNode);
        this.renderNode = renderNode;
        if (this.emitter && this.parentXmlNamespace) {
          renderNode.attach(this.emitter, this.parentXmlNamespace);
        }
        if (this.isMounted) {
          renderNode.setMounted(true);
        }
      });
    }
  }
  commit(phase) {
    if (isNextRenderNodeCommitPhase(this._commitPhase, phase)) {
      this.renderNode?.commit(phase);
      this._commitPhase = phase;
    }
  }
  __alive() {
    try {
      this.calculationSubscription = this.calculation.subscribe(this.subscribe);
      this.subscribe(void 0, this.calculation(), (action) => {
        action();
      });
    } catch (e) {
      this.subscribe(1 /* EXCEPTION */, wrapError(e), (action) => {
        action();
      });
    }
  }
  __dead() {
    this.calculationSubscription?.();
    this.calculationSubscription = void 0;
    this.cleanPrior();
    removeRenderNode(this);
    this.emitter = void 0;
  }
};
var CollectionRenderNode = class {
  constructor(collection2, debugName) {
    this.handleCollectionEvent = (events) => {
      for (const event of events) {
        switch (event.type) {
          case "splice" /* SPLICE */: {
            const newChildren = [];
            if (event.items) {
              for (const [index, item] of event.items.entries()) {
                const child = renderJSXNode(item);
                newChildren.push(child);
                this.childIndex.set(child, event.index + index);
              }
            }
            const removed = this.children.splice(event.index, event.count, ...newChildren);
            this.batchChildEvents(() => {
              for (const child of removed) {
                this.releaseChild(child);
                this.childIndex.delete(child);
              }
            });
            this.slotSizes.splice(event.index, event.count, ...newChildren.map(() => 0));
            if (newChildren.length !== event.count) {
              for (let i = event.index + newChildren.length; i < this.children.length; ++i) {
                this.childIndex.set(this.children[i], i);
              }
            }
            this.batchChildEvents(() => {
              for (const child of newChildren) {
                this.retainChild(child);
              }
            });
            break;
          }
          case "move" /* MOVE */: {
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
            applyArrayEvent(this.slotSizes, event);
            event.from = slotStartIndex[event.from];
            event.count = realCount;
            event.to = slotStartIndex[event.to];
            this.emitter?.(event);
            break;
          }
          case "sort" /* SORT */: {
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
            applyArrayEvent(this.slotSizes, event);
            applyArrayEvent(nestedIndexes, event);
            const sortedIndexes = nestedIndexes.slice(event.from).flat();
            event.from = realFrom;
            event.indexes = sortedIndexes;
            this.emitter?.(event);
            break;
          }
        }
      }
    };
    this._type = RenderNodeType;
    this._commitPhase = 3 /* COMMIT_MOUNT */;
    this.collection = collection2;
    this.children = [];
    this.childIndex = /* @__PURE__ */ new Map();
    this.slotSizes = [];
    this.isMounted = false;
    this.__debugName = debugName ?? `rendercoll`;
    this.__refcount = 0;
  }
  batchChildEvents(fn) {
    this.batchEvents = [];
    fn();
    this.batchEvents.sort((a, b) => a[0] - b[0]);
    let eventIndex = 0;
    let shiftAmount = 0;
    for (let slotIndex = 0; eventIndex < this.batchEvents.length && slotIndex < this.slotSizes.length; ++slotIndex) {
      while (eventIndex < this.batchEvents.length && this.batchEvents[eventIndex][0] === slotIndex) {
        const event = this.batchEvents[eventIndex][1];
        if (event.type === "splice" /* SPLICE */) {
          this.slotSizes[slotIndex] += (event.items?.length ?? 0) - event.count;
        }
        if (this.emitter) {
          shiftEventBy(shiftAmount, event);
          this.emitter(event);
        }
        eventIndex++;
      }
      shiftAmount += this.slotSizes[slotIndex];
    }
    this.batchEvents = void 0;
  }
  attach(emitter, parentXmlNamespace) {
    this.emitter = emitter;
    this.parentXmlNamespace = parentXmlNamespace;
    this.batchChildEvents(() => {
      for (const child of this.children) {
        child.attach((event) => {
          this.handleChildEvent(event, child);
        }, parentXmlNamespace);
      }
    });
  }
  detach() {
    for (const child of this.children) {
      child.detach();
    }
    this.emitter = void 0;
  }
  handleChildEvent(event, child) {
    if (this.emitter) {
      if (!(event instanceof Error)) {
        const index = this.childIndex.get(child);
        if (this.batchEvents) {
          this.batchEvents.push([index, event]);
        } else {
          shiftEvent(this.slotSizes, index, event);
          this.emitter(event);
        }
      } else {
        this.emitter(event);
      }
    }
  }
  setMounted(isMounted) {
    this.isMounted = isMounted;
    for (const child of this.children) {
      child.setMounted(isMounted);
    }
  }
  retain() {
    retain(this);
  }
  release() {
    release(this);
  }
  releaseChild(child) {
    if (this.emitter) {
      if (this.isMounted) {
        child.setMounted(false);
      }
      child.detach();
    }
    disown(this, child);
  }
  retainChild(child) {
    own(this, child);
    if (this.emitter && this.parentXmlNamespace) {
      child.attach((event) => this.handleChildEvent(event, child), this.parentXmlNamespace);
      if (this.isMounted) {
        child.setMounted(true);
      }
    }
  }
  commit(phase) {
    if (isNextRenderNodeCommitPhase(this._commitPhase, phase)) {
      for (const child of this.children) {
        child.commit(phase);
      }
      this._commitPhase = phase;
    }
  }
  __alive() {
    retain(this.collection);
    this.unsubscribe = this.collection.subscribe(this.handleCollectionEvent);
    untrackReads(() => {
      this.batchChildEvents(() => {
        for (const [index, item] of this.collection.entries()) {
          const child = renderJSXNode(item);
          this.children.push(child);
          this.slotSizes.push(0);
          this.childIndex.set(child, index);
          this.retainChild(child);
        }
      });
    });
  }
  __dead() {
    this.unsubscribe?.();
    release(this.collection);
    const removed = this.children.splice(0, this.children.length);
    for (const child of removed) {
      this.releaseChild(child);
      this.childIndex.delete(child);
    }
    this.slotSizes.splice(0, this.slotSizes.length);
    this.emitter = void 0;
    removeRenderNode(this);
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
  const root = new PortalRenderNode(target, new ArrayRenderNode([node]), null, "root");
  retain(root);
  let syncError;
  root.attach((event) => {
    if (event instanceof Error) {
      syncError = event;
      error("Unhandled mount error", event);
      return;
    }
  }, target.namespaceURI ?? HTML_NAMESPACE);
  if (syncError) {
    release(root);
    throw syncError;
  }
  root.setMounted(true);
  flush();
  return () => {
    root.setMounted(false);
    root.detach();
    flush();
    release(root);
  };
}
var IntrinsicObserverEventType = /* @__PURE__ */ ((IntrinsicObserverEventType2) => {
  IntrinsicObserverEventType2["MOUNT"] = "mount";
  IntrinsicObserverEventType2["UNMOUNT"] = "unmount";
  return IntrinsicObserverEventType2;
})(IntrinsicObserverEventType || {});
var IntrinsicObserverRenderNode = class {
  constructor(nodeCallback, elementCallback, children, debugName) {
    this._type = RenderNodeType;
    this._commitPhase = 3 /* COMMIT_MOUNT */;
    this.nodeCallback = nodeCallback;
    this.elementCallback = elementCallback;
    this.child = new ArrayRenderNode(children);
    this.childNodes = [];
    this.pendingMount = [];
    this.pendingUnmount = [];
    this.isMounted = false;
    this.__debugName = debugName ?? `lifecycleobserver`;
    this.__refcount = 0;
  }
  notify(node, type) {
    switch (type) {
      case "mount" /* MOUNT */:
        this.pendingMount.push(node);
        break;
      case "unmount" /* UNMOUNT */:
        this.pendingUnmount.push(node);
        break;
      default:
        assertExhausted(type);
    }
    dirtyRenderNode(this);
  }
  commit(phase) {
    if (!isNextRenderNodeCommitPhase(this._commitPhase, phase)) {
      return;
    }
    this.child.commit(phase);
    this._commitPhase = phase;
    switch (phase) {
      case 0 /* COMMIT_UNMOUNT */:
        if (this.pendingUnmount.length > 0) {
          for (const node of this.pendingUnmount) {
            this.nodeCallback?.(node, "unmount" /* UNMOUNT */);
            if (node instanceof Element) {
              this.elementCallback?.(node, "unmount" /* UNMOUNT */);
            }
          }
          this.pendingUnmount = [];
        }
        break;
      case 3 /* COMMIT_MOUNT */:
        if (this.pendingMount.length > 0) {
          for (const node of this.pendingMount) {
            this.nodeCallback?.(node, "mount" /* MOUNT */);
            if (node instanceof Element) {
              this.elementCallback?.(node, "mount" /* MOUNT */);
            }
          }
          this.pendingMount = [];
        }
        break;
    }
  }
  handleEvent(event) {
    if (event instanceof Error) {
      if (this.emitter) {
        this.emitter(event);
      } else {
        warn("Unhandled error on detached IntrinsicObserverRenderNode", event);
      }
      return;
    }
    if (event.type === "splice" /* SPLICE */) {
      for (let i = 0; i < event.count; ++i) {
        const node = this.childNodes[event.index + i];
        if (this.isMounted) {
          this.notify(node, "unmount" /* UNMOUNT */);
        }
      }
    }
    applyArrayEvent(this.childNodes, event);
    this.emitter?.(event);
    if (event.type === "splice" /* SPLICE */) {
      if (event.items) {
        for (const node of event.items) {
          if (this.isMounted) {
            this.notify(node, "mount" /* MOUNT */);
          }
        }
      }
    }
  }
  detach() {
    this.child.detach();
    this.emitter = void 0;
  }
  attach(emitter, parentXmlNamespace) {
    this.emitter = emitter;
    this.child.attach((event) => {
      this.handleEvent(event);
    }, parentXmlNamespace);
  }
  setMounted(isMounted) {
    this.child.setMounted(isMounted);
    this.isMounted = isMounted;
    const event = isMounted ? "mount" /* MOUNT */ : "unmount" /* UNMOUNT */;
    for (const node of this.childNodes) {
      this.notify(node, event);
    }
  }
  retain() {
    retain(this);
  }
  release() {
    release(this);
  }
  __alive() {
    own(this, this.child);
  }
  __dead() {
    disown(this, this.child);
    removeRenderNode(this);
    this.emitter = void 0;
  }
};
var IntrinsicObserver = ({ nodeCallback, elementCallback, children }) => {
  return new IntrinsicObserverRenderNode(nodeCallback, elementCallback, renderJSXChildren(children));
};
var ComponentRenderNode = class {
  constructor(Component2, props, children, debugName) {
    this.handleEvent = (event) => {
      assert(!(this.result instanceof Error), "Invariant: received event on calculation error");
      if (event instanceof Error && this.errorHandler) {
        if (this.result) {
          if (this.resultAttached) {
            if (this.isMounted) {
              this.result.setMounted(false);
            }
            this.result.detach();
            this.resultAttached = false;
          }
          disown(this, this.result);
          this.result = void 0;
        }
        const handledResult = this.errorHandler(event);
        this.result = handledResult ? renderJSXNode(handledResult) : emptyRenderNode;
        own(this, this.result);
        if (this.emitter && this.parentXmlNamespace) {
          this.result.attach(this.handleEvent, this.parentXmlNamespace);
          this.resultAttached = true;
        }
        if (this.isMounted) {
          this.result.setMounted(true);
        }
      } else {
        this.emitter?.(event);
      }
    };
    this._type = RenderNodeType;
    this._commitPhase = 3 /* COMMIT_MOUNT */;
    this.Component = Component2;
    this.props = props;
    this.children = children;
    this.owned = /* @__PURE__ */ new Set();
    this.isMounted = false;
    this.resultAttached = false;
    this.__debugName = debugName ?? `component(${Component2.name})`;
    this.__refcount = 0;
  }
  detach() {
    assert(this.result, "Invariant: missing component result");
    if (this.result instanceof Error) {
      return;
    }
    assert(this.resultAttached, "Invariant: detached unattached component result");
    this.result.detach();
    this.resultAttached = false;
    this.emitter = void 0;
  }
  ensureResult() {
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
        onDestroy: (handler) => {
          assert(callbacksAllowed, "onDestroy must be called in component body");
          if (!this.onDestroyCallbacks)
            this.onDestroyCallbacks = [];
          this.onDestroyCallbacks.push(handler);
        },
        onError: (errorHandler) => {
          assert(callbacksAllowed, "onError must be called in component body");
          assert(!this.errorHandler, "onError called multiple times");
          this.errorHandler = errorHandler;
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
      let jsxResult;
      try {
        jsxResult = trackCreates(this.owned, () => Component2(componentProps, lifecycle) || emptyRenderNode);
      } catch (e) {
        const error2 = wrapError(e, "Unknown error rendering component");
        if (this.errorHandler) {
          jsxResult = this.errorHandler(error2) ?? emptyRenderNode;
        } else {
          jsxResult = error2;
        }
      }
      callbacksAllowed = false;
      for (const item of this.owned) {
        retain(item);
      }
      if (!(jsxResult instanceof Error)) {
        this.result = renderJSXNode(jsxResult);
        own(this, this.result);
      } else {
        this.result = jsxResult;
      }
    }
    return this.result;
  }
  attach(emitter, parentXmlNamespace) {
    assert(this.__refcount > 0, "Invariant: dead ComponentRenderNode called attach");
    this.emitter = emitter;
    this.parentXmlNamespace = parentXmlNamespace;
    const result = this.ensureResult();
    if (result instanceof Error) {
      emitter(result);
    } else {
      result.attach(this.handleEvent, parentXmlNamespace);
      this.resultAttached = true;
    }
  }
  setMounted(isMounted) {
    assert(this.result, "Invariant: missing result");
    this.isMounted = isMounted;
    if (this.result instanceof Error) {
      return;
    }
    if (isMounted) {
      this.needsMount = true;
      dirtyRenderNode(this);
      this.result.setMounted(isMounted);
    } else {
      this.result.setMounted(isMounted);
      if (this.onUnmountCallbacks) {
        for (const callback of this.onUnmountCallbacks) {
          callback();
        }
      }
    }
  }
  commit(phase) {
    if (!isNextRenderNodeCommitPhase(this._commitPhase, phase)) {
      return;
    }
    if (this.result && !(this.result instanceof Error)) {
      this.result.commit(phase);
    }
    this._commitPhase = phase;
    if (phase === 3 /* COMMIT_MOUNT */ && this.needsMount && this.onMountCallbacks) {
      for (const callback of this.onMountCallbacks) {
        const maybeOnUnmount = callback();
        if (typeof maybeOnUnmount === "function") {
          if (!this.onUnmountCallbacks) {
            this.onUnmountCallbacks = [];
          }
          const onUnmount = () => {
            maybeOnUnmount();
            if (this.onUnmountCallbacks) {
              const index = this.onUnmountCallbacks.indexOf(onUnmount);
              if (index >= 0) {
                this.onUnmountCallbacks.splice(index, 1);
              }
            }
          };
          this.onUnmountCallbacks.push(onUnmount);
        }
      }
      this.needsMount = false;
    }
  }
  retain() {
    retain(this);
  }
  release() {
    release(this);
  }
  __alive() {
    this.ensureResult();
  }
  __dead() {
    if (this.onDestroyCallbacks) {
      for (const callback of this.onDestroyCallbacks) {
        callback();
      }
    }
    if (this.result && !(this.result instanceof Error)) {
      disown(this, this.result);
    }
    this.result = void 0;
    for (const item of this.owned) {
      release(item);
    }
    this.emitter = void 0;
    removeRenderNode(this);
  }
};
function classComponentToFunctionComponentRenderNode(Component2, props, children) {
  return new ComponentRenderNode((props2, lifecycle) => {
    const instance = new Component2(props2);
    if (!instance.render)
      return null;
    if (instance.onDestroy)
      lifecycle.onDestroy(instance.onDestroy.bind(instance));
    if (instance.onMount)
      lifecycle.onMount(instance.onMount.bind(instance));
    if (instance.onError)
      lifecycle.onError(instance.onError.bind(instance));
    if (instance.onUnmount)
      lifecycle.onUnmount(instance.onUnmount.bind(instance));
    return instance.render();
  }, props, children, Component2.name);
}

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
  if (isClassComponent(type)) {
    return classComponentToFunctionComponentRenderNode(type, props, children);
  }
  return new ComponentRenderNode(type, props, children);
}
createElement.Fragment = Fragment;

// src/model.ts
var ModelPrototype = {
  __debugName: "",
  __refcount: 0,
  __alive: noop,
  __dead: noop
};
var ModelEventType = /* @__PURE__ */ ((ModelEventType2) => {
  ModelEventType2["ADD"] = "add";
  ModelEventType2["SET"] = "set";
  ModelEventType2["DEL"] = "del";
  return ModelEventType2;
})(ModelEventType || {});
function model(target, debugName) {
  const proxyHandler = {
    get: (dataAccessor, emitter, prop, receiver) => dataAccessor.get(prop, receiver),
    has: (dataAccessor, emitter, prop) => dataAccessor.has(prop),
    set: (dataAccessor, emitter, prop, value, receiver) => {
      if (typeof prop === "string" && !Object.prototype.hasOwnProperty.call(ModelPrototype, prop)) {
        if (dataAccessor.peekHas(prop)) {
          emitter({ type: "set" /* SET */, prop, value });
        } else {
          emitter({ type: "add" /* ADD */, prop, value });
        }
      }
      return dataAccessor.set(prop, value, receiver);
    },
    delete: (dataAccessor, emitter, prop) => {
      if (typeof prop === "string" && !Object.prototype.hasOwnProperty.call(ModelPrototype, prop) && dataAccessor.peekHas(prop)) {
        emitter({ type: "del" /* DEL */, prop });
      }
      return dataAccessor.delete(prop);
    }
  };
  const modelInterface = new TrackedDataHandle(target, proxyHandler, ModelPrototype, null, null, addModelEvent, addModelEvent, debugName);
  return modelInterface.revocable.proxy;
}
model.subscribe = function modelSubscribe(sourceModel, handler, debugName) {
  const sourceTDHandle = getTrackedDataHandle(sourceModel);
  assert(sourceTDHandle, "missing tdHandle");
  retain(sourceTDHandle.emitter);
  const unsubscribe = sourceTDHandle.emitter.subscribe((events) => {
    handler(events);
  });
  return () => {
    unsubscribe();
    release(sourceTDHandle.emitter);
  };
};
model.keys = function modelKeys(sourceModel, debugName) {
  const sourceTDHandle = getTrackedDataHandle(sourceModel);
  assert(sourceTDHandle, "missing tdHandle");
  const initialKeys = Object.keys(sourceModel);
  const derivedCollection = new TrackedDataHandle(initialKeys, ViewHandler, makeViewPrototype(sourceModel), sourceTDHandle.emitter, function* keysHandler(target, events) {
    for (const event of events) {
      switch (event.type) {
        case "del" /* DEL */: {
          const index = target.indexOf(event.prop);
          if (index !== -1) {
            const prevLength = target.length;
            target.splice(index, 1);
            const newLength = target.length;
            for (let i = index; i < target.length; ++i) {
              derivedCollection.fieldMap.set(i.toString(), target[i]);
            }
            for (let i = newLength; i < prevLength; ++i) {
              derivedCollection.fieldMap.delete(i.toString());
            }
            derivedCollection.fieldMap.set("length", target.length);
            yield {
              type: "splice" /* SPLICE */,
              index,
              count: 1,
              items: []
            };
          }
          break;
        }
        case "add" /* ADD */: {
          const length = target.length;
          target.push(event.prop);
          derivedCollection.fieldMap.set(length.toString(), event.prop);
          derivedCollection.fieldMap.set("length", target.length);
          yield {
            type: "splice" /* SPLICE */,
            index: length,
            count: 0,
            items: [event.prop]
          };
          break;
        }
        case "set" /* SET */:
          break;
        default:
          assertExhausted(event);
      }
    }
  }, addArrayEvent, addModelEvent, debugName);
  return derivedCollection.revocable.proxy;
};
function addModelEvent(events, event) {
  events.push(event);
}

// src/index.ts
var src_default = createElement;
var VERSION = true ? "0.13.0" : "development";
module.exports = __toCommonJS(src_exports);
//# sourceMappingURL=index.debug.cjs.map
