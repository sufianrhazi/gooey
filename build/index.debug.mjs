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

// src/common/slotsizes.ts
var SlotSizes = class {
  constructor(items) {
    this.slots = items.map(() => 0);
    this.items = items;
    this.indexes = /* @__PURE__ */ new Map();
    this.updateIndexes(0, items.length);
  }
  clearSlots() {
    this.slots = this.items.map(() => 0);
  }
  updateIndexes(lo, hi) {
    for (let i = lo; i < hi; ++i) {
      this.indexes.set(this.items[i], i);
    }
  }
  index(item) {
    return this.indexes.get(item);
  }
  get(index) {
    return this.items[index];
  }
  move(from, count, to) {
    let fromShift = 0;
    let countShift = 0;
    let toShift = 0;
    for (let i = 0; i < from; ++i) {
      fromShift += this.slots[i];
    }
    for (let i = from; i < from + count; ++i) {
      countShift += this.slots[i];
    }
    applyMove(this.slots, from, count, to);
    applyMove(this.items, from, count, to);
    for (let i = 0; i < to; ++i) {
      toShift += this.slots[i];
    }
    this.updateIndexes(from, from + count);
    this.updateIndexes(to, to + count);
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
      const slotSize = this.slots[i];
      const indexedSlot = [];
      for (let j = 0; j < slotSize; ++j) {
        indexedSlot.push(totalIndex++);
      }
      indexedSlots.push(indexedSlot);
      if (i < from) {
        fromShift += this.slots[i];
      }
    }
    applySort(indexedSlots, from, indexes);
    const newIndexes = indexedSlots.slice(from).flat();
    applySort(this.slots, from, indexes);
    applySort(this.items, from, indexes);
    this.updateIndexes(from, from + indexes.length);
    return {
      type: "sort" /* SORT */,
      from: fromShift,
      indexes: newIndexes
    };
  }
  splice(index, count, items) {
    let shiftIndex = 0;
    for (let i = 0; i < index; ++i) {
      shiftIndex += this.slots[i];
    }
    let shiftCount = 0;
    for (let i = index; i < index + count; ++i) {
      shiftCount += this.slots[i];
    }
    this.slots.splice(index, count, ...items.map(() => 0));
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
    let shift = 0;
    for (let i = 0; i < sourceIndex; ++i) {
      shift += this.slots[i];
    }
    switch (event.type) {
      case "splice" /* SPLICE */: {
        this.slots[sourceIndex] += event.items?.length ?? 0 - event.count;
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
  1 /* COMMIT_DELETE */,
  2 /* COMMIT_RENDER */,
  3 /* COMMIT_INSERT */,
  4 /* COMMIT_MOUNT */
];
var commitPhases = {
  [0 /* COMMIT_UNMOUNT */]: /* @__PURE__ */ new Set(),
  [1 /* COMMIT_DELETE */]: /* @__PURE__ */ new Set(),
  [2 /* COMMIT_RENDER */]: /* @__PURE__ */ new Set(),
  [3 /* COMMIT_INSERT */]: /* @__PURE__ */ new Set(),
  [4 /* COMMIT_MOUNT */]: /* @__PURE__ */ new Set()
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
    if (phase === 1 /* COMMIT_DELETE */) {
      activeElement = document.activeElement;
    }
    const toCommit = Array.from(commitPhases[phase]).sort(
      (a, b) => b.getDepth() - a.getDepth()
    );
    commitPhases[phase] = /* @__PURE__ */ new Set();
    for (const renderNode of toCommit) {
      renderNode.commit(phase);
    }
    if (phase === 3 /* COMMIT_INSERT */ && activeElement && document.documentElement.contains(activeElement)) {
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
    this.forwardAdjacencyHard[id] = [];
    this.forwardAdjacencyEither[id] = [];
    this.reverseAdjacencyEither[id] = [];
  }
  removeVertex(vertex) {
    const id = this.vertexToId.get(vertex);
    assert(id, "double vertex removal");
    const index = this.topologicalIndexById[id];
    assert(index !== void 0, "malformed graph");
    assert(
      this.forwardAdjacencyEither[id].length === 0,
      "cannot remove vertex with forward edges"
    );
    assert(
      this.reverseAdjacencyEither[id].length === 0,
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
    assert(
      !this.forwardAdjacencyEither[fromId].includes(toId),
      "addEdge duplicate"
    );
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
    assert(
      this.forwardAdjacencyEither[fromId].includes(toId),
      "removeEdge on edge that does not exist"
    );
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
    const seedVertices = this.visitDfsForward(
      toReorder,
      lowerBound,
      upperBound
    );
    const components = tarjanStronglyConnected(
      this.reverseAdjacencyEither,
      this.topologicalIndexById,
      lowerBound,
      upperBound,
      seedVertices
    );
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
        subscription(
          this.debug(
            (v) => ({
              ...formatter(v),
              isActive: v === vertex
            }),
            label
          ),
          label
        );
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
            shouldPropagate = this.processHandler(
              cycleVertex,
              2 /* CYCLE */
            ) || shouldPropagate;
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
      if (this.forwardAdjacencyEither[id]) {
        for (const toId of this.forwardAdjacencyEither[id]) {
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
Graph.EDGE_SOFT = 1 /* EDGE_SOFT */;
Graph.EDGE_HARD = 2 /* EDGE_HARD */;
if (false) {
  Graph.prototype._test_getVertices = function _test_getVertices() {
    return this.vertexById.filter((vertex) => !!vertex);
  };
  Graph.prototype._test_getDependencies = function _test_getDependencies(vertex) {
    const id = this.vertexToId.get(vertex);
    assert(id, "getDependencies on nonexistent vertex");
    return this.forwardAdjacencyEither[id].map(
      (toId) => this.vertexById[toId]
    );
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
var postProcessActions = /* @__PURE__ */ new Set();
var trackReadSets = [];
var isFlushing = false;
var needsFlush = false;
var flushHandle = null;
var flushScheduler = defaultScheduler2;
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
  postProcessActions = /* @__PURE__ */ new Set();
  trackReadSets = [];
  isFlushing = false;
  needsFlush = false;
  if (flushHandle)
    flushHandle();
  flushHandle = null;
  flushScheduler = defaultScheduler2;
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
  const toProcess = postProcessActions;
  postProcessActions = /* @__PURE__ */ new Set();
  for (const postProcessAction of toProcess) {
    postProcessAction();
  }
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
function addHardEdge(fromVertex, toVertex) {
  debug(
    "add edge:hard",
    fromVertex.__debugName,
    "->",
    toVertex.__debugName
  );
  globalDependencyGraph.addEdge(fromVertex, toVertex, Graph.EDGE_HARD);
}
function addSoftEdge(fromVertex, toVertex) {
  debug(
    "add edge:soft",
    fromVertex.__debugName,
    "->",
    toVertex.__debugName
  );
  globalDependencyGraph.addEdge(fromVertex, toVertex, Graph.EDGE_SOFT);
}
function removeHardEdge(fromVertex, toVertex) {
  debug(
    "del edge:hard",
    fromVertex.__debugName,
    "->",
    toVertex.__debugName
  );
  globalDependencyGraph.removeEdge(fromVertex, toVertex, Graph.EDGE_HARD);
}
function removeSoftEdge(fromVertex, toVertex) {
  debug(
    "del edge:soft",
    fromVertex.__debugName,
    "->",
    toVertex.__debugName
  );
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
    assert(
      set === trackReadSets.pop(),
      "Calculation tracking consistency error"
    );
  }
}
function untrackReads(fn, debugName) {
  group("untrackReads", debugName ?? "call");
  trackReadSets.push(null);
  try {
    return fn();
  } finally {
    groupEnd();
    assert(
      null === trackReadSets.pop(),
      "Calculation tracking consistency error"
    );
  }
}
function notifyRead(dependency) {
  if (trackReadSets.length === 0)
    return;
  const calculationReads = trackReadSets[trackReadSets.length - 1];
  if (calculationReads) {
    debug(
      "adding dependency",
      dependency.__debugName,
      "to active calculation"
    );
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
function debugGetGraph() {
  const { vertices, edges } = globalDependencyGraph.debugGetGraph();
  const labels = /* @__PURE__ */ new Map();
  vertices.forEach((vertex) => {
    labels.set(vertex, vertex.__debugName);
  });
  return { vertices, edges, labels };
}

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
      renderNode.requestCommit(2 /* COMMIT_RENDER */);
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
        if (phase === 2 /* COMMIT_RENDER */) {
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
  if (typeof jsxNode === "object" && typeof jsxNode.get === "function" && typeof jsxNode.subscribe === "function") {
    return DynamicRenderNode(renderJSXNode, jsxNode);
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
        const componentResult = ensureResult();
        if (componentResult instanceof Error) {
          warn("Unhandled exception on detached component", {
            error: componentResult,
            renderNode
          });
        } else {
          renderNode.own(componentResult);
        }
      },
      onDestroy: () => {
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
        renderNode.requestCommit(4 /* COMMIT_MOUNT */);
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
        if (phase === 4 /* COMMIT_MOUNT */ && onMountCallbacks) {
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

// src/common/sentinel.ts
var Sentinel = Symbol("sentinel");

// src/model/calc.ts
var CalculationSymbol = Symbol("calculation");
var Calculation = class {
  get() {
    notifyRead(this);
    const state = this._state;
    switch (state) {
      case 4 /* DEAD */:
        return this._fn();
      case 2 /* CACHED */:
        return this._val;
      case 1 /* CALLING */:
        this._state = 3 /* ERROR */;
        this._error = new CycleError(
          "Cycle reached: calculation reached itself",
          this
        );
        throw this._error;
      case 3 /* ERROR */:
        if (this._error === Sentinel) {
          throw new Error(
            "Cycle reached: calculation reached itself"
          );
        } else {
          throw new Error(
            "Calculation in error state: " + this._error.message
          );
        }
        break;
      case 0 /* READY */: {
        const calculationReads = /* @__PURE__ */ new Set();
        let result = Sentinel;
        let exception;
        this._state = 1 /* CALLING */;
        try {
          result = trackReads(
            calculationReads,
            () => this._fn(),
            this.__debugName
          );
        } catch (e) {
          exception = e;
        }
        if (this._state === 4 /* DEAD */) {
          for (const retained of calculationReads) {
            release(retained);
          }
          if (result === Sentinel)
            throw exception;
          return result;
        }
        if (
          // Cast due to TypeScript limitation
          this._state === 3 /* ERROR */
        ) {
          exception = this._error;
        }
        let isActiveCycle = false;
        let isActiveCycleRoot = false;
        if (exception) {
          if (exception instanceof CycleError) {
            isActiveCycle = true;
            isActiveCycleRoot = exception.sourceCalculation === this;
          }
          const errorHandler = this._errorHandler;
          if (errorHandler) {
            result = untrackReads(
              () => errorHandler(exception),
              this.__debugName
            );
          }
          if (isActiveCycle) {
            markCycleInformed(this);
          }
        }
        if (result === Sentinel) {
          if ("_val" in this) {
            delete this._val;
          }
          this._error = exception;
          this._state = 3 /* ERROR */;
        } else {
          this._val = result;
          if ("_error" in this) {
            delete this._error;
          }
          this._state = 2 /* CACHED */;
          unmarkDirty(this);
        }
        if (this._retained) {
          for (const priorDependency of this._retained) {
            if (isProcessable(priorDependency) && !calculationReads.has(priorDependency)) {
              removeHardEdge(priorDependency, this);
            }
            release(priorDependency);
          }
        }
        for (const dependency of calculationReads) {
          if (isProcessable(dependency)) {
            if (!this._retained || !this._retained.has(dependency)) {
              addHardEdge(dependency, this);
            }
          }
        }
        this._retained = calculationReads;
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
  constructor(fn, debugName) {
    this.__debugName = debugName ?? "calc";
    this.__refcount = 0;
    this.__processable = true;
    this._type = CalculationSymbol;
    this._state = 4 /* DEAD */;
    this._fn = fn;
  }
  onError(handler) {
    this._errorHandler = handler;
    return this;
  }
  _eq(a, b) {
    return a === b;
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
    this._state = 0 /* READY */;
  }
  __dead() {
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
  __recalculate() {
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
          newResult = this.get();
        } catch (e) {
          this._state = 3 /* ERROR */;
          this._error = e;
          if (this._subscriptions) {
            const error2 = wrapError(
              e,
              "Unknown error in calculation"
            );
            for (const subscription of this._subscriptions) {
              subscription(error2, void 0);
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
        assertExhausted(
          this._state,
          "Calculation in unknown state"
        );
    }
  }
  __invalidate() {
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
        assertExhausted(
          this._state,
          "Calculation in unknown state"
        );
    }
  }
  __cycle() {
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
          this._val = untrackReads(
            () => errorHandler(
              new CycleError(
                "Calculation is part of a cycle",
                this
              )
            ),
            this.__debugName
          );
          this._state = 2 /* CACHED */;
          unmarkDirty(this);
        } else {
          this._state = 3 /* ERROR */;
          this._error = Sentinel;
          if (this._subscriptions) {
            for (const subscription of this._subscriptions) {
              subscription(
                new CycleError(
                  "Calculation is part of a cycle",
                  this
                ),
                void 0
              );
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
        assertExhausted(
          this._state,
          "Calculation in unknown state"
        );
    }
  }
  map(fn) {
    return calc(() => fn(this.get()));
  }
};
var CycleError = class extends Error {
  constructor(msg, sourceCalculation) {
    super(msg);
    this.sourceCalculation = sourceCalculation;
  }
};
function calc(fn, debugName) {
  return new Calculation(fn, debugName);
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
var sharedFragment;
function getFragment() {
  if (!sharedFragment) {
    sharedFragment = document.createDocumentFragment();
  }
  return sharedFragment;
}
function PortalRenderNode(element, childrenRenderNode, refProp, debugName) {
  let committedNodes = [];
  let liveNodes = [];
  let liveNodeSet = /* @__PURE__ */ new Set();
  let deadNodeSet = /* @__PURE__ */ new Set();
  function insertBefore(nodes, targetIndex) {
    let toInsert;
    if (nodes.length === 1) {
      toInsert = nodes[0];
      liveNodeSet.add(nodes[0]);
      committedNodes.splice(targetIndex, 0, toInsert);
    } else if (nodes.length > 1) {
      const fragment = getFragment();
      for (const node of nodes) {
        liveNodeSet.add(node);
        fragment.appendChild(node);
      }
      committedNodes.splice(targetIndex, 0, ...nodes);
      toInsert = fragment;
    }
    if (toInsert) {
      element.insertBefore(
        toInsert,
        element.childNodes[targetIndex] || null
      );
    }
  }
  const renderNode = new SingleChildRenderNode(
    {
      onEvent: (event) => {
        const removed = applyArrayEvent(liveNodes, event);
        for (const toRemove of removed) {
          if (liveNodeSet.has(toRemove)) {
            deadNodeSet.add(toRemove);
          }
        }
        const isDelete = event.type !== "splice" /* SPLICE */ || event.count > 0;
        const isInsert = event.type !== "splice" /* SPLICE */ || event.items?.length;
        if (isDelete) {
          renderNode.requestCommit(
            1 /* COMMIT_DELETE */
          );
        }
        if (isInsert) {
          renderNode.requestCommit(
            3 /* COMMIT_INSERT */
          );
        }
        return true;
      },
      onMount: () => {
        if (refProp) {
          renderNode.requestCommit(
            4 /* COMMIT_MOUNT */
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
        if (phase === 1 /* COMMIT_DELETE */ && deadNodeSet.size > 0) {
          if (deadNodeSet.size === liveNodeSet.size) {
            element.replaceChildren();
            liveNodeSet.clear();
            committedNodes = [];
          } else {
            for (const toRemove of deadNodeSet) {
              liveNodeSet.delete(toRemove);
              element.removeChild(toRemove);
            }
            committedNodes = committedNodes.filter(
              (node) => !deadNodeSet.has(node)
            );
          }
          deadNodeSet.clear();
        }
        if (phase === 3 /* COMMIT_INSERT */ && liveNodes.length > 0) {
          let liveIndex = 0;
          while (liveIndex < liveNodes.length) {
            if (liveIndex >= committedNodes.length) {
              insertBefore(liveNodes.slice(liveIndex), liveIndex);
              break;
            }
            if (liveNodes[liveIndex] !== committedNodes[liveIndex]) {
              let checkIndex = liveIndex + 1;
              while (checkIndex < liveNodes.length && checkIndex < committedNodes.length && liveNodes[checkIndex] !== committedNodes[liveIndex]) {
                checkIndex++;
              }
              insertBefore(
                liveNodes.slice(liveIndex, checkIndex),
                liveIndex
              );
              liveIndex = checkIndex;
              continue;
            }
            liveIndex++;
          }
        }
        if (phase === 4 /* COMMIT_MOUNT */ && refProp) {
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
        committedNodes = [];
        liveNodes = [];
        liveNodeSet = /* @__PURE__ */ new Set();
        deadNodeSet = /* @__PURE__ */ new Set();
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
function classComponentToFunctionComponentRenderNode(Component, props, children) {
  return ComponentRenderNode(
    (props2, lifecycle) => {
      const instance = new Component(props2);
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
    },
    props,
    children
  );
}
function createElement(type, props, ...children) {
  if (typeof type === "string") {
    return IntrinsicRenderNode(
      type,
      props,
      ArrayRenderNode(renderJSXChildren(children))
    );
  }
  if (isClassComponent(type)) {
    return classComponentToFunctionComponentRenderNode(
      type,
      props,
      children
    );
  }
  return ComponentRenderNode(
    type,
    props,
    children
  );
}
createElement.Fragment = Fragment;

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
            4 /* COMMIT_MOUNT */
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
            4 /* COMMIT_MOUNT */
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
            4 /* COMMIT_MOUNT */
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
            4 /* COMMIT_MOUNT */
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
          case 4 /* COMMIT_MOUNT */:
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
        untrackReads(() => {
          renderNode.spliceChildren(
            0,
            0,
            collection2.map((item) => renderJSXNode2(item))
          );
        });
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
    return true;
  }
  map(fn) {
    return calc(() => fn(this.get()));
  }
};
function field(val, debugName) {
  return new Field(val, debugName);
}

// src/model/fieldmap.ts
var FieldMap = class {
  constructor(keysField, consumer, emitter, debugName) {
    this.__refcount = 0;
    this.__debugName = debugName ?? "fieldmap";
    this.keysField = keysField;
    this.fieldMap = /* @__PURE__ */ new Map();
    this.consumer = consumer;
    this.emitter = emitter;
  }
  getOrMake(key, val) {
    let field2 = this.fieldMap.get(key);
    if (!field2) {
      field2 = new Field(val, `${this.__debugName}:${key}`);
      this.fieldMap.set(key, field2);
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
  set(key, val) {
    const field2 = this.getOrMake(key, void 0);
    field2.set(val);
  }
  delete(key) {
    const field2 = this.fieldMap.get(key);
    if (field2) {
      field2.set(void 0);
      this.fieldMap.delete(key);
      if (this.__refcount > 0) {
        if (this.emitter)
          removeSoftEdge(field2, this.emitter);
        if (this.consumer)
          removeSoftEdge(this.consumer, field2);
        release(field2);
      }
    }
  }
  keys() {
    notifyRead(this.keysField);
    return this.fieldMap.keys();
  }
  values() {
    notifyRead(this.keysField);
    return this.fieldMap.values();
  }
  entries() {
    notifyRead(this.keysField);
    return this.fieldMap.entries();
  }
  clear() {
    const keys = [...this.fieldMap.keys()];
    keys.forEach((key) => {
      this.delete(key);
    });
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

// src/model/subscriptionconsumer.ts
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

// src/model/subscriptionemitter.ts
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
    assert(
      this.subscribers.length === 0,
      "released subscription emitter that had subscribers"
    );
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
      const index = this.subscribers.findIndex(
        (subscriber) => subscriber.handler === handler
      );
      if (index === -1)
        return;
      this.subscribers.splice(index, 1);
    };
  }
};

// src/model/trackeddata.ts
var TrackedDataHandle = class {
  constructor(target, proxyHandler, methods, derivedEmitter, handleEvents, appendEmitEvent, appendConsumeEvent, debugName = "trackeddata") {
    this.target = target;
    this.methods = methods;
    this.emitter = new SubscriptionEmitter(
      appendEmitEvent,
      debugName
    );
    if (derivedEmitter && handleEvents) {
      this.consumer = new SubscriptionConsumer(
        target,
        derivedEmitter,
        this.emitter,
        handleEvents,
        appendConsumeEvent,
        debugName
      );
    } else {
      this.consumer = null;
    }
    this.keys = new Set(Object.keys(target));
    this.keysField = new Field(this.keys.size, `${debugName}:@keys`);
    this.fieldMap = new FieldMap(
      this.keysField,
      this.consumer,
      this.emitter,
      debugName
    );
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
        if (prop === "__refcount" || prop === "__alive" || prop === "__dead" || prop === "__renderNode") {
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
      set: (target2, prop, value, receiver) => proxyHandler.set(
        this.dataAccessor,
        emitEvent,
        prop,
        value,
        receiver
      ),
      deleteProperty: (target2, prop) => proxyHandler.delete(this.dataAccessor, emitEvent, prop),
      ownKeys: () => {
        const keys = this.keys;
        this.keysField.get();
        return [...keys];
      }
    });
  }
};
function getTrackedDataHandle(trackedData) {
  return trackedData.__tdHandle;
}

// src/model/collection.ts
function makeCollectionPrototype() {
  return {
    _type: "collection",
    // Array mutation values
    splice: collectionSplice,
    push: collectionPush,
    pop: collectionPop,
    shift: collectionShift,
    unshift: collectionUnshift,
    sort: collectionSort,
    reverse: collectionReverse,
    // Handy API values
    reject: collectionReject,
    moveSlice: collectionMoveSlice,
    // View production
    mapView,
    filterView,
    flatMapView,
    subscribe: collectionSubscribe,
    // Retainable
    __refcount: 0,
    __alive: collectionAlive,
    __dead: collectionDead,
    __debugName: "collection",
    // JSXRenderable
    __renderNode: collectionRender
  };
}
function makeViewPrototype(sourceCollection) {
  return {
    _type: "view",
    // Array mutation values
    splice: viewSplice,
    push: viewPush,
    pop: viewPop,
    shift: viewShift,
    unshift: viewUnshift,
    sort: viewSort,
    reverse: viewReverse,
    // View production
    mapView,
    filterView,
    flatMapView,
    subscribe: collectionSubscribe,
    // Retainable
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
    __debugName: "collection",
    // JSXRenderable
    __renderNode: collectionRender
  };
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
  const handle = new TrackedDataHandle(
    items,
    CollectionHandler,
    makeCollectionPrototype(),
    null,
    null,
    addArrayEvent,
    addArrayEvent,
    debugName
  );
  return handle.revocable.proxy;
}
function viewSplice(index, count, ...items) {
  fail("Cannot mutate readonly view");
}
function spliceInner(tdHandle, index, count, ...items) {
  const startLength = tdHandle.target.length;
  const removed = Array.prototype.splice.call(
    tdHandle.target,
    index,
    count,
    ...items
  );
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
  retain(this);
  retain(tdHandle.emitter);
  const unsubscribe = tdHandle.emitter.subscribe((events) => {
    handler(events);
  });
  return () => {
    unsubscribe();
    release(tdHandle.emitter);
    release(this);
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
  return makeFlatMapView(
    this,
    (item) => fn(item) ? [item] : [],
    debugName
  );
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
  const derivedCollection = new TrackedDataHandle(
    initialTransform,
    ViewHandler,
    makeViewPrototype(sourceCollection),
    sourceTDHandle.emitter,
    function* (target, events) {
      for (const event of events) {
        const lengthStart = initialTransform.length;
        yield* arrayEventFlatMap(
          slotSizes,
          flatMap,
          initialTransform,
          event
        );
        switch (event.type) {
          case "splice" /* SPLICE */: {
            const lengthEnd = initialTransform.length;
            if (lengthStart === lengthEnd) {
              for (let i = event.index; i < event.index + event.count; ++i) {
                derivedCollection.fieldMap.set(
                  i.toString(),
                  initialTransform[i]
                );
              }
            } else {
              for (let i = event.index; i < lengthEnd; ++i) {
                derivedCollection.fieldMap.set(
                  i.toString(),
                  initialTransform[i]
                );
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
            const upperBound = Math.max(
              event.from + event.count,
              event.to + event.count
            );
            for (let i = lowerBound; i < upperBound; ++i) {
              derivedCollection.fieldMap.set(
                i.toString(),
                initialTransform[i]
              );
            }
            break;
          }
          case "sort" /* SORT */:
            for (let i = event.from; i < event.from + event.indexes.length; ++i) {
              derivedCollection.fieldMap.set(
                i.toString(),
                initialTransform[i]
              );
            }
            break;
        }
      }
    },
    addArrayEvent,
    addArrayEvent,
    debugName ?? "derived"
  );
  return derivedCollection.revocable.proxy;
}
function collectionRender(renderJSXNode2) {
  return CollectionRenderNode(renderJSXNode2, this, this.__debugName);
}

// src/model/dict.ts
var DictEventType = /* @__PURE__ */ ((DictEventType2) => {
  DictEventType2["ADD"] = "add";
  DictEventType2["SET"] = "set";
  DictEventType2["DEL"] = "del";
  return DictEventType2;
})(DictEventType || {});
function addDictEvent(events, event) {
  events.push(event);
}
var Dict = class {
  constructor(entries = [], debugName) {
    this.ownKeys = /* @__PURE__ */ new Set();
    this.keysField = new Field(entries.length);
    this.emitter = new SubscriptionEmitter(
      addDictEvent,
      debugName ?? "map"
    );
    this.fieldMap = new FieldMap(
      this.keysField,
      null,
      this.emitter,
      debugName
    );
    for (const [key, value] of entries) {
      this.ownKeys.add(key);
      this.fieldMap.getOrMake(key, value);
    }
    this.__refcount = 0;
    this.__debugName = debugName || "map";
  }
  // Map interface
  clear() {
    this.fieldMap.clear();
    this.ownKeys.forEach((key) => {
      this.emitter.addEvent({
        type: "del" /* DEL */,
        prop: key
      });
    });
    this.ownKeys.clear();
    this.keysField.set(this.ownKeys.size);
  }
  delete(key) {
    this.fieldMap.delete(key);
    if (this.ownKeys.has(key)) {
      this.ownKeys.delete(key);
      this.emitter.addEvent({
        type: "del" /* DEL */,
        prop: key
      });
      this.keysField.set(this.ownKeys.size);
    }
  }
  forEach(fn) {
    for (const [key, value] of this.fieldMap.entries()) {
      fn(value.get(), key);
    }
  }
  get(key) {
    const field2 = this.fieldMap.getOrMake(key, Sentinel);
    const value = field2.get();
    if (value === Sentinel)
      return void 0;
    return value;
  }
  has(key) {
    const field2 = this.fieldMap.getOrMake(key, Sentinel);
    const value = field2.get();
    if (value === Sentinel)
      return false;
    return true;
  }
  set(key, value) {
    this.fieldMap.set(key, value);
    if (this.ownKeys.has(key)) {
      this.emitter.addEvent({
        type: "set" /* SET */,
        prop: key,
        value
      });
    } else {
      this.ownKeys.add(key);
      this.emitter.addEvent({
        type: "add" /* ADD */,
        prop: key,
        value
      });
      this.keysField.set(this.ownKeys.size);
    }
    return this;
  }
  entries(debugName) {
    const initialEntries = [...this.fieldMap.entries()];
    const derivedCollection = new TrackedDataHandle(
      initialEntries,
      ViewHandler,
      makeViewPrototype(this),
      this.emitter,
      function* keysHandler(target, events) {
        const addEvent = (prop, value) => {
          const length = target.length;
          target.push([prop, value]);
          derivedCollection.fieldMap.set(length.toString(), prop);
          derivedCollection.fieldMap.set("length", target.length);
          return {
            type: "splice" /* SPLICE */,
            index: length,
            count: 0,
            items: [[prop, value]]
          };
        };
        for (const event of events) {
          switch (event.type) {
            case "del" /* DEL */: {
              const index = target.findIndex(
                (item) => item[0] === event.prop
              );
              if (index !== -1) {
                const prevLength = target.length;
                target.splice(index, 1);
                const newLength = target.length;
                for (let i = index; i < target.length; ++i) {
                  derivedCollection.fieldMap.set(
                    i.toString(),
                    target[i]
                  );
                }
                for (let i = newLength; i < prevLength; ++i) {
                  derivedCollection.fieldMap.delete(
                    i.toString()
                  );
                }
                derivedCollection.fieldMap.set(
                  "length",
                  target.length
                );
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
              yield addEvent(event.prop, event.value);
              break;
            }
            case "set" /* SET */: {
              const index = target.findIndex(
                (item) => item[0] === event.prop
              );
              if (index === -1) {
                yield addEvent(event.prop, event.value);
              } else {
                const entry = [event.prop, event.value];
                target.splice(index, 1, entry);
                yield {
                  type: "splice" /* SPLICE */,
                  index,
                  count: 1,
                  items: [entry]
                };
              }
              break;
            }
            default:
              assertExhausted(event);
          }
        }
      },
      addArrayEvent,
      addDictEvent,
      debugName
    );
    return derivedCollection.revocable.proxy;
  }
  keys(debugName) {
    return this.entries(debugName).mapView(([key, value]) => key);
  }
  values(debugName) {
    return this.entries(debugName).mapView(([key, value]) => value);
  }
  subscribe(handler) {
    retain(this.fieldMap);
    const unsubscribe = this.emitter.subscribe((events) => {
      handler(events);
    });
    return () => {
      unsubscribe();
      release(this.fieldMap);
    };
  }
  field(key) {
    return this.fieldMap.getOrMake(key, void 0);
  }
  __alive() {
    retain(this.fieldMap);
  }
  __dead() {
    retain(this.emitter);
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
function addModelEvent(events, event) {
  events.push(event);
}
function getModelHandle(model2) {
  return model2.__handle;
}
function model(target, debugName) {
  const keysField = new Field(Object.keys(target).length);
  const emitter = new SubscriptionEmitter(
    addModelEvent,
    debugName ?? "model"
  );
  const fieldMap = new FieldMap(keysField, null, emitter, debugName);
  const modelHandle = {
    target,
    emitter,
    fieldMap
  };
  const modelObj = { ...target };
  Object.keys(target).forEach((key) => {
    Object.defineProperty(modelObj, key, {
      get: () => {
        return fieldMap.getOrMake(key, target[key]).get();
      },
      set: (newValue) => {
        fieldMap.getOrMake(key, newValue).set(newValue);
        emitter.addEvent({
          type: "set" /* SET */,
          prop: key,
          value: newValue
        });
      }
    });
  });
  Object.defineProperty(modelObj, "__handle", { get: () => modelHandle });
  return modelObj;
}
model.subscribe = function modelSubscribe(sourceModel, handler, debugName) {
  const modelHandle = getModelHandle(sourceModel);
  assert(modelHandle, "missing model __handle");
  retain(modelHandle.emitter);
  retain(modelHandle.fieldMap);
  const unsubscribe = modelHandle.emitter.subscribe((events) => {
    handler(events);
  });
  return () => {
    unsubscribe();
    release(modelHandle.emitter);
    release(modelHandle.fieldMap);
  };
};
model.field = function modelField(sourceModel, field2) {
  const modelHandle = getModelHandle(sourceModel);
  assert(modelHandle, "missing model __handle");
  return modelHandle.fieldMap.getOrMake(
    field2,
    modelHandle.target[field2]
  );
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
        renderNode.requestCommit(4 /* COMMIT_MOUNT */);
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
        if (phase === 4 /* COMMIT_MOUNT */ && onMountCallbacks) {
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
  children.push(node);
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
var VERSION = true ? "0.19.1" : "development";
export {
  ArrayEventType,
  ClassComponent,
  CycleError,
  Dict,
  DictEventType,
  Fragment2 as Fragment,
  IntrinsicObserver,
  IntrinsicObserverEventType,
  InvariantError,
  ModelEventType,
  VERSION,
  applyArrayEvent,
  calc,
  collection,
  createElement,
  debug2 as debug,
  debugGetGraph,
  debugSubscribe,
  src_default as default,
  defineCustomElement,
  dict,
  dynGet,
  dynSet,
  dynSubscribe,
  field,
  flush,
  getLogLevel,
  isDynamic,
  isDynamicMut,
  model,
  mount,
  ref,
  reset,
  setLogLevel,
  subscribe
};
//# sourceMappingURL=index.debug.mjs.map
