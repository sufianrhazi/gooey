(() => {
  // src/log.ts
  var levels = {
    error: 0,
    warn: 1,
    info: 2,
    debug: 3
  };
  var currentLevel = levels.warn;
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
      error("Assertion failure", check.toString(), "is not truthy", ...items);
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
  var CalculationTypeTag = Symbol("calculationType");
  var OwnKeysField = Symbol("ownKeys");
  var ObserveKey = Symbol("observe");
  var GetRawArrayKey = Symbol("getRawArray");
  var FlushKey = Symbol("flush");
  var NotifyKey = Symbol("notifyEvent");
  function isRef(ref2) {
    return ref2 && ref2[TypeTag] === "ref";
  }
  var OnCollectionRelease = Symbol("OnCollectionRelease");
  function makeCalculation(fn) {
    return Object.assign(fn, {
      [TypeTag]: "calculation",
      [CalculationTypeTag]: "calculation"
    });
  }
  function makeEffect(fn) {
    return Object.assign(fn, {
      [TypeTag]: "calculation",
      [CalculationTypeTag]: "effect"
    });
  }
  function isModel(thing) {
    return !!(thing && thing[TypeTag] === "model");
  }
  function isCollection(thing) {
    return !!(thing && thing[TypeTag] === "collection");
  }
  function isCalculation(thing) {
    return !!(thing && thing[TypeTag] === "calculation");
  }
  function isEffect(thing) {
    return thing[CalculationTypeTag] === "effect";
  }

  // src/sentinel.ts
  var sentinel = {};
  var isSentinel = (value) => {
    return value === sentinel;
  };

  // src/dag.ts
  var DAG = class {
    constructor() {
      this.maxId = 0;
      this.idMap = new WeakMap();
      this.nodes = {};
      this.edgeMap = {};
      this.reverseEdgeMap = {};
      this.refCount = {};
      this.cullableSet = {};
      this._addNode(sentinel);
      this.sentinelId = this.getItemId(sentinel);
    }
    getItemId(item) {
      let id;
      if ((id = this.idMap.get(item)) === void 0) {
        id = this.maxId.toString();
        this.maxId += 1;
        this.idMap.set(item, id);
      }
      return id;
    }
    addNode(node) {
      return this._addNode(node);
    }
    _addNode(node) {
      const itemId = this.getItemId(node);
      if (!this.nodes[itemId]) {
        this.refCount[itemId] = 0;
        if (!isSentinel(node)) {
          this.cullableSet[itemId] = true;
        }
        this.nodes[itemId] = node;
        this.edgeMap[itemId] = {};
        this.reverseEdgeMap[itemId] = {};
        return true;
      }
      return false;
    }
    hasNode(node) {
      return !!this.nodes[this.getItemId(node)];
    }
    addEdge(fromNode, toNode) {
      const fromId = this.getItemId(fromNode);
      const toId = this.getItemId(toNode);
      return this._addEdge(fromId, toId);
    }
    _addEdge(fromId, toId) {
      const fromNode = this.nodes[fromId];
      const toNode = this.nodes[toId];
      invariant(() => fromId === this.sentinelId || !!this.nodes[fromId], "addEdge fromNode does not exist", fromNode);
      invariant(() => !!this.nodes[toId], "addEdge toNode does not exist", toNode);
      if (!this.edgeMap[fromId]) {
        this.edgeMap[fromId] = {};
      }
      if (this.edgeMap[fromId][toId]) {
        return false;
      }
      this.edgeMap[fromId][toId] = toNode;
      if (!this.reverseEdgeMap[toId]) {
        this.reverseEdgeMap[toId] = {};
      }
      this.reverseEdgeMap[toId][fromId] = fromNode;
      this.refCount[fromId] += 1;
      delete this.cullableSet[fromId];
      return true;
    }
    removeEdge(fromNode, toNode) {
      const fromId = this.getItemId(fromNode);
      const toId = this.getItemId(toNode);
      const result = this._removeEdge(fromId, toId);
      invariant(() => result === false, "removeEdge attempted on nonexistent edge", { fromNode, toNode });
      return result;
    }
    removeNode(node) {
      const itemId = this.getItemId(node);
      return this._removeNode(itemId);
    }
    _removeNode(itemId) {
      if (!this.nodes[itemId])
        return true;
      const node = this.nodes[itemId];
      Object.keys(this.edgeMap[itemId]).forEach((toId) => this._removeEdge(itemId, toId));
      Object.keys(this.reverseEdgeMap[itemId]).forEach((fromId) => this._removeEdge(fromId, itemId));
      invariant(() => this.refCount[itemId] === 0, "still has refcount after deleting edges", node);
      invariant(() => this.cullableSet[itemId] === true, "not cullable after deleting edges", node);
      delete this.nodes[itemId];
      delete this.edgeMap[itemId];
      delete this.reverseEdgeMap[itemId];
      delete this.refCount[itemId];
      delete this.cullableSet[itemId];
      return false;
    }
    _removeEdge(fromId, toId) {
      assert(!!this.edgeMap[fromId], "_removeEdge fromId not found in edgeMap", fromId);
      assert(!!this.reverseEdgeMap[toId], "_removeEdge toId not found in reverseEdgeMap", toId);
      if (!this.edgeMap[fromId][toId]) {
        error("_removeEdge edge not found", { fromId, toId });
        return true;
      }
      delete this.edgeMap[fromId][toId];
      this.refCount[fromId] -= 1;
      if (this.refCount[fromId] === 0) {
        this.cullableSet[fromId] = true;
      }
      delete this.reverseEdgeMap[toId][fromId];
      return false;
    }
    retain(node) {
      const retained = this._addEdge(this.getItemId(node), this.sentinelId);
      invariant(() => !!retained, "double-retained", node);
    }
    release(node) {
      const releaseFailed = this._removeEdge(this.getItemId(node), this.sentinelId);
      invariant(() => !releaseFailed, "released a non-retained node", node);
    }
    removeEdges(edges) {
      edges.forEach(([fromNode, toNode]) => {
        const fromId = this.getItemId(fromNode);
        const toId = this.getItemId(toNode);
        this._removeEdge(fromId, toId);
      });
    }
    getDependencies(fromNode) {
      const fromId = this.getItemId(fromNode);
      if (!this.edgeMap[fromId]) {
        return [];
      }
      const deps = [];
      Object.values(this.edgeMap[fromId]).forEach((node) => {
        if (!isSentinel(node)) {
          deps.push(node);
        }
      });
      return deps;
    }
    getReverseDependencies(toNode) {
      const toId = this.getItemId(toNode);
      if (!this.reverseEdgeMap[toId]) {
        return [];
      }
      const revDeps = [];
      Object.values(this.reverseEdgeMap[toId]).forEach((node) => {
        if (!isSentinel(node)) {
          revDeps.push(node);
        }
      });
      return revDeps;
    }
    visitTopological(callback) {
      const visited = {};
      const sorted = [];
      const dfsRecurse = (nodeId) => {
        if (visited[nodeId])
          return;
        visited[nodeId] = true;
        Object.keys(this.edgeMap[nodeId] || {}).forEach((toId) => {
          dfsRecurse(toId);
        });
        const node = this.nodes[nodeId];
        if (!isSentinel(node)) {
          sorted.unshift(node);
        }
      };
      Object.keys(this.nodes).forEach((nodeId) => {
        dfsRecurse(nodeId);
      });
      sorted.forEach((node) => {
        callback(node);
      });
    }
    garbageCollect() {
      const culled = [];
      while (Object.keys(this.cullableSet).length > 0) {
        Object.keys(this.cullableSet).forEach((nodeId) => {
          const node = this.nodes[nodeId];
          assert(!isSentinel(node), "tried to garbage collect sentinel");
          culled.push(node);
          this._removeNode(nodeId);
        });
      }
      return culled;
    }
    graphviz(makeName) {
      const lines = ["digraph dag {"];
      Object.entries(this.nodes).forEach(([nodeId, node]) => {
        if (isSentinel(node))
          return;
        const props = {
          label: makeName(nodeId, node)
        };
        lines.push(`  item_${nodeId} [${Object.entries(props).map(([key, value]) => `${key}=${JSON.stringify(value)}`).join(",")}];`);
      });
      Object.entries(this.edgeMap).forEach(([fromNodeId, toNodeMap]) => {
        Object.keys(toNodeMap).forEach((toNodeId) => {
          if (toNodeId === this.sentinelId || fromNodeId === this.sentinelId)
            return;
          lines.push(`  item_${fromNodeId} -> item_${toNodeId};`);
        });
      });
      lines.push("}");
      return lines.join("\n");
    }
  };

  // src/debug.ts
  var nameMap = new WeakMap();
  function debugNameFor(item) {
    var _a, _b, _c, _d;
    if (isCollection(item)) {
      return `collection:${(_a = nameMap.get(item)) != null ? _a : "?"}`;
    }
    if (isCalculation(item)) {
      return `${isEffect(item) ? "effect" : "calc"}:${(_b = nameMap.get(item)) != null ? _b : "?"}`;
    }
    if (isModel(item)) {
      return `model:${(_c = nameMap.get(item)) != null ? _c : "?"}`;
    }
    return `field:${(_d = nameMap.get(item.model)) != null ? _d : "?"}:${String(item.key)}`;
  }
  function name(item, name2) {
    nameMap.set(item, name2);
    return item;
  }

  // src/calc.ts
  var activeCalculations = [];
  var calculationToInvalidationMap = new Map();
  var partialDag = new DAG();
  var globalDependencyGraph = new DAG();
  var refcountMap = new WeakMap();
  function calc(func, debugName) {
    const calculation = trackCalculation(func, false);
    if (debugName)
      name(calculation, debugName);
    return calculation;
  }
  function effect(func, debugName) {
    const calculation = trackCalculation(func, true);
    if (debugName)
      name(calculation, debugName);
    return calculation;
  }
  function trackCalculation(func, isEffect2) {
    if (typeof func !== "function") {
      throw new InvariantError("calculation must be provided a function");
    }
    let result = void 0;
    const invalidate = () => {
      result = void 0;
    };
    const trackedCalculation = (isEffect2 ? makeEffect : makeCalculation)(function runCalculation() {
      if (!isEffect2) {
        addDepToCurrentCalculation(trackedCalculation);
      }
      if (result) {
        return result.result;
      }
      const edgesToRemove = globalDependencyGraph.getReverseDependencies(trackedCalculation).map((fromNode) => {
        return [fromNode, trackedCalculation];
      });
      globalDependencyGraph.removeEdges(edgesToRemove);
      activeCalculations.push(trackedCalculation);
      result = { result: func() };
      const sanityCheck = activeCalculations.pop();
      if (sanityCheck !== trackedCalculation) {
        throw new InvariantError("Active calculation stack inconsistency!");
      }
      return result.result;
    });
    globalDependencyGraph.addNode(trackedCalculation);
    calculationToInvalidationMap.set(trackedCalculation, invalidate);
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
        debug("New global dependency", debugNameFor(item), "->", debugNameFor(dependentCalculation));
      }
    }
  }
  function addManualDep(fromNode, toNode) {
    globalDependencyGraph.addNode(fromNode);
    globalDependencyGraph.addNode(toNode);
    if (globalDependencyGraph.addEdge(fromNode, toNode)) {
      debug("New manual dependency", debugNameFor(fromNode), "->", debugNameFor(toNode));
    }
  }
  function processChange(item) {
    const chain = [];
    const addNode = (node) => {
      chain.push(debugNameFor(node));
      partialDag.addNode(node);
      const dependencies = globalDependencyGraph.getDependencies(node);
      dependencies.forEach((dependentItem) => {
        if (!partialDag.hasNode(dependentItem)) {
          addNode(dependentItem);
        }
        if (partialDag.addEdge(node, dependentItem)) {
          debug("New local dependency", debugNameFor(item), "->", debugNameFor(dependentItem));
        }
        if (!needsFlush) {
          needsFlush = true;
          notify();
        }
      });
    };
    addNode(item);
    debug("processChange", chain);
  }
  var needsFlush = false;
  var subscribeListener = () => setTimeout(() => flush(), 0);
  function notify() {
    try {
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
    const oldPartialDag = partialDag;
    partialDag = new DAG();
    oldPartialDag.visitTopological((item) => {
      if (isCalculation(item)) {
        debug("flushing calculation", debugNameFor(item));
        const invalidation = calculationToInvalidationMap.get(item);
        if (invalidation) {
          invalidation();
        }
        item();
      } else if (isCollection(item)) {
        debug("flushing collection", debugNameFor(item));
        item[FlushKey]();
      } else {
        debug("flushing model", debugNameFor(item));
      }
    });
    globalDependencyGraph.garbageCollect().forEach((item) => {
      if (isCalculation(item)) {
        debug("GC calculation", debugNameFor(item));
      } else if (isCollection(item)) {
        debug("GC collection", debugNameFor(item));
      } else {
        debug("GC model", debugNameFor(item));
      }
    });
  }
  function retain(item) {
    var _a;
    const refcount = (_a = refcountMap.get(item)) != null ? _a : 0;
    const newRefcount = refcount + 1;
    if (refcount === 0) {
      debug(`retain ${debugNameFor(item)} retained; refcount ${refcount} -> ${newRefcount}`);
      if (!globalDependencyGraph.hasNode(item)) {
        globalDependencyGraph.addNode(item);
      }
      globalDependencyGraph.retain(item);
    } else {
      debug(`retain ${debugNameFor(item)} incremented; refcount ${refcount} -> ${newRefcount}`);
    }
    refcountMap.set(item, newRefcount);
  }
  function release(item) {
    var _a;
    const refcount = (_a = refcountMap.get(item)) != null ? _a : 0;
    const newRefcount = Math.min(refcount - 1, 0);
    if (refcount < 1) {
      error(`release called on unretained item ${debugNameFor(item)}`, item);
    }
    if (newRefcount < 1) {
      debug(`release ${debugNameFor(item)} released; refcount ${refcount} -> ${newRefcount}`);
      globalDependencyGraph.release(item);
    } else {
      debug(`release ${debugNameFor(item)} decremented; refcount ${refcount} -> ${newRefcount}`);
    }
    refcountMap.set(item, newRefcount);
  }

  // src/jsx.ts
  function isRenderElement(jsxNode) {
    return !!(jsxNode && typeof jsxNode === "object" && "type" in jsxNode && jsxNode.type === "element");
  }
  function isRenderComponent(jsxNode) {
    return !!(jsxNode && typeof jsxNode === "object" && "type" in jsxNode && jsxNode.type === "component");
  }

  // src/vnode.ts
  var VNodeSymbol = Symbol("VNode");
  function makeRootVNode({ domNode }) {
    const rootVNode = {
      domNode,
      children: [],
      parentNode: null,
      domParent: null,
      jsxNode: null,
      onUnmount: [],
      [VNodeSymbol]: true
    };
    rootVNode.domParent = rootVNode;
    return rootVNode;
  }
  function makeChildVNode({
    jsxNode,
    domNode,
    domParent,
    onUnmount,
    parentNode
  }) {
    return {
      domNode,
      children: [],
      parentNode,
      domParent,
      jsxNode,
      onUnmount,
      [VNodeSymbol]: true
    };
  }
  function makeEmptyVNode({
    parentNode,
    domParent
  }) {
    return {
      domNode: null,
      children: [],
      parentNode,
      domParent,
      jsxNode: null,
      onUnmount: [],
      [VNodeSymbol]: true
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
  function replaceVNode(replaceNode, newNode) {
    return spliceVNode(replaceNode.parentNode, replaceNode, 1, [newNode])[0];
  }
  function spliceVNode(immediateParent, replaceNode, removeCount, newNodes) {
    let domParent;
    let childIndex;
    if (replaceNode) {
      childIndex = immediateParent.children.indexOf(replaceNode);
      if (childIndex === -1) {
        childIndex = immediateParent.children.length;
      }
      domParent = replaceNode.domParent;
    } else {
      childIndex = immediateParent.children.length;
      domParent = immediateParent.domNode ? immediateParent : immediateParent.domParent;
    }
    assert(domParent, "tried to replace a root tree slot with missing domParent");
    const detachedVNodes = immediateParent.children.splice(childIndex, removeCount, ...newNodes);
    detachedVNodes.forEach((detachedVNode) => {
      callOnUnmount(detachedVNode);
      const nodesToRemove = getShallowNodes(detachedVNode);
      nodesToRemove.forEach((node) => {
        if (node.parentNode) {
          node.parentNode.removeChild(node);
        }
      });
    });
    if (!domParent.domNode) {
      throw new Error("Invariant: domParent missing domNode");
    }
    const domParentNode = domParent.domNode;
    newNodes.forEach((newNode) => {
      newNode.parentNode = immediateParent;
      newNode.domParent = domParent;
      if (newNode.domNode) {
        const domIndex = getDomParentChildIndex(domParent, immediateParent, childIndex);
        const referenceNode = domParentNode.childNodes[domIndex];
        domParentNode.insertBefore(newNode.domNode, referenceNode || null);
      }
    });
    return detachedVNodes;
  }

  // src/view.ts
  function createElement(Constructor, props, ...children) {
    if (typeof Constructor === "string") {
      return {
        type: "element",
        element: Constructor,
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
  var boundEvents = new WeakMap();
  function setBooleanPropertyValue(element, key, value) {
    if (element instanceof HTMLInputElement && (key === "checked" || key === "indeterminate") && element[key] !== value) {
      element[key] = value;
    }
    if (element instanceof HTMLOptionElement && key == "selected" && element[key] !== value) {
      element[key] = value;
    }
    if (element instanceof HTMLDetailsElement && key == "open" && element[key] !== value) {
      element[key] = value;
    }
  }
  function setStringPropertyValue(element, key, value) {
    if (element instanceof HTMLInputElement && key === "value" && element[key] !== value) {
      element[key] = value;
    }
    if (element instanceof HTMLTextAreaElement && key === "value" && element[key] !== value) {
      element[key] = value;
    }
    if (element instanceof HTMLOptionElement && key === "value" && element[key] !== value) {
      element[key] = value;
    }
  }
  function setAttributeValue(element, key, value) {
    if (value === null || value === void 0 || value === false) {
      element.removeAttribute(key);
      setBooleanPropertyValue(element, key, false);
      setStringPropertyValue(element, key, "");
    } else if (value === true) {
      element.setAttribute(key, "");
      setBooleanPropertyValue(element, key, true);
    } else if (typeof value === "string") {
      element.setAttribute(key, value);
      setStringPropertyValue(element, key, value);
    } else if (typeof value === "number") {
      element.setAttribute(key, value.toString());
      setStringPropertyValue(element, key, value.toString());
    } else if (key.startsWith("on:") && typeof value === "function") {
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
    }
  }
  function renderAppending({
    domParent,
    parentNode,
    jsxNode
  }) {
    const emptyChildVNode = makeEmptyVNode({
      domParent,
      parentNode
    });
    parentNode.children.push(emptyChildVNode);
    renderReplacing({
      nodeToReplace: emptyChildVNode,
      jsxNode
    });
  }
  function renderReplacing({
    nodeToReplace,
    jsxNode
  }) {
    var _a;
    if (jsxNode === null || jsxNode === void 0 || jsxNode === false || jsxNode === true) {
      const emptyVNode = makeChildVNode({
        parentNode: nodeToReplace.parentNode,
        domParent: nodeToReplace.domParent,
        jsxNode,
        domNode: null,
        onUnmount: []
      });
      replaceVNode(nodeToReplace, emptyVNode);
      return emptyVNode;
    }
    if (typeof jsxNode === "string") {
      const stringVNode = makeChildVNode({
        parentNode: nodeToReplace.parentNode,
        domParent: nodeToReplace.domParent,
        jsxNode,
        domNode: document.createTextNode(jsxNode),
        onUnmount: []
      });
      replaceVNode(nodeToReplace, stringVNode);
      return stringVNode;
    }
    if (typeof jsxNode === "number") {
      const numberVNode = makeChildVNode({
        parentNode: nodeToReplace.parentNode,
        domParent: nodeToReplace.domParent,
        jsxNode,
        domNode: document.createTextNode(jsxNode.toString()),
        onUnmount: []
      });
      replaceVNode(nodeToReplace, numberVNode);
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
              setAttributeValue(element, key, computedValue);
            }, `viewattr:${key}`);
            retain(boundEffect);
            boundEffects.push(boundEffect);
            boundEffect();
          } else {
            setAttributeValue(element, key, value);
          }
        });
      }
      const elementNode = makeChildVNode({
        parentNode: nodeToReplace.parentNode,
        domParent: nodeToReplace.domParent,
        jsxNode,
        domNode: element,
        onUnmount: [
          () => {
            boundEffects.forEach((boundEffect) => release(boundEffect));
            if (refCallback) {
              refCallback(void 0);
            }
          }
        ]
      });
      replaceVNode(nodeToReplace, elementNode);
      jsxNode.children.forEach((child) => {
        renderAppending({
          domParent: elementNode,
          parentNode: elementNode,
          jsxNode: child
        });
      });
      if (refCallback) {
        refCallback(element);
      }
      return elementNode;
    }
    if (isCollection(jsxNode)) {
      const trackedCollection = jsxNode;
      const onUnmount = [];
      const collectionNode = makeChildVNode({
        parentNode: nodeToReplace.parentNode,
        domParent: nodeToReplace.domParent,
        jsxNode,
        domNode: null,
        onUnmount
      });
      replaceVNode(nodeToReplace, collectionNode);
      const unobserve = trackedCollection[ObserveKey]((event) => {
        if (event.type === "init") {
          const { items } = event;
          items.forEach((jsxChild) => {
            renderAppending({
              domParent: collectionNode.domParent,
              parentNode: collectionNode,
              jsxNode: jsxChild
            });
          });
        } else if (event.type === "splice") {
          const { count, index, items } = event;
          const childNodes = items.map(() => makeEmptyVNode({
            domParent: collectionNode.domParent,
            parentNode: collectionNode
          }));
          spliceVNode(collectionNode, collectionNode.children[index], count, childNodes);
          items.forEach((jsxChild, index2) => {
            renderReplacing({
              nodeToReplace: childNodes[index2],
              jsxNode: jsxChild
            });
          });
        }
      });
      retain(trackedCollection);
      onUnmount.push(unobserve);
      onUnmount.push(() => {
        release(trackedCollection);
      });
      return collectionNode;
    }
    if (isCalculation(jsxNode)) {
      const trackedCalculation = jsxNode;
      const onUnmount = [];
      const calculationNode = makeChildVNode({
        parentNode: nodeToReplace.parentNode,
        domParent: nodeToReplace.domParent,
        jsxNode,
        domNode: null,
        onUnmount
      });
      replaceVNode(nodeToReplace, calculationNode);
      let calculationResultNode = makeEmptyVNode({
        parentNode: calculationNode,
        domParent: calculationNode.domParent
      });
      calculationNode.children.push(calculationResultNode);
      const resultEffect = effect(() => {
        const jsxChild = trackedCalculation();
        calculationResultNode = renderReplacing({
          nodeToReplace: calculationResultNode,
          jsxNode: jsxChild
        });
      }, `viewcalc:${(_a = debugNameFor(jsxNode)) != null ? _a : "node"}`);
      retain(resultEffect);
      onUnmount.push(() => release(resultEffect));
      resultEffect();
      return calculationNode;
    }
    if (isRenderComponent(jsxNode)) {
      const onUnmount = [];
      const componentNode = makeChildVNode({
        parentNode: nodeToReplace.parentNode,
        domParent: nodeToReplace.domParent,
        jsxNode,
        domNode: null,
        onUnmount
      });
      replaceVNode(nodeToReplace, componentNode);
      let componentResultNode = makeEmptyVNode({
        parentNode: componentNode,
        domParent: componentNode.domParent
      });
      componentNode.children.push(componentResultNode);
      const Component4 = jsxNode.component;
      const resultEffect = effect(() => {
        const onComponentMount = [];
        const jsxChild = Component4({
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
            const effectCalc = effect(effectCallback, `componenteffect:${jsxNode.component.name}:${debugName != null ? debugName : onComponentMount.length}`);
            onComponentMount.push(() => {
              retain(effectCalc);
              effectCalc();
            });
            onUnmount.push(() => {
              release(effectCalc);
            });
          }
        });
        componentResultNode = renderReplacing({
          nodeToReplace: componentResultNode,
          jsxNode: jsxChild
        });
        onComponentMount.forEach((mountCallback) => mountCallback());
      }, `component:${jsxNode.component.name}`);
      retain(resultEffect);
      onUnmount.push(() => release(resultEffect));
      resultEffect();
      return componentNode;
    }
    if (Array.isArray(jsxNode)) {
      const items = jsxNode;
      const arrayNode = makeChildVNode({
        parentNode: nodeToReplace.parentNode,
        domParent: nodeToReplace.domParent,
        jsxNode,
        domNode: null,
        onUnmount: []
      });
      replaceVNode(nodeToReplace, arrayNode);
      items.forEach((jsxChild) => {
        renderAppending({
          domParent: arrayNode.domParent,
          parentNode: arrayNode,
          jsxNode: jsxChild
        });
      });
      return arrayNode;
    }
    if (typeof jsxNode === "function") {
      const functionVNode = makeChildVNode({
        parentNode: nodeToReplace.parentNode,
        domParent: nodeToReplace.domParent,
        jsxNode,
        domNode: null,
        onUnmount: []
      });
      replaceVNode(nodeToReplace, functionVNode);
      warn("Attempted to render JSX node that was a function, not rendering anything");
      return functionVNode;
    }
    assertExhausted(jsxNode, "unexpected render type");
  }
  function mount(parentElement, jsxNode) {
    const rootNode = makeRootVNode({ domNode: parentElement });
    renderAppending({
      domParent: rootNode,
      parentNode: rootNode,
      jsxNode
    });
  }
  var Fragment = ({ children }) => children;

  // src/collection.ts
  function binarySearchIndex(sortedArray, item, sorter) {
    let min = 0;
    let max = sortedArray.length - 1;
    let pivot = min;
    let result = -1;
    while (min <= max) {
      pivot = min + max >> 1;
      result = sorter(item, sortedArray[pivot]);
      if (result < 0) {
        max = pivot - 1;
      } else if (result > 0) {
        min = pivot + 1;
      } else {
        return [result, pivot];
      }
    }
    return [result, pivot];
  }
  function collection(array, debugName) {
    if (!Array.isArray(array)) {
      throw new InvariantError("collection must be provided an array");
    }
    const fields = new Map();
    let observers = [];
    function notify2(event) {
      observers.forEach((observer) => {
        observer(event);
      });
    }
    function splice(index, count, ...items) {
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
          processChange(getField(i.toString()));
        }
      } else {
        for (let i = index; i < Math.max(newLength, origLength); ++i) {
          processChange(getField(i.toString()));
        }
        processChange(getField("length"));
      }
      processChange(proxy);
      return removed;
    }
    function pop() {
      const removed = splice(array.length - 1, 1);
      return removed[0];
    }
    function shift() {
      const removed = splice(0, 1);
      return removed[0];
    }
    function push(...items) {
      splice(array.length, 0, ...items);
      return array.length;
    }
    function unshift(...items) {
      splice(0, 0, ...items);
      return array.length;
    }
    function reject(func) {
      for (let i = proxy.length - 1; i >= 0; --i) {
        if (!func(proxy[i], i)) {
          proxy.splice(i, 1);
        }
      }
    }
    function sort(_sorter) {
      throw new Error("sort not implemented");
    }
    const deferred = [];
    function sortedView(sorter, viewDebugName) {
      let sortedDebugName;
      if (viewDebugName) {
        sortedDebugName = viewDebugName;
      } else if (debugName) {
        sortedDebugName = `${debugName}:sortedView`;
      }
      const sorted = collection([], sortedDebugName);
      proxy[ObserveKey]((event) => {
        if (event.type === "init") {
          const initialItems = event.items.slice();
          initialItems.sort(sorter);
          sorted.push(...initialItems);
          return;
        } else if (event.type === "splice") {
          deferred.push(() => {
            const { items, removed } = event;
            const rawArray = sorted[GetRawArrayKey]();
            removed.forEach((removedItem, removedItemIndex) => {
              const [lastComparison, index] = binarySearchIndex(rawArray, removedItem, sorter);
              assert(lastComparison === 0, "Missing item removed from source array in sortedView splice", { removedItem, removedItemIndex, event });
              sorted.splice(index, 1);
            });
            items.forEach((item) => {
              const [lastComparison, insertionIndex] = binarySearchIndex(rawArray, item, sorter);
              sorted.splice(lastComparison > 0 ? insertionIndex + 1 : insertionIndex, 0, item);
            });
          });
        }
      });
      return sorted;
    }
    function mapView(mapper, viewDebugName) {
      let mappedDebugName;
      if (viewDebugName) {
        mappedDebugName = viewDebugName;
      } else if (debugName) {
        mappedDebugName = `${debugName}:mapView`;
      }
      const mapped = collection(array.map(mapper), mappedDebugName);
      proxy[ObserveKey]((event) => {
        if (event.type === "splice") {
          deferred.push(() => {
            const { index, count, items } = event;
            mapped.splice(index, count, ...items.map(mapper));
          });
        }
      });
      addManualDep(proxy, mapped);
      return mapped;
    }
    function filterView(fn, viewDebugName) {
      let mappedDebugName;
      if (viewDebugName) {
        mappedDebugName = viewDebugName;
      } else if (debugName) {
        mappedDebugName = `${debugName}:filterView`;
      }
      const filterPresent = [];
      const filtered = collection([], mappedDebugName);
      array.forEach((value, index) => {
        const present = fn(value, index);
        filterPresent.push(present);
        if (present) {
          filtered.push(value);
        }
      });
      proxy[ObserveKey]((event) => {
        if (event.type === "splice") {
          deferred.push(() => {
            const { index, count, items } = event;
            let realIndex = 0;
            let realCount = 0;
            for (let i = 0; i < index; ++i) {
              if (filterPresent[i]) {
                realIndex++;
              }
            }
            for (let i = 0; i < count; ++i) {
              if (filterPresent[index + i]) {
                realCount++;
              }
            }
            const presentItems = items.map(fn);
            filterPresent.splice(index, count, ...presentItems);
            filtered.splice(realIndex, realCount, ...items.filter((_value, index2) => presentItems[index2]));
          });
        }
      });
      addManualDep(proxy, filtered);
      return filtered;
    }
    function flatMapView(fn, viewDebugName) {
      let mappedDebugName;
      if (viewDebugName) {
        mappedDebugName = viewDebugName;
      } else if (debugName) {
        mappedDebugName = `${debugName}:flatMapView`;
      }
      const flatMapped = collection([], mappedDebugName);
      const flatMapCount = [];
      array.forEach((value, index) => {
        const chunk = fn(value, index);
        flatMapped.push(...chunk);
        flatMapCount.push(chunk.length);
      });
      proxy[ObserveKey]((event) => {
        if (event.type === "splice") {
          deferred.push(() => {
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
            items.forEach((itemValue, itemIndex) => {
              const chunk = fn(itemValue, itemIndex);
              realItems.push(...chunk);
              realItemCount.push(chunk.length);
            });
            flatMapped.splice(realIndex, realCount, ...realItems);
            flatMapCount.splice(index, count, ...realItemCount);
          });
        }
      });
      addManualDep(proxy, flatMapped);
      return flatMapped;
    }
    function set(index, val) {
      splice(index, 1, val);
    }
    function observe(observer) {
      observers.push(observer);
      observer({
        type: "init",
        items: array
      });
      return () => {
        observers = observers.filter((obs) => obs !== observer);
      };
    }
    function flush2() {
      let thunk;
      while (thunk = deferred.shift()) {
        thunk();
      }
    }
    function getRawArray() {
      return array;
    }
    const methods = {
      splice,
      pop,
      shift,
      push,
      unshift,
      [ObserveKey]: observe,
      [FlushKey]: flush2,
      [GetRawArrayKey]: getRawArray,
      sort,
      reject,
      sortedView,
      mapView,
      filterView,
      flatMapView
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
      }
      return field;
    }
    const proxy = new Proxy(array, {
      get(target, key) {
        if (key in methods) {
          return methods[key];
        }
        if (key === TypeTag) {
          return "collection";
        }
        const field = getField(key);
        addManualDep(proxy, field);
        addDepToCurrentCalculation(field);
        return target[key];
      },
      set(target, key, value) {
        if (key in methods) {
          error("Overriding certain collection methods not supported", key);
          return false;
        }
        const numericKey = Number(key);
        if (!isNaN(numericKey) && numericKey <= array.length) {
          set(numericKey, value);
        } else {
          target[key] = value;
          const field = getField(key);
          processChange(field);
          processChange(proxy);
        }
        return true;
      },
      deleteProperty(target, key) {
        if (key in methods) {
          error("Deleting certain collection methods not supported", key);
          return false;
        }
        const field = getField(key);
        processChange(field);
        delete target[key];
        return true;
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
    const fields = new Map();
    let observers = [];
    function notify2(event) {
      observers.forEach((observer) => {
        observer(event);
      });
    }
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
      }
      return field;
    }
    const knownFields = new Set(Object.keys(obj));
    function observe(observer) {
      observers.push(observer);
      observer({
        type: "init",
        keys: Object.keys(obj)
      });
      return () => {
        observers = observers.filter((obs) => obs !== observer);
      };
    }
    const methods = {
      [ObserveKey]: observe
    };
    const proxy = new Proxy(obj, {
      get(target, key) {
        if (key === TypeTag) {
          return "model";
        }
        if (key in methods) {
          return methods[key];
        }
        const field = getField(key);
        addDepToCurrentCalculation(field);
        return target[key];
      },
      has(target, key) {
        if (key === TypeTag) {
          return true;
        }
        if (key in methods) {
          return true;
        }
        const field = getField(key);
        addDepToCurrentCalculation(field);
        return knownFields.has(key);
      },
      set(target, key, value) {
        const field = getField(key);
        const changed = !knownFields.has(key) || target[key] !== value;
        target[key] = value;
        if (changed) {
          processChange(field);
          if (!knownFields.has(key)) {
            knownFields.add(key);
            notify2({ type: "add", key });
            if (typeof key !== "symbol") {
              processChange(getField(OwnKeysField));
            }
          }
          notify2({ type: "set", key, value });
        }
        return true;
      },
      deleteProperty(target, key) {
        const field = getField(key);
        const changed = knownFields.has(key);
        if (changed) {
          processChange(field);
          knownFields.delete(key);
          if (typeof key !== "symbol") {
            processChange(getField(OwnKeysField));
          }
          notify2({ type: "delete", key });
        }
        delete target[key];
        return true;
      }
    });
    if (debugName)
      name(proxy, debugName);
    return proxy;
  }
  model.keys = function keys(target) {
    const view = collection([]);
    name(view, `keys(${debugNameFor(target)})`);
    const keysSet = new Set();
    function addKey(key) {
      if (typeof key === "number" || typeof key === "string") {
        const stringKey = key.toString();
        if (!keysSet.has(stringKey)) {
          keysSet.add(stringKey);
          view.push(stringKey);
        }
      }
    }
    function delKey(key) {
      if (typeof key === "number" || typeof key === "string") {
        const stringKey = key.toString();
        if (keysSet.has(stringKey)) {
          keysSet.delete(stringKey);
          view.reject((k) => k !== stringKey);
        }
      }
    }
    const events = [];
    const updateEffect = effect(() => {
      target[OwnKeysField];
      let event;
      while (event = events.shift()) {
        if (event.type === "init") {
          event.keys.forEach((key) => {
            addKey(key);
          });
        }
        if (event.type === "add") {
          addKey(event.key);
        }
        if (event.type === "delete") {
          delKey(event.key);
        }
      }
    });
    addManualDep(updateEffect, view);
    updateEffect();
    target[ObserveKey]((event) => {
      events.push(event);
    });
    return view;
  };

  // src/index.ts
  var src_default = createElement;

  // src/test/types.ts
  function isInitMessageTest(test) {
    return !!(typeof test === "object" && test && typeof test.id === "number" && typeof test.name === "string" && typeof test.only === "boolean");
  }
  function isInitMessageSuite(suite) {
    return !!(typeof suite === "object" && suite && typeof suite.id === "number" && typeof suite.name === "string" && (typeof suite.parentSuiteId === "number" || suite.parentSuiteId === void 0) && typeof suite.only === "boolean" && Array.isArray(suite.tests) && suite.tests.every((test) => isInitMessageTest(test)));
  }
  function isInitMessage(msg) {
    return !!(typeof msg === "object" && msg && typeof msg.url === "string" && msg.type === "init" && Array.isArray(msg.suites) && msg.suites.every((suite) => isInitMessageSuite(suite)));
  }
  function makeRequest(id, item) {
    return {
      id,
      type: "request",
      request: item
    };
  }
  function isResponse(msg) {
    return typeof msg.id === "number" && msg.type === "response" && typeof msg.response === "object" && typeof msg.isPartial === "boolean";
  }
  function makeRunTestRequest({
    suiteId,
    testId
  }) {
    return {
      type: "runtest",
      suiteId,
      testId
    };
  }
  function isRunResponse(msg) {
    return msg.type === "runtest" && (msg.result === "done" || msg.result === "error" && typeof msg.error === "string");
  }
  function isRunUpdate(msg) {
    if (msg && msg.type === "internal" && typeof msg.error === "string") {
      return true;
    }
    if (msg && msg.type === "test" && typeof msg.testId === "number" && typeof msg.suiteId === "number" && msg.result === "pass" && typeof msg.duration === "number" && typeof msg.selfDuration === "number") {
      return true;
    }
    if (msg && msg.type === "test" && typeof msg.testId === "number" && typeof msg.suiteId === "number" && msg.result === "run") {
      return true;
    }
    if (msg && msg.type === "test" && typeof msg.testId === "number" && typeof msg.suiteId === "number" && msg.result === "fail" && typeof msg.error === "string") {
      return true;
    }
    return false;
  }

  // src/util.ts
  var noop = () => {
  };
  function makePromise() {
    let resolve = noop;
    let reject = noop;
    const promise = new Promise((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  }
  function groupBy2(items, grouper) {
    const grouped = new Map();
    items.forEach((item) => {
      const [outerKey, innerKey, val] = grouper(item);
      let outer = grouped.get(outerKey);
      if (!outer) {
        outer = new Map();
        grouped.set(outerKey, outer);
      }
      let inner = outer.get(innerKey);
      if (!inner) {
        inner = [];
        outer.set(innerKey, inner);
      }
      inner.push(val);
    });
    return grouped;
  }

  // src/test/rpc.ts
  var makeId = (() => {
    let maxId = 0;
    return () => maxId++;
  })();
  var requests = {};
  function request(targetWindow, request2, validator) {
    const id = makeId();
    const promise = new Promise((resolve, reject) => {
      requests[id] = (response, isPartial) => {
        if (isPartial) {
          console.error("Got partial response when full response expected", response);
          reject(new Error("Got partial response when full response expected"));
        }
        if (validator(response)) {
          resolve(response);
        } else {
          reject(new Error("Failed validation"));
        }
        delete requests[id];
      };
    });
    const msg = makeRequest(id, request2);
    targetWindow.postMessage(msg);
    return promise;
  }
  async function* requestStream(targetWindow, request2) {
    const id = makeId();
    const messages = [];
    let notify2 = makePromise().resolve;
    requests[id] = (response, isPartial) => {
      messages.push({ response, isPartial });
      notify2();
    };
    const msg = makeRequest(id, request2);
    targetWindow.postMessage(msg);
    while (true) {
      if (messages.length === 0) {
        const { promise, resolve } = makePromise();
        notify2 = resolve;
        await promise;
      }
      const { response, isPartial } = messages.shift();
      yield response;
      if (!isPartial) {
        delete requests[id];
        return;
      }
    }
  }
  window.addEventListener("message", (event) => {
    if (event.origin !== window.location.origin) {
      return;
    }
    const source = event.source;
    if (!source) {
      return;
    }
    const msg = event.data;
    if (!isResponse(msg)) {
      console.error("Received malformed message, message not response", event);
      return;
    }
    if (!requests[msg.id]) {
      console.log("Received unexpected message, message id not expected", event);
      return;
    }
    requests[msg.id](msg.response, msg.isPartial);
  }, false);

  // test-manifest.json
  var test_manifest_default = [{ src: "src/model.test.ts", buildTarget: "test/model.test.js" }, { src: "src/index.test.ts", buildTarget: "test/index.test.js" }, { src: "src/collection.test.ts", buildTarget: "test/collection.test.js" }, { src: "src/view.test.tsx", buildTarget: "test/view.test.js" }];

  // src/testrunner.tsx
  function classes(...args) {
    return args.filter((x) => !!x).join(" ");
  }
  var millis = (ms) => `${(ms || 0).toFixed(3)}ms`;
  var testFiles = model({});
  var uiState = model({
    stopOnFailure: true
  });
  function initializeTestSandbox(testFile, iframeElement) {
    iframeElement.addEventListener("load", () => {
      const contentWindow = iframeElement.contentWindow;
      const contentDocument = iframeElement.contentDocument;
      if (!contentWindow)
        throw new Error("iframe missing contentWindow");
      if (!contentDocument)
        throw new Error("iframe missing contentDocument");
      const suites = collection([]);
      testFiles[testFile.buildTarget] = model({
        src: testFile.src,
        buildTarget: testFile.buildTarget,
        iframe: iframeElement,
        suites,
        active: false,
        initialized: false
      });
      const script = contentDocument.createElement("script");
      script.src = testFile.buildTarget;
      script.onload = () => {
        request(contentWindow, {
          type: "init"
        }, isInitMessage).then((initMessage) => {
          initMessage.suites.forEach((suite) => {
            const tests = collection([]);
            suite.tests.forEach((test) => {
              const testModel = model({
                id: test.id,
                name: test.name,
                only: test.only
              });
              tests.push(testModel);
            });
            const suiteModel = model({
              id: suite.id,
              name: suite.name,
              tests,
              only: suite.only,
              parentSuiteId: suite.parentSuiteId
            });
            suites.push(suiteModel);
          });
          testFiles[testFile.buildTarget].initialized = true;
        }).catch((e) => {
          console.error("Failed to initialize", testFile, e);
        });
      };
      contentDocument.body.appendChild(script);
    });
  }
  function resetAllTestState() {
    for (const testFile of Object.values(testFiles)) {
      resetTestFileState(testFile);
    }
  }
  function resetTestFileState(testFile) {
    for (const suite of testFile.suites) {
      suite.status = void 0;
      suite.error = void 0;
      suite.only = false;
      for (const test of suite.tests) {
        test.status = void 0;
        test.only = false;
      }
    }
  }
  async function runTests() {
    const allSuites = [];
    let toRun = [];
    for (const testFile of Object.values(testFiles)) {
      for (const suite of testFile.suites) {
        suite.status = void 0;
        suite.error = void 0;
        if (suite.only) {
          suite.tests.forEach((test) => {
            allSuites.push([testFile, suite, test]);
            toRun.push([testFile, suite, test]);
          });
        } else {
          for (const test of suite.tests) {
            test.status = void 0;
            test.error = void 0;
            test.duration = void 0;
            test.selfDuration = void 0;
            allSuites.push([testFile, suite, test]);
            if (test.only) {
              toRun.push([testFile, suite, test]);
            }
          }
        }
      }
    }
    if (toRun.length === 0) {
      toRun = allSuites;
    }
    const groupedTests = groupBy2(toRun, (item) => [item[0], item[1], item[2]]);
    for (const [testFile, suites] of groupedTests) {
      const contentWindow = testFile.iframe.contentWindow;
      if (!contentWindow) {
        console.error("No content window!?");
        continue;
      }
      testFile.active = true;
      try {
        for (const [suite, tests] of suites) {
          let numFailures = 0;
          suite.status = "run";
          for (const test of tests) {
            const stream = requestStream(contentWindow, makeRunTestRequest({
              suiteId: suite.id,
              testId: test.id
            }));
            for await (const msg of stream) {
              if (isRunUpdate(msg)) {
                switch (msg.type) {
                  case "internal":
                    suite.status = "fail";
                    test.status = "fail";
                    test.error = msg.error;
                    throw new Error("Internal error: " + msg.error);
                    break;
                  case "test": {
                    if (msg.suiteId !== suite.id) {
                      throw new Error("Malformed message; suite mismatch");
                    }
                    test.status = msg.result;
                    if (msg.result === "fail") {
                      suite.status = "fail";
                      test.error = msg.error;
                      numFailures += 1;
                      continue;
                    }
                    if (msg.result === "pass") {
                      test.duration = msg.duration;
                      test.selfDuration = msg.selfDuration;
                    }
                    break;
                  }
                }
              }
              if (isRunResponse(msg)) {
                switch (msg.type) {
                  case "runtest":
                    break;
                }
              }
            }
            if (numFailures > 0 && uiState.stopOnFailure) {
              return;
            }
          }
          suite.status = numFailures > 0 ? "fail" : "pass";
        }
      } finally {
        testFile.active = false;
      }
    }
  }
  var TestView = ({ test }) => {
    const onClick = (e) => {
      e.preventDefault();
      if (!e.shiftKey) {
        resetAllTestState();
      }
      test.only = !test.only;
      runTests();
    };
    const statusText = {
      run: "RUN:",
      pass: "PASS",
      fail: "FAIL"
    };
    return /* @__PURE__ */ src_default("div", {
      class: calc(() => classes("test", test.only && "test--only", test.status === "run" && "test--running", test.status === "pass" && "test--pass", test.status === "fail" && "test--fail"))
    }, /* @__PURE__ */ src_default("a", {
      class: "test__link",
      href: "#",
      "on:click": onClick
    }, calc(() => test.status ? statusText[test.status] : ""), " ", calc(() => test.name), calc(() => test.duration !== void 0 && test.selfDuration !== void 0 && /* @__PURE__ */ src_default(Fragment, null, ": (", millis(test.selfDuration), ";", " ", millis(test.duration), " including setup)"))), calc(() => test.status === "fail" && test.error && /* @__PURE__ */ src_default("pre", null, test.error)));
  };
  var SuiteView = ({ suite }) => suite.tests.length > 0 && /* @__PURE__ */ src_default("details", {
    class: calc(() => classes("suite", suite.status === "run" && "suite--running", suite.status === "pass" && "suite--pass", suite.status === "fail" && "suite--fail")),
    open: calc(() => !(suite.status === "pass" && suite.tests.every((test) => test.status === "pass")))
  }, /* @__PURE__ */ src_default("summary", {
    class: "suite__top"
  }, /* @__PURE__ */ src_default("div", {
    class: "suite__name"
  }, calc(() => suite.name || "<root>")), calc(() => suite.status && /* @__PURE__ */ src_default("div", {
    class: "suite__info"
  }, suite.status)), calc(() => suite.tests.length > 0 && suite.status === "pass" && /* @__PURE__ */ src_default("div", {
    class: "suite__info"
  }, suite.tests.filter((test) => test.status === "pass").length, " ", "/ ", suite.tests.length)), calc(() => suite.tests.length > 0 && (suite.status === "pass" || suite.status === "fail") && /* @__PURE__ */ src_default("div", {
    class: "suite__info"
  }, "in", " ", millis(suite.tests.reduce((acc, test) => {
    var _a;
    return acc + ((_a = test == null ? void 0 : test.duration) != null ? _a : 0);
  }, 0))))), suite.tests.mapView((test) => /* @__PURE__ */ src_default(TestView, {
    test
  })));
  var TestFileView = ({
    testFile
  }) => /* @__PURE__ */ src_default("details", {
    class: "testfile",
    open: true
  }, /* @__PURE__ */ src_default("summary", {
    class: "testfile__status"
  }, calc(() => testFile.src)), calc(() => testFile.suites.mapView((suite) => calc(() => /* @__PURE__ */ src_default(SuiteView, {
    suite
  })))));
  var TestRunner = (props, { onMount, onEffect }) => {
    const testFileKeys = model.keys(testFiles);
    onEffect(() => {
      if (testFileKeys.length === test_manifest_default.length && testFileKeys.every((testFileKey) => testFiles[testFileKey].initialized)) {
        runTests();
      }
    });
    const onClickRunAll = () => {
      resetAllTestState();
      runTests();
    };
    const onClickRerun = () => {
      runTests();
    };
    const hasEmptyTests = calc(() => {
      return testFileKeys.every((testFileKey) => {
        return testFiles[testFileKey].suites.every((suite) => {
          return suite.tests.length === 0;
        });
      });
    });
    const hasAnyOnlyItems = calc(() => {
      return !testFileKeys.some((testFileKey) => {
        return testFiles[testFileKey].suites.some((suite) => {
          return suite.only || suite.tests.some((test) => test.only);
        });
      });
    });
    const onStopToggle = (e) => {
      var _a;
      uiState.stopOnFailure = !!((_a = e.target) == null ? void 0 : _a.checked);
    };
    return /* @__PURE__ */ src_default("div", {
      class: "testrunner"
    }, /* @__PURE__ */ src_default("div", {
      class: "test-ui"
    }, /* @__PURE__ */ src_default("button", {
      disabled: hasEmptyTests,
      "on:click": onClickRunAll
    }, "Run all tests"), /* @__PURE__ */ src_default("button", {
      disabled: hasAnyOnlyItems,
      "on:click": onClickRerun
    }, "Rerun selected tests"), /* @__PURE__ */ src_default("label", null, /* @__PURE__ */ src_default("input", {
      type: "checkbox",
      checked: calc(() => uiState.stopOnFailure),
      "on:change": onStopToggle
    }), " ", "Stop on failure"), testFileKeys.mapView((testFile) => /* @__PURE__ */ src_default(TestFileView, {
      testFile: testFiles[testFile]
    }))), /* @__PURE__ */ src_default("div", {
      class: "test-sandboxes"
    }, test_manifest_default.map((testFile) => /* @__PURE__ */ src_default("iframe", {
      class: calc(() => {
        var _a;
        return classes(((_a = testFiles[testFile.buildTarget]) == null ? void 0 : _a.active) && "active");
      }),
      ref: (iframeElement) => {
        if (!iframeElement) {
          return;
        }
        initializeTestSandbox(testFile, iframeElement);
      },
      src: "testsandbox.html"
    }))));
  };
  mount(document.body, /* @__PURE__ */ src_default(TestRunner, null));
})();
//# sourceMappingURL=testrunner.js.map
