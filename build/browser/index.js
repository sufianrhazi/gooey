var Revise = (() => {
  var __defProp = Object.defineProperty;
  var __markAsModule = (target) => __defProp(target, "__esModule", { value: true });
  var __export = (target, all) => {
    __markAsModule(target);
    for (var name2 in all)
      __defProp(target, name2, { get: all[name2], enumerable: true });
  };

  // build/tsc/index.js
  var tsc_exports = {};
  __export(tsc_exports, {
    Fragment: () => Fragment,
    InvariantError: () => InvariantError,
    OnCollectionRelease: () => OnCollectionRelease,
    VERSION: () => VERSION,
    calc: () => calc,
    collection: () => collection,
    debug: () => debug2,
    default: () => tsc_default,
    effect: () => effect,
    flush: () => flush,
    model: () => model,
    mount: () => mount,
    name: () => name,
    ref: () => ref,
    release: () => release,
    reset: () => reset,
    retain: () => retain,
    setLogLevel: () => setLogLevel,
    subscribe: () => subscribe
  });

  // build/tsc/types.js
  var InvariantError = class extends Error {
  };
  var TypeTag = Symbol("reviseType");
  var CalculationTypeTag = Symbol("calculationType");
  function isRef(ref2) {
    return ref2 && ref2[TypeTag] === "ref";
  }
  function ref(val) {
    return {
      [TypeTag]: "ref",
      current: val
    };
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
  function isCollection(thing) {
    return !!(thing && thing[TypeTag] === "collection");
  }
  function isCalculation(thing) {
    return !!(thing && thing[TypeTag] === "calculation");
  }
  function isEffect(thing) {
    return thing[CalculationTypeTag] === "effect";
  }

  // build/tsc/log.js
  var levels = {
    error: 0,
    warn: 1,
    info: 2,
    debug: 3
  };
  var currentLevel = levels.warn;
  function setLogLevel(logLevel) {
    invariant(() => logLevel in levels, logLevel);
    currentLevel = levels[logLevel];
  }
  function debug(...items) {
    if (currentLevel >= levels.debug) {
      console.log(...items);
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

  // build/tsc/sentinel.js
  var sentinel = {};
  var isSentinel = (value) => {
    return value === sentinel;
  };

  // build/tsc/dag.js
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
        const props = {
          label: isSentinel(node) ? "<ROOT>" : makeName(nodeId, node)
        };
        if (isSentinel(node)) {
          props.shape = "circle";
        }
        lines.push(`  item_${nodeId} [${Object.entries(props).map(([key, value]) => `${key}=${JSON.stringify(value)}`).join(",")}];`);
      });
      Object.entries(this.edgeMap).forEach(([fromNodeId, toNodeMap]) => {
        Object.keys(toNodeMap).forEach((toNodeId) => {
          lines.push(`  item_${fromNodeId} -> item_${toNodeId};`);
        });
      });
      lines.push("}");
      return lines.join("\n");
    }
  };

  // build/tsc/renderchild.js
  function isRenderElement(renderChild) {
    return !!(renderChild && typeof renderChild === "object" && "type" in renderChild && renderChild.type === "element");
  }
  function isRenderComponent(renderChild) {
    return !!(renderChild && typeof renderChild === "object" && "type" in renderChild && renderChild.type === "component");
  }

  // build/tsc/treeslot.js
  var TreeSlotSymbol = Symbol("TreeSlot");
  function makeTreeSlot({ renderChild, domNode, onUnmount }) {
    return {
      domNode,
      children: [],
      renderChild,
      onUnmount,
      [TreeSlotSymbol]: true
    };
  }
  function getTreeSlotParent(root, treeSlotIndex) {
    if (!root.domNode)
      throw new Error("TreeSlot roots must have a DOM node");
    let node = root;
    let realTreeSlot = root;
    for (let i = 0; i < treeSlotIndex.length - 1; ++i) {
      node = node.children[treeSlotIndex[i]];
      if (node.domNode) {
        realTreeSlot = node;
      }
    }
    return {
      immediateParent: node,
      childIndex: treeSlotIndex[treeSlotIndex.length - 1],
      domParent: realTreeSlot
    };
  }
  function getShallowNodes(treeSlot) {
    const nodes = [];
    function visit(node) {
      if (node.domNode) {
        nodes.push(node.domNode);
      } else {
        node.children.forEach((child) => visit(child));
      }
    }
    visit(treeSlot);
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
          exception(e, "TreeSlot node raised exception in onUnmount", node);
        }
      });
    }
  }
  function setTreeSlot(root, treeSlotIndex, newNode) {
    return spliceTreeSlot(root, treeSlotIndex, 1, [newNode])[0];
  }
  function spliceTreeSlot(root, treeSlotIndex, removeCount, newNodes) {
    const { immediateParent, childIndex, domParent } = getTreeSlotParent(root, treeSlotIndex);
    const detachedTreeSlots = immediateParent.children.splice(childIndex, removeCount, ...newNodes);
    detachedTreeSlots.forEach((detachedTreeSlot) => {
      callOnUnmount(detachedTreeSlot);
      const nodesToRemove = getShallowNodes(detachedTreeSlot);
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
      if (newNode.domNode) {
        const domIndex = getDomParentChildIndex(domParent, immediateParent, childIndex);
        const referenceNode = domParentNode.childNodes[domIndex];
        domParentNode.insertBefore(newNode.domNode, referenceNode || null);
      }
    });
    return detachedTreeSlots;
  }

  // build/tsc/view.js
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
  function setAttributeValue(element, key, value) {
    if (value === null || value === void 0 || value === false) {
      element.removeAttribute(key);
    } else if (value === true) {
      element.setAttribute(key, "");
    } else if (typeof value === "string") {
      element.setAttribute(key, value);
    } else if (typeof value === "number") {
      element.setAttribute(key, value.toString());
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
  function mountTo({ parentElement, treeSlot, mountIndex, root, replacedTreeSlot }) {
    if (root === null || root === void 0 || root === false || root === true) {
      setTreeSlot(treeSlot, mountIndex, makeTreeSlot({
        renderChild: root,
        domNode: null,
        onUnmount: []
      }));
      return;
    }
    if (typeof root === "string") {
      setTreeSlot(treeSlot, mountIndex, makeTreeSlot({
        renderChild: root,
        domNode: document.createTextNode(root),
        onUnmount: []
      }));
      return;
    }
    if (typeof root === "number") {
      setTreeSlot(treeSlot, mountIndex, makeTreeSlot({
        renderChild: root,
        domNode: document.createTextNode(root.toString()),
        onUnmount: []
      }));
      return;
    }
    if (isRenderElement(root)) {
      const element = document.createElement(root.element);
      const boundEffects = [];
      let refCallback = void 0;
      if (root.props) {
        Object.entries(root.props).forEach(([key, value]) => {
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
            const boundEffect = name(effect(() => {
              const computedValue = value();
              setAttributeValue(element, key, computedValue);
            }), `view:bindAttribute:${key}:${JSON.stringify(mountIndex)}`);
            retain(boundEffect);
            boundEffects.push(boundEffect);
            boundEffect();
          } else {
            setAttributeValue(element, key, value);
          }
        });
      }
      const newTreeSlot = makeTreeSlot({
        renderChild: root,
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
      setTreeSlot(treeSlot, mountIndex, newTreeSlot);
      root.children.forEach((child, childIndex) => {
        mountTo({
          parentElement: element,
          treeSlot,
          mountIndex: mountIndex.concat([childIndex]),
          root: child
        });
      });
      if (refCallback) {
        refCallback(element);
      }
      return;
    }
    if (isCollection(root)) {
      const trackedCollection = root;
      const onUnmount = [];
      setTreeSlot(treeSlot, mountIndex, makeTreeSlot({
        renderChild: root,
        domNode: null,
        onUnmount
      }));
      const unobserve = trackedCollection.observe((event) => {
        if (event.type === "init") {
          const { items } = event;
          items.forEach((renderChild, childIndex) => {
            mountTo({
              parentElement,
              treeSlot,
              mountIndex: mountIndex.concat([childIndex]),
              root: renderChild
            });
          });
        } else if (event.type === "sort") {
        } else if (event.type === "splice") {
          const { count, index, items } = event;
          const replaceCount = Math.min(count, items.length);
          const removeCount = count - replaceCount;
          const insertCount = items.length - replaceCount;
          const removed = spliceTreeSlot(treeSlot, mountIndex.concat([index]), count, items.map((item) => makeTreeSlot({
            renderChild: null,
            domNode: null,
            onUnmount: []
          })));
          items.forEach((renderChild, childIndex) => {
            mountTo({
              parentElement,
              treeSlot,
              mountIndex: mountIndex.concat([index + childIndex]),
              root: renderChild
            });
          });
        }
      });
      retain(trackedCollection);
      onUnmount.push(unobserve);
      onUnmount.push(() => {
        release(trackedCollection);
      });
      return;
    }
    if (isCalculation(root)) {
      const trackedCalculation = root;
      const onUnmount = [];
      const resultEffect = name(effect(() => {
        const renderChild = trackedCalculation();
        const { immediateParent, childIndex } = getTreeSlotParent(treeSlot, mountIndex);
        const replaced = setTreeSlot(treeSlot, mountIndex, makeTreeSlot({
          renderChild,
          domNode: null,
          onUnmount: [() => release(resultEffect)]
        }));
        retain(resultEffect);
        mountTo({
          parentElement,
          treeSlot,
          mountIndex: mountIndex.concat([0]),
          root: renderChild,
          replacedTreeSlot: replaced
        });
      }), `view:calc:${JSON.stringify(mountIndex)}`);
      resultEffect();
      return;
    }
    if (isRenderComponent(root)) {
      const Component = root.component;
      const resultEffect = name(effect(() => {
        const onUnmount = [];
        const onMount = [];
        const renderChild = Component(Object.assign(Object.assign({}, root.props || {}), { children: root.children }), {
          onUnmount: (unmountCallback) => {
            onUnmount.push(unmountCallback);
          },
          onMount: (mountCallback) => {
            onMount.push(mountCallback);
          }
        });
        setTreeSlot(treeSlot, mountIndex, makeTreeSlot({
          renderChild,
          domNode: null,
          onUnmount: [() => release(resultEffect), ...onUnmount]
        }));
        retain(resultEffect);
        mountTo({
          parentElement,
          treeSlot,
          mountIndex: mountIndex.concat([0]),
          root: renderChild
        });
        onMount.forEach((mountCallback) => mountCallback());
      }), `view:component:${root.component.name}:${JSON.stringify(mountIndex)}`);
      resultEffect();
      return;
    }
    if (Array.isArray(root)) {
      const items = root;
      setTreeSlot(treeSlot, mountIndex, makeTreeSlot({
        renderChild: root,
        domNode: null,
        onUnmount: []
      }));
      items.forEach((renderChild, childIndex) => {
        mountTo({
          parentElement,
          treeSlot,
          mountIndex: mountIndex.concat([childIndex]),
          root: renderChild
        });
      });
      return;
    }
    if (typeof root === "function") {
      setTreeSlot(treeSlot, mountIndex, makeTreeSlot({
        renderChild: root,
        domNode: null,
        onUnmount: []
      }));
      return;
    }
    assertExhausted(root, "unexpected render type");
  }
  function mount(parentElement, root) {
    mountTo({
      parentElement,
      treeSlot: makeTreeSlot({
        renderChild: null,
        domNode: parentElement,
        onUnmount: []
      }),
      mountIndex: [0],
      root
    });
  }
  var Fragment = ({ children }) => children;

  // build/tsc/index.js
  var tsc_default = createElement;
  var VERSION = "development";
  var activeCalculations = [];
  var calculationToInvalidationMap = new Map();
  var nameMap = new WeakMap();
  function debugNameFor(item) {
    var _a, _b, _c;
    if (isCollection(item)) {
      return `coll:${(_a = nameMap.get(item)) !== null && _a !== void 0 ? _a : "?"}`;
    }
    if (isCalculation(item)) {
      return `${isEffect(item) ? "eff" : "comp"}:${(_b = nameMap.get(item)) !== null && _b !== void 0 ? _b : "?"}`;
    }
    return `model:${(_c = nameMap.get(item.model)) !== null && _c !== void 0 ? _c : "?"}:${String(item.key)}`;
  }
  var partialDag = new DAG();
  var globalDependencyGraph = new DAG();
  function reset() {
    partialDag = new DAG();
    activeCalculations = [];
    calculationToInvalidationMap = new Map();
    globalDependencyGraph = new DAG();
  }
  function name(item, name2) {
    nameMap.set(item, name2);
    return item;
  }
  function model(obj) {
    if (typeof obj !== "object" || !obj) {
      throw new InvariantError("model must be provided an object");
    }
    const fields = new Map();
    const proxy = new Proxy(obj, {
      get(target, key) {
        if (key === TypeTag) {
          return "model";
        }
        let field = fields.get(key);
        if (!field) {
          field = {
            model: proxy,
            key
          };
          fields.set(key, field);
        }
        addDepToCurrentCalculation(field);
        return target[key];
      },
      set(target, key, value) {
        let field = fields.get(key);
        if (!field) {
          field = {
            model: proxy,
            key
          };
          fields.set(key, field);
        }
        processChange(field);
        target[key] = value;
        return true;
      }
    });
    return proxy;
  }
  function collection(array) {
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
        items
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
      return removed;
    }
    function pop(val) {
      const removed = splice(array.length - 1, 1);
      return removed[0];
    }
    function shift(val) {
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
    function sort(sorter) {
      array.sort(sorter);
      observers.forEach((observer) => {
        observer({
          type: "sort"
        });
      });
      return proxy;
    }
    function mapView(mapper) {
      const mapped = collection(array.map(mapper));
      const unobserve = proxy.observe((event) => {
        if (event.type === "sort") {
          return;
        } else if (event.type === "splice") {
          const { index, count, items } = event;
          mapped.splice(index, count, ...items.map(mapper));
        }
      });
      return mapped;
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
    const methods = {
      splice,
      pop,
      shift,
      push,
      unshift,
      observe,
      sort,
      mapView
    };
    function getField(key) {
      let field = fields.get(key);
      if (!field) {
        field = {
          model: proxy,
          key
        };
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
        addCollectionDep(proxy, field);
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
          return true;
        }
        const field = getField(key);
        processChange(field);
        target[key] = value;
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
    return proxy;
  }
  function calc(func) {
    return trackCalculation(func, false);
  }
  function effect(func) {
    return trackCalculation(func, true);
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
  function addCollectionDep(fromNode, toNode) {
    globalDependencyGraph.addNode(fromNode);
    globalDependencyGraph.addNode(toNode);
    if (globalDependencyGraph.addEdge(fromNode, toNode)) {
      debug("New global collection dependency", debugNameFor(fromNode), "->", debugNameFor(toNode));
    }
  }
  function processChange(item) {
    const addNode = (node) => {
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
  }
  var needsFlush = false;
  var listeners = new Set();
  function subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }
  function notify() {
    listeners.forEach((listener) => {
      try {
        listener();
      } catch (e) {
        exception(e, "unhandled exception in subscriber");
      }
    });
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
      } else {
        debug("flushing model", debugNameFor(item));
      }
    });
    globalDependencyGraph.garbageCollect().forEach((item) => {
      if (isCalculation(item)) {
        debug("GC calculation", debugNameFor(item));
      } else {
        debug("GC model", debugNameFor(item));
      }
    });
  }
  function retain(item) {
    debug("retain", debugNameFor(item));
    if (!globalDependencyGraph.hasNode(item)) {
      globalDependencyGraph.addNode(item);
    }
    globalDependencyGraph.retain(item);
  }
  function release(item) {
    debug("release", debugNameFor(item));
    globalDependencyGraph.release(item);
  }
  function debug2() {
    return globalDependencyGraph.graphviz((id, item) => {
      return `${id}
${debugNameFor(item)}`;
    });
  }
  return tsc_exports;
})();
//# sourceMappingURL=index.js.map
