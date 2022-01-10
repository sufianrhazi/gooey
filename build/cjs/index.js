var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __markAsModule = (target) => __defProp(target, "__esModule", { value: true });
var __export = (target, all) => {
  __markAsModule(target);
  for (var name2 in all)
    __defProp(target, name2, { get: all[name2], enumerable: true });
};
var __publicField = (obj, key, value) => {
  __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
  return value;
};

// src/index.ts
__export(exports, {
  Fragment: () => Fragment,
  InvariantError: () => InvariantError,
  VERSION: () => VERSION,
  calc: () => calc,
  collection: () => collection,
  createContext: () => createContext,
  debug: () => debug2,
  default: () => src_default,
  effect: () => effect,
  flush: () => flush,
  getLogLevel: () => getLogLevel,
  model: () => model,
  mount: () => mount,
  nextFlush: () => nextFlush,
  ref: () => ref,
  release: () => release,
  reset: () => reset,
  retain: () => retain,
  setLogLevel: () => setLogLevel,
  subscribe: () => subscribe
});

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
function assert(check, ...items) {
  if (!check) {
    error("Assertion failure", check === void 0 ? "undefined" : check === null ? "null" : check.toString(), "is not truthy", ...items);
    throw new Error("Assertion failure");
  }
}
function assertExhausted(context, ...items) {
  error("Assertion failure", context, "is not exhausted", ...items);
  throw new Error("Assertion failure");
}

// src/types.ts
var InvariantError = class extends Error {
};
var TypeTag = Symbol("reviseType");
var DataTypeTag = Symbol("dataTypeTag");
var CalculationTypeTag = Symbol("calculationType");
var RecalculationTag = Symbol("recalculate");
var ObserveKey = Symbol("observe");
var MakeModelViewKey = Symbol("makeModelView");
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
  return Object.assign(() => val, {
    [TypeTag]: "context"
  });
}
function isContext(val) {
  return !!(val && val[TypeTag] === "context");
}
function makeCalculation(fn, recalcFn) {
  return Object.assign(fn, {
    [TypeTag]: "calculation",
    [CalculationTypeTag]: "calculation",
    [RecalculationTag]: recalcFn
  });
}
function makeEffect(fn, recalcFn) {
  return Object.assign(fn, {
    [TypeTag]: "calculation",
    [CalculationTypeTag]: "effect",
    [RecalculationTag]: recalcFn
  });
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

// src/util.ts
var noop = () => {
};
function groupBy(items, grouper) {
  const grouped = new Map();
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
function alwaysFalse() {
  return false;
}
function strictEqual(a, b) {
  return a === b;
}

// src/dag.ts
var DAG = class {
  constructor() {
    __publicField(this, "nextId");
    __publicField(this, "idMap");
    __publicField(this, "nodesSet");
    __publicField(this, "retained");
    __publicField(this, "dirtyNodes");
    __publicField(this, "graph");
    __publicField(this, "reverseGraph");
    this.nextId = 1;
    this.idMap = new WeakMap();
    this.nodesSet = {};
    this.retained = {};
    this.graph = {};
    this.reverseGraph = {};
    this.dirtyNodes = {};
  }
  getId(node) {
    let id = this.idMap.get(node);
    if (id === void 0) {
      id = this.nextId.toString();
      this.nextId += 1;
      this.idMap.set(node, id);
    }
    return id;
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
    const nodeId = this.getId(node);
    if (this.dirtyNodes[nodeId])
      return false;
    this.dirtyNodes[nodeId] = true;
    return true;
  }
  addEdge(fromNode, toNode) {
    const fromId = this.getId(fromNode);
    const toId = this.getId(toNode);
    assert(!!this.nodesSet[fromId], "cannot add edge from node that does not exist");
    assert(!!this.nodesSet[toId], "cannot add edge to node that does not exist");
    this.graph[fromId][toId] = true;
    this.reverseGraph[toId][fromId] = true;
    return true;
  }
  removeEdge(fromNode, toNode) {
    const fromId = this.getId(fromNode);
    const toId = this.getId(toNode);
    if (!this.nodesSet[fromId])
      return false;
    if (!this.nodesSet[toId])
      return false;
    if (!this.graph[fromId][toId])
      return false;
    delete this.graph[fromId][toId];
    delete this.reverseGraph[toId][fromId];
    return true;
  }
  removeNodeInner(nodeId) {
    assert(!this.retained[nodeId], "attempted to remove a retained node");
    const toIds = Object.keys(this.graph[nodeId]);
    const fromIds = Object.keys(this.reverseGraph[nodeId]);
    fromIds.forEach((fromId) => {
      delete this.graph[fromId][nodeId];
    });
    toIds.forEach((toId) => {
      delete this.reverseGraph[toId][nodeId];
    });
    delete this.reverseGraph[nodeId];
    delete this.graph[nodeId];
    delete this.nodesSet[nodeId];
    delete this.dirtyNodes[nodeId];
    delete this.retained[nodeId];
  }
  removeNode(node) {
    const nodeId = this.getId(node);
    if (!this.nodesSet[nodeId])
      return true;
    this.removeNodeInner(nodeId);
    return false;
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
  removeIncoming(node) {
    const nodeId = this.getId(node);
    const fromIds = Object.keys(this.reverseGraph[nodeId]);
    fromIds.forEach((fromId) => {
      delete this.graph[fromId][nodeId];
    });
    this.reverseGraph[nodeId] = {};
  }
  getDependencies(fromNode) {
    const nodeId = this.getId(fromNode);
    if (!this.graph[nodeId])
      return [];
    return Object.keys(this.graph[nodeId]).map((toId) => this.nodesSet[toId]);
  }
  visitDirtyTopological(callback) {
    const dirtyNodes = this.dirtyNodes;
    this.dirtyNodes = {};
    const visited = {};
    const sortedIds = [];
    const dfsRecurse = (nodeId) => {
      if (visited[nodeId])
        return;
      visited[nodeId] = true;
      const toIds = Object.keys(this.graph[nodeId]);
      toIds.forEach((toId) => {
        dfsRecurse(toId);
      });
      sortedIds.push(nodeId);
    };
    Object.keys(dirtyNodes).forEach((nodeId) => {
      dfsRecurse(nodeId);
    });
    for (let i = sortedIds.length - 1; i >= 0; --i) {
      const nodeId = sortedIds[i];
      if (dirtyNodes[nodeId]) {
        const node = this.nodesSet[nodeId];
        const isEqual = callback(node);
        if (!isEqual) {
          const toIds = Object.keys(this.graph[nodeId]);
          toIds.forEach((toId) => {
            dirtyNodes[toId] = true;
          });
        }
      }
    }
  }
  garbageCollect() {
    const marked = {};
    const mark = (nodeId) => {
      if (marked[nodeId])
        return;
      marked[nodeId] = true;
      const fromIds = Object.keys(this.reverseGraph[nodeId]);
      fromIds.forEach((fromId) => {
        mark(fromId);
      });
    };
    Object.keys(this.retained).forEach((nodeId) => {
      mark(nodeId);
    });
    const removed = [];
    Object.keys(this.graph).forEach((nodeId) => {
      if (!marked[nodeId]) {
        removed.push(this.nodesSet[nodeId]);
        this.removeNodeInner(nodeId);
      }
    });
    return removed;
  }
  graphviz(getAttributes) {
    const lines = [
      "digraph dag {",
      'graph [rankdir="LR"];',
      'node [style="filled", fillcolor="#DDDDDD"];'
    ];
    const nodeIds = Object.keys(this.graph);
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
          label: nodeAttributes[nodeId].label
        };
        lines.push(`  item_${nodeId} [${Object.entries(props).map(([key, value]) => `${key}=${JSON.stringify(value)}`).join(",")}];`);
      });
      if (group)
        lines.push("}");
    });
    nodeIds.forEach((fromId) => {
      Object.keys(this.graph[fromId]).forEach((toId) => {
        lines.push(`  item_${fromId} -> item_${toId};`);
      });
    });
    lines.push("}");
    return lines.join("\n");
  }
};

// src/debug.ts
var nameMap = new WeakMap();
function clearNames() {
  nameMap = new WeakMap();
}
function debugNameFor(item) {
  if (true) {
    return "";
  }
  if (isCollection(item)) {
    return `collection:${nameMap.get(item) ?? "?"}`;
  }
  if (isCalculation(item)) {
    return `${isEffect(item) ? "effect" : "calc"}:${nameMap.get(item) ?? "?"}`;
  }
  if (isModel(item)) {
    return `model:${nameMap.get(item) ?? "?"}`;
  }
  if (isSubscription(item)) {
    return `sub:${nameMap.get(item) ?? "?"}`;
  }
  return `field:${nameMap.get(item.model) ?? "?"}:${String(item.key)}`;
}
function name(item, name2) {
  if (true)
    return item;
  nameMap.set(item, name2);
  return item;
}

// src/calc.ts
var activeCalculations = [];
var globalDependencyGraph = new DAG();
var refcountMap = new WeakMap();
function reset() {
  activeCalculations = [];
  globalDependencyGraph = new DAG();
  refcountMap = new WeakMap();
  clearNames();
}
function calc(func, isEqual, debugName) {
  if (typeof isEqual === "string")
    debugName = isEqual;
  if (typeof isEqual !== "function")
    isEqual = strictEqual;
  if (typeof debugName !== "string")
    debugName = void 0;
  const calculation = trackCalculation(func, isEqual, false);
  if (debugName)
    name(calculation, debugName);
  return calculation;
}
function effect(func, debugName) {
  const calculation = trackCalculation(func, alwaysFalse, true);
  if (debugName)
    name(calculation, debugName);
  return calculation;
}
function untracked(func) {
  activeCalculations.push(null);
  const result = func();
  activeCalculations.pop();
  return result;
}
function trackCalculation(func, isEqual, isEffect2) {
  if (typeof func !== "function") {
    throw new InvariantError("calculation must be provided a function");
  }
  let result = void 0;
  const trackedCalculation = isEffect2 ? makeEffect(runCalculation, recalculate) : makeCalculation(runCalculation, recalculate);
  function runCalculation() {
    if (!isEffect2) {
      addDepToCurrentCalculation(trackedCalculation);
    }
    if (result) {
      return result.result;
    }
    globalDependencyGraph.removeIncoming(trackedCalculation);
    activeCalculations.push(trackedCalculation);
    result = { result: func() };
    const sanityCheck = activeCalculations.pop();
    if (sanityCheck !== trackedCalculation) {
      throw new InvariantError("Active calculation stack inconsistency!");
    }
    return result.result;
  }
  globalDependencyGraph.addNode(trackedCalculation);
  function recalculate() {
    if (!result) {
      trackedCalculation();
      return false;
    }
    const prevResult = result.result;
    result = void 0;
    const newResult = trackedCalculation();
    const eq = isEqual(prevResult, newResult);
    if (eq) {
      result = { result: prevResult };
    }
    return eq;
  }
  return trackedCalculation;
}
function addDepToCurrentCalculation(item) {
  const dependentCalculation = activeCalculations[activeCalculations.length - 1];
  if (dependentCalculation) {
    globalDependencyGraph.addNode(item);
    if (!globalDependencyGraph.hasNode(dependentCalculation)) {
      globalDependencyGraph.addNode(dependentCalculation);
    }
    if (globalDependencyGraph.addEdge(item, dependentCalculation)) {
      false;
    }
  }
}
function addManualDep(fromNode, toNode) {
  globalDependencyGraph.addNode(fromNode);
  globalDependencyGraph.addNode(toNode);
  if (globalDependencyGraph.addEdge(fromNode, toNode)) {
    false;
  }
}
function removeManualDep(fromNode, toNode) {
  if (globalDependencyGraph.removeEdge(fromNode, toNode)) {
    false;
  }
}
function processChange(item) {
  const newNode = globalDependencyGraph.addNode(item);
  const marked = globalDependencyGraph.markNodeDirty(item);
  false;
  if (!needsFlush) {
    needsFlush = true;
    notify();
  }
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
function subscribe(listener) {
  subscribeListener = listener;
  if (needsFlush) {
    subscribeListener();
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
function flush() {
  if (!needsFlush) {
    return;
  }
  needsFlush = false;
  const removed = globalDependencyGraph.garbageCollect();
  false;
  globalDependencyGraph.visitDirtyTopological((item) => {
    if (isCalculation(item)) {
      false;
      const recalculation = item[RecalculationTag];
      return recalculation();
    } else if (isCollection(item)) {
      false;
      item[FlushKey]();
    } else if (isModel(item)) {
      false;
      item[FlushKey]();
    } else {
      false;
    }
    return false;
  });
  resolveFlushPromise();
}
function retain(item) {
  const refcount = refcountMap.get(item) ?? 0;
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
  refcountMap.set(item, newRefcount);
}
function release(item) {
  const refcount = refcountMap.get(item) ?? 0;
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
  refcountMap.set(item, newRefcount);
}
function debug2() {
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
    return {
      label: `${id}
${debugNameFor(item)}`,
      subgraph
    };
  });
}

// src/jsx.ts
function isRenderElement(jsxNode) {
  return !!(jsxNode && typeof jsxNode === "object" && !Array.isArray(jsxNode) && jsxNode[TypeTag] === "element");
}
function isRenderComponent(jsxNode) {
  return !!(jsxNode && typeof jsxNode === "object" && !Array.isArray(jsxNode) && jsxNode[TypeTag] === "component");
}
function isRenderProvider(jsxNode) {
  return !!(jsxNode && typeof jsxNode === "object" && !Array.isArray(jsxNode) && jsxNode[TypeTag] === "provider");
}
function attrIdentity(val) {
  return val;
}
function attrBooleanToEmptyString(val) {
  if (!val)
    return void 0;
  return "";
}
function attrNumberToString(val) {
  if (val === void 0)
    return void 0;
  return val.toString();
}
function attrStringOrNumberToString(val) {
  if (val === void 0)
    return void 0;
  return val.toString();
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
function attrStringArrayToWsString(val) {
  if (val === void 0)
    return void 0;
  if (val.length === 0)
    return void 0;
  return val.join(" ");
}
var HTMLElementMap = {
  accesskey: {
    makeAttrValue: attrIdentity,
    idlName: "accessKey",
    makeIdlValue: attrIdentity
  },
  "aria-atomic": {
    makeAttrValue: attrIdentity,
    idlName: "ariaAtomic",
    makeIdlValue: attrIdentity
  },
  "aria-autocomplete": {
    makeAttrValue: attrIdentity,
    idlName: "ariaAutoComplete",
    makeIdlValue: attrIdentity
  },
  "aria-busy": {
    makeAttrValue: attrIdentity,
    idlName: "ariaBusy",
    makeIdlValue: attrIdentity
  },
  "aria-checked": {
    makeAttrValue: attrIdentity,
    idlName: "ariaChecked",
    makeIdlValue: attrIdentity
  },
  "aria-colcount": {
    makeAttrValue: attrIdentity,
    idlName: "ariaColCount",
    makeIdlValue: attrIdentity
  },
  "aria-colindex": {
    makeAttrValue: attrIdentity,
    idlName: "ariaColIndex",
    makeIdlValue: attrIdentity
  },
  "aria-colindextext": {
    makeAttrValue: attrIdentity,
    idlName: "ariaColIndexText",
    makeIdlValue: attrIdentity
  },
  "aria-colspan": {
    makeAttrValue: attrIdentity,
    idlName: "ariaColSpan",
    makeIdlValue: attrIdentity
  },
  "aria-current": {
    makeAttrValue: attrIdentity,
    idlName: "ariaCurrent",
    makeIdlValue: attrIdentity
  },
  "aria-disabled": {
    makeAttrValue: attrIdentity,
    idlName: "ariaDisabled",
    makeIdlValue: attrIdentity
  },
  "aria-expanded": {
    makeAttrValue: attrIdentity,
    idlName: "ariaExpanded",
    makeIdlValue: attrIdentity
  },
  "aria-haspopup": {
    makeAttrValue: attrIdentity,
    idlName: "ariaHasPopup",
    makeIdlValue: attrIdentity
  },
  "aria-hidden": {
    makeAttrValue: attrIdentity,
    idlName: "ariaHidden",
    makeIdlValue: attrIdentity
  },
  "aria-invalid": {
    makeAttrValue: attrIdentity,
    idlName: "ariaInvalid",
    makeIdlValue: attrIdentity
  },
  "aria-keyshortcuts": {
    makeAttrValue: attrIdentity,
    idlName: "ariaKeyShortcuts",
    makeIdlValue: attrIdentity
  },
  "aria-label": {
    makeAttrValue: attrIdentity,
    idlName: "ariaLabel",
    makeIdlValue: attrIdentity
  },
  "aria-level": {
    makeAttrValue: attrIdentity,
    idlName: "ariaLevel",
    makeIdlValue: attrIdentity
  },
  "aria-live": {
    makeAttrValue: attrIdentity,
    idlName: "ariaLive",
    makeIdlValue: attrIdentity
  },
  "aria-modal": {
    makeAttrValue: attrIdentity,
    idlName: "ariaModal",
    makeIdlValue: attrIdentity
  },
  "aria-multiline": {
    makeAttrValue: attrIdentity,
    idlName: "ariaMultiLine",
    makeIdlValue: attrIdentity
  },
  "aria-multiselectable": {
    makeAttrValue: attrIdentity,
    idlName: "ariaMultiSelectable",
    makeIdlValue: attrIdentity
  },
  "aria-orientation": {
    makeAttrValue: attrIdentity,
    idlName: "ariaOrientation",
    makeIdlValue: attrIdentity
  },
  "aria-placeholder": {
    makeAttrValue: attrIdentity,
    idlName: "ariaPlaceholder",
    makeIdlValue: attrIdentity
  },
  "aria-posinset": {
    makeAttrValue: attrIdentity,
    idlName: "ariaPosInSet",
    makeIdlValue: attrIdentity
  },
  "aria-pressed": {
    makeAttrValue: attrIdentity,
    idlName: "ariaPressed",
    makeIdlValue: attrIdentity
  },
  "aria-readonly": {
    makeAttrValue: attrIdentity,
    idlName: "ariaReadOnly",
    makeIdlValue: attrIdentity
  },
  "aria-required": {
    makeAttrValue: attrIdentity,
    idlName: "ariaRequired",
    makeIdlValue: attrIdentity
  },
  "aria-roledescription": {
    makeAttrValue: attrIdentity,
    idlName: "ariaRoleDescription",
    makeIdlValue: attrIdentity
  },
  "aria-rowcount": {
    makeAttrValue: attrIdentity,
    idlName: "ariaRowCount",
    makeIdlValue: attrIdentity
  },
  "aria-rowindex": {
    makeAttrValue: attrIdentity,
    idlName: "ariaRowIndex",
    makeIdlValue: attrIdentity
  },
  "aria-rowindextext": {
    makeAttrValue: attrIdentity,
    idlName: "ariaRowIndexText",
    makeIdlValue: attrIdentity
  },
  "aria-rowspan": {
    makeAttrValue: attrIdentity,
    idlName: "ariaRowSpan",
    makeIdlValue: attrIdentity
  },
  "aria-selected": {
    makeAttrValue: attrIdentity,
    idlName: "ariaSelected",
    makeIdlValue: attrIdentity
  },
  "aria-setsize": {
    makeAttrValue: attrIdentity,
    idlName: "ariaSetSize",
    makeIdlValue: attrIdentity
  },
  "aria-sort": {
    makeAttrValue: attrIdentity,
    idlName: "ariaSort",
    makeIdlValue: attrIdentity
  },
  "aria-valuemax": {
    makeAttrValue: attrIdentity,
    idlName: "ariaValueMax",
    makeIdlValue: attrIdentity
  },
  "aria-valuemin": {
    makeAttrValue: attrIdentity,
    idlName: "ariaValueMin",
    makeIdlValue: attrIdentity
  },
  "aria-valuenow": {
    makeAttrValue: attrIdentity,
    idlName: "ariaValueNow",
    makeIdlValue: attrIdentity
  },
  "aria-valuetext": {
    makeAttrValue: attrIdentity,
    idlName: "ariaValueText",
    makeIdlValue: attrIdentity
  },
  autocapitalize: {
    makeAttrValue: attrIdentity,
    idlName: "autocapitalize",
    makeIdlValue: attrIdentity
  },
  autofocus: {
    makeAttrValue: attrIdentity,
    idlName: "autofocus",
    makeIdlValue: attrIdentity
  },
  class: {
    makeAttrValue: attrIdentity,
    idlName: "className",
    makeIdlValue: attrIdentity
  },
  contenteditable: {
    makeAttrValue: attrIdentity,
    idlName: "contentEditable",
    makeIdlValue: attrIdentity
  },
  dir: {
    makeAttrValue: attrIdentity,
    idlName: "dir",
    makeIdlValue: attrIdentity
  },
  draggable: {
    makeAttrValue: attrBooleanToEmptyString,
    idlName: "draggable",
    makeIdlValue: attrIdentity
  },
  enterkeyhint: {
    makeAttrValue: attrIdentity,
    idlName: "enterKeyHint",
    makeIdlValue: attrIdentity
  },
  hidden: {
    makeAttrValue: attrBooleanToEmptyString,
    idlName: "hidden",
    makeIdlValue: attrIdentity
  },
  id: {
    makeAttrValue: attrIdentity,
    idlName: "id",
    makeIdlValue: attrIdentity
  },
  inputmode: {
    makeAttrValue: attrIdentity,
    idlName: "inputMode",
    makeIdlValue: attrIdentity
  },
  is: { makeAttrValue: attrIdentity },
  itemid: { makeAttrValue: attrIdentity },
  itemprop: { makeAttrValue: attrIdentity },
  itemref: { makeAttrValue: attrIdentity },
  itemscope: { makeAttrValue: attrBooleanToEmptyString },
  itemtype: { makeAttrValue: attrIdentity },
  lang: {
    makeAttrValue: attrIdentity,
    idlName: "lang",
    makeIdlValue: attrIdentity
  },
  nonce: {
    makeAttrValue: attrIdentity,
    idlName: "nonce",
    makeIdlValue: attrIdentity
  },
  role: {
    makeAttrValue: attrIdentity,
    idlName: "role",
    makeIdlValue: attrIdentity
  },
  slot: {
    makeAttrValue: attrIdentity,
    idlName: "slot",
    makeIdlValue: attrIdentity
  },
  spellcheck: {
    makeAttrValue: attrBooleanToEmptyString,
    idlName: "spellcheck",
    makeIdlValue: attrIdentity
  },
  style: {
    makeAttrValue: attrIdentity,
    idlName: "style",
    makeIdlValue: attrIdentity
  },
  tabindex: {
    makeAttrValue: attrStringOrNumberToString,
    idlName: "tabIndex",
    makeIdlValue: attrStringOrNumberToNumber
  },
  title: {
    makeAttrValue: attrIdentity,
    idlName: "title",
    makeIdlValue: attrIdentity
  },
  translate: {
    makeAttrValue: attrIdentity,
    idlName: "translate",
    makeIdlValue: attrYesNo
  }
};
var HTMLAnchorElementMap = {
  ...HTMLElementMap,
  href: {
    makeAttrValue: attrIdentity,
    idlName: "href",
    makeIdlValue: attrIdentity
  },
  target: {
    makeAttrValue: attrIdentity,
    idlName: "target",
    makeIdlValue: attrIdentity
  },
  download: {
    makeAttrValue: attrIdentity,
    idlName: "download",
    makeIdlValue: attrIdentity
  },
  ping: {
    makeAttrValue: attrIdentity,
    idlName: "ping",
    makeIdlValue: attrIdentity
  },
  rel: {
    makeAttrValue: attrIdentity,
    idlName: "rel",
    makeIdlValue: attrIdentity
  },
  hreflang: {
    makeAttrValue: attrIdentity,
    idlName: "hreflang",
    makeIdlValue: attrIdentity
  },
  type: {
    makeAttrValue: attrIdentity,
    idlName: "type",
    makeIdlValue: attrIdentity
  },
  referrerpolicy: {
    makeAttrValue: attrIdentity,
    idlName: "referrerPolicy",
    makeIdlValue: attrIdentity
  }
};
var HTMLAreaElementMap = {
  ...HTMLElementMap,
  alt: {
    makeAttrValue: attrIdentity,
    idlName: "alt",
    makeIdlValue: attrIdentity
  },
  coords: {
    makeAttrValue: attrIdentity,
    idlName: "coords",
    makeIdlValue: attrIdentity
  },
  shape: {
    makeAttrValue: attrIdentity,
    idlName: "shape",
    makeIdlValue: attrIdentity
  },
  href: {
    makeAttrValue: attrIdentity,
    idlName: "href",
    makeIdlValue: attrIdentity
  },
  target: {
    makeAttrValue: attrIdentity,
    idlName: "target",
    makeIdlValue: attrIdentity
  },
  download: {
    makeAttrValue: attrIdentity,
    idlName: "download",
    makeIdlValue: attrIdentity
  },
  ping: {
    makeAttrValue: attrIdentity,
    idlName: "ping",
    makeIdlValue: attrIdentity
  },
  rel: {
    makeAttrValue: attrIdentity,
    idlName: "rel",
    makeIdlValue: attrIdentity
  },
  referrerpolicy: {
    makeAttrValue: attrIdentity,
    idlName: "referrerPolicy",
    makeIdlValue: attrIdentity
  }
};
var HTMLAudioElementMap = {
  ...HTMLElementMap,
  src: {
    makeAttrValue: attrIdentity,
    idlName: "src",
    makeIdlValue: attrIdentity
  },
  crossorigin: {
    makeAttrValue: attrIdentity,
    idlName: "crossOrigin",
    makeIdlValue: attrIdentity
  },
  preload: {
    makeAttrValue: attrIdentity,
    idlName: "preload",
    makeIdlValue: attrIdentity
  },
  autoplay: {
    makeAttrValue: attrBooleanToEmptyString,
    idlName: "autoplay",
    makeIdlValue: attrIdentity
  },
  loop: {
    makeAttrValue: attrBooleanToEmptyString,
    idlName: "loop",
    makeIdlValue: attrBooleanToEmptyString
  },
  muted: {
    makeAttrValue: attrBooleanToEmptyString,
    idlName: "muted",
    makeIdlValue: attrIdentity
  },
  controls: {
    makeAttrValue: attrBooleanToEmptyString,
    idlName: "controls",
    makeIdlValue: attrIdentity
  }
};
var HTMLBRElementMap = {
  ...HTMLElementMap
};
var HTMLBaseElementMap = {
  ...HTMLElementMap,
  href: {
    makeAttrValue: attrIdentity,
    idlName: "href",
    makeIdlValue: attrIdentity
  },
  target: {
    makeAttrValue: attrIdentity,
    idlName: "target",
    makeIdlValue: attrIdentity
  }
};
var HTMLBodyElementMap = {
  ...HTMLElementMap
};
var HTMLButtonElementMap = {
  ...HTMLElementMap,
  disabled: {
    makeAttrValue: attrBooleanToEmptyString,
    idlName: "disabled",
    makeIdlValue: attrIdentity
  },
  form: { makeAttrValue: attrIdentity },
  formaction: {
    makeAttrValue: attrIdentity,
    idlName: "formAction",
    makeIdlValue: attrIdentity
  },
  formenctype: {
    makeAttrValue: attrIdentity,
    idlName: "formEnctype",
    makeIdlValue: attrIdentity
  },
  formmethod: {
    makeAttrValue: attrIdentity,
    idlName: "formMethod",
    makeIdlValue: attrIdentity
  },
  formnovalidate: {
    makeAttrValue: attrBooleanToEmptyString,
    idlName: "formNoValidate",
    makeIdlValue: attrIdentity
  },
  formtarget: {
    makeAttrValue: attrIdentity,
    idlName: "formTarget",
    makeIdlValue: attrIdentity
  },
  name: {
    makeAttrValue: attrIdentity,
    idlName: "name",
    makeIdlValue: attrIdentity
  },
  type: {
    makeAttrValue: attrIdentity,
    idlName: "type",
    makeIdlValue: attrIdentity
  },
  value: {
    makeAttrValue: attrIdentity,
    idlName: "value",
    makeIdlValue: attrIdentity
  }
};
var HTMLCanvasElementMap = {
  ...HTMLElementMap,
  width: {
    makeAttrValue: attrNumberToString,
    idlName: "width",
    makeIdlValue: attrIdentity
  },
  height: {
    makeAttrValue: attrNumberToString,
    idlName: "height",
    makeIdlValue: attrIdentity
  }
};
var HTMLDListElementMap = {
  ...HTMLElementMap
};
var HTMLDataElementMap = {
  ...HTMLElementMap,
  value: {
    makeAttrValue: attrIdentity,
    idlName: "value",
    makeIdlValue: attrIdentity
  }
};
var HTMLDataListElementMap = {
  ...HTMLElementMap
};
var HTMLDetailsElementMap = {
  ...HTMLElementMap,
  open: {
    makeAttrValue: attrBooleanToEmptyString,
    idlName: "open",
    makeIdlValue: attrIdentity
  }
};
var HTMLDialogElementMap = {
  ...HTMLElementMap,
  open: {
    makeAttrValue: attrBooleanToEmptyString,
    idlName: "open",
    makeIdlValue: attrIdentity
  }
};
var HTMLDivElementMap = {
  ...HTMLElementMap
};
var HTMLEmbedElementMap = {
  ...HTMLElementMap,
  src: {
    makeAttrValue: attrIdentity,
    idlName: "src",
    makeIdlValue: attrIdentity
  },
  type: {
    makeAttrValue: attrIdentity,
    idlName: "type",
    makeIdlValue: attrIdentity
  },
  width: {
    makeAttrValue: attrNumberToString,
    idlName: "width",
    makeIdlValue: attrIdentity
  },
  height: {
    makeAttrValue: attrNumberToString,
    idlName: "height",
    makeIdlValue: attrIdentity
  }
};
var HTMLFieldSetElementMap = {
  ...HTMLElementMap,
  disabled: {
    makeAttrValue: attrBooleanToEmptyString,
    idlName: "disabled",
    makeIdlValue: attrIdentity
  },
  form: { makeAttrValue: attrIdentity },
  name: {
    makeAttrValue: attrIdentity,
    idlName: "name",
    makeIdlValue: attrIdentity
  }
};
var HTMLFormElementMap = {
  ...HTMLElementMap,
  "accept-charset": {
    makeAttrValue: attrIdentity,
    idlName: "acceptCharset",
    makeIdlValue: attrIdentity
  },
  action: {
    makeAttrValue: attrIdentity,
    idlName: "action",
    makeIdlValue: attrIdentity
  },
  autocomplete: {
    makeAttrValue: attrIdentity,
    idlName: "autocomplete",
    makeIdlValue: attrIdentity
  },
  enctype: {
    makeAttrValue: attrIdentity,
    idlName: "enctype",
    makeIdlValue: attrIdentity
  },
  method: {
    makeAttrValue: attrIdentity,
    idlName: "method",
    makeIdlValue: attrIdentity
  },
  name: {
    makeAttrValue: attrIdentity,
    idlName: "name",
    makeIdlValue: attrIdentity
  },
  novalidate: {
    makeAttrValue: attrBooleanToEmptyString,
    idlName: "noValidate",
    makeIdlValue: attrIdentity
  },
  target: {
    makeAttrValue: attrIdentity,
    idlName: "target",
    makeIdlValue: attrIdentity
  },
  rel: {
    makeAttrValue: attrIdentity,
    idlName: "rel",
    makeIdlValue: attrIdentity
  }
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
  src: {
    makeAttrValue: attrIdentity,
    idlName: "src",
    makeIdlValue: attrIdentity
  },
  srcdoc: {
    makeAttrValue: attrIdentity,
    idlName: "srcdoc",
    makeIdlValue: attrIdentity
  },
  name: {
    makeAttrValue: attrIdentity,
    idlName: "name",
    makeIdlValue: attrIdentity
  },
  sandbox: {
    makeAttrValue: attrStringArrayToWsString,
    idlName: "sandbox",
    makeIdlValue: attrStringArrayToWsString
  },
  allow: {
    makeAttrValue: attrIdentity,
    idlName: "allow",
    makeIdlValue: attrIdentity
  },
  allowfullscreen: {
    makeAttrValue: attrBooleanToEmptyString,
    idlName: "allowFullscreen",
    makeIdlValue: attrIdentity
  },
  width: {
    makeAttrValue: attrNumberToString,
    idlName: "width",
    makeIdlValue: attrIdentity
  },
  height: {
    makeAttrValue: attrNumberToString,
    idlName: "height",
    makeIdlValue: attrIdentity
  },
  referrerpolicy: {
    makeAttrValue: attrIdentity,
    idlName: "referrerPolicy",
    makeIdlValue: attrIdentity
  },
  loading: {
    makeAttrValue: attrIdentity,
    idlName: "loading",
    makeIdlValue: attrIdentity
  }
};
var HTMLImageElementMap = {
  ...HTMLElementMap,
  alt: {
    makeAttrValue: attrIdentity,
    idlName: "alt",
    makeIdlValue: attrIdentity
  },
  src: {
    makeAttrValue: attrIdentity,
    idlName: "src",
    makeIdlValue: attrIdentity
  },
  srcset: {
    makeAttrValue: attrIdentity,
    idlName: "srcset",
    makeIdlValue: attrIdentity
  },
  sizes: {
    makeAttrValue: attrIdentity,
    idlName: "sizes",
    makeIdlValue: attrIdentity
  },
  crossorigin: {
    makeAttrValue: attrIdentity,
    idlName: "crossOrigin",
    makeIdlValue: attrIdentity
  },
  usemap: {
    makeAttrValue: attrIdentity,
    idlName: "useMap",
    makeIdlValue: attrIdentity
  },
  ismap: {
    makeAttrValue: attrBooleanToEmptyString,
    idlName: "isMap",
    makeIdlValue: attrIdentity
  },
  width: {
    makeAttrValue: attrNumberToString,
    idlName: "width",
    makeIdlValue: attrIdentity
  },
  height: {
    makeAttrValue: attrNumberToString,
    idlName: "height",
    makeIdlValue: attrIdentity
  },
  referrerpolicy: {
    makeAttrValue: attrIdentity,
    idlName: "referrerPolicy",
    makeIdlValue: attrIdentity
  },
  decoding: {
    makeAttrValue: attrIdentity,
    idlName: "decoding",
    makeIdlValue: attrIdentity
  },
  loading: {
    makeAttrValue: attrIdentity,
    idlName: "loading",
    makeIdlValue: attrIdentity
  }
};
var HTMLInputElementMap = {
  ...HTMLElementMap,
  accept: {
    makeAttrValue: attrIdentity,
    idlName: "accept",
    makeIdlValue: attrIdentity
  },
  alt: {
    makeAttrValue: attrIdentity,
    idlName: "alt",
    makeIdlValue: attrIdentity
  },
  autocomplete: {
    makeAttrValue: attrIdentity,
    idlName: "autocomplete",
    makeIdlValue: attrIdentity
  },
  checked: {
    makeAttrValue: attrBooleanToEmptyString,
    idlName: "checked",
    makeIdlValue: attrIdentity
  },
  dirname: {
    makeAttrValue: attrIdentity,
    idlName: "dirName",
    makeIdlValue: attrIdentity
  },
  disabled: {
    makeAttrValue: attrBooleanToEmptyString,
    idlName: "disabled",
    makeIdlValue: attrIdentity
  },
  form: {
    makeAttrValue: attrIdentity,
    idlName: "form",
    makeIdlValue: attrIdentity
  },
  formaction: {
    makeAttrValue: attrIdentity,
    idlName: "formAction",
    makeIdlValue: attrIdentity
  },
  formenctype: {
    makeAttrValue: attrIdentity,
    idlName: "formEnctype",
    makeIdlValue: attrIdentity
  },
  formmethod: {
    makeAttrValue: attrIdentity,
    idlName: "formMethod",
    makeIdlValue: attrIdentity
  },
  formnovalidate: {
    makeAttrValue: attrBooleanToEmptyString,
    idlName: "formNoValidate",
    makeIdlValue: attrIdentity
  },
  formtarget: {
    makeAttrValue: attrIdentity,
    idlName: "formTarget",
    makeIdlValue: attrIdentity
  },
  height: {
    makeAttrValue: attrNumberToString,
    idlName: "height",
    makeIdlValue: attrIdentity
  },
  indeterminate: {
    idlName: "indeterminate",
    makeIdlValue: attrIdentity
  },
  list: {
    makeAttrValue: attrIdentity,
    idlName: "list",
    makeIdlValue: attrIdentity
  },
  max: {
    makeAttrValue: attrNumberToString,
    idlName: "max",
    makeIdlValue: attrIdentity
  },
  maxlength: {
    makeAttrValue: attrNumberToString,
    idlName: "maxLength",
    makeIdlValue: attrIdentity
  },
  min: {
    makeAttrValue: attrNumberToString,
    idlName: "min",
    makeIdlValue: attrIdentity
  },
  minlength: {
    makeAttrValue: attrNumberToString,
    idlName: "minLength",
    makeIdlValue: attrIdentity
  },
  multiple: {
    makeAttrValue: attrBooleanToEmptyString,
    idlName: "multiple",
    makeIdlValue: attrIdentity
  },
  name: {
    makeAttrValue: attrIdentity,
    idlName: "name",
    makeIdlValue: attrIdentity
  },
  pattern: {
    makeAttrValue: attrIdentity,
    idlName: "pattern",
    makeIdlValue: attrIdentity
  },
  placeholder: {
    makeAttrValue: attrIdentity,
    idlName: "placeholder",
    makeIdlValue: attrIdentity
  },
  readonly: {
    makeAttrValue: attrBooleanToEmptyString,
    idlName: "readOnly",
    makeIdlValue: attrIdentity
  },
  required: {
    makeAttrValue: attrBooleanToEmptyString,
    idlName: "required",
    makeIdlValue: attrIdentity
  },
  size: {
    makeAttrValue: attrNumberToString,
    idlName: "size",
    makeIdlValue: attrIdentity
  },
  src: {
    makeAttrValue: attrIdentity,
    idlName: "src",
    makeIdlValue: attrIdentity
  },
  step: {
    makeAttrValue: attrNumberToString,
    idlName: "step",
    makeIdlValue: attrIdentity
  },
  type: {
    makeAttrValue: attrIdentity,
    idlName: "type",
    makeIdlValue: attrIdentity
  },
  value: {
    makeAttrValue: attrIdentity,
    idlName: "value",
    makeIdlValue: attrIdentity
  },
  width: {
    makeAttrValue: attrNumberToString,
    idlName: "width",
    makeIdlValue: attrIdentity
  }
};
var HTMLModElementMap = {
  ...HTMLElementMap,
  cite: {
    makeAttrValue: attrIdentity,
    idlName: "cite",
    makeIdlValue: attrIdentity
  },
  datetime: {
    makeAttrValue: attrIdentity,
    idlName: "dateTime",
    makeIdlValue: attrIdentity
  }
};
var HTMLLabelElementMap = {
  ...HTMLElementMap,
  for: {
    makeAttrValue: attrIdentity,
    idlName: "htmlFor",
    makeIdlValue: attrIdentity
  }
};
var HTMLLegendElementMap = {
  ...HTMLElementMap
};
var HTMLLIElementMap = {
  ...HTMLElementMap,
  value: {
    makeAttrValue: attrIdentity,
    idlName: "value",
    makeIdlValue: attrIdentity
  }
};
var HTMLLinkElementMap = {
  ...HTMLElementMap,
  href: {
    makeAttrValue: attrIdentity,
    idlName: "href",
    makeIdlValue: attrIdentity
  },
  crossorigin: {
    makeAttrValue: attrIdentity,
    idlName: "crossOrigin",
    makeIdlValue: attrIdentity
  },
  rel: {
    makeAttrValue: attrIdentity,
    idlName: "rel",
    makeIdlValue: attrIdentity
  },
  media: {
    makeAttrValue: attrIdentity,
    idlName: "media",
    makeIdlValue: attrIdentity
  },
  integrity: {
    makeAttrValue: attrIdentity,
    idlName: "integrity",
    makeIdlValue: attrIdentity
  },
  hreflang: {
    makeAttrValue: attrIdentity,
    idlName: "hreflang",
    makeIdlValue: attrIdentity
  },
  type: {
    makeAttrValue: attrIdentity,
    idlName: "type",
    makeIdlValue: attrIdentity
  },
  referrerpolicy: {
    makeAttrValue: attrIdentity,
    idlName: "referrerPolicy",
    makeIdlValue: attrIdentity
  },
  sizes: {
    makeAttrValue: attrIdentity,
    idlName: "sizes",
    makeIdlValue: attrIdentity
  },
  imagesrcset: {
    makeAttrValue: attrIdentity,
    idlName: "imageSrcset",
    makeIdlValue: attrIdentity
  },
  imagesizes: {
    makeAttrValue: attrIdentity,
    idlName: "imageSizes",
    makeIdlValue: attrIdentity
  },
  as: {
    makeAttrValue: attrIdentity,
    idlName: "as",
    makeIdlValue: attrIdentity
  },
  color: {
    makeAttrValue: attrIdentity
  },
  disabled: {
    makeAttrValue: attrBooleanToEmptyString,
    idlName: "disabled",
    makeIdlValue: attrIdentity
  }
};
var HTMLMapElementMap = {
  ...HTMLElementMap,
  name: {
    makeAttrValue: attrIdentity,
    idlName: "name",
    makeIdlValue: attrIdentity
  }
};
var HTMLMenuElementMap = {
  ...HTMLElementMap
};
var HTMLMetaElementMap = {
  ...HTMLElementMap,
  name: {
    makeAttrValue: attrIdentity,
    idlName: "name",
    makeIdlValue: attrIdentity
  },
  "http-equiv": {
    makeAttrValue: attrIdentity,
    idlName: "httpEquiv",
    makeIdlValue: attrIdentity
  },
  content: {
    makeAttrValue: attrIdentity,
    idlName: "content",
    makeIdlValue: attrIdentity
  },
  charset: {
    makeAttrValue: attrIdentity
  },
  media: {
    makeAttrValue: attrIdentity,
    idlName: "media",
    makeIdlValue: attrIdentity
  }
};
var HTMLMeterElementMap = {
  ...HTMLElementMap,
  value: {
    makeAttrValue: attrNumberToString,
    idlName: "value",
    makeIdlValue: attrIdentity
  },
  min: {
    makeAttrValue: attrNumberToString,
    idlName: "min",
    makeIdlValue: attrIdentity
  },
  max: {
    makeAttrValue: attrNumberToString,
    idlName: "max",
    makeIdlValue: attrIdentity
  },
  low: {
    makeAttrValue: attrNumberToString,
    idlName: "low",
    makeIdlValue: attrIdentity
  },
  high: {
    makeAttrValue: attrNumberToString,
    idlName: "high",
    makeIdlValue: attrIdentity
  },
  optimum: {
    makeAttrValue: attrNumberToString,
    idlName: "optimum",
    makeIdlValue: attrIdentity
  }
};
var HTMLObjectElementMap = {
  ...HTMLElementMap,
  data: {
    makeAttrValue: attrIdentity,
    idlName: "data",
    makeIdlValue: attrIdentity
  },
  type: {
    makeAttrValue: attrIdentity,
    idlName: "type",
    makeIdlValue: attrIdentity
  },
  name: {
    makeAttrValue: attrIdentity,
    idlName: "name",
    makeIdlValue: attrIdentity
  },
  form: {
    makeAttrValue: attrIdentity
  },
  width: {
    makeAttrValue: attrIdentity,
    idlName: "width",
    makeIdlValue: attrIdentity
  },
  height: {
    makeAttrValue: attrIdentity,
    idlName: "height",
    makeIdlValue: attrIdentity
  }
};
var HTMLOListElementMap = {
  ...HTMLElementMap,
  reversed: {
    makeAttrValue: attrBooleanToEmptyString,
    idlName: "reversed",
    makeIdlValue: attrIdentity
  },
  start: {
    makeAttrValue: attrNumberToString,
    idlName: "start",
    makeIdlValue: attrIdentity
  },
  type: {
    makeAttrValue: attrIdentity,
    idlName: "type",
    makeIdlValue: attrIdentity
  }
};
var HTMLOptGroupElementMap = {
  ...HTMLElementMap,
  disabled: {
    makeAttrValue: attrBooleanToEmptyString,
    idlName: "disabled",
    makeIdlValue: attrIdentity
  },
  label: {
    makeAttrValue: attrIdentity,
    idlName: "label",
    makeIdlValue: attrIdentity
  }
};
var HTMLOptionElementMap = {
  ...HTMLElementMap,
  disabled: {
    makeAttrValue: attrBooleanToEmptyString,
    idlName: "disabled",
    makeIdlValue: attrIdentity
  },
  label: {
    makeAttrValue: attrIdentity,
    idlName: "label",
    makeIdlValue: attrIdentity
  },
  selected: {
    makeAttrValue: attrBooleanToEmptyString,
    idlName: "selected",
    makeIdlValue: attrIdentity
  },
  value: {
    makeAttrValue: attrIdentity,
    idlName: "value",
    makeIdlValue: attrIdentity
  }
};
var HTMLOutputElementMap = {
  ...HTMLElementMap,
  for: {
    makeAttrValue: attrIdentity,
    idlName: "htmlFor",
    makeIdlValue: attrIdentity
  },
  form: { makeAttrValue: attrIdentity },
  name: {
    makeAttrValue: attrIdentity,
    idlName: "name",
    makeIdlValue: attrIdentity
  }
};
var HTMLParagraphElementMap = {
  ...HTMLElementMap
};
var HTMLParamElementMap = {
  ...HTMLElementMap,
  name: {
    makeAttrValue: attrIdentity,
    idlName: "name",
    makeIdlValue: attrIdentity
  },
  value: {
    makeAttrValue: attrIdentity,
    idlName: "value",
    makeIdlValue: attrIdentity
  }
};
var HTMLPictureElementMap = {
  ...HTMLElementMap
};
var HTMLPreElementMap = {
  ...HTMLElementMap
};
var HTMLProgressElementMap = {
  ...HTMLElementMap,
  value: {
    makeAttrValue: attrNumberToString,
    idlName: "value",
    makeIdlValue: attrIdentity
  },
  max: {
    makeAttrValue: attrNumberToString,
    idlName: "max",
    makeIdlValue: attrIdentity
  }
};
var HTMLQuoteElementMap = {
  ...HTMLElementMap,
  cite: {
    makeAttrValue: attrIdentity,
    idlName: "cite",
    makeIdlValue: attrIdentity
  }
};
var HTMLScriptElementMap = {
  ...HTMLElementMap,
  src: {
    makeAttrValue: attrIdentity,
    idlName: "src",
    makeIdlValue: attrIdentity
  },
  type: {
    makeAttrValue: attrIdentity,
    idlName: "type",
    makeIdlValue: attrIdentity
  },
  nomodule: {
    makeAttrValue: attrBooleanToEmptyString,
    idlName: "noModule",
    makeIdlValue: attrIdentity
  },
  async: {
    makeAttrValue: attrBooleanToEmptyString,
    idlName: "async",
    makeIdlValue: attrIdentity
  },
  defer: {
    makeAttrValue: attrBooleanToEmptyString,
    idlName: "defer",
    makeIdlValue: attrIdentity
  },
  crossorigin: {
    makeAttrValue: attrIdentity,
    idlName: "crossOrigin",
    makeIdlValue: attrIdentity
  },
  integrity: {
    makeAttrValue: attrIdentity,
    idlName: "integrity",
    makeIdlValue: attrIdentity
  },
  referrerpolicy: {
    makeAttrValue: attrIdentity,
    idlName: "referrerPolicy",
    makeIdlValue: attrIdentity
  }
};
var HTMLSelectElementMap = {
  ...HTMLElementMap,
  autocomplete: {
    makeAttrValue: attrIdentity,
    idlName: "autocomplete",
    makeIdlValue: attrIdentity
  },
  disabled: {
    makeAttrValue: attrBooleanToEmptyString,
    idlName: "disabled",
    makeIdlValue: attrIdentity
  },
  form: { makeAttrValue: attrIdentity },
  multiple: {
    makeAttrValue: attrBooleanToEmptyString,
    idlName: "multiple",
    makeIdlValue: attrIdentity
  },
  name: {
    makeAttrValue: attrIdentity,
    idlName: "name",
    makeIdlValue: attrIdentity
  },
  required: {
    makeAttrValue: attrBooleanToEmptyString,
    idlName: "required",
    makeIdlValue: attrIdentity
  },
  size: {
    makeAttrValue: attrNumberToString,
    idlName: "size",
    makeIdlValue: attrIdentity
  },
  value: { idlName: "value", makeIdlValue: attrIdentity }
};
var HTMLSlotElementMap = {
  ...HTMLElementMap,
  name: {
    makeAttrValue: attrIdentity,
    idlName: "name",
    makeIdlValue: attrIdentity
  }
};
var HTMLSourceElementMap = {
  ...HTMLElementMap,
  type: {
    makeAttrValue: attrIdentity,
    idlName: "type",
    makeIdlValue: attrIdentity
  },
  src: {
    makeAttrValue: attrIdentity,
    idlName: "src",
    makeIdlValue: attrIdentity
  },
  srcset: {
    makeAttrValue: attrIdentity,
    idlName: "srcset",
    makeIdlValue: attrIdentity
  },
  sizes: {
    makeAttrValue: attrIdentity,
    idlName: "sizes",
    makeIdlValue: attrIdentity
  },
  media: {
    makeAttrValue: attrIdentity,
    idlName: "media",
    makeIdlValue: attrIdentity
  },
  width: {
    makeAttrValue: attrNumberToString,
    idlName: "width",
    makeIdlValue: attrIdentity
  },
  height: {
    makeAttrValue: attrNumberToString,
    idlName: "height",
    makeIdlValue: attrIdentity
  }
};
var HTMLSpanElementMap = {
  ...HTMLElementMap
};
var HTMLStyleElementMap = {
  ...HTMLElementMap,
  media: {
    makeAttrValue: attrIdentity,
    idlName: "media",
    makeIdlValue: attrIdentity
  }
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
    makeAttrValue: attrNumberToString,
    idlName: "colSpan",
    makeIdlValue: attrIdentity
  },
  rowspan: {
    makeAttrValue: attrNumberToString,
    idlName: "rowSpan",
    makeIdlValue: attrIdentity
  },
  headers: {
    makeAttrValue: attrIdentity,
    idlName: "headers",
    makeIdlValue: attrIdentity
  }
};
var HTMLTableColElementMap = {
  ...HTMLElementMap,
  span: {
    makeAttrValue: attrNumberToString,
    idlName: "span",
    makeIdlValue: attrIdentity
  }
};
var HTMLTemplateElementMap = {
  ...HTMLElementMap
};
var HTMLTextAreaElementMap = {
  ...HTMLElementMap,
  autocomplete: {
    makeAttrValue: attrIdentity,
    idlName: "autocomplete",
    makeIdlValue: attrIdentity
  },
  cols: {
    makeAttrValue: attrNumberToString,
    idlName: "cols",
    makeIdlValue: attrIdentity
  },
  dirname: {
    makeAttrValue: attrIdentity,
    idlName: "dirName",
    makeIdlValue: attrIdentity
  },
  disabled: {
    makeAttrValue: attrBooleanToEmptyString,
    idlName: "disabled",
    makeIdlValue: attrIdentity
  },
  form: { makeAttrValue: attrIdentity },
  maxlength: {
    makeAttrValue: attrNumberToString,
    idlName: "maxLength",
    makeIdlValue: attrIdentity
  },
  minlength: {
    makeAttrValue: attrNumberToString,
    idlName: "minLength",
    makeIdlValue: attrIdentity
  },
  name: {
    makeAttrValue: attrIdentity,
    idlName: "name",
    makeIdlValue: attrIdentity
  },
  placeholder: {
    makeAttrValue: attrIdentity,
    idlName: "placeholder",
    makeIdlValue: attrIdentity
  },
  readonly: {
    makeAttrValue: attrBooleanToEmptyString,
    idlName: "readOnly",
    makeIdlValue: attrIdentity
  },
  required: {
    makeAttrValue: attrBooleanToEmptyString,
    idlName: "required",
    makeIdlValue: attrIdentity
  },
  rows: {
    makeAttrValue: attrNumberToString,
    idlName: "rows",
    makeIdlValue: attrIdentity
  },
  wrap: {
    makeAttrValue: attrIdentity,
    idlName: "wrap",
    makeIdlValue: attrIdentity
  }
};
var HTMLTimeElementMap = {
  ...HTMLElementMap,
  datetime: {
    makeAttrValue: attrIdentity,
    idlName: "dateTime",
    makeIdlValue: attrIdentity
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
  kind: {
    makeAttrValue: attrIdentity,
    idlName: "kind",
    makeIdlValue: attrIdentity
  },
  src: {
    makeAttrValue: attrIdentity,
    idlName: "src",
    makeIdlValue: attrIdentity
  },
  srclang: {
    makeAttrValue: attrIdentity,
    idlName: "srclang",
    makeIdlValue: attrIdentity
  },
  label: {
    makeAttrValue: attrIdentity,
    idlName: "label",
    makeIdlValue: attrIdentity
  },
  default: {
    makeAttrValue: attrBooleanToEmptyString,
    idlName: "default",
    makeIdlValue: attrIdentity
  }
};
var HTMLUListElementMap = {
  ...HTMLElementMap
};
var HTMLVideoElementMap = {
  ...HTMLElementMap,
  src: {
    makeAttrValue: attrIdentity,
    idlName: "src",
    makeIdlValue: attrIdentity
  },
  crossorigin: {
    makeAttrValue: attrIdentity,
    idlName: "crossOrigin",
    makeIdlValue: attrIdentity
  },
  preload: {
    makeAttrValue: attrIdentity,
    idlName: "preload",
    makeIdlValue: attrIdentity
  },
  autoplay: {
    makeAttrValue: attrBooleanToEmptyString,
    idlName: "autoplay",
    makeIdlValue: attrIdentity
  },
  loop: {
    makeAttrValue: attrBooleanToEmptyString,
    idlName: "loop",
    makeIdlValue: attrBooleanToEmptyString
  },
  muted: {
    makeAttrValue: attrBooleanToEmptyString,
    idlName: "muted",
    makeIdlValue: attrIdentity
  },
  controls: {
    makeAttrValue: attrBooleanToEmptyString,
    idlName: "controls",
    makeIdlValue: attrIdentity
  },
  poster: {
    makeAttrValue: attrIdentity,
    idlName: "poster",
    makeIdlValue: attrIdentity
  },
  playsinline: {
    makeAttrValue: attrIdentity,
    idlName: "playsInline",
    makeIdlValue: attrIdentity
  },
  width: {
    makeAttrValue: attrNumberToString,
    idlName: "width",
    makeIdlValue: attrIdentity
  },
  height: {
    makeAttrValue: attrNumberToString,
    idlName: "height",
    makeIdlValue: attrIdentity
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
function makeRootVNode({ domNode }) {
  const rootVNode = {
    domNode,
    children: [],
    domParent: null,
    mountFragment: document.createDocumentFragment(),
    jsxNode: null,
    onMount: [],
    onUnmount: []
  };
  rootVNode.domParent = rootVNode;
  return rootVNode;
}
function makeChildVNode({
  jsxNode,
  domNode,
  domParent,
  onMount,
  onUnmount
}) {
  return {
    domNode,
    children: [],
    domParent,
    mountFragment: domNode ? document.createDocumentFragment() : null,
    jsxNode,
    onMount,
    onUnmount
  };
}
function getShallowNodes(vNode) {
  const nodes = [];
  function visit(node) {
    if (node.domNode) {
      nodes.push(node.domNode);
    } else {
      node.children.forEach((child) => visit(child));
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
    const visitIndex = node === immediateParent ? childIndex : node.children.length;
    for (let i = 0; i < visitIndex; ++i) {
      if (visit(node.children[i])) {
        return true;
      }
    }
    return node === immediateParent;
  }
  visitChildren(domParent);
  return realIndex;
}
function callOnMount(node) {
  node.children.forEach((child) => callOnMount(child));
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
function callOnUnmount(node) {
  node.children.forEach((child) => callOnUnmount(child));
  if (node.onUnmount) {
    node.onUnmount.forEach((onUnmount) => {
      try {
        onUnmount();
      } catch (e) {
        exception(e, "VNode node raised exception in onUnmount", node);
      }
    });
  }
}
function mountVNode(vNode) {
  if (vNode.domNode && vNode.domParent.mountFragment) {
    vNode.domParent.mountFragment.appendChild(vNode.domNode);
  }
}
function spliceVNode(immediateParent, childIndex, removeCount, newNodes, { runOnMount = true, runOnUnmount = true } = {}) {
  let domParent;
  if (immediateParent.children[childIndex]) {
    domParent = immediateParent.children[childIndex].domParent;
  } else {
    childIndex = immediateParent.children.length;
    domParent = immediateParent.domNode ? immediateParent : immediateParent.domParent;
  }
  assert(domParent, "tried to replace a root tree slot with missing domParent");
  const detachedVNodes = immediateParent.children.splice(childIndex, removeCount, ...newNodes);
  const toRemove = [];
  detachedVNodes.forEach((detachedVNode) => {
    if (runOnUnmount) {
      callOnUnmount(detachedVNode);
    }
    const nodesToRemove = getShallowNodes(detachedVNode);
    nodesToRemove.forEach((node) => {
      if (node.parentNode) {
        toRemove.push([node.parentNode, node]);
      }
    });
  });
  const groupedToRemove = groupBy(toRemove, (item) => item);
  groupedToRemove.forEach((childNodes, parentNode) => {
    if (parentNode.childNodes.length === childNodes.length) {
      parentNode.replaceChildren();
    } else {
      childNodes.forEach((child) => parentNode.removeChild(child));
    }
  });
  if (!domParent.domNode) {
    throw new Error("Invariant: domParent missing domNode");
  }
  const domParentNode = domParent.domNode;
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
        callOnMount(newNode);
      });
    }
  }
  return detachedVNodes;
}

// src/view.ts
function createElement(Constructor, props, ...children) {
  if (typeof Constructor === "string") {
    return {
      [TypeTag]: "element",
      element: Constructor,
      props,
      children
    };
  }
  if (isContext(Constructor)) {
    return {
      [TypeTag]: "provider",
      context: Constructor,
      value: props.value,
      children
    };
  }
  return {
    [TypeTag]: "component",
    component: Constructor,
    props,
    children
  };
}
var boundEvents = new WeakMap();
function setAttributeValue(elementType, element, key, value) {
  if (key.startsWith("on:") && typeof value === "function") {
    const eventName = key.slice(3);
    let attributes = boundEvents.get(element);
    if (!attributes) {
      attributes = {};
      boundEvents.set(element, attributes);
    }
    if (attributes[key]) {
      element.removeEventListener(eventName, attributes[key]);
    }
    element.addEventListener(eventName, value);
    attributes[key] = value;
  } else {
    const mapping = getElementTypeMapping(elementType, key);
    if (mapping) {
      if (mapping.makeAttrValue) {
        const attributeValue = mapping.makeAttrValue(value);
        if (attributeValue === void 0) {
          element.removeAttribute(key);
        } else {
          element.setAttribute(key, attributeValue);
        }
      }
      if (mapping.idlName && mapping.makeIdlValue) {
        element[mapping.idlName] = mapping.makeIdlValue(value);
      }
    } else if (value === false || value === void 0 || value === null) {
      element.removeAttribute(key);
    } else if (value === true) {
      element.setAttribute(key, "");
    } else if (typeof value === "string") {
      element.setAttribute(key, value);
    }
  }
}
function jsxNodeToVNode({
  domParent,
  jsxNode,
  contextMap
}) {
  if (jsxNode === null || jsxNode === void 0 || jsxNode === false || jsxNode === true) {
    const emptyVNode = makeChildVNode({
      domParent,
      jsxNode,
      domNode: null,
      onMount: [],
      onUnmount: []
    });
    mountVNode(emptyVNode);
    return emptyVNode;
  }
  if (typeof jsxNode === "string") {
    const stringVNode = makeChildVNode({
      domParent,
      jsxNode,
      domNode: document.createTextNode(jsxNode),
      onMount: [],
      onUnmount: []
    });
    mountVNode(stringVNode);
    return stringVNode;
  }
  if (typeof jsxNode === "number") {
    const numberVNode = makeChildVNode({
      domParent,
      jsxNode,
      domNode: document.createTextNode(jsxNode.toString()),
      onMount: [],
      onUnmount: []
    });
    mountVNode(numberVNode);
    return numberVNode;
  }
  if (isRenderElement(jsxNode)) {
    const element = document.createElement(jsxNode.element);
    const boundEffects = [];
    let refCallback = void 0;
    if (jsxNode.props) {
      Object.entries(jsxNode.props).forEach(([key, value]) => {
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
            setAttributeValue(jsxNode.element, element, key, computedValue);
          }, `viewattr:${key}`);
          retain(boundEffect);
          boundEffects.push(boundEffect);
          boundEffect();
        } else {
          setAttributeValue(jsxNode.element, element, key, value);
        }
      });
    }
    const elementNode = makeChildVNode({
      domParent,
      jsxNode,
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
          boundEffects.forEach((boundEffect) => release(boundEffect));
          if (refCallback) {
            refCallback(void 0);
          }
        }
      ]
    });
    elementNode.children = jsxNode.children.map((childJsxNode) => jsxNodeToVNode({
      domParent: elementNode,
      jsxNode: childJsxNode,
      contextMap
    }));
    if (elementNode.mountFragment) {
      element.appendChild(elementNode.mountFragment);
      elementNode.mountFragment = null;
    }
    mountVNode(elementNode);
    return elementNode;
  }
  if (isCollection(jsxNode)) {
    const trackedCollection = jsxNode;
    const onUnmount = [];
    const collectionNode = makeChildVNode({
      domParent,
      jsxNode,
      domNode: null,
      onMount: [],
      onUnmount
    });
    untracked(() => {
      collectionNode.children.push(...trackedCollection.map((jsxChild) => jsxNodeToVNode({
        domParent: collectionNode.domParent,
        jsxNode: jsxChild,
        contextMap
      })));
    });
    const unobserve = trackedCollection[ObserveKey]((event) => {
      if (event.type === "splice") {
        untracked(() => {
          const { count, index, items } = event;
          const childNodes = items.map((jsxChild) => jsxNodeToVNode({
            domParent: collectionNode.domParent,
            jsxNode: jsxChild,
            contextMap
          }));
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
    retain(trackedCollection);
    onUnmount.push(unobserve);
    onUnmount.push(() => {
      release(trackedCollection);
    });
    mountVNode(collectionNode);
    return collectionNode;
  }
  if (isCalculation(jsxNode)) {
    const trackedCalculation = jsxNode;
    const onUnmount = [];
    const calculationNode = makeChildVNode({
      domParent,
      jsxNode,
      domNode: null,
      onMount: [],
      onUnmount
    });
    let firstRun = true;
    const resultEffect = effect(() => {
      const jsxChild = trackedCalculation();
      const childVNode = jsxNodeToVNode({
        domParent: calculationNode.domParent,
        jsxNode: jsxChild,
        contextMap
      });
      if (firstRun) {
        firstRun = false;
        calculationNode.children.push(childVNode);
      } else {
        spliceVNode(calculationNode, 0, calculationNode.children.length, [childVNode]);
      }
    }, `viewcalc:${debugNameFor(jsxNode) ?? "node"}`);
    retain(resultEffect);
    onUnmount.push(() => release(resultEffect));
    resultEffect();
    mountVNode(calculationNode);
    return calculationNode;
  }
  if (isRenderProvider(jsxNode)) {
    const renderProvider = jsxNode;
    const providerNode = makeChildVNode({
      domParent,
      jsxNode,
      domNode: null,
      onMount: [],
      onUnmount: []
    });
    const subMap = new Map(contextMap);
    subMap.set(renderProvider.context, renderProvider.value);
    providerNode.children.push(...renderProvider.children.map((jsxChild) => jsxNodeToVNode({
      domParent,
      jsxNode: jsxChild,
      contextMap: subMap
    })));
    mountVNode(providerNode);
    return providerNode;
  }
  if (isRenderComponent(jsxNode)) {
    const onUnmount = [];
    const componentNode = makeChildVNode({
      domParent,
      jsxNode,
      domNode: null,
      onMount: [],
      onUnmount
    });
    const Component2 = jsxNode.component;
    const onComponentMount = [];
    const jsxChild = Component2({
      ...jsxNode.props || {},
      children: jsxNode.children
    }, {
      onUnmount: (unmountCallback) => {
        onUnmount.push(unmountCallback);
      },
      onMount: (mountCallback) => {
        onComponentMount.push(mountCallback);
      },
      onEffect: (effectCallback, debugName) => {
        const effectCalc = effect(effectCallback, `componenteffect:${jsxNode.component.name}:${debugName ?? onComponentMount.length}`);
        onComponentMount.push(() => {
          retain(effectCalc);
          effectCalc();
        });
        onUnmount.push(() => {
          release(effectCalc);
        });
      },
      getContext: (context) => {
        if (contextMap.has(context)) {
          return contextMap.get(context);
        }
        return context();
      }
    });
    const childVNode = jsxNodeToVNode({
      domParent: componentNode.domParent,
      jsxNode: jsxChild,
      contextMap
    });
    componentNode.children.push(childVNode);
    onComponentMount.forEach((mountCallback) => componentNode.onMount.push(mountCallback));
    mountVNode(componentNode);
    return componentNode;
  }
  if (Array.isArray(jsxNode)) {
    const items = jsxNode;
    const arrayNode = makeChildVNode({
      domParent,
      jsxNode,
      domNode: null,
      onMount: [],
      onUnmount: []
    });
    arrayNode.children.push(...items.map((jsxChild) => jsxNodeToVNode({
      domParent,
      jsxNode: jsxChild,
      contextMap
    })));
    mountVNode(arrayNode);
    return arrayNode;
  }
  if (typeof jsxNode === "function") {
    const functionVNode = makeChildVNode({
      domParent,
      jsxNode,
      domNode: null,
      onMount: [],
      onUnmount: []
    });
    warn("Attempted to render JSX node that was a function, not rendering anything");
    mountVNode(functionVNode);
    return functionVNode;
  }
  assertExhausted(jsxNode, "unexpected render type");
}
function mount(parentElement, jsxNode) {
  const rootNode = makeRootVNode({ domNode: parentElement });
  rootNode.children.push(jsxNodeToVNode({
    domParent: rootNode,
    jsxNode,
    contextMap: new Map()
  }));
  if (rootNode.mountFragment) {
    parentElement.appendChild(rootNode.mountFragment);
    rootNode.mountFragment = null;
  }
  callOnMount(rootNode);
  return () => {
    spliceVNode(rootNode, 0, rootNode.children.length, []);
  };
}
var Fragment = ({ children }) => children;

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
    observe,
    addDeferredWork,
    processFieldChange,
    removeSubscriptionField
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
          processFieldChange(key);
          if (i >= newLength) {
            removeSubscriptionField(key);
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
      for (let i = array.length - 1; i >= 0; --i) {
        if (func(this[i], i)) {
          this.splice(i, 1);
        }
      }
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
  const fields = new Map();
  let observers = [];
  let deferredTasks = [];
  const subscriptionNode = {
    [TypeTag]: "subscription"
  };
  name(subscriptionNode, `${debugName || "?"}:sub`);
  function addDeferredWork(task) {
    deferredTasks.push(task);
    processChange(proxy);
  }
  function flush2() {
    const toProcess = deferredTasks;
    deferredTasks = [];
    toProcess.forEach((task) => {
      task();
    });
  }
  function notify2(event) {
    observers.forEach((observer) => {
      observer(event);
    });
  }
  function observe(observer) {
    if (observers.length === 0) {
      fields.forEach((field) => {
        addManualDep(field, subscriptionNode);
      });
    }
    observers.push(observer);
    return () => {
      observers = observers.filter((obs) => obs !== observer);
      if (observers.length === 0) {
        fields.forEach((field) => {
          removeManualDep(field, subscriptionNode);
        });
      }
    };
  }
  function makeView(spec, viewDebugName) {
    const viewArray = untracked(() => spec.initialize(initialValue));
    const view = collection(viewArray, viewDebugName);
    observe((event) => {
      view[AddDeferredWorkKey](() => spec.processEvent(view, event, viewArray));
    });
    addManualDep(proxy, view);
    addManualDep(subscriptionNode, view);
    return view;
  }
  function processFieldChange(key) {
    const field = getField(key);
    processChange(field);
  }
  function removeSubscriptionField(key) {
    if (observers.length > 0) {
      const field = getField(key);
      removeManualDep(field, subscriptionNode);
    }
  }
  const pseudoPrototype = {
    [TypeTag]: "data",
    [DataTypeTag]: typeTag,
    [FlushKey]: flush2,
    [AddDeferredWorkKey]: addDeferredWork,
    [ObserveKey]: observe,
    [NotifyKey]: notify2,
    ...bindMethods({
      addDeferredWork,
      observe,
      notify: notify2,
      makeView,
      subscriptionNode,
      processFieldChange,
      removeSubscriptionField
    })
  };
  function getField(key) {
    let field = fields.get(key);
    if (!field) {
      field = {
        model: proxy,
        key
      };
      if (debugName)
        name(field, debugName);
      fields.set(key, field);
      addManualDep(proxy, field);
      if (observers.length > 0) {
        addManualDep(field, subscriptionNode);
      }
    }
    return field;
  }
  const proxy = new Proxy(initialValue, {
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
        processChange(field);
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
        processChange(field);
        if (observers.length > 0) {
          removeManualDep(field, subscriptionNode);
        }
      }
      return changed;
    }
  });
  if (debugName)
    name(proxy, debugName);
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
  }, ({ addDeferredWork, makeView, notify: notify2, observe, subscriptionNode }) => {
    return {
      [MakeModelViewKey]: function makeModelView(spec, viewDebugName) {
        const viewArray = untracked(() => spec.initialize(obj));
        const view = collection(viewArray, viewDebugName);
        observe((event) => {
          view[AddDeferredWorkKey](() => spec.processEvent(view, event, viewArray));
        });
        addManualDep(subscriptionNode, view);
        return view;
      }
    };
  }, debugName);
}
model.keys = function keys(target, debugName) {
  const keysSet = new Set();
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

// src/index.ts
var src_default = createElement;
var VERSION = "0.2.0";
//# sourceMappingURL=index.js.map
