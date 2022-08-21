import * as log from './log';
import {
    Retainable,
    retain,
    release,
    trackCreates,
    untrackReads,
    afterFlush,
    pumpFlush,
} from './engine';
import { SymDebugName, SymRefcount, SymAlive, SymDead } from './symbols';
import { Ref, RefObject } from './ref';
import { JSXNode, setAttribute, assignProp } from './jsx';
import {
    ArrayEvent,
    ArrayEventType,
    shiftEvent,
    applyArrayEvent,
} from './arrayevent';
import {
    isCalculation,
    isCalcUnsubscribe,
    Calculation,
    CalculationErrorType,
} from './calc';
import { isCollection, isView, Collection, View } from './collection';
import { noop, noopGenerator, wrapError } from './util';

export interface ComponentLifecycle {
    onMount: (callback: () => void) => (() => void) | void;
    onUnmount: (callback: () => void) => void;
    onDestroy: (callback: () => void) => void;
    onError: (handler: (e: Error) => JSX.Element | null) => void;
    getContext: <TContext>(
        context: Context<TContext>,
        handler?: ((val: TContext) => void) | undefined
    ) => TContext;
}

// NOTE: UnusedSymbolForChildrenOmission is present solely for the typechecker to not allow assignment of { children?: JSXNode | JSXNode[] } to TProps if TProps is {}
// Which allows components to flag type errors when they do not specify a `children` prop, but children are given
declare const UnusedSymbolForChildrenOmission: unique symbol;
export type Component<TProps = {}> = (
    props: TProps & { [UnusedSymbolForChildrenOmission]?: boolean },
    lifecycle: ComponentLifecycle
) => JSX.Element | null;

export type NodeEmitter = (event: ArrayEvent<Node> | Error) => void;

const ContextType = Symbol('context');

export interface Context<T>
    extends Component<{ value: T; children?: JSX.Node | JSX.Node[] }> {
    _type: typeof ContextType;
    _get: () => T;
}

export function createContext<T>(val: T): Context<T> {
    const contextBody = {
        _type: ContextType,
        _get: () => val,
    } as const;
    const context: Context<T> = Object.assign(
        ({
            value,
            children,
        }: {
            value: T;
            children?: JSX.Node | JSX.Node[];
        }) => {
            return new ContextRenderNode<T>(
                context,
                value,
                renderJSXChildren(children)
            );
        },
        contextBody
    );
    return context;
}

export type ContextMap = Map<Context<any>, any>;

function readContext<T>(contextMap: ContextMap, context: Context<T>): T {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    if (contextMap.has(context)) return contextMap.get(context)!;
    return context._get();
}

export const RenderNodeType = Symbol('rendernode');

export interface RenderNode extends Retainable {
    _type: typeof RenderNodeType;
    detach(): void;
    attach(emitter: NodeEmitter, context: ContextMap): void;
    onMount(): void;
    onUnmount(): void;
    retain(): void;
    release(): void;
}

/**
 * Renders nothing
 */
export class EmptyRenderNode implements RenderNode {
    _type: typeof RenderNodeType = RenderNodeType;
    constructor() {
        this[SymDebugName] = 'empty';
        this[SymRefcount] = 0;
    }

    detach = noopGenerator;
    attach = noop;
    onMount = noop;
    onUnmount = noop;
    retain() {
        retain(this);
    }
    release() {
        release(this);
    }

    // Retainable
    [SymDebugName]: string;
    [SymRefcount]: number;
    [SymAlive] = noop;
    [SymDead] = noop;
}

/**
 * Only need one of nothing
 */
export const emptyRenderNode = new EmptyRenderNode();

/**
 * Renders a Text DOM node
 */
export class TextRenderNode implements RenderNode {
    _type: typeof RenderNodeType = RenderNodeType;
    private text: Text;
    private emitter: NodeEmitter | null;

    constructor(string: string, debugName?: string) {
        this.text = document.createTextNode(string);
        this.emitter = null;

        this[SymDebugName] = debugName ?? 'text';
        this[SymRefcount] = 0;
    }

    detach() {
        this.emitter?.({ type: ArrayEventType.SPLICE, index: 0, count: 1 });
        this.emitter = null;
    }

    attach(emitter: NodeEmitter, context: ContextMap) {
        log.assert(!this.emitter, 'Invariant: Text node double attached');
        this.emitter = emitter;
        this.emitter?.({
            type: ArrayEventType.SPLICE,
            index: 0,
            count: 0,
            items: [this.text],
        });
    }

    onMount = noop;
    onUnmount = noop;
    retain() {
        retain(this);
    }
    release() {
        release(this);
    }

    // Retainable
    [SymDebugName]: string;
    [SymRefcount]: number;
    [SymAlive] = noop;
    [SymDead]() {
        this.emitter = null;
    }
}

/**
 * Renders a foreign managed DOM node
 */
export class ForeignRenderNode implements RenderNode {
    _type: typeof RenderNodeType = RenderNodeType;
    private node: Node;
    private emitter: NodeEmitter | null;

    constructor(node: Node, debugName?: string) {
        this.node = node;
        this.emitter = null;

        this[SymDebugName] = debugName ?? 'foreign';
        this[SymRefcount] = 0;
    }

    detach() {
        this.emitter?.({ type: ArrayEventType.SPLICE, index: 0, count: 1 });
        this.emitter = null;
    }

    attach(emitter: NodeEmitter, context: ContextMap) {
        log.assert(!this.emitter, 'Invariant: Foreign node double attached');
        this.emitter = emitter;
        this.emitter?.({
            type: ArrayEventType.SPLICE,
            index: 0,
            count: 0,
            items: [this.node],
        });
    }

    onMount = noop;
    onUnmount = noop;
    retain() {
        retain(this);
    }
    release() {
        release(this);
    }

    // Retainable
    [SymDebugName]: string;
    [SymRefcount]: number;
    [SymAlive] = noop;
    [SymDead]() {
        this.emitter = null;
    }
}

/**
 * Renders an array of render nodes
 */
export class ArrayRenderNode implements RenderNode {
    _type: typeof RenderNodeType = RenderNodeType;
    private children: RenderNode[];
    private slotSizes: number[];
    private attached: boolean[];
    private emitter: NodeEmitter | null;

    constructor(children: RenderNode[], debugName?: string) {
        this.children = children;
        this.slotSizes = children.map(() => 0);
        this.attached = children.map(() => false);
        this.emitter = null;

        this[SymDebugName] = debugName ?? 'array';
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

    attach(emitter: NodeEmitter, context: ContextMap) {
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

    // Retainable
    [SymDebugName]: string;
    [SymRefcount]: number;
    [SymAlive]() {
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
}

const HTML_NAMESPACE = 'http://www.w3.org/1999/xhtml';
const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';
const MATHML_NAMESPACE = 'http://www.w3.org/1998/Math/MathML';

const elementNamespaceTransitionMap: Record<
    string,
    Record<string, { node: string; children: string } | undefined> | undefined
> = {
    [HTML_NAMESPACE]: {
        svg: {
            node: SVG_NAMESPACE,
            children: SVG_NAMESPACE,
        },
        math: {
            node: MATHML_NAMESPACE,
            children: MATHML_NAMESPACE,
        },
    },
    [SVG_NAMESPACE]: {
        foreignObject: {
            node: SVG_NAMESPACE,
            children: HTML_NAMESPACE,
        },
    },
} as const;

const XmlNamespaceContext = createContext(HTML_NAMESPACE);

/**
 * If an intrinsic element is detached when it has focused, this holds a reference to the element.
 * While any nodes are mounted, we observe the document for focus change events. If focus is moved to anything inside the body, we clear this reference.
 * If an intrinsic element is attached and its element matches this reference, it steals focus.
 */
let previousFocusedDetachedElement: Element | null = null;

const EventProps = [
    { prefix: 'on:', param: false },
    { prefix: 'oncapture:', param: true },
    { prefix: 'onpassive:', param: { passive: true } },
] as const;

/**
 * Renders an intrinsic DOM node
 */
export class IntrinsicRenderNode implements RenderNode {
    _type: typeof RenderNodeType = RenderNodeType;
    private tagName: string;
    private element: Element | null;
    private emitter: NodeEmitter | null;
    private xmlNamespace: string | null;
    private childXmlNamespace: string | null;
    private props: Record<string, any> | undefined;
    private children: ArrayRenderNode;
    private portalRenderNode: PortalRenderNode | null;
    private calculations?: Map<string, Calculation<any>>;
    private calculationSubscriptions?: Set<() => void>;

    constructor(
        tagName: string,
        props: Record<string, any> | undefined,
        children: RenderNode[],
        debugName?: string
    ) {
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

    private createElement(xmlNamespace: string) {
        const element = document.createElementNS(xmlNamespace, this.tagName);
        if (this.props) {
            for (const [prop, val] of Object.entries(this.props)) {
                if (prop === 'ref') continue; // specially handled by PortalRenderNode
                if (
                    EventProps.some(({ prefix, param }) => {
                        if (prop.startsWith(prefix)) {
                            element.addEventListener(
                                prop.slice(prefix.length),
                                (e) => {
                                    try {
                                        val(e, element);
                                    } finally {
                                        pumpFlush();
                                    }
                                },
                                param
                            );
                            return true;
                        }
                        return false;
                    })
                ) {
                    continue;
                }
                if (isCalcUnsubscribe(val) || isCalculation(val)) {
                    if (!this.calculations) {
                        this.calculations = new Map();
                    }
                    this.calculations.set(
                        prop,
                        isCalculation(val) ? val : val.calculation
                    );
                } else {
                    this.setProp(element, prop, val);
                }
            }
            if (this.calculations) {
                if (!this.calculationSubscriptions) {
                    this.calculationSubscriptions = new Set();
                }
                for (const [prop, calculation] of this.calculations.entries()) {
                    retain(calculation);
                    const currentVal = calculation();
                    this.setProp(element, prop, currentVal);
                    this.calculationSubscriptions.add(
                        calculation.onRecalc((error, updatedVal) => {
                            if (error) {
                                log.error('Unhandled error in bound prop', {
                                    prop,
                                    element,
                                    error: updatedVal,
                                });
                            } else {
                                this.setProp(element, prop, updatedVal);
                            }
                        })
                    );
                }
            }
        }
        return element;
    }

    private setProp(element: Element, prop: string, val: unknown) {
        if (prop.startsWith('prop:')) {
            const propName = prop.slice(5);
            (element as any)[propName] = val;
            return;
        }

        if (prop.startsWith('attr:')) {
            const attrName = prop.slice(5);
            setAttribute(element, attrName, val);
            return;
        }

        assignProp(element, prop, val);
    }

    private handleEvent = (event: ArrayEvent<Node> | Error) => {
        if (event instanceof Error) {
            this.emitter?.(event);
            return;
        }
        log.assert(false, 'unexpected event from PortalRenderNode');
    };

    detach() {
        this.emitter?.({
            type: ArrayEventType.SPLICE,
            index: 0,
            count: 1,
        });
        this.emitter = null;
    }

    attach(emitter: NodeEmitter, context: ContextMap) {
        log.assert(!this.emitter, 'Invariant: Intrinsic node double attached');
        this.emitter = emitter;

        const parentXmlNamespace = readContext(context, XmlNamespaceContext);
        const namespaceTransition =
            elementNamespaceTransitionMap[parentXmlNamespace]?.[this.tagName];
        const xmlNamespace = namespaceTransition?.node ?? parentXmlNamespace;
        const childXmlNamespace =
            namespaceTransition?.children ?? parentXmlNamespace;
        if (!this.element || xmlNamespace !== this.xmlNamespace) {
            this.xmlNamespace = xmlNamespace;
            this.element = this.createElement(xmlNamespace);

            if (this.portalRenderNode) {
                this.portalRenderNode.detach();
                release(this.portalRenderNode);
            }
            this.portalRenderNode = new PortalRenderNode(
                this.element,
                this.children,
                this.props?.ref
            );
            retain(this.portalRenderNode);

            let subContext = context;
            if (parentXmlNamespace !== childXmlNamespace) {
                subContext = new Map(context);
                subContext.set(XmlNamespaceContext, childXmlNamespace);
            }
            this.portalRenderNode.attach(this.handleEvent, subContext);
        }

        this.emitter?.({
            type: ArrayEventType.SPLICE,
            index: 0,
            count: 0,
            items: [this.element],
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

    // Retainable
    [SymDebugName]: string;
    [SymRefcount]: number;
    [SymAlive]() {
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
}

export class PortalRenderNode implements RenderNode {
    _type: typeof RenderNodeType = RenderNodeType;
    private tagName: string;
    private element: Element;
    private refProp: Ref<Element> | null;
    private emitter: NodeEmitter | null;
    private xmlNamespace: string | null;
    private childXmlNamespace: string | null;
    private existingOffset: number;
    private arrayRenderNode: ArrayRenderNode;
    private calculations?: Map<string, Calculation<any>>;
    private calculationSubscriptions?: Set<() => void>;

    constructor(
        element: Element,
        children: ArrayRenderNode,
        refProp: Ref<Element> | null,
        debugName?: string
    ) {
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

    private handleEvent = (event: ArrayEvent<Node> | Error) => {
        if (event instanceof Error) {
            this.emitter?.(event);
            return;
        }
        log.assert(this.element, 'missing element');
        switch (event.type) {
            case ArrayEventType.SPLICE: {
                for (let i = 0; i < event.count; ++i) {
                    this.element.removeChild(
                        this.element.childNodes[
                            this.existingOffset + event.index
                        ]
                    );
                }
                const referenceNode =
                    event.index < this.element.childNodes.length
                        ? this.element.childNodes[
                              this.existingOffset + event.index
                          ]
                        : null;
                if (event.items) {
                    for (let i = event.items.length - 1; i >= 0; --i) {
                        this.element.insertBefore(
                            event.items[i],
                            referenceNode
                        );
                    }
                }
                break;
            }
            case ArrayEventType.MOVE: {
                const toMove: Node[] = [];
                for (let i = 0; i < event.count; ++i) {
                    const node =
                        this.element.childNodes[
                            this.existingOffset + event.from
                        ];
                    this.element.removeChild(node);
                    toMove.push(node);
                }
                const referenceNode =
                    event.to < this.element.childNodes.length
                        ? this.element.childNodes[
                              this.existingOffset + event.to
                          ]
                        : null;
                for (const node of toMove) {
                    this.element.insertBefore(node, referenceNode);
                }
                break;
            }
            case ArrayEventType.SORT: {
                const unsorted: Node[] = [];
                for (let i = 0; i < event.indexes.length; ++i) {
                    const node =
                        this.element.childNodes[
                            this.existingOffset + event.from
                        ];
                    this.element.removeChild(node);
                    unsorted.push(node);
                }
                const referenceNode =
                    event.from < this.element.childNodes.length
                        ? this.element.childNodes[
                              this.existingOffset + event.from
                          ]
                        : null;
                for (const index of event.indexes) {
                    this.element.insertBefore(
                        unsorted[index - event.from],
                        referenceNode
                    );
                }
                break;
            }
            default:
                log.assertExhausted(event);
        }
    };

    detach() {
        this.emitter = null;
        this.arrayRenderNode.detach();
    }

    attach(emitter: NodeEmitter, contextMap: ContextMap) {
        log.assert(!this.emitter, 'Invariant: Intrinsic node double attached');
        this.emitter = emitter;
        this.arrayRenderNode.attach(this.handleEvent, contextMap);
    }

    onMount() {
        this.arrayRenderNode.onMount();
        if (this.refProp) {
            if (this.refProp instanceof RefObject) {
                this.refProp.current = this.element;
            } else if (typeof this.refProp === 'function') {
                this.refProp(this.element);
            }
        }
        if (
            this.element &&
            (this.element as any).focus &&
            previousFocusedDetachedElement === this.element
        ) {
            (this.element as any).focus();
        }
    }

    onUnmount() {
        if (this.element && document.activeElement === this.element) {
            previousFocusedDetachedElement = this.element;
        }
        if (this.refProp) {
            if (this.refProp instanceof RefObject) {
                this.refProp.current = undefined;
            } else if (typeof this.refProp === 'function') {
                this.refProp(undefined);
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

    // Retainable
    [SymDebugName]: string;
    [SymRefcount]: number;
    [SymAlive]() {
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
}

/**
 * Renders the result of a calculation
 */
export class CalculationRenderNode implements RenderNode {
    _type: typeof RenderNodeType = RenderNodeType;
    private error: Error | null;
    private renderNode: RenderNode | null;
    private calculation: Calculation<any>;
    private calculationSubscription: (() => void) | null;
    private context: ContextMap | null;
    private isMounted: boolean;
    private emitter: NodeEmitter | null;

    constructor(calculation: Calculation<any>, debugName?: string) {
        this.calculation = calculation;
        this.calculationSubscription = null;
        this.error = null;
        this.renderNode = null;
        this.context = null;
        this.isMounted = false;
        this.emitter = null;

        this[SymDebugName] =
            debugName ?? `rendercalc:${calculation[SymDebugName]}`;
        this[SymRefcount] = 0;

        this.onRecalc = this.onRecalc.bind(this);
    }

    detach() {
        this.renderNode?.detach();
        this.context = null;
        this.emitter = null;
    }

    attach(emitter: NodeEmitter, context: ContextMap) {
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

    onRecalc(errorType: undefined, val: any): void;
    onRecalc(errorType: CalculationErrorType, val: Error): void;
    onRecalc(
        errorType: CalculationErrorType | undefined,
        val: Error | any
    ): void {
        this.cleanPrior();
        if (errorType) {
            this.error = val;
            this.emitter?.(val);
        } else {
            const renderNode = renderJSXNode(val);
            retain(renderNode);
            afterFlush(() => {
                this.cleanPrior(); // it's possible the calculation is notified multiple times in a flush; only care about the last one
                this.renderNode = renderNode;
                if (this.emitter) {
                    // context guaranteed to exist
                    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                    renderNode.attach(this.emitter, this.context!);
                }
                if (this.isMounted) {
                    renderNode.onMount();
                }
            });
        }
    }

    // Retainable
    [SymDebugName]: string;
    [SymRefcount]: number;
    [SymAlive]() {
        retain(this.calculation);
        try {
            this.onRecalc(undefined, this.calculation());
            this.calculationSubscription = this.calculation.onRecalc(
                this.onRecalc
            );
        } catch (e) {
            this.onRecalc(CalculationErrorType.EXCEPTION, wrapError(e));
        }
    }
    [SymDead]() {
        release(this.calculation);
        this.cleanPrior();
        this.emitter = null;
    }
}

export class CollectionRenderNode implements RenderNode {
    _type: typeof RenderNodeType = RenderNodeType;
    private children: RenderNode[];
    private childIndex: Map<RenderNode, number>;
    private slotSizes: number[];
    private collection: Collection<any> | View<any>;
    private unsubscribe?: () => void;
    private context: ContextMap | null;
    private isMounted: boolean;
    private emitter: NodeEmitter | null;

    constructor(collection: Collection<any> | View<any>, debugName?: string) {
        this.collection = collection;
        this.children = [];
        this.childIndex = new Map();
        this.slotSizes = [];
        this.context = null;
        this.isMounted = false;
        this.emitter = null;

        this[SymDebugName] = debugName ?? `rendercoll`;
        this[SymRefcount] = 0;
    }

    attach(emitter: NodeEmitter, context: ContextMap) {
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

    handleChildEvent(event: ArrayEvent<Node> | Error, child: RenderNode) {
        if (this.emitter) {
            if (!(event instanceof Error)) {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                const index = this.childIndex.get(child)!;
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

    private releaseChild(child: RenderNode) {
        if (this.emitter && this.context) {
            if (this.isMounted) {
                child.onUnmount();
            }
            child.detach();
        }
        release(child);
    }
    private retainChild(child: RenderNode) {
        retain(child);
        if (this.emitter && this.context) {
            child.attach(
                (event) => this.handleChildEvent(event, child),
                this.context
            );
            if (this.isMounted) {
                child.onUnmount();
            }
        }
    }

    private handleCollectionEvent = (events: ArrayEvent<any>[]) => {
        for (const event of events) {
            switch (event.type) {
                case ArrayEventType.SPLICE: {
                    const newChildren: RenderNode[] = [];
                    if (event.items) {
                        for (const [index, item] of event.items.entries()) {
                            const child = renderJSXNode(item);
                            newChildren.push(child);
                            this.childIndex.set(child, event.index + index);
                        }
                    }
                    const removed = this.children.splice(
                        event.index,
                        event.count,
                        ...newChildren
                    );
                    for (const child of removed) {
                        this.releaseChild(child);
                        this.childIndex.delete(child);
                    }
                    this.slotSizes.splice(
                        event.index,
                        event.count,
                        ...newChildren.map(() => 0)
                    );
                    if (newChildren.length !== event.count) {
                        for (
                            let i = event.index + newChildren.length;
                            i < this.children.length;
                            ++i
                        ) {
                            this.childIndex.set(this.children[i], i);
                        }
                    }
                    for (const child of newChildren) {
                        this.retainChild(child);
                    }
                    break;
                }
                case ArrayEventType.MOVE: {
                    // Get adjusted data for event
                    const slotStartIndex: number[] = [];
                    let realIndex = 0;
                    for (const slotSize of this.slotSizes) {
                        slotStartIndex.push(realIndex);
                        realIndex += slotSize;
                    }
                    let realCount = 0;
                    for (let i = 0; i < event.count; ++i) {
                        realCount += this.slotSizes[event.from + i];
                    }

                    // Move slots
                    applyArrayEvent(this.slotSizes, event);

                    // Update and emit event
                    event.from = slotStartIndex[event.from];
                    event.count = realCount;
                    event.to = slotStartIndex[event.to];
                    this.emitter?.(event);
                    break;
                }
                case ArrayEventType.SORT: {
                    // Get adjusted data for event
                    let realFrom = 0;
                    for (let i = 0; i < event.from; ++i) {
                        realFrom += this.slotSizes[i];
                    }
                    const nestedIndexes: number[][] = [];
                    let index = 0;
                    for (let i = 0; i < this.slotSizes.length; ++i) {
                        const slotIndexes: number[] = [];
                        for (let j = 0; j < this.slotSizes[i]; ++j) {
                            slotIndexes.push(index);
                            index += 1;
                        }
                        nestedIndexes.push(slotIndexes);
                    }

                    // Sort slots
                    applyArrayEvent(this.slotSizes, event);
                    // Sort nested indexes
                    applyArrayEvent(nestedIndexes, event);

                    // Update and emit event
                    const sortedIndexes = nestedIndexes
                        .slice(event.from)
                        .flat();
                    event.from = realFrom;
                    event.indexes = sortedIndexes;
                    this.emitter?.(event);
                    break;
                }
            }
        }
    };

    // Retainable
    [SymDebugName]: string;
    [SymRefcount]: number;
    [SymAlive]() {
        retain(this.collection);
        this.unsubscribe = this.collection.subscribe(
            this.handleCollectionEvent
        );

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
}

function isCalculationRenderNode(val: any): val is Calculation<JSXNode> {
    return isCalculation(val);
}

function isCollectionOrViewRenderNode(
    val: any
): val is Collection<JSXNode> | View<JSXNode> {
    return isCollection(val) || isView(val);
}

function isRenderNode(val: any): val is RenderNode {
    return val && val._type === RenderNodeType;
}

export function renderJSXNode(jsxNode: JSX.Node): RenderNode {
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
    if (
        jsxNode === null ||
        jsxNode === undefined ||
        typeof jsxNode === 'boolean'
    ) {
        return emptyRenderNode;
    }
    if (typeof jsxNode === 'function') {
        log.warn('Rendering a function as JSX renders to nothing');
        return emptyRenderNode;
    }
    if (typeof jsxNode === 'symbol') {
        log.warn('Rendering a symbol as JSX renders to nothing');
        return emptyRenderNode;
    }
    if (typeof jsxNode === 'string') {
        return new TextRenderNode(jsxNode);
    }
    if (typeof jsxNode === 'number' || typeof jsxNode === 'bigint') {
        return new TextRenderNode(jsxNode.toString());
    }
    log.warn('Unexpected JSX node type, rendering nothing', jsxNode);
    return emptyRenderNode;
}

export function renderJSXChildren(
    children?: JSX.Node | JSX.Node[]
): RenderNode[] {
    const childRenderNodes: RenderNode[] = [];
    if (children) {
        if (
            Array.isArray(children) &&
            !isCollection(children) &&
            !isView(children)
        ) {
            for (const child of children) {
                childRenderNodes.push(renderJSXNode(child));
            }
        } else {
            childRenderNodes.push(renderJSXNode(children));
        }
    }
    return childRenderNodes;
}

export function mount(target: Element, node: RenderNode): () => void {
    const focusMonitor = (e: FocusEvent) => {
        if (
            previousFocusedDetachedElement &&
            e.target &&
            e.target !== document.documentElement &&
            e.target !== document.body
        ) {
            previousFocusedDetachedElement = null;
        }
    };
    document.documentElement.addEventListener('focusin', focusMonitor);
    const root = new PortalRenderNode(
        target,
        new ArrayRenderNode([node]),
        null,
        'root'
    );
    retain(root);
    const context = new Map();
    root.attach((event) => {
        if (event instanceof Error) {
            console.error('Unhandled mount error', event);
            return;
        }
    }, context);
    root.onMount();
    return () => {
        root.onUnmount();
        root.detach();
        release(root);
        document.documentElement.removeEventListener('focusin', focusMonitor);
    };
}

export enum IntrinsicObserverEventType {
    MOUNT = 'mount',
    UNMOUNT = 'unmount',
}

export type IntrinsicObserverNodeCallback = (
    node: Node,
    event: IntrinsicObserverEventType
) => void;
export type IntrinsicObserverElementCallback = (
    element: Element,
    event: IntrinsicObserverEventType
) => void;

export class IntrinsicObserverRenderNode implements RenderNode {
    _type: typeof RenderNodeType = RenderNodeType;
    nodeCallback: IntrinsicObserverNodeCallback | undefined;
    elementCallback: IntrinsicObserverElementCallback | undefined;
    child: RenderNode;
    childNodes: Node[];
    emitter: NodeEmitter | null;
    isMounted: boolean;

    constructor(
        nodeCallback: IntrinsicObserverNodeCallback | undefined,
        elementCallback: IntrinsicObserverElementCallback | undefined,
        children: RenderNode[],
        debugName?: string
    ) {
        this.nodeCallback = nodeCallback;
        this.elementCallback = elementCallback;
        this.child = new ArrayRenderNode(children);
        this.childNodes = [];
        this.emitter = null;
        this.isMounted = false;

        this[SymDebugName] = debugName ?? `lifecycleobserver`;
        this[SymRefcount] = 0;
    }

    notify(node: Node, type: IntrinsicObserverEventType) {
        this.nodeCallback?.(node, type);
        if (node instanceof Element) {
            this.elementCallback?.(node, type);
        }
    }

    handleEvent(event: ArrayEvent<Node> | Error) {
        if (event instanceof Error) {
            this.emitter?.(event);
            return;
        }
        if (event.type === ArrayEventType.SPLICE) {
            for (let i = 0; i < event.count; ++i) {
                const node = this.childNodes[event.index + i];
                if (this.isMounted) {
                    this.notify(node, IntrinsicObserverEventType.UNMOUNT);
                }
            }
        }

        applyArrayEvent(this.childNodes, event);
        this.emitter?.(event);

        if (event.type === ArrayEventType.SPLICE) {
            if (event.items) {
                for (const node of event.items) {
                    if (this.isMounted) {
                        this.notify(node, IntrinsicObserverEventType.MOUNT);
                    }
                }
            }
        }
    }

    detach() {
        this.child.detach();
        this.emitter = null;
    }

    attach(emitter: NodeEmitter, context: ContextMap) {
        this.emitter = emitter;
        this.child.attach((event) => {
            this.handleEvent(event);
        }, context);
    }

    onMount() {
        this.child.onMount();
        this.isMounted = true;
        for (const node of this.childNodes) {
            this.notify(node, IntrinsicObserverEventType.MOUNT);
        }
    }

    onUnmount() {
        this.child.onUnmount();
        this.isMounted = false;
        for (const node of this.childNodes) {
            this.notify(node, IntrinsicObserverEventType.UNMOUNT);
        }
    }
    retain() {
        retain(this);
    }
    release() {
        release(this);
    }

    // Retainable
    [SymDebugName]: string;
    [SymRefcount]: number;
    [SymAlive]() {
        retain(this.child);
    }
    [SymDead]() {
        release(this.child);
        this.emitter = null;
    }
}

export const IntrinsicObserver: Component<{
    nodeCallback?: IntrinsicObserverNodeCallback;
    elementCallback?: IntrinsicObserverElementCallback;
    children?: JSX.Node | JSX.Node[];
}> = ({ nodeCallback, elementCallback, children }) => {
    return new IntrinsicObserverRenderNode(
        nodeCallback,
        elementCallback,
        renderJSXChildren(children)
    );
};

export class ComponentRenderNode<TProps> implements RenderNode {
    _type: typeof RenderNodeType = RenderNodeType;
    Component: Component<TProps>;
    props: TProps | null | undefined;
    children: JSX.Node[];
    result: RenderNode | Error | null;
    resultAttached: boolean;
    onMountCallbacks?: (() => (() => void) | void)[];
    onUnmountCallbacks?: (() => void)[];
    onDestroyCallbacks?: (() => void)[];
    getContextCallbacks?: Map<Context<any>, ((val: any) => void)[]>;
    owned: Set<Retainable>;
    errorHandler: ((e: Error) => RenderNode | null) | null;
    emitter: NodeEmitter | null;
    contextMap: ContextMap | null;
    isMounted: boolean;
    id: number;

    constructor(
        Component: Component<TProps>,
        props: TProps | null | undefined,
        children: JSX.Node[],
        debugName?: string
    ) {
        this.id = Math.random();
        this.Component = Component;
        this.props = props;
        this.children = children;
        this.owned = new Set();
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
        log.assert(this.result, 'Invariant: missing component result');
        if (this.result instanceof Error) {
            return;
        }
        log.assert(
            this.resultAttached,
            'Invariant: detached unattached component result'
        );
        this.result.detach();
        this.resultAttached = false;
        this.emitter = null;
        this.contextMap = null;
    }

    attach(emitter: NodeEmitter, contextMap: ContextMap) {
        log.assert(
            this[SymRefcount] > 0,
            'Invariant: dead ComponentRenderNode called setContext'
        );
        this.emitter = emitter;
        this.contextMap = contextMap;
        if (!this.result) {
            let callbacksAllowed = true;
            const lifecycle: ComponentLifecycle = {
                onMount: (handler: () => (() => void) | void) => {
                    log.assert(
                        callbacksAllowed,
                        'onMount must be called in component body'
                    );
                    if (!this.onMountCallbacks) this.onMountCallbacks = [];
                    this.onMountCallbacks.push(handler);
                },
                onUnmount: (handler: () => void) => {
                    log.assert(
                        callbacksAllowed,
                        'onUnmount must be called in component body'
                    );
                    if (!this.onUnmountCallbacks) this.onUnmountCallbacks = [];
                    this.onUnmountCallbacks.push(handler);
                },
                onDestroy: (handler: () => void) => {
                    log.assert(
                        callbacksAllowed,
                        'onDestroy must be called in component body'
                    );
                    if (!this.onDestroyCallbacks) this.onDestroyCallbacks = [];
                    this.onDestroyCallbacks.push(handler);
                },
                // "extends unknown" needed to avoid syntax ambiguity with type parameter in jsx
                // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-constraint
                getContext: <TContext extends unknown>(
                    context: Context<TContext>,
                    handler?: ((val: TContext) => void) | undefined
                ) => {
                    log.assert(
                        callbacksAllowed,
                        'getContext must be called in component body'
                    );
                    if (handler) {
                        if (!this.getContextCallbacks)
                            this.getContextCallbacks = new Map();
                        let callbacks = this.getContextCallbacks.get(context);
                        if (!callbacks) {
                            callbacks = [];
                            this.getContextCallbacks.set(context, callbacks);
                        }
                        callbacks.push(handler);
                    }
                    return readContext(contextMap, context);
                },
                onError: (errorHandler: (e: Error) => RenderNode | null) => {
                    log.assert(
                        callbacksAllowed,
                        'onError must be called in component body'
                    );
                    log.assert(
                        !this.errorHandler,
                        'onError called multiple times'
                    );
                    this.errorHandler = errorHandler;
                },
            };

            let componentProps: any;
            const Component = this.Component;
            const children = this.children;
            const props = this.props;
            if (children.length === 0) {
                componentProps = props || {};
            } else if (children.length === 1) {
                componentProps = props
                    ? { ...props, children: children[0] }
                    : { children: children[0] };
            } else {
                componentProps = props ? { ...props, children } : { children };
            }
            let jsxResult: RenderNode | Error;
            try {
                jsxResult = trackCreates(
                    this.owned,
                    () =>
                        Component(componentProps, lifecycle) || emptyRenderNode
                );
            } catch (e) {
                const error = wrapError(e, 'Unknown error rendering component');
                if (this.errorHandler) {
                    jsxResult = this.errorHandler(error) ?? emptyRenderNode;
                } else {
                    jsxResult = error;
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
                callbacks,
            ] of this.getContextCallbacks.entries()) {
                const value = contextMap.has(Context)
                    ? contextMap.get(Context)
                    : Context._get();
                for (const callback of callbacks) {
                    callback(value);
                }
            }
        }

        log.assert(this.result, 'Invariant: missing context');
        if (this.result instanceof Error) {
            this.emitter?.(this.result);
        } else {
            this.result.attach(this.handleEvent, contextMap);
            this.resultAttached = true;
        }
    }

    handleEvent = (event: ArrayEvent<Node> | Error) => {
        log.assert(
            !(this.result instanceof Error),
            'Invariant: received event on calculation error'
        );
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
            this.result = handledResult
                ? renderJSXNode(handledResult)
                : emptyRenderNode;
            retain(this.result);

            log.assert(
                this.emitter && this.contextMap,
                'Invariant: received event while unattached'
            );
            this.result.attach(this.handleEvent, this.contextMap);
            this.resultAttached = true;

            if (this.isMounted) {
                this.result.onMount();
            }
        } else {
            this.emitter?.(event);
        }
    };

    onMount() {
        this.isMounted = true;
        log.assert(this.result, 'Invariant: missing context');
        if (this.result instanceof Error) {
            return;
        }
        this.result.onMount();
        if (this.onMountCallbacks) {
            for (const callback of this.onMountCallbacks) {
                const maybeOnUnmount = callback();
                if (typeof maybeOnUnmount === 'function') {
                    if (!this.onUnmountCallbacks) {
                        this.onUnmountCallbacks = [];
                    }
                    const onUnmount = () => {
                        maybeOnUnmount();
                        if (this.onUnmountCallbacks) {
                            const index =
                                this.onUnmountCallbacks.indexOf(onUnmount);
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
        log.assert(this.result, 'Invariant: missing context');
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

    // Retainable
    [SymDebugName]: string;
    [SymRefcount]: number;
    [SymAlive] = noop;
    [SymDead]() {
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
}

export class ContextRenderNode<T> implements RenderNode {
    _type: typeof RenderNodeType = RenderNodeType;
    child: RenderNode;
    context: Context<T>;
    value: T;

    constructor(
        context: Context<T>,
        value: T,
        children: JSX.Element[],
        debugName?: string
    ) {
        this.context = context;
        this.value = value;
        this.child = new ArrayRenderNode(children);
        this[SymDebugName] = debugName ?? `context`;
        this[SymRefcount] = 0;
    }

    detach() {
        this.child.detach();
    }

    attach(emitter: NodeEmitter, context: ContextMap) {
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

    // Retainable
    [SymDebugName]: string;
    [SymRefcount]: number;
    [SymAlive]() {
        retain(this.child);
    }
    [SymDead]() {
        release(this.child);
    }
}
