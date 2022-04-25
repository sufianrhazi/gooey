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
var TypeTag = Symbol("typeTag");
var ContextGetterTag = Symbol("contextGetter");
var DataTypeTag = Symbol("dataTypeTag");
var CalculationTypeTag = Symbol("calculationType");
var CalculationRecalculateTag = Symbol("calculationRecalculate");
var CalculationInvalidateTag = Symbol("calculationInvalidate");
var CalculationSetCycleTag = Symbol("calculationSetCycle");
var ObserveKey = Symbol("observe");
var GetSubscriptionNodeKey = Symbol("getSubscriptionNode");
var MakeModelViewKey = Symbol("makeModelView");
var DisposeKey = Symbol("dispose");
var FlushKey = Symbol("flush");
var AddDeferredWorkKey = Symbol("addDeferredWork");
var NotifyKey = Symbol("notify");
function isRef(ref2) {
  return ref2 && ref2[TypeTag] === "ref";
}
function ref(val) {
  return {
    [TypeTag]: "ref",
    current: val
  };
}
function createContext(val) {
  return Object.assign(() => {
    throw new Error("Do not call contexts as functions");
  }, {
    [ContextGetterTag]: () => val,
    [TypeTag]: "context"
  });
}
function getContext(context) {
  return context[ContextGetterTag]();
}
function isContext(val) {
  return !!(val && val[TypeTag] === "context");
}
function isModel(thing) {
  return !!(thing && thing[TypeTag] === "data" && thing[DataTypeTag] === "model");
}
function isModelField(thing) {
  return !!(thing && !thing[TypeTag] && !!thing.model && !!thing.model[DataTypeTag]);
}
function isCollection(thing) {
  return !!(thing && thing[TypeTag] === "data" && thing[DataTypeTag] === "collection");
}
function isCalculation(thing) {
  return !!(thing && thing[TypeTag] === "calculation");
}
function isEffect(thing) {
  return thing[CalculationTypeTag] === "effect";
}
function isSubscription(thing) {
  return !!(thing && thing[TypeTag] === "subscription");
}
function isNodeOrdering(thing) {
  return !!(thing && thing[TypeTag] === "nodeOrdering");
}

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
function exception(exception2, ...items) {
  if (exception2 instanceof Error) {
    error(exception2);
    error(...items);
  } else {
    error(exception2, ...items);
  }
}
function invariant(check, ...items) {
  if (!check()) {
    error("Invariant error", check.toString(), "is not truthy", ...items);
  }
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
  let id = 0;
  return () => (id++).toString();
})();
function groupBy(items, grouper) {
  const grouped = /* @__PURE__ */ new Map();
  items.forEach((item) => {
    const [key, val] = grouper(item);
    let inner = grouped.get(key);
    if (!inner) {
      inner = [];
      grouped.set(key, inner);
    }
    inner.push(val);
  });
  return grouped;
}
function alwaysTrue() {
  return true;
}
function strictEqual(a, b) {
  return a === b;
}

// src/graph.ts
var _Graph = class {
  constructor() {
    __publicField(this, "nextId");
    __publicField(this, "nodesSet");
    __publicField(this, "retained");
    __publicField(this, "dirtyNodes");
    __publicField(this, "knownCycles");
    __publicField(this, "graph");
    __publicField(this, "reverseGraph");
    this.nextId = 1;
    this.nodesSet = {};
    this.retained = {};
    this.graph = {};
    this.reverseGraph = {};
    this.dirtyNodes = {};
    this.knownCycles = {};
  }
  getId(node) {
    return node.$__id;
  }
  addNode(node) {
    const nodeId = this.getId(node);
    if (this.nodesSet[nodeId])
      return false;
    this.graph[nodeId] = {};
    this.reverseGraph[nodeId] = {};
    this.nodesSet[nodeId] = node;
    return true;
  }
  hasNode(node) {
    return !!this.nodesSet[this.getId(node)];
  }
  markNodeDirty(node) {
    this.dirtyNodes[this.getId(node)] = true;
  }
  getRecursiveDependenciesInner(nodeId) {
    const otherNodeIds = {};
    const otherNodes = [];
    let foundCycle = false;
    const visit = (visitId) => {
      if (otherNodeIds[visitId] === 2)
        foundCycle = true;
      if (otherNodeIds[visitId])
        return;
      if (visitId !== nodeId)
        otherNodes.push(this.nodesSet[visitId]);
      otherNodeIds[visitId] = 2;
      this.getDependenciesInner(visitId, _Graph.EDGE_ANY).forEach((toId) => {
        visit(toId);
      });
      otherNodeIds[visitId] = 1;
    };
    visit(nodeId);
    return { otherNodeIds, otherNodes, isCycle: foundCycle };
  }
  getRecursiveDependencies(node) {
    const nodeId = this.getId(node);
    const { otherNodes, isCycle } = this.getRecursiveDependenciesInner(nodeId);
    assert(!isCycle, "getRecursiveDependencies found a cycle");
    return otherNodes;
  }
  hasDirtyNodes() {
    return Object.keys(this.dirtyNodes).length > 0;
  }
  addEdge(fromNode, toNode, kind) {
    const fromId = this.getId(fromNode);
    const toId = this.getId(toNode);
    this.addEdgeInner(fromId, toId, kind);
  }
  addEdgeInner(fromId, toId, kind) {
    assert(!!this.nodesSet[fromId], "cannot add edge from node that does not exist");
    assert(!!this.nodesSet[toId], "cannot add edge to node that does not exist");
    this.graph[fromId][toId] = (this.graph[fromId][toId] || 0) | kind;
    this.reverseGraph[toId][fromId] = (this.reverseGraph[toId][fromId] || 0) | kind;
  }
  removeEdge(fromNode, toNode, kind) {
    const fromId = this.getId(fromNode);
    const toId = this.getId(toNode);
    this.removeEdgeInner(fromId, toId, kind);
  }
  removeEdgeInner(fromId, toId, kind) {
    assert(!!this.nodesSet[fromId], "cannot remove edge from node that does not exist");
    assert(!!this.nodesSet[toId], "cannot remove edge to node that does not exist");
    this.graph[fromId][toId] = (this.graph[fromId][toId] || 0) & ~kind;
    this.reverseGraph[toId][fromId] = (this.reverseGraph[toId][fromId] || 0) & ~kind;
  }
  removeNode(node) {
    const nodeId = this.getId(node);
    this.removeNodeInner(nodeId);
  }
  removeNodeInner(nodeId) {
    assert(!this.retained[nodeId], "attempted to remove a retained node");
    const toIds = this.getDependenciesInner(nodeId);
    const fromIds = this.getReverseDependenciesInner(nodeId);
    fromIds.forEach((fromId) => {
      this.graph[fromId][nodeId] = 0;
      this.reverseGraph[nodeId][fromId] = 0;
    });
    toIds.forEach((toId) => {
      this.reverseGraph[toId][nodeId] = 0;
      this.graph[nodeId][toId] = 0;
    });
    delete this.nodesSet[nodeId];
    delete this.dirtyNodes[nodeId];
    delete this.retained[nodeId];
    delete this.knownCycles[nodeId];
  }
  retain(node) {
    const nodeId = this.getId(node);
    assert(!this.retained[nodeId], "double-retain");
    this.retained[nodeId] = true;
  }
  release(node) {
    const nodeId = this.getId(node);
    assert(this.retained[nodeId], "double-release");
    delete this.retained[nodeId];
  }
  replaceIncoming(node, newIncomingNodes) {
    const toId = this.getId(node);
    const beforeFromIds = this.getReverseDependenciesInner(toId, _Graph.EDGE_HARD);
    const beforeFromSet = new Set(beforeFromIds);
    const newFromIds = newIncomingNodes.map((fromNode) => this.getId(fromNode));
    const newFromSet = new Set(newFromIds);
    beforeFromIds.forEach((fromId) => {
      if (!newFromSet.has(fromId)) {
        this.removeEdgeInner(fromId, toId, _Graph.EDGE_HARD);
      }
    });
    newFromIds.forEach((fromId) => {
      if (!beforeFromSet.has(fromId)) {
        this.addEdgeInner(fromId, toId, _Graph.EDGE_HARD);
      }
    });
  }
  removeIncoming(node) {
    const toId = this.getId(node);
    const fromIds = this.getReverseDependenciesInner(toId);
    fromIds.forEach((fromId) => {
      this.removeEdgeInner(fromId, toId, _Graph.EDGE_HARD);
    });
  }
  getDependenciesInner(nodeId, edgeType = _Graph.EDGE_ANY) {
    if (!this.graph[nodeId])
      return [];
    return Object.keys(this.graph[nodeId]).filter((toId) => (this.graph[nodeId][toId] || 0) & edgeType);
  }
  getReverseDependenciesInner(nodeId, edgeType = _Graph.EDGE_ANY) {
    if (!this.reverseGraph[nodeId])
      return [];
    return Object.keys(this.reverseGraph[nodeId]).filter((fromId) => (this.reverseGraph[nodeId][fromId] || 0) & edgeType);
  }
  getDependencies(fromNode, edgeType = _Graph.EDGE_ANY) {
    const nodeId = this.getId(fromNode);
    return this.getDependenciesInner(nodeId, edgeType).map((toId) => this.nodesSet[toId]);
  }
  _toposortRetained() {
    let index = 0;
    const nodeVertex = {};
    const stack = [];
    const reverseTopoSort = [];
    const strongconnect = (vertex) => {
      vertex.index = index;
      vertex.lowlink = index;
      index = index + 1;
      stack.push(vertex);
      vertex.onStack = true;
      this.getReverseDependenciesInner(vertex.nodeId).forEach((toId) => {
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
      });
      if (vertex.lowlink === vertex.index) {
        const component = [];
        for (; ; ) {
          const toVertex = stack.pop();
          toVertex.onStack = false;
          component.push(toVertex);
          if (toVertex === vertex) {
            break;
          }
        }
        reverseTopoSort.push(component);
      }
    };
    Object.keys(this.retained).forEach((nodeId) => {
      if (this.retained[nodeId] && !nodeVertex[nodeId]) {
        nodeVertex[nodeId] = {
          nodeId
        };
        strongconnect(nodeVertex[nodeId]);
      }
    });
    return reverseTopoSort;
  }
  _toposort(fromNodeIds) {
    let index = 0;
    const nodeVertex = {};
    const stack = [];
    const reverseTopoSort = [];
    const strongconnect = (vertex) => {
      vertex.index = index;
      vertex.lowlink = index;
      index = index + 1;
      stack.push(vertex);
      vertex.onStack = true;
      this.getDependenciesInner(vertex.nodeId).forEach((toId) => {
        if (!nodeVertex[toId]) {
          nodeVertex[toId] = {
            nodeId: toId,
            reachesRetained: !!this.retained[toId]
          };
        }
        const toVertex = nodeVertex[toId];
        if (toVertex.index === void 0) {
          strongconnect(toVertex);
          vertex.lowlink = Math.min(vertex.lowlink, toVertex.lowlink);
        } else if (toVertex.onStack) {
          vertex.lowlink = Math.min(vertex.lowlink, toVertex.index);
        }
        if (toVertex.reachesRetained) {
          vertex.reachesRetained = true;
        }
      });
      if (vertex.lowlink === vertex.index) {
        const component = [];
        for (; ; ) {
          const toVertex = stack.pop();
          toVertex.onStack = false;
          component.push(toVertex);
          if (toVertex === vertex) {
            break;
          }
        }
        reverseTopoSort.push(component);
      }
    };
    fromNodeIds.forEach((nodeId) => {
      if (!nodeVertex[nodeId]) {
        nodeVertex[nodeId] = {
          nodeId,
          reachesRetained: !!this.retained[nodeId]
        };
        strongconnect(nodeVertex[nodeId]);
      }
    });
    return reverseTopoSort.reverse();
  }
  process(callback) {
    Object.keys(this.dirtyNodes).forEach((nodeId) => {
      if (this.dirtyNodes[nodeId]) {
        callback(this.nodesSet[nodeId], "invalidate");
      }
    });
    let visitedAnyDirty = false;
    do {
      visitedAnyDirty = false;
      this._toposortRetained().forEach((component) => {
        const isCycle = component.length > 1;
        const nodeIds = new Set(component.map((vertex) => vertex.nodeId));
        nodeIds.forEach((nodeId) => {
          const wasCycle = !!this.knownCycles[nodeId];
          if (wasCycle !== isCycle) {
            callback(this.nodesSet[nodeId], "invalidate");
            this.dirtyNodes[nodeId] = true;
            this.knownCycles[nodeId] = isCycle;
          }
        });
        nodeIds.forEach((nodeId) => {
          if (this.dirtyNodes[nodeId]) {
            const shouldPropagate = callback(this.nodesSet[nodeId], isCycle ? "cycle" : "recalculate");
            if (shouldPropagate) {
              this.getDependenciesInner(nodeId, _Graph.EDGE_HARD).forEach((toId) => {
                if (!nodeIds.has(toId)) {
                  this.dirtyNodes[toId] = true;
                  callback(this.nodesSet[toId], "invalidate");
                }
              });
            }
            visitedAnyDirty = true;
            delete this.dirtyNodes[nodeId];
          }
        });
      });
    } while (visitedAnyDirty);
    const visited = {};
    const flushTransitive = (nodeId) => {
      if (visited[nodeId])
        return;
      visited[nodeId] = true;
      callback(this.nodesSet[nodeId], "invalidate");
      this.getDependenciesInner(nodeId, _Graph.EDGE_HARD).forEach((toId) => {
        flushTransitive(toId);
      });
    };
    Object.keys(this.dirtyNodes).forEach((nodeId) => {
      if (this.dirtyNodes[nodeId]) {
        flushTransitive(nodeId);
        delete this.dirtyNodes[nodeId];
      }
    });
  }
  graphviz(getAttributes) {
    const lines = [
      "digraph debug {",
      'node [style="filled", fillcolor="#DDDDDD"];'
    ];
    const nodeIds = Object.keys(this.nodesSet).filter((nodeId) => !!this.nodesSet[nodeId]);
    const nodeAttributes = {};
    nodeIds.forEach((nodeId) => {
      nodeAttributes[nodeId] = getAttributes(nodeId, this.nodesSet[nodeId]);
    });
    const groupedNodes = groupBy(nodeIds, (nodeId) => {
      return [nodeAttributes[nodeId].subgraph, nodeId];
    });
    let clusterId = 0;
    groupedNodes.forEach((nodeIds2, group) => {
      if (group)
        lines.push(`subgraph cluster_${clusterId++} {`, 'style="filled";', 'color="#AAAAAA";');
      nodeIds2.forEach((nodeId) => {
        const props = {
          shape: this.retained[nodeId] ? "box" : "ellipse",
          label: nodeAttributes[nodeId].label,
          penwidth: nodeAttributes[nodeId].penwidth,
          fillcolor: this.dirtyNodes[nodeId] ? "#FFDDDD" : "#DDDDDD"
        };
        lines.push(`  item_${nodeId} [${Object.entries(props).map(([key, value]) => `${key}=${JSON.stringify(value)}`).join(",")}];`);
      });
      if (group)
        lines.push("}");
    });
    nodeIds.forEach((fromId) => {
      const allDestinations = Array.from(new Set(Object.keys(this.graph[fromId])));
      allDestinations.forEach((toId) => {
        if (this.graph[fromId][toId] & _Graph.EDGE_HARD) {
          lines.push(`  item_${fromId} -> item_${toId} [style="solid"];`);
        }
        if (this.graph[fromId][toId] & _Graph.EDGE_SOFT) {
          lines.push(`  item_${fromId} -> item_${toId} [style="dashed"];`);
        }
      });
    });
    lines.push("}");
    return lines.join("\n");
  }
};
var Graph = _Graph;
__publicField(Graph, "EDGE_NONE", 0);
__publicField(Graph, "EDGE_SOFT", 1);
__publicField(Graph, "EDGE_HARD", 2);
__publicField(Graph, "EDGE_ANY", 3);

// src/debug.ts
var nameMap = /* @__PURE__ */ new WeakMap();
function clearNames() {
  nameMap = /* @__PURE__ */ new WeakMap();
}
function debugNameFor(item) {
  if (true) {
    return "";
  }
  const id = item.$__id;
  if (isCollection(item)) {
    return `${id}:collection:${nameMap.get(item) ?? "?"}`;
  }
  if (isCalculation(item)) {
    return `${id}:${isEffect(item) ? "effect" : "calc"}:${nameMap.get(item) ?? "?"}`;
  }
  if (isModel(item)) {
    return `${id}:model:${nameMap.get(item) ?? "?"}`;
  }
  if (isSubscription(item)) {
    return `${id}:sub:${nameMap.get(item) ?? "?"}`;
  }
  if (isNodeOrdering(item)) {
    return `${id}:ord:${nameMap.get(item) ?? "?"}`;
  }
  if (isModelField(item)) {
    return `${id}:field:${nameMap.get(item.model) ?? "?"}:${String(item.key)}`;
  }
  return `${id}:unknown`;
}
function name(item, name2) {
  if (true)
    return item;
  nameMap.set(item, name2);
  return item;
}

// src/calc.ts
var activeCalculations = [];
var globalDependencyGraph = new Graph();
var refcountMap = {};
function reset() {
  activeCalculations = [];
  globalDependencyGraph = new Graph();
  refcountMap = {};
  clearNames();
}
var createdCalculations;
function trackCreatedCalculations(fn) {
  const before = createdCalculations;
  createdCalculations = [];
  try {
    fn();
    const toReturn = createdCalculations;
    return toReturn;
  } finally {
    createdCalculations = before;
  }
}
function calc(func, isEqual, debugName) {
  if (typeof isEqual === "string")
    debugName = isEqual;
  if (typeof isEqual !== "function")
    isEqual = strictEqual;
  if (typeof debugName !== "string")
    debugName = void 0;
  const calculation = makeCalculation(func, isEqual, false);
  if (debugName)
    name(calculation, debugName);
  if (createdCalculations)
    createdCalculations.push(calculation);
  return calculation;
}
function effect(func, debugName) {
  const calculation = makeCalculation(func, alwaysTrue, true);
  if (debugName)
    name(calculation, debugName);
  if (createdCalculations)
    createdCalculations.push(calculation);
  return calculation;
}
function untracked(func) {
  activeCalculations.push({ calc: null, deps: [] });
  try {
    return func();
  } finally {
    activeCalculations.pop();
  }
}
var CalculationError = class extends Error {
  constructor(msg, originalError) {
    super(msg);
    __publicField(this, "originalError");
    this.originalError = originalError;
  }
};
var CycleAbortError = class extends Error {
};
function makeCalculation(calculationFunc, isEqual, isEffect2) {
  if (typeof calculationFunc !== "function") {
    throw new InvariantError("calculation must be provided a function");
  }
  let result = void 0;
  let state = 0 /* STATE_FLUSHED */;
  let errorHandler = void 0;
  let isDisposed = false;
  const calculation = Object.assign(calculationBody, {
    $__id: uniqueid(),
    [TypeTag]: "calculation",
    [CalculationTypeTag]: isEffect2 ? "effect" : "calculation",
    [CalculationSetCycleTag]: calculationSetError,
    [CalculationRecalculateTag]: calculationRecalculate,
    [CalculationInvalidateTag]: calculationInvalidate,
    onError: calculationOnError,
    dispose: calculationDispose
  });
  globalDependencyGraph.addNode(calculation);
  function calculationBody() {
    assert(!isDisposed, "calculation already disposed");
    if (!isEffect2) {
      addDepToCurrentCalculation(calculation);
    }
    switch (state) {
      case 0 /* STATE_FLUSHED */: {
        state = 1 /* STATE_TRACKING */;
        activeCalculations.push({ calc: calculation, deps: [] });
        const prevResult = result;
        try {
          result = { result: calculationFunc() };
        } catch (e) {
          const calcRecord2 = activeCalculations.pop();
          assert(calcRecord2?.calc === calculation, "calculation stack inconsistency");
          globalDependencyGraph.replaceIncoming(calculation, calcRecord2.deps);
          const isCycle = e instanceof CycleAbortError;
          state = isCycle ? 3 /* STATE_CYCLE */ : 4 /* STATE_ERROR */;
          if (errorHandler) {
            result = {
              result: errorHandler(isCycle ? "cycle" : "error")
            };
          } else {
            result = void 0;
          }
          if (result && activeCalculations.length === 0) {
            return prevResult && isEqual(prevResult.result, result.result) ? prevResult.result : result.result;
          }
          if (isCycle) {
            throw e;
          }
          throw new CalculationError("Calculation error: calculation threw error while being called", e);
        }
        state = 2 /* STATE_CACHED */;
        const calcRecord = activeCalculations.pop();
        assert(calcRecord?.calc === calculation, "calculation stack inconsistency");
        globalDependencyGraph.replaceIncoming(calculation, calcRecord.deps);
        return prevResult && isEqual(prevResult.result, result.result) ? prevResult.result : result.result;
      }
      case 1 /* STATE_TRACKING */:
        state = 4 /* STATE_ERROR */;
        if (errorHandler) {
          result = {
            result: errorHandler("cycle")
          };
          if (activeCalculations.length === 0) {
            return result.result;
          }
        }
        throw new CycleAbortError("Cycle reached: calculation is part of a cycle");
        break;
      case 2 /* STATE_CACHED */:
        if (result) {
          return result.result;
        }
        throw new InvariantError("Calculation in cached state missing result value");
      case 3 /* STATE_CYCLE */:
        if (result) {
          return result.result;
        }
        throw new Error("Cycle reached: calculation is part of a cycle");
      case 4 /* STATE_ERROR */:
        if (result) {
          return result.result;
        }
        throw new Error("Calculation in error state");
      default:
        assertExhausted(state, "Unexpected calculation state");
    }
  }
  function calculationInvalidate() {
    assert(!isDisposed, "calculation already disposed");
    switch (state) {
      case 1 /* STATE_TRACKING */:
        throw new InvariantError("Cannot invalidate a calculation while being tracked");
      case 0 /* STATE_FLUSHED */:
        return;
      case 3 /* STATE_CYCLE */:
        false;
        globalDependencyGraph.removeIncoming(calculation);
        state = 0 /* STATE_FLUSHED */;
        break;
      case 2 /* STATE_CACHED */:
      case 4 /* STATE_ERROR */: {
        false;
        state = 0 /* STATE_FLUSHED */;
        break;
      }
      default:
        assertExhausted(state, "Unexpected calculation state");
    }
  }
  function calculationSetError() {
    assert(!isDisposed, "calculation already disposed");
    switch (state) {
      case 1 /* STATE_TRACKING */:
        throw new InvariantError("Cannot mark calculation as being a cycle while it is being calculated");
        break;
      case 0 /* STATE_FLUSHED */:
      case 2 /* STATE_CACHED */:
      case 3 /* STATE_CYCLE */:
      case 4 /* STATE_ERROR */: {
        state = 3 /* STATE_CYCLE */;
        if (errorHandler) {
          let isResultEqual = false;
          const newResult = errorHandler("cycle");
          if (result) {
            isResultEqual = isEqual(result.result, newResult);
          }
          if (!isResultEqual) {
            result = { result: newResult };
          }
          return !isResultEqual;
        } else {
          if (result) {
            result = void 0;
            return true;
          }
          return false;
        }
      }
      default:
        assertExhausted(state, "Unexpected calculation state");
    }
  }
  function calculationRecalculate() {
    assert(!isDisposed, "calculation already disposed");
    switch (state) {
      case 1 /* STATE_TRACKING */:
        throw new InvariantError("Cannot recalculate calculation while it is being calculated");
        break;
      case 0 /* STATE_FLUSHED */:
      case 4 /* STATE_ERROR */:
      case 2 /* STATE_CACHED */: {
        const priorResult = result;
        try {
          calculationBody();
        } catch (e) {
        }
        if (priorResult && result && isEqual(priorResult.result, result.result)) {
          result = priorResult;
          return false;
        }
        return true;
      }
      case 3 /* STATE_CYCLE */:
        throw new InvariantError("Cannot recalculate calculation in cycle state without flushing");
      default:
        assertExhausted(state, "Unexpected calculation state");
    }
  }
  function calculationOnError(handler) {
    assert(!isDisposed, "calculation already disposed");
    errorHandler = handler;
    return calculation;
  }
  function calculationDispose() {
    assert(!isDisposed, "calculation already disposed");
    globalDependencyGraph.removeNode(calculation);
    result = void 0;
    errorHandler = void 0;
    isDisposed = true;
  }
  return calculation;
}
function addDepToCurrentCalculation(item) {
  if (activeCalculations.length === 0)
    return;
  const dependentCalculation = activeCalculations[activeCalculations.length - 1];
  dependentCalculation.deps.push(item);
  false;
}
function addManualDep(fromNode, toNode) {
  globalDependencyGraph.addNode(fromNode);
  globalDependencyGraph.addNode(toNode);
  globalDependencyGraph.addEdge(fromNode, toNode, Graph.EDGE_HARD);
  false;
}
function registerNode(node) {
  globalDependencyGraph.addNode(node);
}
function disposeNode(node) {
  globalDependencyGraph.removeNode(node);
}
function addOrderingDep(fromNode, toNode) {
  globalDependencyGraph.addEdge(fromNode, toNode, Graph.EDGE_SOFT);
  false;
}
function removeManualDep(fromNode, toNode) {
  globalDependencyGraph.removeEdge(fromNode, toNode, Graph.EDGE_HARD);
  false;
}
function removeOrderingDep(fromNode, toNode) {
  globalDependencyGraph.removeEdge(fromNode, toNode, Graph.EDGE_SOFT);
  false;
}
function markDirty(item) {
  false;
  globalDependencyGraph.addNode(item);
  globalDependencyGraph.markNodeDirty(item);
  scheduleFlush();
}
var needsFlush = false;
var flushPromise = Promise.resolve();
var resolveFlushPromise = noop;
var subscribeListener = () => setTimeout(() => flush(), 0);
function nextFlush() {
  if (!needsFlush)
    return Promise.resolve();
  return flushPromise;
}
function subscribe(listener = noop) {
  subscribeListener = listener;
  if (needsFlush) {
    subscribeListener();
  }
}
function scheduleFlush() {
  if (!needsFlush) {
    needsFlush = true;
    notify();
  }
}
function notify() {
  try {
    flushPromise = new Promise((resolve) => {
      resolveFlushPromise = resolve;
    });
    subscribeListener();
  } catch (e) {
    exception(e, "uncaught exception in notify");
  }
}
var debugSubscription = null;
function flush() {
  if (!needsFlush) {
    return;
  }
  needsFlush = false;
  false;
  globalDependencyGraph.process((item, action) => {
    let shouldPropagate = true;
    switch (action) {
      case "cycle":
        if (isCalculation(item)) {
          shouldPropagate = item[CalculationSetCycleTag]();
        } else {
          throw new Error("Unexpected dependency on cycle");
        }
        break;
      case "invalidate":
        if (isCalculation(item)) {
          item[CalculationInvalidateTag]();
        }
        break;
      case "recalculate":
        if (isCalculation(item)) {
          shouldPropagate = item[CalculationRecalculateTag]();
        } else if (isCollection(item) || isModel(item) || isSubscription(item)) {
          shouldPropagate = item[FlushKey]();
        }
        break;
      default:
        assertExhausted(action);
    }
    if (false) {
      debug(`process:${action}`, debugNameFor(item), `shouldPropagate=${shouldPropagate}`);
      debugSubscription && debugSubscription(debug2(item), `process:${action}:shouldPropagate=${shouldPropagate}`);
    }
    return shouldPropagate;
  });
  if (globalDependencyGraph.hasDirtyNodes()) {
    false;
    scheduleFlush();
  }
  false;
  resolveFlushPromise();
}
function retain(item) {
  const refcount = refcountMap[item.$__id] ?? 0;
  const newRefcount = refcount + 1;
  if (refcount === 0) {
    false;
    if (!globalDependencyGraph.hasNode(item)) {
      globalDependencyGraph.addNode(item);
    }
    globalDependencyGraph.retain(item);
  } else {
    false;
  }
  refcountMap[item.$__id] = newRefcount;
}
function release(item) {
  const refcount = refcountMap[item.$__id] ?? 0;
  const newRefcount = Math.min(refcount - 1, 0);
  if (refcount < 1) {
    error(`release called on unretained item ${debugNameFor(item)}`, item);
  }
  if (newRefcount < 1) {
    false;
    globalDependencyGraph.release(item);
  } else {
    false;
  }
  refcountMap[item.$__id] = newRefcount;
}
function debug2(activeItem) {
  return globalDependencyGraph.graphviz((id, item) => {
    let subgraph = void 0;
    if (isModel(item)) {
      subgraph = item;
    }
    if (isCollection(item)) {
      subgraph = item;
    }
    if (isModelField(item)) {
      subgraph = item.model;
    }
    if (isSubscription(item)) {
      subgraph = item.item;
    }
    return {
      label: `${id}
${debugNameFor(item)}`,
      subgraph,
      penwidth: activeItem === item ? "5.0" : "1.0"
    };
  });
}
function debugState() {
  return {
    globalDependencyGraph,
    activeCalculations,
    refcountMap,
    needsFlush,
    flushPromise,
    resolveFlushPromise,
    subscribeListener
  };
}
function debugSubscribe(callback) {
  debugSubscription = callback;
}

// src/jsx.ts
var NoChildren = Symbol("NoChildren");
var UnusedSymbol = Symbol("unused");
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
  width: {},
  height: {}
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
  width: {},
  height: {}
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
  width: {},
  height: {},
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
  width: {},
  height: {},
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
  height: {},
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
  width: {}
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
  width: {},
  height: {}
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
  width: {},
  height: {}
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
  width: {},
  height: {}
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
  image: HTMLImageElementMap,
  img: HTMLElementMap,
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
  th: HTMLElementMap,
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

// src/vnode.ts
function getShallowNodes(vNode) {
  const nodes = [];
  function visit(node) {
    if (node.domNode) {
      nodes.push(node.domNode);
    } else {
      node.children?.forEach((child) => visit(child));
    }
  }
  visit(vNode);
  return nodes;
}
function getDomParentChildIndex(domParent, immediateParent, childIndex) {
  let realIndex = 0;
  function visit(node) {
    if (node.domNode) {
      realIndex += 1;
      return false;
    } else {
      return visitChildren(node);
    }
  }
  function visitChildren(node) {
    if (node.children) {
      const visitIndex = node === immediateParent ? childIndex : node.children.length;
      for (let i = 0; i < visitIndex; ++i) {
        if (visit(node.children[i])) {
          return true;
        }
      }
    }
    return node === immediateParent;
  }
  visitChildren(domParent);
  return realIndex;
}
function callOnMount(node) {
  node.children?.forEach((child) => callOnMount(child));
  if (node.onMount) {
    node.onMount.forEach((onMount) => {
      try {
        onMount();
      } catch (e) {
        exception(e, "VNode node raised exception in onMount", node);
      }
    });
  }
}
function performUnmount(node, shallowDomNodes, runOnUnmount) {
  if (shallowDomNodes && node.domNode) {
    shallowDomNodes.push(node.domNode);
  }
  node.children?.forEach((child) => {
    performUnmount(child, node.domNode ? void 0 : shallowDomNodes, runOnUnmount);
  });
  if (runOnUnmount && node.onUnmount) {
    node.onUnmount.forEach((onUnmount) => {
      try {
        onUnmount();
      } catch (e) {
        exception(e, "VNode node raised exception in onUnmount", node);
      }
    });
  }
}
function spliceVNode(immediateParent, childIndex, removeCount, newNodes, { runOnMount = true, runOnUnmount = true } = {}) {
  assert(immediateParent.children, "attempted to splice a parent node with no children");
  const domParent = immediateParent.domNode ? immediateParent : immediateParent.domParent;
  if (childIndex > immediateParent.children.length) {
    childIndex = immediateParent.children.length;
  }
  assert(domParent && domParent.domNode, "tried to replace a root tree slot with missing domParent");
  const domParentNode = domParent.domNode;
  const detachedVNodes = immediateParent.children.splice(childIndex, removeCount, ...newNodes);
  const toRemove = [];
  detachedVNodes.forEach((detachedVNode) => {
    performUnmount(detachedVNode, toRemove, runOnUnmount);
  });
  if (domParentNode.childNodes.length === toRemove.length) {
    domParentNode.replaceChildren();
  } else {
    toRemove.forEach((child) => domParentNode.removeChild(child));
  }
  if (newNodes.length > 0) {
    const domIndex = getDomParentChildIndex(domParent, immediateParent, childIndex);
    const referenceNode = domParentNode.childNodes[domIndex];
    const fragment = document.createDocumentFragment();
    for (let i = 0; i < newNodes.length; ++i) {
      const newNode = newNodes[i];
      newNode.domParent = domParent;
      const nodesToAdd = getShallowNodes(newNode);
      nodesToAdd.forEach((addNode) => {
        fragment.appendChild(addNode);
      });
    }
    domParentNode.insertBefore(fragment, referenceNode || null);
    if (runOnMount) {
      newNodes.forEach((newNode) => {
        if (newNode) {
          callOnMount(newNode);
        }
      });
    }
  }
  return detachedVNodes;
}

// src/view.ts
var Fragment = ({ children }) => children;
function createElement(Constructor, props, ...children) {
  if (typeof Constructor === "string") {
    return {
      type: "intrinsic",
      element: Constructor,
      props,
      children
    };
  }
  if (isContext(Constructor)) {
    return {
      type: "context",
      context: Constructor,
      props,
      children
    };
  }
  return {
    type: "component",
    component: Constructor,
    props,
    children
  };
}
createElement.Fragment = Fragment;
function setAttributeValue(elementType, element, key, value, boundEvents) {
  if (key.startsWith("on:") && typeof value === "function") {
    const eventName = key.slice(3);
    if (boundEvents[key]) {
      element.removeEventListener(eventName, boundEvents[key]);
    }
    element.addEventListener(eventName, value);
    boundEvents[key] = value;
  } else {
    const attributeNamespace = attributeNamespaceMap[key] || null;
    const mapping = getElementTypeMapping(elementType, key);
    if (mapping) {
      if (mapping.makeAttrValue !== null) {
        const attributeValue = mapping.makeAttrValue ? mapping.makeAttrValue(value) : value;
        if (attributeValue === void 0 || attributeValue === null || attributeValue === false) {
          element.removeAttribute(key);
        } else if (attributeValue === true) {
          element.setAttributeNS(attributeNamespace, key, "");
        } else {
          element.setAttributeNS(attributeNamespace, key, attributeValue);
        }
      }
      if (mapping.idlName !== null) {
        element[mapping.idlName ?? key] = mapping.makeIdlValue ? mapping.makeIdlValue(value) : value;
      }
    } else if (value === false || value === void 0 || value === null) {
      element.removeAttributeNS(attributeNamespace, key);
    } else if (value === true) {
      element.setAttributeNS(attributeNamespace, key, "");
    } else if (typeof value === "string" || typeof value === "number") {
      element.setAttributeNS(attributeNamespace, key, value.toString());
    }
  }
}
function isCollectionView(thing) {
  return isCollection(thing);
}
function jsxNodeToVNode(jsxNode, domParent, parentOrdering, contextMap, documentFragment) {
  if (jsxNode === null || jsxNode === void 0 || jsxNode === false || jsxNode === true) {
    return { domParent };
  }
  if (typeof jsxNode === "string") {
    const domNode = document.createTextNode(jsxNode);
    documentFragment.appendChild(domNode);
    return {
      domNode,
      domParent
    };
  }
  if (typeof jsxNode === "number") {
    const domNode = document.createTextNode(jsxNode.toString());
    documentFragment.appendChild(domNode);
    return {
      domNode,
      domParent
    };
  }
  if (isCalculation(jsxNode)) {
    return makeCalculationVNode(jsxNode, domParent, parentOrdering, contextMap, documentFragment);
  }
  if (isCollectionView(jsxNode)) {
    return makeCollectionVNode(jsxNode, domParent, parentOrdering, contextMap, documentFragment);
  }
  if (Array.isArray(jsxNode)) {
    return {
      domParent,
      children: jsxNode.map((child) => jsxNodeToVNode(child, domParent, parentOrdering, contextMap, documentFragment))
    };
  }
  if (typeof jsxNode === "function") {
    warn("Attempted to render JSX node that was a function, not rendering anything");
    return { domParent };
  }
  if (typeof jsxNode === "symbol") {
    warn("Attempted to render JSX node that was a symbol, not rendering anything");
    return { domParent };
  }
  return renderElementToVNode(jsxNode, domParent, parentOrdering, contextMap, documentFragment);
}
function renderElementToVNode(renderElement, domParent, nodeOrdering, contextMap, documentFragment) {
  false;
  switch (renderElement.type) {
    case "intrinsic":
      return makeElementVNode(renderElement.element, renderElement.props, renderElement.children, domParent, nodeOrdering, contextMap, documentFragment);
    case "context":
      return makeContextVNode(renderElement.context, renderElement.props.value, renderElement.children, domParent, nodeOrdering, contextMap, documentFragment);
    case "component":
      return makeComponentVNode(renderElement.component, renderElement.props, renderElement.children, domParent, nodeOrdering, contextMap, documentFragment);
    default:
      assertExhausted(renderElement);
  }
}
var HTML_NAMESPACE = "http://www.w3.org/1999/xhtml";
var SVG_NAMESPACE = "http://www.w3.org/2000/svg";
var MATHML_NAMESPACE = "http://www.w3.org/1998/Math/MathML";
var XLINK_NAMESPACE = "http://www.w3.org/1999/xlink";
var XML_NAMESPACE = "http://www.w3.org/XML/1998/namespace";
var XMLNS_NAMESPACE = "http://www.w3.org/2000/xmlns/";
var attributeNamespaceMap = {
  "xlink:actuate": XLINK_NAMESPACE,
  "xlink:arcrole": XLINK_NAMESPACE,
  "xlink:href": XLINK_NAMESPACE,
  "xlink:role": XLINK_NAMESPACE,
  "xlink:show": XLINK_NAMESPACE,
  "xlink:title": XLINK_NAMESPACE,
  "xlink:type": XLINK_NAMESPACE,
  "xml:lang": XML_NAMESPACE,
  "xml:space": XML_NAMESPACE,
  xmlns: XMLNS_NAMESPACE,
  "xmlns:xlink": XMLNS_NAMESPACE
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
var XmlNamespaceContext = createContext(HTML_NAMESPACE);
function makeElementVNode(elementType, props, children, domParent, nodeOrdering, contextMap, documentFragment) {
  let subContextMap = contextMap;
  let elementXMLNamespace = contextMap.has(XmlNamespaceContext) ? contextMap.get(XmlNamespaceContext) : getContext(XmlNamespaceContext);
  let childElementXMLNamespace = null;
  const xmlNamespaceTransition = elementNamespaceTransitionMap[elementXMLNamespace]?.[elementType];
  if (xmlNamespaceTransition) {
    elementXMLNamespace = xmlNamespaceTransition.node;
    childElementXMLNamespace = xmlNamespaceTransition.children;
  }
  if (childElementXMLNamespace != null) {
    subContextMap = new Map(contextMap);
    subContextMap.set(XmlNamespaceContext, childElementXMLNamespace);
  }
  false;
  const element = document.createElementNS(elementXMLNamespace, elementType);
  const elementBoundEvents = {};
  const onReleaseActions = [];
  let refCallback = void 0;
  if (props) {
    Object.entries(props).forEach(([key, value]) => {
      if (key === "ref") {
        if (isRef(value)) {
          value.current = element;
          return;
        }
        if (typeof value === "function" && !isCalculation(value)) {
          refCallback = value;
          return;
        }
      }
      if (isCalculation(value)) {
        const boundEffect = effect(() => {
          const computedValue = value();
          setAttributeValue(elementType, element, key, computedValue, elementBoundEvents);
        }, `viewattr:${key}`);
        onReleaseActions.push(() => {
          removeOrderingDep(boundEffect, nodeOrdering);
          boundEffect.dispose();
        });
        addOrderingDep(boundEffect, nodeOrdering);
        boundEffect();
      } else {
        setAttributeValue(elementType, element, key, value, elementBoundEvents);
      }
    });
  }
  const elementNode = {
    domParent,
    domNode: element,
    onMount: [
      () => {
        if (refCallback) {
          refCallback(element);
        }
      }
    ],
    onUnmount: [
      () => {
        onReleaseActions.forEach((action) => action());
        if (refCallback) {
          refCallback(void 0);
        }
      }
    ]
  };
  if (children && children.length > 0) {
    const childDocumentFragment = document.createDocumentFragment();
    const childVNodes = children.map((child) => jsxNodeToVNode(child, elementNode, nodeOrdering, subContextMap, childDocumentFragment));
    elementNode.children = childVNodes;
    element.appendChild(childDocumentFragment);
  }
  documentFragment.appendChild(element);
  return elementNode;
}
function makeContextVNode(context, value, children, domParent, nodeOrdering, contextMap, documentFragment) {
  const subContextMap = new Map(contextMap);
  subContextMap.set(context, value);
  const providerNode = {
    domParent
  };
  if (children) {
    providerNode.children = children.map((jsxChild) => jsxNodeToVNode(jsxChild, domParent, nodeOrdering, subContextMap, documentFragment));
  }
  return providerNode;
}
function makeComponentVNode(Component2, props, children, domParent, nodeOrdering, contextMap, documentFragment) {
  false;
  const onUnmount = [];
  const onMount = [];
  let jsxNode;
  const createdCalculations2 = trackCreatedCalculations(() => {
    jsxNode = Component2({
      ...props,
      children
    }, {
      onUnmount: (unmountCallback) => {
        onUnmount.push(unmountCallback);
      },
      onMount: (mountCallback) => {
        onMount.push(mountCallback);
      },
      onEffect: (effectCallback, debugName) => {
        const effectCalc = effect(effectCallback, `componenteffect:${Component2.name}:${debugName ?? "?"}`);
        onMount.push(() => {
          retain(effectCalc);
          addOrderingDep(nodeOrdering, effectCalc);
          effectCalc();
        });
        onUnmount.push(() => {
          removeOrderingDep(nodeOrdering, effectCalc);
          release(effectCalc);
          effectCalc.dispose();
        });
      },
      getContext: (context) => {
        if (contextMap.has(context)) {
          return contextMap.get(context);
        }
        return getContext(context);
      }
    });
  });
  onUnmount.push(() => {
    createdCalculations2.forEach((calculation) => {
      calculation.dispose();
    });
  });
  const childVNode = jsxNodeToVNode(jsxNode, domParent, nodeOrdering, contextMap, documentFragment);
  const componentNode = {
    domParent,
    children: [childVNode],
    onMount,
    onUnmount
  };
  return componentNode;
}
function makeCalculationVNode(calculation, domParent, parentNodeOrdering, contextMap, documentFragment) {
  const onUnmount = [];
  const calculationNodeChildren = [];
  const calculationNode = {
    domParent,
    children: calculationNodeChildren,
    onUnmount
  };
  const calculationNodeOrdering = makeNodeOrdering(false ? `viewcalc:${debugNameFor(calculation) ?? "node"}:order` : "viewcalc:order");
  registerNode(calculationNodeOrdering);
  let firstRun = true;
  const resultEffect = effect(() => {
    const renderElement = calculation();
    const calculationChild = jsxNodeToVNode(renderElement, domParent, calculationNodeOrdering, contextMap, documentFragment);
    if (firstRun) {
      firstRun = false;
      calculationNodeChildren.push(calculationChild);
    } else {
      untracked(() => {
        spliceVNode(calculationNode, 0, calculationNodeChildren.length, [calculationChild]);
      });
    }
  }, `viewcalc:${debugNameFor(calculation) ?? "node"}`);
  addOrderingDep(calculationNodeOrdering, parentNodeOrdering);
  addOrderingDep(resultEffect, calculationNodeOrdering);
  onUnmount.push(() => {
    removeOrderingDep(calculationNodeOrdering, parentNodeOrdering);
    removeOrderingDep(resultEffect, calculationNodeOrdering);
    resultEffect.dispose();
    disposeNode(calculationNodeOrdering);
  });
  resultEffect();
  return calculationNode;
}
function makeCollectionVNode(collection2, domParent, parentNodeOrdering, contextMap, documentFragment) {
  const onUnmount = [];
  const collectionNodeChildren = [];
  const collectionNode = {
    domParent,
    children: collectionNodeChildren,
    onUnmount
  };
  const collectionNodeOrdering = makeNodeOrdering(false ? `viewcoll:${debugNameFor(collection2) ?? "node"}:order` : "viewcoll:order");
  registerNode(collectionNodeOrdering);
  addOrderingDep(collectionNodeOrdering, parentNodeOrdering);
  onUnmount.push(() => {
    removeOrderingDep(collectionNodeOrdering, parentNodeOrdering);
  });
  untracked(() => {
    collectionNode.children.push(...collection2.map((jsxChild) => jsxNodeToVNode(jsxChild, domParent, collectionNodeOrdering, contextMap, documentFragment)));
  });
  const unobserve = collection2[ObserveKey]((events) => {
    events.forEach((event) => {
      if (event.type === "splice") {
        untracked(() => {
          const { count, index, items } = event;
          const childNodes = items.map((jsxChild) => jsxNodeToVNode(jsxChild, domParent, collectionNodeOrdering, contextMap, documentFragment));
          spliceVNode(collectionNode, index, count, childNodes);
        });
      } else if (event.type === "move") {
        const { fromIndex, fromCount, toIndex } = event;
        const moved = spliceVNode(collectionNode, fromIndex, fromCount, [], { runOnUnmount: false });
        spliceVNode(collectionNode, fromIndex < toIndex ? toIndex - fromCount : toIndex, 0, moved, { runOnMount: false });
      } else if (event.type === "sort") {
        const { indexes } = event;
        const removedVNodes = spliceVNode(collectionNode, 0, indexes.length, [], { runOnUnmount: false });
        const sortedVNodes = indexes.map((newIndex) => removedVNodes[newIndex]);
        spliceVNode(collectionNode, 0, 0, sortedVNodes, {
          runOnMount: false
        });
      } else {
        assertExhausted(event, "unhandled collection event");
      }
    });
  });
  const subscriptionNode = collection2[GetSubscriptionNodeKey]();
  registerNode(subscriptionNode);
  addOrderingDep(subscriptionNode, collectionNodeOrdering);
  onUnmount.push(unobserve);
  onUnmount.push(() => {
    removeOrderingDep(subscriptionNode, collectionNodeOrdering);
  });
  return collectionNode;
}
function makeNodeOrdering(debugName) {
  const nodeOrdering = {
    $__id: uniqueid(),
    [TypeTag]: "nodeOrdering"
  };
  if (debugName)
    name(nodeOrdering, debugName);
  return nodeOrdering;
}
function mount(parentElement, jsxNode) {
  const contextMap = /* @__PURE__ */ new Map();
  if (parentElement.namespaceURI === SVG_NAMESPACE || parentElement.namespaceURI === MATHML_NAMESPACE) {
    contextMap.set(XmlNamespaceContext, parentElement.namespaceURI);
  }
  const nodeOrdering = makeNodeOrdering("mount");
  retain(nodeOrdering);
  const anchorNode = { domNode: parentElement };
  const documentFragment = document.createDocumentFragment();
  const rootNode = jsxNodeToVNode(jsxNode, anchorNode, nodeOrdering, contextMap, documentFragment);
  anchorNode.children = [rootNode];
  parentElement.appendChild(documentFragment);
  callOnMount(anchorNode);
  return () => {
    spliceVNode(anchorNode, 0, anchorNode.children?.length ?? 0, []);
    release(nodeOrdering);
  };
}

// src/collection.ts
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
function collection(array, debugName) {
  if (!Array.isArray(array)) {
    throw new InvariantError("collection must be provided an array");
  }
  return trackedData(array, "collection", {
    get(notify2, target, key) {
      return target[key];
    },
    has(notify2, target, key) {
      return key in target;
    },
    set(notify2, target, key, value) {
      if (key === "length" && typeof value === "number" && value < target.length) {
        this.splice(value, target.length - value);
        return true;
      }
      const numericKey = Number(key);
      if (!isNaN(numericKey) && numericKey <= array.length) {
        this.splice(numericKey, 1, value);
      } else {
        target[key] = value;
      }
      return true;
    },
    deleteProperty(notify2, target, key) {
      delete target[key];
      return true;
    }
  }, ({
    notify: notify2,
    subscriptionNode,
    makeView,
    processFieldChange,
    processFieldDelete
  }) => ({
    splice: function splice(index, count, ...items) {
      if (count < 1 && items.length === 0)
        return [];
      const origLength = array.length;
      const removed = array.splice(index, count, ...items);
      const newLength = array.length;
      notify2({
        type: "splice",
        index,
        count,
        items,
        removed
      });
      if (origLength === newLength) {
        for (let i = index; i < index + count; ++i) {
          processFieldChange(i.toString());
        }
      } else {
        for (let i = index; i < Math.max(newLength, origLength); ++i) {
          const key = i.toString();
          if (i >= newLength) {
            processFieldDelete(key);
          } else {
            processFieldChange(key);
          }
        }
        processFieldChange("length");
      }
      return removed;
    },
    pop: function pop() {
      const removed = this.splice(array.length - 1, 1);
      return removed[0];
    },
    shift: function shift() {
      const removed = this.splice(0, 1);
      return removed[0];
    },
    push: function push(...items) {
      this.splice(array.length, 0, ...items);
      return array.length;
    },
    unshift: function unshift(...items) {
      this.splice(0, 0, ...items);
      return array.length;
    },
    reject: function reject(func) {
      const removed = [];
      for (let i = array.length - 1; i >= 0; --i) {
        if (func(this[i], i)) {
          removed.push(...this.splice(i, 1));
        }
      }
      return removed;
    },
    moveSlice: function moveSlice(fromIndex, fromCount, toIndex) {
      if (fromCount <= 0)
        return;
      if (toIndex >= fromIndex && toIndex < fromIndex + fromCount)
        return;
      const moved = array.splice(fromIndex, fromCount);
      if (toIndex < fromIndex) {
        array.splice(toIndex, 0, ...moved);
      } else {
        array.splice(toIndex - fromCount, 0, ...moved);
      }
      notify2({
        type: "move",
        fromIndex,
        fromCount,
        toIndex,
        moved
      });
    },
    sort: function sort(sorter = defaultSort) {
      const arrayWithIndexes = array.map((item, index) => [item, index]);
      array.sort(sorter);
      arrayWithIndexes.sort((ai, bi) => sorter(ai[0], bi[0]));
      notify2({
        type: "sort",
        indexes: arrayWithIndexes.map((pair) => pair[1])
      });
      return this;
    },
    reverse: function reverse(sorter = defaultSort) {
      if (array.length === 0)
        return this;
      array.reverse();
      const indexes = [];
      for (let i = array.length - 1; i >= 0; --i) {
        indexes.push(i);
      }
      notify2({
        type: "sort",
        indexes
      });
      return this;
    },
    makeView,
    mapView: function mapView(mapper, debugName2) {
      return mapViewImplementation(this, mapper, debugName2);
    },
    filterView: function filterView(filterFn, debugName2) {
      return filterViewImplementation(this, filterFn, debugName2);
    },
    flatMapView: function flatMapView(fn, debugName2) {
      return flatMapViewImplementation(this, fn, debugName2);
    }
  }), debugName);
}
collection.dispose = function dispose(c) {
  c[DisposeKey]();
};
function mapViewImplementation(sourceCollection, mapper, debugName) {
  return flatMapViewImplementation(sourceCollection, (item) => [mapper(item)], debugName);
}
function filterViewImplementation(sourceCollection, filterFn, debugName) {
  return flatMapViewImplementation(sourceCollection, (item) => filterFn(item) ? [item] : [], debugName);
}
function flatMapViewImplementation(sourceCollection, fn, debugName) {
  const flatMapCount = [];
  return sourceCollection.makeView({
    initialize: (items) => {
      const flatMapItems = [];
      items.forEach((value) => {
        const chunk = fn(value);
        flatMapItems.push(...chunk);
        flatMapCount.push(chunk.length);
      });
      return flatMapItems;
    },
    processEvent: (view, event, rawArray) => {
      if (event.type === "splice") {
        const { index, count, items } = event;
        let realIndex = 0;
        for (let i = 0; i < index; ++i) {
          realIndex += flatMapCount[i];
        }
        let realCount = 0;
        for (let i = index; i < index + count; ++i) {
          realCount += flatMapCount[i];
        }
        const realItems = [];
        const realItemCount = [];
        items.forEach((itemValue) => {
          const chunk = fn(itemValue);
          realItems.push(...chunk);
          realItemCount.push(chunk.length);
        });
        view.splice(realIndex, realCount, ...realItems);
        flatMapCount.splice(index, count, ...realItemCount);
      } else if (event.type === "move") {
        const { fromIndex, fromCount, toIndex } = event;
        let realFromCount = 0;
        for (let i = fromIndex; i < fromIndex + fromCount; ++i) {
          realFromCount += flatMapCount[i];
        }
        if (realFromCount > 0) {
          let realFromIndex = 0;
          let realToIndex = 0;
          const lastIndex = Math.max(fromIndex, toIndex);
          let count = 0;
          for (let i = 0; i <= lastIndex; ++i) {
            if (i === fromIndex)
              realFromIndex = count;
            if (i === toIndex)
              realToIndex = count;
            count += flatMapCount[i];
          }
          view.moveSlice(realFromIndex, realFromCount, realToIndex);
        }
        flatMapCount.splice(toIndex, 0, ...flatMapCount.splice(fromIndex, fromCount));
      } else if (event.type === "sort") {
        const { indexes } = event;
        const flatMapIndexes = [];
        let accumulatorIndex = 0;
        for (let i = 0; i < flatMapCount.length; ++i) {
          flatMapIndexes.push(accumulatorIndex);
          accumulatorIndex += flatMapCount[i];
        }
        const copiedSource = rawArray.slice();
        const newIndexes = [];
        let destIndex = 0;
        indexes.forEach((sourceIndex) => {
          const realCount = flatMapCount[sourceIndex];
          if (realCount === 0)
            return;
          const realIndex = flatMapIndexes[sourceIndex];
          for (let i = 0; i < realCount; ++i) {
            newIndexes.push(realIndex + i);
            rawArray[destIndex] = copiedSource[realIndex + i];
            destIndex += 1;
          }
        });
        view[NotifyKey]({
          type: "sort",
          indexes: newIndexes
        });
      } else {
        assertExhausted(event, "unhandled collection event type");
      }
    }
  }, debugName);
}

// src/trackeddata.ts
function trackedData(initialValue, typeTag, implSpec, bindMethods, debugName) {
  const fieldRecords = /* @__PURE__ */ new Map();
  let subscriptionEvents = /* @__PURE__ */ new Map();
  let observers = [];
  let isDisposed = false;
  let deferredTasks = [];
  const subscriptionNode = {
    $__id: uniqueid(),
    [TypeTag]: "subscription",
    [FlushKey]: flushSubscription,
    item: null
  };
  name(subscriptionNode, `${debugName || "?"}:sub`);
  function flushSubscription() {
    assert(!isDisposed, "data already disposed");
    let processed = false;
    const toProcess = subscriptionEvents;
    subscriptionEvents = /* @__PURE__ */ new Map();
    toProcess.forEach((events, observer) => {
      processed = true;
      observer(events);
    });
    return processed;
  }
  function flush2() {
    assert(!isDisposed, "data already disposed");
    const toProcess = deferredTasks;
    let processed = false;
    deferredTasks = [];
    toProcess.forEach((task) => {
      processed = true;
      task();
    });
    return processed;
  }
  function addDeferredTask(task) {
    assert(!isDisposed, "data already disposed");
    deferredTasks.push(task);
    markDirty(proxy);
  }
  function notify2(event) {
    assert(!isDisposed, "data already disposed");
    if (observers.length > 0) {
      observers.forEach((observer) => {
        let observerEvents = subscriptionEvents.get(observer);
        if (!observerEvents) {
          observerEvents = [];
          subscriptionEvents.set(observer, observerEvents);
        }
        observerEvents.push(event);
      });
      markDirty(subscriptionNode);
    }
  }
  function getSubscriptionNode() {
    assert(!isDisposed, "data already disposed");
    return subscriptionNode;
  }
  function observe(observer) {
    assert(!isDisposed, "data already disposed");
    if (observers.length === 0) {
      registerNode(proxy);
      registerNode(subscriptionNode);
      addManualDep(proxy, subscriptionNode);
      fieldRecords.forEach((field) => {
        addOrderingDep(field, subscriptionNode);
      });
    }
    observers.push(observer);
    return () => {
      observers = observers.filter((obs) => obs !== observer);
      if (observers.length === 0) {
        removeManualDep(proxy, subscriptionNode);
        fieldRecords.forEach((field) => {
          removeOrderingDep(field, subscriptionNode);
        });
      }
    };
  }
  function makeView(spec, viewDebugName) {
    assert(!isDisposed, "data already disposed");
    const viewArray = untracked(() => spec.initialize(initialValue));
    const view = collection(viewArray, viewDebugName);
    observe((events) => {
      view[AddDeferredWorkKey](() => {
        events.forEach((event) => {
          spec.processEvent(view, event, viewArray);
        });
      });
    });
    addManualDep(subscriptionNode, view);
    return view;
  }
  function processFieldChange(key) {
    assert(!isDisposed, "data already disposed");
    const field = getField(key);
    markDirty(field);
  }
  function processFieldDelete(key) {
    assert(!isDisposed, "data already disposed");
    const field = getField(key);
    markDirty(field);
  }
  function dispose3() {
    assert(!isDisposed, "data already disposed");
    fieldRecords.forEach((field) => {
      removeOrderingDep(proxy, field);
      if (observers.length > 0) {
        removeOrderingDep(field, subscriptionNode);
      }
      disposeNode(field);
    });
    fieldRecords.clear();
    disposeNode(proxy);
    disposeNode(subscriptionNode);
    observers.splice(0, observers.length);
    subscriptionEvents.clear();
    deferredTasks.splice(0, deferredTasks.length);
    nextFlush().then(() => {
      revokableProxy.revoke();
    });
    isDisposed = true;
  }
  const pseudoPrototype = {
    $__id: uniqueid(),
    [TypeTag]: "data",
    [DataTypeTag]: typeTag,
    [FlushKey]: flush2,
    [AddDeferredWorkKey]: addDeferredTask,
    [ObserveKey]: observe,
    [NotifyKey]: notify2,
    [GetSubscriptionNodeKey]: getSubscriptionNode,
    [DisposeKey]: dispose3,
    ...bindMethods({
      observe,
      notify: notify2,
      makeView,
      subscriptionNode,
      processFieldChange,
      processFieldDelete
    })
  };
  function getField(key) {
    let field = fieldRecords.get(key);
    if (!field) {
      field = {
        model: proxy,
        key,
        $__id: uniqueid()
      };
      if (debugName)
        name(field, debugName);
      fieldRecords.set(key, field);
      registerNode(field);
      addOrderingDep(proxy, field);
      if (observers.length > 0) {
        addOrderingDep(field, subscriptionNode);
      }
    }
    return field;
  }
  const revokableProxy = Proxy.revocable(initialValue, {
    get(target, key) {
      if (key in pseudoPrototype) {
        return pseudoPrototype[key];
      }
      const field = getField(key);
      addDepToCurrentCalculation(field);
      return implSpec.get.call(proxy, notify2, target, key);
    },
    has(target, key) {
      if (key in pseudoPrototype) {
        return true;
      }
      const field = getField(key);
      addDepToCurrentCalculation(field);
      return implSpec.has.call(proxy, notify2, target, key);
    },
    set(target, key, value) {
      if (key in pseudoPrototype) {
        error(`Overriding ${String(key)} not supported`, key);
        return false;
      }
      const changed = implSpec.set.call(proxy, notify2, target, key, value);
      if (changed) {
        const field = getField(key);
        markDirty(field);
      }
      return changed;
    },
    deleteProperty(target, key) {
      if (key in pseudoPrototype) {
        error(`Deleting ${String(key)} not supported`, key);
        return false;
      }
      const changed = implSpec.deleteProperty.call(proxy, notify2, target, key);
      if (changed) {
        const field = getField(key);
        markDirty(field);
      }
      return changed;
    }
  });
  const proxy = revokableProxy.proxy;
  subscriptionNode.item = proxy;
  if (debugName)
    name(proxy, debugName);
  registerNode(proxy);
  return proxy;
}

// src/model.ts
function model(obj, debugName) {
  if (typeof obj !== "object" || !obj) {
    throw new InvariantError("model must be provided an object");
  }
  const knownFields = new Set(Object.keys(obj));
  return trackedData(obj, "model", {
    get: (_notify, target, key) => {
      return target[key];
    },
    has: (notify2, target, key) => {
      return knownFields.has(key);
    },
    set: (notify2, target, key, value) => {
      const changed = !knownFields.has(key) || target[key] !== value;
      target[key] = value;
      if (changed) {
        if (!knownFields.has(key)) {
          knownFields.add(key);
          notify2({ type: "add", key });
        }
        notify2({ type: "set", key, value });
      }
      return true;
    },
    deleteProperty: (notify2, target, key) => {
      const changed = knownFields.has(key);
      delete target[key];
      if (changed) {
        knownFields.delete(key);
        notify2({ type: "delete", key });
      }
      return true;
    }
  }, ({ makeView, notify: notify2, observe, subscriptionNode }) => {
    return {
      [MakeModelViewKey]: makeView
    };
  }, debugName);
}
model.keys = function keys(target, debugName) {
  const keysSet = /* @__PURE__ */ new Set();
  const view = target[MakeModelViewKey]({
    initialize: (obj) => {
      const keys2 = Object.keys(obj);
      keys2.forEach((key) => keysSet.add(key));
      return keys2;
    },
    processEvent: (modelView, event) => {
      if (event.type === "add") {
        const { key } = event;
        if (typeof key === "number" || typeof key === "string") {
          const stringKey = key.toString();
          if (!keysSet.has(stringKey)) {
            keysSet.add(stringKey);
            modelView.push(stringKey);
          }
        }
      } else if (event.type === "delete") {
        const { key } = event;
        if (typeof key === "number" || typeof key === "string") {
          const stringKey = key.toString();
          if (keysSet.has(stringKey)) {
            keysSet.delete(stringKey);
            modelView.reject((k) => k === stringKey);
          }
        }
      }
    }
  }, debugName);
  return view;
};
model.dispose = function dispose2(m) {
  m[DisposeKey]();
};

// src/index.ts
var src_default = createElement;
var VERSION = true ? "0.6.2" : "development";
export {
  Fragment,
  InvariantError,
  VERSION,
  calc,
  collection,
  createContext,
  debug2 as debug,
  debugState,
  debugSubscribe,
  src_default as default,
  effect,
  flush,
  getLogLevel,
  model,
  mount,
  nextFlush,
  ref,
  release,
  reset,
  retain,
  setLogLevel,
  subscribe
};
//# sourceMappingURL=index.js.map
