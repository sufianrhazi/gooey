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
function* noopGenerator() {
}
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
    __publicField(this, "startVertexIndex");
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
    assert(this.forwardAdjacencyEither[id].length === 0, "cannot remove vertex with forward edges");
    assert(this.reverseAdjacencyEither[id].length === 0, "cannot remove vertex with reverse edges");
    this.topologicalIndexById[id] = void 0;
    this.topologicalOrdering[index] = void 0;
    this.clearVertexDirtyInner(id);
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
      this.startVertexIndex++;
      if (vertexIndex >= this.vertexById.length) {
        this.startVertexIndex = 0;
        break;
      }
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

// src/symbols.ts
var SymDebugName = Symbol("debugName");
var SymRefcount = Symbol("refcount");
var SymAlive = Symbol("alive");
var SymDead = Symbol("dead");
var SymRecalculate = Symbol("recalculate");
var SymCycle = Symbol("cycle");
var SymInvalidate = Symbol("invalidate");
var SymProcessable = Symbol("processable");

// src/engine.ts
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
function pumpFlush() {
  if (!needsFlush)
    return;
  if (flushHandle) {
    flushHandle();
    flushHandle = null;
  }
  needsFlush = false;
  flush();
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
  if (needsFlush) {
    pumpFlush();
  }
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
function shiftEvent(slotSizes, slotIndex, event) {
  let shiftAmount = 0;
  for (let i = 0; i < slotIndex; ++i) {
    shiftAmount += slotSizes[i];
  }
  switch (event.type) {
    case "splice" /* SPLICE */: {
      slotSizes[slotIndex] += (event.items?.length ?? 0) - event.count;
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
function applyArrayEvent(target, event) {
  switch (event.type) {
    case "splice" /* SPLICE */: {
      if (event.items) {
        target.splice(event.index, event.count, ...event.items);
      } else {
        target.splice(event.index, event.count);
      }
      break;
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
        if (this._subscriptions) {
          const error2 = wrapError(e, "Unknown error in calculation");
          for (const subscription of this._subscriptions) {
            subscription(1 /* EXCEPTION */, error2);
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
          subscription(void 0, newResult);
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
        if (this._subscriptions) {
          const error2 = new Error("Calculation found to be in a cycle");
          for (const subscription of this._subscriptions) {
            subscription(0 /* CYCLE */, error2);
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
          subscription(void 0, this._val);
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

// src/fieldmap.ts
var _a, _b;
var FieldMap = class {
  constructor(consumer, emitter, debugName) {
    __publicField(this, "fieldMap");
    __publicField(this, "consumer");
    __publicField(this, "emitter");
    __publicField(this, _a);
    __publicField(this, _b, 0);
    this[SymDebugName] = debugName ?? "fieldmap";
    this.fieldMap = /* @__PURE__ */ new Map();
    this.consumer = consumer;
    this.emitter = emitter;
  }
  getOrMake(prop, val) {
    let field2 = this.fieldMap.get(prop);
    if (!field2) {
      field2 = field(prop, val, `${this[SymDebugName]}:${prop}`);
      this.fieldMap.set(prop, field2);
      if (this[SymRefcount] > 0) {
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
      if (this[SymRefcount] > 0) {
        if (this.emitter)
          removeSoftEdge(field2, this.emitter);
        if (this.consumer)
          removeSoftEdge(this.consumer, field2);
        release(field2);
      }
    }
  }
  [(_a = SymDebugName, _b = SymRefcount, SymDead)]() {
    for (const field2 of this.fieldMap.values()) {
      if (this.emitter)
        removeSoftEdge(field2, this.emitter);
      if (this.consumer)
        removeSoftEdge(this.consumer, field2);
      release(field2);
    }
    if (this.emitter)
      release(this.emitter);
    if (this.consumer)
      release(this.consumer);
  }
  [SymAlive]() {
    if (this.emitter)
      retain(this.emitter);
    if (this.consumer)
      retain(this.consumer);
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
var _a2, _b2, _c;
var SubscriptionEmitter = class {
  constructor(debugName) {
    __publicField(this, "subscribers");
    __publicField(this, "subscriberOffset");
    __publicField(this, "events");
    __publicField(this, "isActive");
    __publicField(this, _a2);
    __publicField(this, _b2);
    __publicField(this, _c);
    this.subscribers = [];
    this.subscriberOffset = [];
    this.events = [];
    this.isActive = false;
    this[SymRefcount] = 0;
    this[SymProcessable] = true;
    this[SymDebugName] = `emitter:${debugName}`;
  }
  [(_a2 = SymProcessable, _b2 = SymDebugName, SymRecalculate)]() {
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
  }
  [SymDead]() {
    assert(this.subscribers.length === 0, "released subscription emitter that had subscribers");
    assert(this.subscriberOffset.length === 0, "released subscription emitter that had subscribers");
    this.events.splice(0, this.events.length);
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
  removeField(field2) {
    if (this.isActive) {
      removeSoftEdge(field2, this);
      release(field2);
    }
  }
  subscribe(handler) {
    this.subscribers.push(handler);
    this.subscriberOffset.push(this.events.length);
    return () => {
      const index = this.subscribers.indexOf(handler);
      if (index === -1)
        return;
      this.subscribers.splice(index, 1);
      this.subscriberOffset.splice(index, 1);
    };
  }
};

// src/subscriptionconsumer.ts
var _a3, _b3, _c2;
var SubscriptionConsumer = class {
  constructor(target, sourceEmitter, transformEmitter, handler, debugName) {
    __publicField(this, "target");
    __publicField(this, "handler");
    __publicField(this, "events");
    __publicField(this, "isActive");
    __publicField(this, "sourceEmitter");
    __publicField(this, "transformEmitter");
    __publicField(this, "unsubscribe");
    __publicField(this, _a3);
    __publicField(this, _b3);
    __publicField(this, _c2);
    this.target = target;
    this.handler = handler;
    this.events = [];
    this.isActive = false;
    this.sourceEmitter = sourceEmitter;
    this.transformEmitter = transformEmitter;
    this[SymRefcount] = 0;
    this[SymProcessable] = true;
    this[SymDebugName] = `consumer:${debugName}`;
  }
  [(_a3 = SymProcessable, _b3 = SymDebugName, SymRecalculate)]() {
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
  removeField(field2) {
    if (this.isActive) {
      removeSoftEdge(this, field2);
      release(field2);
    }
  }
};

// src/trackeddata.ts
var SymTDHandle = Symbol("tdHandle");
var TrackedDataHandle = class {
  constructor(target, proxyHandler, methods, derivedEmitter, handleEvent, debugName = "trackeddata") {
    __publicField(this, "target");
    __publicField(this, "methods");
    __publicField(this, "fieldMap");
    __publicField(this, "keys");
    __publicField(this, "keysField");
    __publicField(this, "dataAccessor");
    __publicField(this, "emitter");
    __publicField(this, "consumer");
    __publicField(this, "revocable");
    this.target = target;
    this.methods = methods;
    this.keys = new Set(Object.keys(target));
    this.keysField = field(`${debugName}:@keys`, this.keys.size);
    this.emitter = new SubscriptionEmitter(debugName);
    if (derivedEmitter && handleEvent) {
      this.consumer = new SubscriptionConsumer(target, derivedEmitter, this.emitter, handleEvent, debugName);
    } else {
      this.consumer = null;
    }
    this.fieldMap = new FieldMap(this.consumer, this.emitter, debugName);
    const emitEvent = (event) => {
      this.emitter.addEvent(event);
    };
    this.dataAccessor = {
      get: (prop, receiver) => {
        if (prop === SymTDHandle) {
          return this;
        }
        if (prop === SymDebugName) {
          return debugName;
        }
        if (prop === SymRefcount || prop === SymAlive || prop === SymDead) {
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
        const field2 = this.fieldMap.getOrMake(prop, value);
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
        const field2 = this.fieldMap.getOrMake(prop, value);
        field2.set(value);
        if (!hadProp) {
          this.keys.add(prop);
          this.keysField.set(this.keys.size);
        }
        return Reflect.set(target, prop, value, this.revocable.proxy);
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
  return trackedData[SymTDHandle];
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
    [SymRefcount]: 0,
    [SymAlive]() {
      retain(sourceCollection);
      const tdHandle = getTrackedDataHandle(this);
      assert(tdHandle, "missing tdHandle");
      retain(tdHandle.fieldMap);
    },
    [SymDead]() {
      const tdHandle = getTrackedDataHandle(this);
      assert(tdHandle, "missing tdHandle");
      release(tdHandle.fieldMap);
      release(sourceCollection);
    },
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
  const handle = new TrackedDataHandle(items, CollectionHandler, makeCollectionPrototype(), null, null, debugName);
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
  const unsubscribe = tdHandle.emitter.subscribe((events, offset) => {
    handler(offset > 0 ? events.slice(offset) : events);
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
  const derivedCollection = new TrackedDataHandle(initialTransform, ViewHandler, makeViewPrototype(sourceCollection), sourceTDHandle.emitter, function* (target, event) {
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
  }, debugName ?? "derived");
  return derivedCollection.revocable.proxy;
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
var _a4, _b4, _c3, _d;
var EmptyRenderNode = class {
  constructor() {
    __publicField(this, "_type", RenderNodeType);
    __publicField(this, "detach", noopGenerator);
    __publicField(this, "attach", noop);
    __publicField(this, "onMount", noop);
    __publicField(this, "onUnmount", noop);
    __publicField(this, _a4);
    __publicField(this, _b4);
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
_a4 = SymDebugName, _b4 = SymRefcount, _c3 = SymAlive, _d = SymDead;
var emptyRenderNode = new EmptyRenderNode();
var _a5, _b5, _c4;
var TextRenderNode = class {
  constructor(string, debugName) {
    __publicField(this, "_type", RenderNodeType);
    __publicField(this, "text");
    __publicField(this, "emitter");
    __publicField(this, "onMount", noop);
    __publicField(this, "onUnmount", noop);
    __publicField(this, _a5);
    __publicField(this, _b5);
    __publicField(this, _c4, noop);
    this.text = document.createTextNode(string);
    this.emitter = null;
    this[SymDebugName] = debugName ?? "text";
    this[SymRefcount] = 0;
  }
  detach() {
    this.emitter?.({ type: "splice" /* SPLICE */, index: 0, count: 1 });
    this.emitter = null;
  }
  attach(emitter, context) {
    assert(!this.emitter, "Invariant: Text node double attached");
    this.emitter = emitter;
    this.emitter?.({
      type: "splice" /* SPLICE */,
      index: 0,
      count: 0,
      items: [this.text]
    });
  }
  retain() {
    retain(this);
  }
  release() {
    release(this);
  }
  [(_a5 = SymDebugName, _b5 = SymRefcount, _c4 = SymAlive, SymDead)]() {
    this.emitter = null;
  }
};
var _a6, _b6, _c5;
var ForeignRenderNode = class {
  constructor(node, debugName) {
    __publicField(this, "_type", RenderNodeType);
    __publicField(this, "node");
    __publicField(this, "emitter");
    __publicField(this, "onMount", noop);
    __publicField(this, "onUnmount", noop);
    __publicField(this, _a6);
    __publicField(this, _b6);
    __publicField(this, _c5, noop);
    this.node = node;
    this.emitter = null;
    this[SymDebugName] = debugName ?? "foreign";
    this[SymRefcount] = 0;
  }
  detach() {
    this.emitter?.({ type: "splice" /* SPLICE */, index: 0, count: 1 });
    this.emitter = null;
  }
  attach(emitter, context) {
    assert(!this.emitter, "Invariant: Foreign node double attached");
    this.emitter = emitter;
    this.emitter?.({
      type: "splice" /* SPLICE */,
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
  [(_a6 = SymDebugName, _b6 = SymRefcount, _c5 = SymAlive, SymDead)]() {
    this.emitter = null;
  }
};
var _a7, _b7;
var ArrayRenderNode = class {
  constructor(children, debugName) {
    __publicField(this, "_type", RenderNodeType);
    __publicField(this, "children");
    __publicField(this, "slotSizes");
    __publicField(this, "attached");
    __publicField(this, "emitter");
    __publicField(this, _a7);
    __publicField(this, _b7);
    this.children = children;
    this.slotSizes = children.map(() => 0);
    this.attached = children.map(() => false);
    this.emitter = null;
    this[SymDebugName] = debugName ?? "array";
    this[SymRefcount] = 0;
  }
  detach() {
    for (const [index, child] of this.children.entries()) {
      if (this.attached[index]) {
        child.detach();
        this.attached[index] = false;
      }
    }
    this.emitter = null;
  }
  attach(emitter, context) {
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
      }, context);
      this.attached[index] = true;
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
  [(_a7 = SymDebugName, _b7 = SymRefcount, SymAlive)]() {
    for (const child of this.children) {
      retain(child);
    }
  }
  [SymDead]() {
    for (const child of this.children) {
      release(child);
    }
    this.emitter = null;
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
var previousFocusedDetachedElement = null;
var EventProps = [
  { prefix: "on:", param: false },
  { prefix: "oncapture:", param: true },
  { prefix: "onpassive:", param: { passive: true } }
];
var _a8, _b8;
var IntrinsicRenderNode = class {
  constructor(tagName, props, children, debugName) {
    __publicField(this, "_type", RenderNodeType);
    __publicField(this, "tagName");
    __publicField(this, "element");
    __publicField(this, "emitter");
    __publicField(this, "xmlNamespace");
    __publicField(this, "childXmlNamespace");
    __publicField(this, "props");
    __publicField(this, "children");
    __publicField(this, "portalRenderNode");
    __publicField(this, "calculations");
    __publicField(this, "calculationSubscriptions");
    __publicField(this, "handleEvent", (event) => {
      if (event instanceof Error) {
        this.emitter?.(event);
        return;
      }
      assert(false, "unexpected event from PortalRenderNode");
    });
    __publicField(this, _a8);
    __publicField(this, _b8);
    this.emitter = null;
    this.props = props;
    this.children = new ArrayRenderNode(children);
    this.portalRenderNode = null;
    this.element = null;
    this.tagName = tagName;
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
        if (EventProps.some(({ prefix, param }) => {
          if (prop.startsWith(prefix)) {
            element.addEventListener(prop.slice(prefix.length), (e) => {
              try {
                val(e, element);
              } finally {
                pumpFlush();
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
          this.calculationSubscriptions.add(calculation.onRecalc((error2, updatedVal) => {
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
    this.emitter = null;
  }
  attach(emitter, context) {
    assert(!this.emitter, "Invariant: Intrinsic node double attached");
    this.emitter = emitter;
    const parentXmlNamespace = readContext(context, XmlNamespaceContext);
    const namespaceTransition = elementNamespaceTransitionMap[parentXmlNamespace]?.[this.tagName];
    const xmlNamespace = namespaceTransition?.node ?? parentXmlNamespace;
    const childXmlNamespace = namespaceTransition?.children ?? parentXmlNamespace;
    if (!this.element || xmlNamespace !== this.xmlNamespace) {
      this.xmlNamespace = xmlNamespace;
      this.element = this.createElement(xmlNamespace);
      if (this.portalRenderNode) {
        this.portalRenderNode.detach();
        release(this.portalRenderNode);
      }
      this.portalRenderNode = new PortalRenderNode(this.element, this.children, this.props?.ref);
      retain(this.portalRenderNode);
      let subContext = context;
      if (parentXmlNamespace !== childXmlNamespace) {
        subContext = new Map(context);
        subContext.set(XmlNamespaceContext, childXmlNamespace);
      }
      this.portalRenderNode.attach(this.handleEvent, subContext);
    }
    this.emitter?.({
      type: "splice" /* SPLICE */,
      index: 0,
      count: 0,
      items: [this.element]
    });
  }
  onMount() {
    this.portalRenderNode?.onMount();
  }
  onUnmount() {
    this.portalRenderNode?.onUnmount();
  }
  retain() {
    retain(this);
  }
  release() {
    release(this);
  }
  [(_a8 = SymDebugName, _b8 = SymRefcount, SymAlive)]() {
    retain(this.children);
  }
  [SymDead]() {
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
    this.element = null;
    if (this.portalRenderNode) {
      release(this.portalRenderNode);
      this.portalRenderNode = null;
    }
    release(this.children);
    this.emitter = null;
  }
};
var _a9, _b9;
var PortalRenderNode = class {
  constructor(element, children, refProp, debugName) {
    __publicField(this, "_type", RenderNodeType);
    __publicField(this, "tagName");
    __publicField(this, "element");
    __publicField(this, "refProp");
    __publicField(this, "emitter");
    __publicField(this, "xmlNamespace");
    __publicField(this, "childXmlNamespace");
    __publicField(this, "existingOffset");
    __publicField(this, "arrayRenderNode");
    __publicField(this, "calculations");
    __publicField(this, "calculationSubscriptions");
    __publicField(this, "handleEvent", (event) => {
      if (event instanceof Error) {
        this.emitter?.(event);
        return;
      }
      assert(this.element, "missing element");
      switch (event.type) {
        case "splice" /* SPLICE */: {
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
        case "move" /* MOVE */: {
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
        case "sort" /* SORT */: {
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
    __publicField(this, _a9);
    __publicField(this, _b9);
    this.emitter = null;
    this.arrayRenderNode = children;
    this.element = element;
    this.refProp = refProp;
    this.tagName = this.element.tagName;
    this.existingOffset = element.childNodes.length;
    this.xmlNamespace = null;
    this.childXmlNamespace = null;
    this[SymDebugName] = debugName ?? `mount:${this.tagName}`;
    this[SymRefcount] = 0;
  }
  detach() {
    this.emitter = null;
    this.arrayRenderNode.detach();
  }
  attach(emitter, contextMap) {
    assert(!this.emitter, "Invariant: Intrinsic node double attached");
    this.emitter = emitter;
    this.arrayRenderNode.attach(this.handleEvent, contextMap);
  }
  onMount() {
    this.arrayRenderNode.onMount();
    if (this.refProp) {
      if (this.refProp instanceof RefObject) {
        this.refProp.current = this.element;
      } else if (typeof this.refProp === "function") {
        this.refProp(this.element);
      }
    }
    if (this.element && this.element.focus && previousFocusedDetachedElement === this.element) {
      this.element.focus();
    }
  }
  onUnmount() {
    if (this.element && document.activeElement === this.element) {
      previousFocusedDetachedElement = this.element;
    }
    if (this.refProp) {
      if (this.refProp instanceof RefObject) {
        this.refProp.current = void 0;
      } else if (typeof this.refProp === "function") {
        this.refProp(void 0);
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
  [(_a9 = SymDebugName, _b9 = SymRefcount, SymAlive)]() {
    retain(this.arrayRenderNode);
  }
  [SymDead]() {
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
    release(this.arrayRenderNode);
    this.emitter = null;
  }
};
var _a10, _b10;
var CalculationRenderNode = class {
  constructor(calculation, debugName) {
    __publicField(this, "_type", RenderNodeType);
    __publicField(this, "error");
    __publicField(this, "renderNode");
    __publicField(this, "calculation");
    __publicField(this, "calculationSubscription");
    __publicField(this, "context");
    __publicField(this, "isMounted");
    __publicField(this, "emitter");
    __publicField(this, _a10);
    __publicField(this, _b10);
    this.calculation = calculation;
    this.calculationSubscription = null;
    this.error = null;
    this.renderNode = null;
    this.context = null;
    this.isMounted = false;
    this.emitter = null;
    this[SymDebugName] = debugName ?? `rendercalc:${calculation[SymDebugName]}`;
    this[SymRefcount] = 0;
    this.onRecalc = this.onRecalc.bind(this);
  }
  detach() {
    this.renderNode?.detach();
    this.context = null;
    this.emitter = null;
  }
  attach(emitter, context) {
    this.context = context;
    this.emitter = emitter;
    if (this.error) {
      emitter(this.error);
    } else {
      this.renderNode?.attach(emitter, context);
    }
  }
  onMount() {
    this.isMounted = true;
    this.renderNode?.onMount();
  }
  onUnmount() {
    this.renderNode?.onUnmount();
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
      if (this.emitter) {
        if (this.isMounted) {
          this.renderNode.onUnmount();
        }
        this.renderNode.detach();
      }
      release(this.renderNode);
      this.error = null;
      this.renderNode = null;
    }
  }
  onRecalc(errorType, val) {
    this.cleanPrior();
    if (errorType) {
      this.error = val;
      this.emitter?.(val);
    } else {
      const renderNode = renderJSXNode(val);
      retain(renderNode);
      afterFlush(() => {
        this.cleanPrior();
        this.renderNode = renderNode;
        if (this.emitter) {
          renderNode.attach(this.emitter, this.context);
        }
        if (this.isMounted) {
          renderNode.onMount();
        }
      });
    }
  }
  [(_a10 = SymDebugName, _b10 = SymRefcount, SymAlive)]() {
    retain(this.calculation);
    try {
      this.onRecalc(void 0, this.calculation());
      this.calculationSubscription = this.calculation.onRecalc(this.onRecalc);
    } catch (e) {
      this.onRecalc(1 /* EXCEPTION */, wrapError(e));
    }
  }
  [SymDead]() {
    release(this.calculation);
    this.cleanPrior();
    this.emitter = null;
  }
};
var _a11, _b11;
var CollectionRenderNode = class {
  constructor(collection2, debugName) {
    __publicField(this, "_type", RenderNodeType);
    __publicField(this, "children");
    __publicField(this, "childIndex");
    __publicField(this, "slotSizes");
    __publicField(this, "collection");
    __publicField(this, "unsubscribe");
    __publicField(this, "context");
    __publicField(this, "isMounted");
    __publicField(this, "emitter");
    __publicField(this, "handleCollectionEvent", (events) => {
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
            for (const child of removed) {
              this.releaseChild(child);
              this.childIndex.delete(child);
            }
            this.slotSizes.splice(event.index, event.count, ...newChildren.map(() => 0));
            if (newChildren.length !== event.count) {
              for (let i = event.index + newChildren.length; i < this.children.length; ++i) {
                this.childIndex.set(this.children[i], i);
              }
            }
            for (const child of newChildren) {
              this.retainChild(child);
            }
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
    });
    __publicField(this, _a11);
    __publicField(this, _b11);
    this.collection = collection2;
    this.children = [];
    this.childIndex = /* @__PURE__ */ new Map();
    this.slotSizes = [];
    this.context = null;
    this.isMounted = false;
    this.emitter = null;
    this[SymDebugName] = debugName ?? `rendercoll`;
    this[SymRefcount] = 0;
  }
  attach(emitter, context) {
    this.emitter = emitter;
    this.context = context;
    for (const child of this.children) {
      child.attach((event) => {
        this.handleChildEvent(event, child);
      }, context);
    }
  }
  detach() {
    for (const child of this.children) {
      child.detach();
    }
    this.emitter = null;
    this.context = null;
  }
  handleChildEvent(event, child) {
    if (this.emitter) {
      if (!(event instanceof Error)) {
        const index = this.childIndex.get(child);
        shiftEvent(this.slotSizes, index, event);
      }
      this.emitter(event);
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
  releaseChild(child) {
    if (this.emitter && this.context) {
      if (this.isMounted) {
        child.onUnmount();
      }
      child.detach();
    }
    release(child);
  }
  retainChild(child) {
    retain(child);
    if (this.emitter && this.context) {
      child.attach((event) => this.handleChildEvent(event, child), this.context);
      if (this.isMounted) {
        child.onMount();
      }
    }
  }
  [(_a11 = SymDebugName, _b11 = SymRefcount, SymAlive)]() {
    retain(this.collection);
    this.unsubscribe = this.collection.subscribe(this.handleCollectionEvent);
    untrackReads(() => {
      for (const [index, item] of this.collection.entries()) {
        const child = renderJSXNode(item);
        this.children.push(child);
        this.slotSizes.push(0);
        this.childIndex.set(child, index);
        this.retainChild(child);
      }
    });
  }
  [SymDead]() {
    this.unsubscribe?.();
    release(this.collection);
    const removed = this.children.splice(0, this.children.length);
    for (const child of removed) {
      this.releaseChild(child);
      this.childIndex.delete(child);
    }
    this.slotSizes.splice(0, this.slotSizes.length);
    this.emitter = null;
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
  const focusMonitor = (e) => {
    if (previousFocusedDetachedElement && e.target && e.target !== document.documentElement && e.target !== document.body) {
      previousFocusedDetachedElement = null;
    }
  };
  document.documentElement.addEventListener("focusin", focusMonitor);
  const root = new PortalRenderNode(target, new ArrayRenderNode([node]), null, "root");
  retain(root);
  const context = /* @__PURE__ */ new Map();
  root.attach((event) => {
    if (event instanceof Error) {
      console.error("Unhandled mount error", event);
      return;
    }
  }, context);
  root.onMount();
  return () => {
    root.onUnmount();
    root.detach();
    release(root);
    document.documentElement.removeEventListener("focusin", focusMonitor);
  };
}
var IntrinsicObserverEventType = /* @__PURE__ */ ((IntrinsicObserverEventType2) => {
  IntrinsicObserverEventType2["MOUNT"] = "mount";
  IntrinsicObserverEventType2["UNMOUNT"] = "unmount";
  return IntrinsicObserverEventType2;
})(IntrinsicObserverEventType || {});
var _a12, _b12;
var IntrinsicObserverRenderNode = class {
  constructor(nodeCallback, elementCallback, children, debugName) {
    __publicField(this, "_type", RenderNodeType);
    __publicField(this, "nodeCallback");
    __publicField(this, "elementCallback");
    __publicField(this, "child");
    __publicField(this, "childNodes");
    __publicField(this, "emitter");
    __publicField(this, "isMounted");
    __publicField(this, _a12);
    __publicField(this, _b12);
    this.nodeCallback = nodeCallback;
    this.elementCallback = elementCallback;
    this.child = new ArrayRenderNode(children);
    this.childNodes = [];
    this.emitter = null;
    this.isMounted = false;
    this[SymDebugName] = debugName ?? `lifecycleobserver`;
    this[SymRefcount] = 0;
  }
  notify(node, type) {
    this.nodeCallback?.(node, type);
    if (node instanceof Element) {
      this.elementCallback?.(node, type);
    }
  }
  handleEvent(event) {
    if (event instanceof Error) {
      this.emitter?.(event);
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
    this.emitter = null;
  }
  attach(emitter, context) {
    this.emitter = emitter;
    this.child.attach((event) => {
      this.handleEvent(event);
    }, context);
  }
  onMount() {
    this.child.onMount();
    this.isMounted = true;
    for (const node of this.childNodes) {
      this.notify(node, "mount" /* MOUNT */);
    }
  }
  onUnmount() {
    this.child.onUnmount();
    this.isMounted = false;
    for (const node of this.childNodes) {
      this.notify(node, "unmount" /* UNMOUNT */);
    }
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
    this.emitter = null;
  }
};
var IntrinsicObserver = ({ nodeCallback, elementCallback, children }) => {
  return new IntrinsicObserverRenderNode(nodeCallback, elementCallback, renderJSXChildren(children));
};
var _a13, _b13, _c6;
var ComponentRenderNode = class {
  constructor(Component2, props, children, debugName) {
    __publicField(this, "_type", RenderNodeType);
    __publicField(this, "Component");
    __publicField(this, "props");
    __publicField(this, "children");
    __publicField(this, "result");
    __publicField(this, "resultAttached");
    __publicField(this, "onMountCallbacks");
    __publicField(this, "onUnmountCallbacks");
    __publicField(this, "onDestroyCallbacks");
    __publicField(this, "getContextCallbacks");
    __publicField(this, "owned");
    __publicField(this, "errorHandler");
    __publicField(this, "emitter");
    __publicField(this, "contextMap");
    __publicField(this, "isMounted");
    __publicField(this, "id");
    __publicField(this, "handleEvent", (event) => {
      assert(!(this.result instanceof Error), "Invariant: received event on calculation error");
      if (event instanceof Error && this.errorHandler) {
        if (this.result) {
          if (this.resultAttached) {
            if (this.isMounted) {
              this.result.onUnmount();
            }
            this.result.detach();
            this.resultAttached = false;
          }
          release(this.result);
          this.result = null;
        }
        const handledResult = this.errorHandler(event);
        this.result = handledResult ? renderJSXNode(handledResult) : emptyRenderNode;
        retain(this.result);
        assert(this.emitter && this.contextMap, "Invariant: received event while unattached");
        this.result.attach(this.handleEvent, this.contextMap);
        this.resultAttached = true;
        if (this.isMounted) {
          this.result.onMount();
        }
      } else {
        this.emitter?.(event);
      }
    });
    __publicField(this, _a13);
    __publicField(this, _b13);
    __publicField(this, _c6, noop);
    this.id = Math.random();
    this.Component = Component2;
    this.props = props;
    this.children = children;
    this.owned = /* @__PURE__ */ new Set();
    this.errorHandler = null;
    this.isMounted = false;
    this.emitter = null;
    this.contextMap = null;
    this.result = null;
    this.resultAttached = false;
    this[SymDebugName] = debugName ?? `component`;
    this[SymRefcount] = 0;
  }
  detach() {
    assert(this.result, "Invariant: missing component result");
    if (this.result instanceof Error) {
      return;
    }
    assert(this.resultAttached, "Invariant: detached unattached component result");
    this.result.detach();
    this.resultAttached = false;
    this.emitter = null;
    this.contextMap = null;
  }
  attach(emitter, contextMap) {
    assert(this[SymRefcount] > 0, "Invariant: dead ComponentRenderNode called setContext");
    this.emitter = emitter;
    this.contextMap = contextMap;
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
        getContext: (context, handler) => {
          assert(callbacksAllowed, "getContext must be called in component body");
          if (handler) {
            if (!this.getContextCallbacks)
              this.getContextCallbacks = /* @__PURE__ */ new Map();
            let callbacks = this.getContextCallbacks.get(context);
            if (!callbacks) {
              callbacks = [];
              this.getContextCallbacks.set(context, callbacks);
            }
            callbacks.push(handler);
          }
          return readContext(contextMap, context);
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
        retain(this.result);
      } else {
        this.result = jsxResult;
      }
    }
    if (this.getContextCallbacks) {
      for (const [
        Context,
        callbacks
      ] of this.getContextCallbacks.entries()) {
        const value = contextMap.has(Context) ? contextMap.get(Context) : Context._get();
        for (const callback of callbacks) {
          callback(value);
        }
      }
    }
    assert(this.result, "Invariant: missing context");
    if (this.result instanceof Error) {
      this.emitter?.(this.result);
    } else {
      this.result.attach(this.handleEvent, contextMap);
      this.resultAttached = true;
    }
  }
  onMount() {
    this.isMounted = true;
    assert(this.result, "Invariant: missing context");
    if (this.result instanceof Error) {
      return;
    }
    this.result.onMount();
    if (this.onMountCallbacks) {
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
    }
  }
  onUnmount() {
    assert(this.result, "Invariant: missing context");
    if (!(this.result instanceof Error) && this.resultAttached) {
      this.result.onUnmount();
      if (this.onUnmountCallbacks) {
        for (const callback of this.onUnmountCallbacks) {
          callback();
        }
      }
    }
    this.isMounted = false;
  }
  retain() {
    retain(this);
  }
  release() {
    release(this);
  }
  [(_a13 = SymDebugName, _b13 = SymRefcount, _c6 = SymAlive, SymDead)]() {
    if (this.onDestroyCallbacks) {
      for (const callback of this.onDestroyCallbacks) {
        callback();
      }
    }
    if (this.result && !(this.result instanceof Error)) {
      release(this.result);
    }
    this.result = null;
    for (const item of this.owned) {
      release(item);
    }
    this.emitter = null;
  }
};
var _a14, _b14;
var ContextRenderNode = class {
  constructor(context, value, children, debugName) {
    __publicField(this, "_type", RenderNodeType);
    __publicField(this, "child");
    __publicField(this, "context");
    __publicField(this, "value");
    __publicField(this, _a14);
    __publicField(this, _b14);
    this.context = context;
    this.value = value;
    this.child = new ArrayRenderNode(children);
    this[SymDebugName] = debugName ?? `context`;
    this[SymRefcount] = 0;
  }
  detach() {
    this.child.detach();
  }
  attach(emitter, context) {
    const derivedContext = new Map(context);
    derivedContext.set(this.context, this.value);
    this.child.attach(emitter, derivedContext);
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
  [(_a14 = SymDebugName, _b14 = SymRefcount, SymAlive)]() {
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
      if (typeof prop === "string") {
        if (dataAccessor.peekHas(prop)) {
          emitter({ type: "set" /* SET */, prop, value });
        } else {
          emitter({ type: "add" /* ADD */, prop, value });
        }
      }
      return dataAccessor.set(prop, value, receiver);
    },
    delete: (dataAccessor, emitter, prop) => {
      if (typeof prop === "string" && dataAccessor.peekHas(prop)) {
        emitter({ type: "del" /* DEL */, prop });
      }
      return dataAccessor.delete(prop);
    }
  };
  const modelInterface = new TrackedDataHandle(target, proxyHandler, ModelPrototype, null, null, debugName);
  return modelInterface.revocable.proxy;
}
model.subscribe = function modelSubscribe(sourceModel, handler, debugName) {
  const sourceTDHandle = getTrackedDataHandle(sourceModel);
  assert(sourceTDHandle, "missing tdHandle");
  retain(sourceTDHandle.emitter);
  const unsubscribe = sourceTDHandle.emitter.subscribe((events, offset) => {
    handler(offset > 0 ? events.slice(offset) : events);
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
  const derivedCollection = new TrackedDataHandle(initialKeys, ViewHandler, makeViewPrototype(sourceModel), sourceTDHandle.emitter, keysHandler, debugName);
  return derivedCollection.revocable.proxy;
};
function* keysHandler(target, event) {
  switch (event.type) {
    case "del" /* DEL */: {
      const index = target.indexOf(event.prop);
      if (index !== -1) {
        target.splice(index, 1);
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

// src/index.ts
var src_default = createElement;
var VERSION = true ? "0.9.1" : "development";
export {
  ArrayEventType,
  CalculationErrorType,
  Fragment,
  IntrinsicObserver,
  IntrinsicObserverEventType,
  InvariantError,
  ModelEventType,
  VERSION,
  applyArrayEvent,
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
  model,
  mount,
  ref,
  release,
  reset,
  retain,
  setLogLevel,
  subscribe
};
//# sourceMappingURL=index.debug.mjs.map
