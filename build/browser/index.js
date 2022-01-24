var Revise = (() => {
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
  var src_exports = {};
  __export(src_exports, {
    Fragment: () => Fragment,
    InvariantError: () => InvariantError,
    VERSION: () => VERSION,
    calc: () => calc,
    collection: () => collection,
    createContext: () => createContext,
    debug: () => debug2,
    debugSubscribe: () => debugSubscribe,
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

  // src/types.ts
  var InvariantError = class extends Error {
    constructor(msg, detail) {
      super(msg);
      __publicField(this, "detail");
      this.detail = detail;
    }
  };
  var TypeTag = Symbol("reviseType");
  var DataTypeTag = Symbol("dataTypeTag");
  var CalculationTypeTag = Symbol("calculationType");
  var RecalculationTag = Symbol("recalculate");
  var ObserveKey = Symbol("observe");
  var GetSubscriptionNodeKey = Symbol("getSubscriptionNode");
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
  function alwaysTrue() {
    return true;
  }
  function strictEqual(a, b) {
    return a === b;
  }

  // src/dag.ts
  var _DAG = class {
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
    addEdge(fromNode, toNode, kind) {
      const fromId = this.getId(fromNode);
      const toId = this.getId(toNode);
      assert(!!this.nodesSet[fromId], "cannot add edge from node that does not exist");
      assert(!!this.nodesSet[toId], "cannot add edge to node that does not exist");
      this.graph[fromId][toId] = (this.graph[fromId][toId] || 0) | kind;
      this.reverseGraph[toId][fromId] = (this.reverseGraph[toId][fromId] || 0) | kind;
    }
    removeEdge(fromNode, toNode, kind) {
      const fromId = this.getId(fromNode);
      const toId = this.getId(toNode);
      if (!this.nodesSet[fromId])
        return false;
      if (!this.nodesSet[toId])
        return false;
      if (!(this.graph[fromId][toId] & kind))
        return false;
      this.graph[fromId][toId] = (this.graph[fromId][toId] || 0) & ~kind;
      this.reverseGraph[toId][fromId] = (this.reverseGraph[toId][fromId] || 0) & ~kind;
      return true;
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
      const fromIds = this.getReverseDependenciesInner(nodeId);
      fromIds.forEach((fromId) => {
        if (this.reverseGraph[nodeId][fromId] & _DAG.EDGE_HARD) {
          this.graph[fromId][nodeId] = (this.graph[fromId][nodeId] || 0) & ~_DAG.EDGE_HARD;
          this.reverseGraph[nodeId][fromId] = (this.reverseGraph[nodeId][fromId] || 0) & ~_DAG.EDGE_HARD;
        }
      });
    }
    getDependenciesInner(nodeId, edgeType = _DAG.EDGE_ANY) {
      if (!this.graph[nodeId])
        return [];
      return Object.keys(this.graph[nodeId]).filter((toId) => (this.graph[nodeId][toId] || 0) & edgeType);
    }
    getReverseDependenciesInner(nodeId) {
      if (!this.reverseGraph[nodeId])
        return [];
      return Object.keys(this.reverseGraph[nodeId]).filter((fromId) => !!this.reverseGraph[nodeId][fromId]);
    }
    getDependencies(fromNode, edgeType = _DAG.EDGE_ANY) {
      const nodeId = this.getId(fromNode);
      return this.getDependenciesInner(nodeId, edgeType).map((toId) => this.nodesSet[toId]);
    }
    process(callback) {
      const visited = {};
      const reachesRetained = {};
      const sortedIds = [];
      const strayIds = [];
      const dfsRecurse = (nodeId) => {
        if (visited[nodeId])
          return reachesRetained[nodeId];
        visited[nodeId] = true;
        reachesRetained[nodeId] = this.retained[nodeId];
        const toIds = this.getDependenciesInner(nodeId);
        let anyDependenciesRetained = false;
        toIds.forEach((toId) => {
          if (dfsRecurse(toId)) {
            anyDependenciesRetained = true;
          }
        });
        if (anyDependenciesRetained)
          reachesRetained[nodeId] = true;
        sortedIds.push(nodeId);
        if (!reachesRetained[nodeId]) {
          strayIds.push(nodeId);
          return false;
        } else {
          return true;
        }
      };
      Object.keys(this.dirtyNodes).forEach((nodeId) => {
        dfsRecurse(nodeId);
      });
      for (let i = sortedIds.length - 1; i >= 0; --i) {
        const nodeId = sortedIds[i];
        if (this.dirtyNodes[nodeId] && reachesRetained[nodeId]) {
          const node = this.nodesSet[nodeId];
          const isEqual = callback(node);
          if (!isEqual) {
            const toIds = this.getDependenciesInner(nodeId);
            toIds.forEach((toId) => {
              if (this.graph[nodeId][toId] & _DAG.EDGE_HARD) {
                this.dirtyNodes[toId] = true;
              }
            });
          }
          delete this.dirtyNodes[nodeId];
        }
      }
      strayIds.forEach((nodeId) => {
        this.removeNodeInner(nodeId);
      });
    }
    graphviz(getAttributes) {
      const lines = [
        "digraph dag {",
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
        this.getDependenciesInner(fromId).forEach((toId) => {
          if (this.graph[fromId][toId] & _DAG.EDGE_HARD) {
            lines.push(`  item_${fromId} -> item_${toId} [style="solid"];`);
          }
          if (this.graph[fromId][toId] & _DAG.EDGE_SOFT) {
            lines.push(`  item_${fromId} -> item_${toId} [style="dashed"];`);
          }
        });
      });
      lines.push("}");
      return lines.join("\n");
    }
  };
  var DAG = _DAG;
  __publicField(DAG, "EDGE_NONE", 0);
  __publicField(DAG, "EDGE_SOFT", 1);
  __publicField(DAG, "EDGE_HARD", 2);
  __publicField(DAG, "EDGE_ANY", 3);

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
    if (isNodeOrdering(item)) {
      return `ord:${nameMap.get(item) ?? "?"}`;
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
    const calculation = trackCalculation(func, alwaysTrue, true);
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
      globalDependencyGraph.addEdge(item, dependentCalculation, DAG.EDGE_HARD);
      false;
    }
  }
  function addManualDep(fromNode, toNode) {
    globalDependencyGraph.addNode(fromNode);
    globalDependencyGraph.addNode(toNode);
    globalDependencyGraph.addEdge(fromNode, toNode, DAG.EDGE_HARD);
    false;
  }
  function addOrderingDep(fromNode, toNode) {
    globalDependencyGraph.addNode(fromNode);
    globalDependencyGraph.addNode(toNode);
    globalDependencyGraph.addEdge(fromNode, toNode, DAG.EDGE_SOFT);
    false;
  }
  function removeManualDep(fromNode, toNode) {
    if (globalDependencyGraph.removeEdge(fromNode, toNode, DAG.EDGE_HARD)) {
      false;
    }
  }
  function removeOrderingDep(fromNode, toNode) {
    if (globalDependencyGraph.removeEdge(fromNode, toNode, DAG.EDGE_SOFT)) {
      false;
    }
  }
  function processChange(item) {
    globalDependencyGraph.addNode(item);
    const hardEdges = globalDependencyGraph.getDependencies(item, DAG.EDGE_HARD);
    if (hardEdges.length > 0) {
      const marked = globalDependencyGraph.markNodeDirty(item);
      false;
      if (!needsFlush) {
        needsFlush = true;
        notify();
      }
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
  var debugSubscription = null;
  function flush() {
    if (!needsFlush) {
      return;
    }
    needsFlush = false;
    false;
    globalDependencyGraph.process((item) => {
      let result = false;
      if (isCalculation(item)) {
        false;
        const recalculation = item[RecalculationTag];
        result = recalculation();
      } else if (isCollection(item)) {
        false;
        item[FlushKey]();
      } else if (isModel(item)) {
        false;
        item[FlushKey]();
      } else if (isSubscription(item)) {
        false;
        item[FlushKey]();
      } else {
        false;
      }
      false;
      return result;
    });
    false;
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
  function debugSubscribe(callback) {
    debugSubscription = callback;
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
  function spliceVNode(immediateParent, childIndex, removeCount, newNodes, { dispose = true, runOnMount = true, runOnUnmount = true } = {}) {
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
      if (dispose) {
        detachedVNode.domParent = null;
        detachedVNode.mountFragment = null;
        detachedVNode.children = null;
        detachedVNode.domNode = null;
        detachedVNode.onMount = null;
        detachedVNode.onUnmount = null;
      }
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
        if (mapping.makeAttrValue !== null) {
          const attributeValue = mapping.makeAttrValue ? mapping.makeAttrValue(value) : value;
          if (attributeValue === void 0 || attributeValue === null || attributeValue === false) {
            element.removeAttribute(key);
          } else if (attributeValue === true) {
            element.setAttribute(key, "");
          } else {
            element.setAttribute(key, attributeValue);
          }
        }
        if (mapping.idlName !== null) {
          element[mapping.idlName ?? key] = mapping.makeIdlValue ? mapping.makeIdlValue(value) : value;
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
    contextMap,
    parentNodeOrdering
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
      const onReleaseActions = [];
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
            onReleaseActions.push(() => {
              removeOrderingDep(boundEffect, parentNodeOrdering);
            });
            addOrderingDep(boundEffect, parentNodeOrdering);
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
            onReleaseActions.forEach((action) => action());
            if (refCallback) {
              refCallback(void 0);
            }
          }
        ]
      });
      elementNode.children = jsxNode.children.map((childJsxNode) => jsxNodeToVNode({
        domParent: elementNode,
        jsxNode: childJsxNode,
        contextMap,
        parentNodeOrdering
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
      const collectionNodeOrdering = makeNodeOrdering(false ? `viewcoll:${debugNameFor(jsxNode) ?? "node"}:order` : "viewcoll:order");
      addOrderingDep(collectionNodeOrdering, parentNodeOrdering);
      onUnmount.push(() => {
        removeOrderingDep(collectionNodeOrdering, parentNodeOrdering);
      });
      untracked(() => {
        collectionNode.children.push(...trackedCollection.map((jsxChild) => jsxNodeToVNode({
          domParent: collectionNode.domParent,
          jsxNode: jsxChild,
          contextMap,
          parentNodeOrdering: collectionNodeOrdering
        })));
      });
      const unobserve = trackedCollection[ObserveKey]((events) => {
        events.forEach((event) => {
          if (event.type === "splice") {
            untracked(() => {
              const { count, index, items } = event;
              const childNodes = items.map((jsxChild) => jsxNodeToVNode({
                domParent: collectionNode.domParent,
                jsxNode: jsxChild,
                contextMap,
                parentNodeOrdering: collectionNodeOrdering
              }));
              spliceVNode(collectionNode, index, count, childNodes);
            });
          } else if (event.type === "move") {
            const { fromIndex, fromCount, toIndex } = event;
            const moved = spliceVNode(collectionNode, fromIndex, fromCount, [], { dispose: false, runOnUnmount: false });
            spliceVNode(collectionNode, fromIndex < toIndex ? toIndex - fromCount : toIndex, 0, moved, { runOnMount: false });
          } else if (event.type === "sort") {
            const { indexes } = event;
            const removedVNodes = spliceVNode(collectionNode, 0, indexes.length, [], { dispose: false, runOnUnmount: false });
            const sortedVNodes = indexes.map((newIndex) => removedVNodes[newIndex]);
            spliceVNode(collectionNode, 0, 0, sortedVNodes, {
              runOnMount: false
            });
          } else {
            assertExhausted(event, "unhandled collection event");
          }
        });
      });
      const subscriptionNode = trackedCollection[GetSubscriptionNodeKey]();
      addOrderingDep(subscriptionNode, collectionNodeOrdering);
      onUnmount.push(unobserve);
      onUnmount.push(() => {
        removeOrderingDep(subscriptionNode, collectionNodeOrdering);
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
      const calculationNodeOrdering = makeNodeOrdering(false ? `viewcalc:${debugNameFor(jsxNode) ?? "node"}:order` : "viewcalc:order");
      addOrderingDep(calculationNodeOrdering, parentNodeOrdering);
      onUnmount.push(() => {
        removeOrderingDep(calculationNodeOrdering, parentNodeOrdering);
      });
      let firstRun = true;
      const resultEffect = effect(() => {
        const jsxChild = trackedCalculation();
        const childVNode = jsxNodeToVNode({
          domParent: calculationNode.domParent,
          jsxNode: jsxChild,
          contextMap,
          parentNodeOrdering: calculationNodeOrdering
        });
        if (firstRun) {
          firstRun = false;
          calculationNode.children.push(childVNode);
        } else {
          spliceVNode(calculationNode, 0, calculationNode.children.length, [childVNode]);
        }
      }, `viewcalc:${debugNameFor(jsxNode) ?? "node"}`);
      onUnmount.push(() => {
        removeOrderingDep(resultEffect, calculationNodeOrdering);
      });
      addOrderingDep(resultEffect, calculationNodeOrdering);
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
        contextMap: subMap,
        parentNodeOrdering
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
            addOrderingDep(parentNodeOrdering, effectCalc);
            effectCalc();
          });
          onUnmount.push(() => {
            removeOrderingDep(parentNodeOrdering, effectCalc);
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
        contextMap,
        parentNodeOrdering
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
        contextMap,
        parentNodeOrdering
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
  function makeNodeOrdering(debugName) {
    const nodeOrdering = {
      [TypeTag]: "nodeOrdering"
    };
    if (debugName)
      name(nodeOrdering, debugName);
    return nodeOrdering;
  }
  function mount(parentElement, jsxNode) {
    const nodeOrdering = makeNodeOrdering("mount");
    retain(nodeOrdering);
    const rootNode = makeRootVNode({ domNode: parentElement });
    rootNode.children.push(jsxNodeToVNode({
      domParent: rootNode,
      jsxNode,
      contextMap: new Map(),
      parentNodeOrdering: nodeOrdering
    }));
    if (rootNode.mountFragment) {
      parentElement.appendChild(rootNode.mountFragment);
      rootNode.mountFragment = null;
    }
    callOnMount(rootNode);
    return () => {
      spliceVNode(rootNode, 0, rootNode.children.length, []);
      release(nodeOrdering);
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
    const fieldRecords = new Map();
    let subscriptionEvents = new Map();
    let observers = [];
    let deferredTasks = [];
    const subscriptionNode = {
      [TypeTag]: "subscription",
      [FlushKey]: flushSubscription,
      item: null
    };
    name(subscriptionNode, `${debugName || "?"}:sub`);
    function flushSubscription() {
      const toProcess = subscriptionEvents;
      subscriptionEvents = new Map();
      toProcess.forEach((events, observer) => {
        observer(events);
      });
    }
    function flush2() {
      const toProcess = deferredTasks;
      deferredTasks = [];
      toProcess.forEach((task) => {
        task();
      });
    }
    function addDeferredTask(task) {
      deferredTasks.push(task);
      processChange(proxy);
    }
    function notify2(event) {
      if (observers.length > 0) {
        observers.forEach((observer) => {
          let observerEvents = subscriptionEvents.get(observer);
          if (!observerEvents) {
            observerEvents = [];
            subscriptionEvents.set(observer, observerEvents);
          }
          observerEvents.push(event);
        });
        processChange(subscriptionNode);
      }
    }
    function getSubscriptionNode() {
      return subscriptionNode;
    }
    function observe(observer) {
      if (observers.length === 0) {
        addManualDep(proxy, subscriptionNode);
        fieldRecords.forEach((field) => {
          addOrderingDep(proxy, field);
          addOrderingDep(field, subscriptionNode);
        });
      }
      observers.push(observer);
      return () => {
        observers = observers.filter((obs) => obs !== observer);
        if (observers.length === 0) {
          removeManualDep(proxy, subscriptionNode);
          fieldRecords.forEach((field) => {
            removeOrderingDep(proxy, field);
            removeOrderingDep(field, subscriptionNode);
          });
        }
      };
    }
    function makeView(spec, viewDebugName) {
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
      const field = getField(key);
      processChange(field);
    }
    function processFieldDelete(key) {
      const field = getField(key);
      processChange(field);
    }
    const pseudoPrototype = {
      [TypeTag]: "data",
      [DataTypeTag]: typeTag,
      [FlushKey]: flush2,
      [AddDeferredWorkKey]: addDeferredTask,
      [ObserveKey]: observe,
      [NotifyKey]: notify2,
      [GetSubscriptionNodeKey]: getSubscriptionNode,
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
          key
        };
        if (debugName)
          name(field, debugName);
        fieldRecords.set(key, field);
        if (observers.length > 0) {
          addOrderingDep(proxy, field);
          addOrderingDep(field, subscriptionNode);
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
        }
        return changed;
      }
    });
    subscriptionNode.item = proxy;
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
    }, ({ makeView, notify: notify2, observe, subscriptionNode }) => {
      return {
        [MakeModelViewKey]: makeView
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
  var VERSION = "0.5.0";
  return src_exports;
})();
//# sourceMappingURL=index.js.map
