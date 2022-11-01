import * as log from './log';
import {
    Retainable,
    retain,
    release,
    trackCreates,
    untrackReads,
    afterFlush,
    flush,
} from './engine';
import { RefObjectOrCallback, Ref } from './ref';
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
import { wrapError } from './util';

export interface ComponentLifecycle {
    onMount: (callback: () => void) => (() => void) | void;
    onUnmount: (callback: () => void) => void;
    onDestroy: (callback: () => void) => void;
    onError: (handler: (e: Error) => JSX.Element | null) => void;
}

// NOTE: UnusedSymbolForChildrenOmission is present solely for the typechecker to not allow assignment of { children?: JSXNode | JSXNode[] } to TProps if TProps is {}
// Which allows components to flag type errors when they do not specify a `children` prop, but children are given
declare const UnusedSymbolForChildrenOmission: unique symbol;
export type EmptyProps = { [UnusedSymbolForChildrenOmission]?: boolean };
export type Component<TProps = {}> =
    | FunctionComponent<TProps>
    | ClassComponentConstructor<TProps>;

export type FunctionComponent<TProps = {}> = (
    props: TProps & EmptyProps,
    lifecycle: ComponentLifecycle
) => JSX.Element | null;

export interface ClassComponentInterface {
    render?(): JSX.Element | null;
    onMount?(): (() => void) | void;
    onUnmount?(): void;
    onDestroy?(): void;
    onError?(e: Error): JSX.Element | null;
}

export interface ClassComponentConstructor<TProps> {
    new (props: TProps): ClassComponent<TProps>;
}

export function isClassComponent(
    val: any
): val is ClassComponentConstructor<unknown> {
    return val && val.prototype instanceof ClassComponent;
}

export class ClassComponent<TProps = EmptyProps>
    implements ClassComponentInterface
{
    declare props: TProps;
    constructor(props: TProps) {
        this.props = props;
    }

    render?(): JSX.Element | null;
    onMount?(): (() => void) | void;
    onUnmount?(): void;
    onDestroy?(): void;
    onError?(e: Error): JSX.Element | null;
}

export type NodeEmitter = (event: ArrayEvent<Node> | Error) => void;

export const RenderNodeType = Symbol('rendernode');

export interface RenderNode extends Retainable {
    _type: typeof RenderNodeType;
    detach(): void;
    attach(emitter: NodeEmitter, parentXmlNamespace: string): void;
    onMount(): void;
    onUnmount(): void;
    retain(): void;
    release(): void;
}

/**
 * Renders nothing
 */
export class EmptyRenderNode implements RenderNode {
    declare _type: typeof RenderNodeType;
    constructor() {
        this._type = RenderNodeType;
        this.__debugName = 'empty';
        this.__refcount = 0;
    }

    detach() {}
    attach() {}
    onMount() {}
    onUnmount() {}
    retain() {
        retain(this);
    }
    release() {
        release(this);
    }

    // Retainable
    declare __debugName: string;
    declare __refcount: number;
    __alive() {}
    __dead() {}
}

/**
 * Only need one of nothing
 */
export const emptyRenderNode = new EmptyRenderNode();

/**
 * Renders a Text DOM node
 */
export class TextRenderNode implements RenderNode {
    declare _type: typeof RenderNodeType;
    private declare text: Text;
    private declare emitter?: NodeEmitter | undefined;

    constructor(string: string, debugName?: string) {
        this._type = RenderNodeType;
        this.text = document.createTextNode(string);

        this.__debugName = debugName ?? 'text';
        this.__refcount = 0;
    }

    detach() {
        this.emitter?.({ type: ArrayEventType.SPLICE, index: 0, count: 1 });
        this.emitter = undefined;
    }

    attach(emitter: NodeEmitter) {
        log.assert(!this.emitter, 'Invariant: Text node double attached');
        this.emitter = emitter;
        this.emitter?.({
            type: ArrayEventType.SPLICE,
            index: 0,
            count: 0,
            items: [this.text],
        });
    }

    onMount() {}
    onUnmount() {}
    retain() {
        retain(this);
    }
    release() {
        release(this);
    }

    // Retainable
    declare __debugName: string;
    declare __refcount: number;
    __alive() {}
    __dead() {
        this.emitter = undefined;
    }
}

/**
 * Renders a foreign managed DOM node
 */
export class ForeignRenderNode implements RenderNode {
    declare _type: typeof RenderNodeType;
    private declare node: Node;
    private declare emitter?: NodeEmitter | undefined;

    constructor(node: Node, debugName?: string) {
        this._type = RenderNodeType;
        this.node = node;

        this.__debugName = debugName ?? 'foreign';
        this.__refcount = 0;
    }

    detach() {
        this.emitter?.({ type: ArrayEventType.SPLICE, index: 0, count: 1 });
        this.emitter = undefined;
    }

    attach(emitter: NodeEmitter) {
        log.assert(!this.emitter, 'Invariant: Foreign node double attached');
        this.emitter = emitter;
        this.emitter?.({
            type: ArrayEventType.SPLICE,
            index: 0,
            count: 0,
            items: [this.node],
        });
    }

    onMount() {}
    onUnmount() {}
    retain() {
        retain(this);
    }
    release() {
        release(this);
    }

    // Retainable
    declare __debugName: string;
    declare __refcount: number;
    __alive() {}
    __dead() {
        this.emitter = undefined;
    }
}

/**
 * Renders an array of render nodes
 */
export class ArrayRenderNode implements RenderNode {
    declare _type: typeof RenderNodeType;
    private declare children: RenderNode[];
    private declare slotSizes: number[];
    private declare attached: boolean[];
    private declare emitter?: NodeEmitter | undefined;

    constructor(children: RenderNode[], debugName?: string) {
        this._type = RenderNodeType;
        this.children = children;
        this.slotSizes = children.map(() => 0);
        this.attached = children.map(() => false);

        this.__debugName = debugName ?? 'array';
        this.__refcount = 0;
    }

    detach() {
        for (const [index, child] of this.children.entries()) {
            if (this.attached[index]) {
                child.detach();
                this.attached[index] = false;
            }
        }
        this.emitter = undefined;
    }

    attach(emitter: NodeEmitter, parentXmlNamespace: string) {
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
    declare __debugName: string;
    declare __refcount: number;
    __alive() {
        for (const child of this.children) {
            retain(child);
        }
    }
    __dead() {
        for (const child of this.children) {
            release(child);
        }
        this.emitter = undefined;
    }
}

const HTML_NAMESPACE = 'http://www.w3.org/1999/xhtml';
const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';
const MATHML_NAMESPACE = 'http://www.w3.org/1998/Math/MathML';

const ELEMENT_NAMESPACE_GUESS: Record<string, string | undefined> = {
    // HTML elements per https://html.spec.whatwg.org/multipage/indices.html#elements-3
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
    // 'math': HTML_NAMESPACE,
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
    // 'svg': HTML_NAMESPACE,
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
    'annotation-xml': MATHML_NAMESPACE,
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
    munderover: MATHML_NAMESPACE,
};

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
    declare _type: typeof RenderNodeType;
    private declare tagName: string;
    private declare element?: Element | undefined;
    private declare emitter?: NodeEmitter | undefined;
    private declare detachedError?: Error | undefined;
    private declare xmlNamespace?: string | undefined;
    private declare childXmlNamespace?: string | undefined;
    private declare props?: Record<string, any> | undefined;
    private declare children: ArrayRenderNode;
    private declare portalRenderNode?: PortalRenderNode | undefined;
    private declare calculations?: Map<string, Calculation<any>>;
    private declare calculationSubscriptions?: Set<() => void>;

    constructor(
        tagName: string,
        props: Record<string, any> | undefined,
        children: RenderNode[],
        debugName?: string
    ) {
        this._type = RenderNodeType;
        this.props = props;
        this.children = new ArrayRenderNode(children);
        this.tagName = tagName;

        this.__debugName = debugName ?? `intrinsic:${this.tagName}`;
        this.__refcount = 0;
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
                                        flush();
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
                        calculation.subscribe((error, updatedVal) => {
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
            if (this.emitter) {
                this.emitter(event);
            } else {
                log.warn(
                    'Unhandled error on detached IntrinsicRenderNode',
                    this.__debugName,
                    event
                );
                this.detachedError = event;
            }
            return;
        }
        log.assert(false, 'unexpected event from IntrinsicRenderNode');
    };

    detach() {
        this.emitter?.({
            type: ArrayEventType.SPLICE,
            index: 0,
            count: 1,
        });
        this.emitter = undefined;
    }

    ensureElement(xmlNamespace: string, childXmlNamespace: string) {
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

            this.portalRenderNode.attach(this.handleEvent, childXmlNamespace);
        }
        return this.element;
    }

    attach(emitter: NodeEmitter, parentXmlNamespace: string) {
        log.assert(!this.emitter, 'Invariant: Intrinsic node double attached');
        this.emitter = emitter;
        if (this.detachedError) {
            this.emitter(this.detachedError);
            return;
        }

        const namespaceTransition =
            elementNamespaceTransitionMap[parentXmlNamespace]?.[this.tagName];
        const xmlNamespace = namespaceTransition?.node ?? parentXmlNamespace;
        const childXmlNamespace =
            namespaceTransition?.children ?? parentXmlNamespace;

        const element = this.ensureElement(xmlNamespace, childXmlNamespace);

        this.emitter?.({
            type: ArrayEventType.SPLICE,
            index: 0,
            count: 0,
            items: [element],
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
    declare __debugName: string;
    declare __refcount: number;
    __alive() {
        // At this point in time, we don't know for sure what the correct XML namespace is, as this could be an SVG
        // looking element that eventually gets placed within an SVG tree, which ought to result in an
        // SVGUnknownElement. So we take an educated guess;
        const xmlNamespaceGuess =
            ELEMENT_NAMESPACE_GUESS[this.tagName] || HTML_NAMESPACE;

        retain(this.children);

        // foreignObject is special; it should be created with an SVG namespace but children should have a HTML
        // namespace
        this.ensureElement(
            xmlNamespaceGuess,
            this.tagName === 'foreignObject'
                ? HTML_NAMESPACE
                : xmlNamespaceGuess
        );
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

        this.element = undefined;
        if (this.portalRenderNode) {
            release(this.portalRenderNode);
            this.portalRenderNode = undefined;
        }
        release(this.children);
        this.emitter = undefined;
    }
}

export class PortalRenderNode implements RenderNode {
    declare _type: typeof RenderNodeType;
    private declare tagName: string;
    private declare element: Element;
    private declare refProp?: RefObjectOrCallback<Element> | undefined;
    private declare emitter?: NodeEmitter | undefined;
    private declare existingOffset: number;
    private declare arrayRenderNode: ArrayRenderNode;
    private declare calculations?: Map<string, Calculation<any>>;
    private declare calculationSubscriptions?: Set<() => void>;

    constructor(
        element: Element,
        children: ArrayRenderNode,
        refProp: RefObjectOrCallback<Element> | null | undefined,
        debugName?: string
    ) {
        this._type = RenderNodeType;
        this.arrayRenderNode = children;
        this.element = element;
        if (refProp) {
            this.refProp = refProp;
        }
        this.tagName = this.element.tagName;
        this.existingOffset = element.childNodes.length;

        this.__debugName = debugName ?? `mount:${this.tagName}`;
        this.__refcount = 0;
    }

    private handleEvent = (event: ArrayEvent<Node> | Error) => {
        if (event instanceof Error) {
            if (this.emitter) {
                this.emitter(event);
            } else {
                log.warn('Unhandled error on detached PortalRenderNode');
            }
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
        this.emitter = undefined;
        this.arrayRenderNode.detach();
    }

    attach(emitter: NodeEmitter, parentXmlNamespace: string) {
        log.assert(!this.emitter, 'Invariant: Intrinsic node double attached');
        this.emitter = emitter;
        this.arrayRenderNode.attach(
            this.handleEvent,
            // Note: portal elements & namespaces are weird! parentXmlNamespace is not quite the right word -- it's the "child" XML namespace.
            parentXmlNamespace
        );
    }

    onMount() {
        this.arrayRenderNode.onMount();
        if (this.refProp) {
            if (this.refProp instanceof Ref) {
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
            if (this.refProp instanceof Ref) {
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
    declare __debugName: string;
    declare __refcount: number;
    __alive() {
        retain(this.arrayRenderNode);
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

        release(this.arrayRenderNode);
        this.emitter = undefined;
    }
}

/**
 * Renders the result of a calculation
 */
export class CalculationRenderNode implements RenderNode {
    declare _type: typeof RenderNodeType;
    private declare error?: Error | undefined;
    private declare renderNode?: RenderNode | undefined;
    private declare calculation: Calculation<any>;
    private declare calculationSubscription?: (() => void) | undefined;
    private declare isMounted: boolean;
    private declare emitter?: NodeEmitter | undefined;
    private declare parentXmlNamespace?: string | undefined;

    constructor(calculation: Calculation<any>, debugName?: string) {
        this._type = RenderNodeType;
        this.calculation = calculation;
        this.isMounted = false;

        this.__debugName = debugName ?? `rendercalc:${calculation.__debugName}`;
        this.__refcount = 0;

        this.subscribe = this.subscribe.bind(this);
    }

    detach() {
        this.renderNode?.detach();
        this.emitter = undefined;
    }

    attach(emitter: NodeEmitter, parentXmlNamespace: string) {
        this.emitter = emitter;
        this.parentXmlNamespace = parentXmlNamespace;
        if (this.error) {
            emitter(this.error);
        } else {
            this.renderNode?.attach(emitter, parentXmlNamespace);
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
            this.error = undefined;
            this.renderNode = undefined;
        }
    }

    subscribe(errorType: undefined, val: any): void;
    subscribe(errorType: CalculationErrorType, val: Error): void;
    subscribe(errorType: undefined | CalculationErrorType, val: Error): void {
        this.cleanPrior();
        if (errorType) {
            this.error = val;
            if (this.emitter) {
                this.emitter(val);
            } else {
                log.warn(
                    'Unhandled error on detached CalculationRenderNode',
                    val
                );
            }
        } else {
            const renderNode = renderJSXNode(val as any);
            retain(renderNode);
            afterFlush(() => {
                this.cleanPrior(); // it's possible the calculation is notified multiple times in a flush; only care about the last one
                this.renderNode = renderNode;
                if (this.emitter && this.parentXmlNamespace) {
                    renderNode.attach(this.emitter, this.parentXmlNamespace);
                }
                if (this.isMounted) {
                    renderNode.onMount();
                }
            });
        }
    }

    // Retainable
    declare __debugName: string;
    declare __refcount: number;
    __alive() {
        try {
            this.calculationSubscription = this.calculation.subscribe(
                this.subscribe
            );
            this.subscribe(undefined, this.calculation());
        } catch (e) {
            this.subscribe(CalculationErrorType.EXCEPTION, wrapError(e));
        }
    }
    __dead() {
        this.calculationSubscription?.();
        this.calculationSubscription = undefined;
        this.cleanPrior();
        this.emitter = undefined;
    }
}

export class CollectionRenderNode implements RenderNode {
    declare _type: typeof RenderNodeType;
    private declare children: RenderNode[];
    private declare childIndex: Map<RenderNode, number>;
    private declare slotSizes: number[];
    private declare collection: Collection<any> | View<any>;
    private declare unsubscribe?: () => void;
    private declare isMounted: boolean;
    private declare emitter?: NodeEmitter | undefined;
    private declare parentXmlNamespace?: string | undefined;

    constructor(collection: Collection<any> | View<any>, debugName?: string) {
        this._type = RenderNodeType;
        this.collection = collection;
        this.children = [];
        this.childIndex = new Map();
        this.slotSizes = [];
        this.isMounted = false;

        this.__debugName = debugName ?? `rendercoll`;
        this.__refcount = 0;
    }

    attach(emitter: NodeEmitter, parentXmlNamespace: string) {
        this.emitter = emitter;
        this.parentXmlNamespace = parentXmlNamespace;

        for (const child of this.children) {
            child.attach((event) => {
                this.handleChildEvent(event, child);
            }, parentXmlNamespace);
        }
    }

    detach() {
        for (const child of this.children) {
            child.detach();
        }

        this.emitter = undefined;
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
        if (this.emitter) {
            if (this.isMounted) {
                child.onUnmount();
            }
            child.detach();
        }
        release(child);
    }
    private retainChild(child: RenderNode) {
        retain(child);
        if (this.emitter && this.parentXmlNamespace) {
            child.attach(
                (event) => this.handleChildEvent(event, child),
                this.parentXmlNamespace
            );
            if (this.isMounted) {
                child.onMount();
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
    declare __debugName: string;
    declare __refcount: number;
    __alive() {
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
    __dead() {
        this.unsubscribe?.();
        release(this.collection);
        const removed = this.children.splice(0, this.children.length);
        for (const child of removed) {
            this.releaseChild(child);
            this.childIndex.delete(child);
        }
        this.slotSizes.splice(0, this.slotSizes.length);
        this.emitter = undefined;
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
    let syncError: undefined | Error;
    root.attach((event) => {
        if (event instanceof Error) {
            syncError = event;
            log.error('Unhandled mount error', event);
            return;
        }
    }, target.namespaceURI ?? HTML_NAMESPACE);
    if (syncError) {
        release(root);
        throw syncError;
    }
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
    declare _type: typeof RenderNodeType;
    nodeCallback?: IntrinsicObserverNodeCallback | undefined;
    elementCallback?: IntrinsicObserverElementCallback | undefined;
    child: RenderNode;
    childNodes: Node[];
    emitter?: NodeEmitter | undefined;
    isMounted: boolean;

    constructor(
        nodeCallback: IntrinsicObserverNodeCallback | undefined,
        elementCallback: IntrinsicObserverElementCallback | undefined,
        children: RenderNode[],
        debugName?: string
    ) {
        this._type = RenderNodeType;
        this.nodeCallback = nodeCallback;
        this.elementCallback = elementCallback;
        this.child = new ArrayRenderNode(children);
        this.childNodes = [];
        this.isMounted = false;

        this.__debugName = debugName ?? `lifecycleobserver`;
        this.__refcount = 0;
    }

    notify(node: Node, type: IntrinsicObserverEventType) {
        this.nodeCallback?.(node, type);
        if (node instanceof Element) {
            this.elementCallback?.(node, type);
        }
    }

    handleEvent(event: ArrayEvent<Node> | Error) {
        if (event instanceof Error) {
            if (this.emitter) {
                this.emitter(event);
            } else {
                log.warn(
                    'Unhandled error on detached IntrinsicObserverRenderNode',
                    event
                );
            }
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
        this.emitter = undefined;
    }

    attach(emitter: NodeEmitter, parentXmlNamespace: string) {
        this.emitter = emitter;
        this.child.attach((event) => {
            this.handleEvent(event);
        }, parentXmlNamespace);
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
    declare __debugName: string;
    declare __refcount: number;
    __alive() {
        retain(this.child);
    }
    __dead() {
        release(this.child);
        this.emitter = undefined;
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
    declare _type: typeof RenderNodeType;
    declare Component: FunctionComponent<TProps>;
    declare props: TProps | null | undefined;
    declare children: JSX.Node[];
    declare result?: RenderNode | Error | undefined;
    declare resultAttached: boolean;
    declare onMountCallbacks?: (() => (() => void) | void)[];
    declare onUnmountCallbacks?: (() => void)[];
    declare onDestroyCallbacks?: (() => void)[];
    declare owned: Set<Retainable>;
    declare errorHandler?: ((e: Error) => RenderNode | null) | undefined;
    declare emitter?: NodeEmitter | undefined;
    declare parentXmlNamespace?: string | undefined;
    declare isMounted: boolean;

    constructor(
        Component: FunctionComponent<TProps>,
        props: TProps | null | undefined,
        children: JSX.Node[],
        debugName?: string
    ) {
        this._type = RenderNodeType;
        this.Component = Component;
        this.props = props;
        this.children = children;
        this.owned = new Set();
        this.isMounted = false;

        this.resultAttached = false;

        this.__debugName = debugName ?? `component`;
        this.__refcount = 0;
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
        this.emitter = undefined;
    }

    private ensureResult() {
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
        return this.result;
    }

    attach(emitter: NodeEmitter, parentXmlNamespace: string) {
        log.assert(
            this.__refcount > 0,
            'Invariant: dead ComponentRenderNode called attach'
        );
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
                this.result = undefined;
            }
            const handledResult = this.errorHandler(event);
            this.result = handledResult
                ? renderJSXNode(handledResult)
                : emptyRenderNode;
            retain(this.result);

            if (this.emitter && this.parentXmlNamespace) {
                this.result.attach(this.handleEvent, this.parentXmlNamespace);
                this.resultAttached = true;
            }

            if (this.isMounted) {
                this.result.onMount();
            }
        } else {
            this.emitter?.(event);
        }
    };

    onMount() {
        this.isMounted = true;
        log.assert(this.result, 'Invariant: missing result');
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
        log.assert(this.result, 'Invariant: missing result');
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
    declare __debugName: string;
    declare __refcount: number;
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
            release(this.result);
        }
        this.result = undefined;
        for (const item of this.owned) {
            release(item);
        }
        this.emitter = undefined;
    }
}

export function classComponentToFunctionComponentRenderNode<TProps>(
    Component: ClassComponentConstructor<TProps>,
    props: TProps,
    children: JSX.Node[]
) {
    return new ComponentRenderNode(
        (props: TProps, lifecycle) => {
            const instance = new Component(props);
            if (!instance.render) return null;
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
        children,
        Component.name
    );
}
