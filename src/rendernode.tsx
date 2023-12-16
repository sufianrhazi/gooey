import * as log from './log';
import {
    Retainable,
    retain,
    release,
    trackCreates,
    untrackReads,
    flush,
    removeRenderNode,
    dirtyRenderNode,
} from './engine';
import { RefObjectOrCallback, Ref } from './ref';
import { JSXNode, setAttribute, assignProp } from './jsx';
import { dynGet, dynSubscribe } from './dyn';
import type { Dyn } from './dyn';
import {
    ArrayEvent,
    ArrayEventType,
    shiftEvent,
    shiftEventBy,
    applyArrayEvent,
    addArrayEvent,
} from './arrayevent';
import { Calculation, CalculationSubscribeWithPostAction } from './calc';
import { isCollection, isView, Collection, View } from './collection';
import { field, Field } from './field';
import { wrapError } from './util';

export interface ComponentLifecycle {
    onMount: (callback: () => void) => (() => void) | void;
    onUnmount: (callback: () => void) => void;
    onDestroy: (callback: () => void) => void;
    onError: (handler: (e: Error) => JSX.Element | null) => void;
}

// List per https://developer.mozilla.org/en-US/docs/Web/API/ElementInternals
type WebComponentInternalsKey =
    | 'ariaAtomic'
    | 'ariaAutoComplete'
    | 'ariaBusy'
    | 'ariaChecked'
    | 'ariaColCount'
    | 'ariaColIndex'
    | 'ariaColSpan'
    | 'ariaCurrent'
    | 'ariaDescription'
    | 'ariaDisabled'
    | 'ariaExpanded'
    | 'ariaHasPopup'
    | 'ariaHidden'
    | 'ariaKeyShortcuts'
    | 'ariaLabel'
    | 'ariaLevel'
    | 'ariaLive'
    | 'ariaModal'
    | 'ariaMultiLine'
    | 'ariaMultiSelectable'
    | 'ariaOrientation'
    | 'ariaPlaceholder'
    | 'ariaPosInSet'
    | 'ariaPressed'
    | 'ariaReadOnly'
    | 'ariaRequired'
    | 'ariaRoleDescription'
    | 'ariaRowCount'
    | 'ariaRowIndex'
    | 'ariaRowSpan'
    | 'ariaSelected'
    | 'ariaSetSize'
    | 'ariaSort'
    | 'ariaValueMax'
    | 'ariaValueMin'
    | 'ariaValueNow'
    | 'ariaValueText'
    | 'role'
    // Non-standard properties
    | 'ariaRelevant'
    // Experimental properties
    | 'ariaRowIndexText'
    | 'ariaColIndexText';

interface Validity {
    flags: {
        valueMissing?: boolean;
        typeMismatch?: boolean;
        patternMismatch?: boolean;
        tooLong?: boolean;
        tooShort?: boolean;
        rangeUnderflow?: boolean;
        rangeOverflow?: boolean;
        stepMismatch?: boolean;
        badInput?: boolean;
        customError?: boolean;
    };
    message?: string | undefined;
    anchor?: HTMLElement | undefined;
}
type FormValue =
    | string
    | File
    | FormData
    | {
          value: string | File | FormData;
          state?: string | File | FormData | undefined;
      };

export interface WebComponentLifecycle extends ComponentLifecycle {
    host: HTMLElement;
    shadowRoot: ShadowRoot | undefined;
    elementInternals: ElementInternals | undefined;
    addEventListener<K extends keyof HTMLElementEventMap>(
        type: K,
        listener: (
            this: HTMLElement,
            ev: HTMLElementEventMap[K],
            el: HTMLElement // Added for convenience
        ) => any,
        options?: boolean | AddEventListenerOptions
    ): () => void;
    addEventListener(
        type: string,
        listener: (
            this: HTMLElement,
            ev: Event,
            el: HTMLElement // Added for convenience
        ) => any,
        options?: boolean | AddEventListenerOptions
    ): void;
    bindElementInternalsAttribute: (
        param: WebComponentInternalsKey,
        value: Dyn<string | null>
    ) => () => void;
    bindFormValue: (formValue: Dyn<FormValue>) => () => void;
    bindValidity: (validity: Dyn<Validity>) => () => void;
    checkValidity: () => void;
    reportValidity: () => void;
}

// NOTE: UnusedSymbolForChildrenOmission is present solely for the typechecker to not allow assignment of { children?: JSXNode | JSXNode[] } to TProps if TProps is {}
// Which allows components to flag type errors when they do not specify a `children` prop, but children are given
declare const UnusedSymbolForChildrenOmission: unique symbol;
export type EmptyProps = { [UnusedSymbolForChildrenOmission]?: boolean };
export type Component<TProps = {}> =
    | FunctionComponent<TProps>
    | ClassComponentConstructor<TProps>;

export type WebComponent<
    TKeys extends string,
    TShadowMode extends 'open' | 'closed' | undefined
> = WebFunctionComponent<TKeys, TShadowMode>;

type WebComponentProps<
    TKeys extends string,
    TShadowMode extends 'open' | 'closed' | undefined
> = TShadowMode extends undefined
    ? { [Key in TKeys]?: Dyn<string | undefined> } & { children: JSXNode }
    : { [Key in TKeys]?: Dyn<string | undefined> };

export type WebFunctionComponent<
    TKeys extends string,
    TShadowMode extends 'open' | 'closed' | undefined
> = (
    props: WebComponentProps<TKeys, TShadowMode>,
    lifecycle: WebComponentLifecycle
) => JSX.Element | null;

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

export enum RenderNodeCommitPhase {
    COMMIT_UNMOUNT,
    COMMIT_DEL,
    COMMIT_INS,
    COMMIT_MOUNT,
}
function isNextRenderNodeCommitPhase(
    commitPhase: RenderNodeCommitPhase,
    nextPhase: RenderNodeCommitPhase
) {
    return (
        (commitPhase === RenderNodeCommitPhase.COMMIT_MOUNT &&
            nextPhase === RenderNodeCommitPhase.COMMIT_UNMOUNT) ||
        (commitPhase === RenderNodeCommitPhase.COMMIT_UNMOUNT &&
            nextPhase === RenderNodeCommitPhase.COMMIT_DEL) ||
        (commitPhase === RenderNodeCommitPhase.COMMIT_DEL &&
            nextPhase === RenderNodeCommitPhase.COMMIT_INS) ||
        (commitPhase === RenderNodeCommitPhase.COMMIT_INS &&
            nextPhase === RenderNodeCommitPhase.COMMIT_MOUNT)
    );
}

export interface RenderNode extends Retainable {
    _type: typeof RenderNodeType;
    _commitPhase: RenderNodeCommitPhase;
    detach(): void;
    attach(emitter: NodeEmitter, parentXmlNamespace: string): void;
    setMounted(isMounted: boolean): void;
    commit(phase: RenderNodeCommitPhase): void;
    retain(): void;
    release(): void;
    clone(props?: {}, children?: RenderNode[]): RenderNode;
}

function own(parent: RenderNode, child: RenderNode) {
    if (child === emptyRenderNode) return;
    retain(child);
}

function disown(parent: RenderNode, child: RenderNode) {
    if (child === emptyRenderNode) return;
    release(child);
}

/**
 * Renders nothing
 */
export class EmptyRenderNode implements RenderNode {
    declare _type: typeof RenderNodeType;
    declare _commitPhase: RenderNodeCommitPhase;
    constructor() {
        this._type = RenderNodeType;
        this._commitPhase = RenderNodeCommitPhase.COMMIT_MOUNT;
        this.__debugName = 'empty';
        this.__refcount = 0;
    }

    detach() {}
    attach() {}
    setMounted() {}
    retain() {
        retain(this);
    }
    release() {
        release(this);
    }
    commit() {
        // No children, no commit action
    }
    clone(): RenderNode {
        return emptyRenderNode;
    }

    // Retainable
    declare __debugName: string;
    declare __refcount: number;
    __alive() {}
    __dead() {
        removeRenderNode(this);
    }
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
    declare _commitPhase: RenderNodeCommitPhase;
    private declare text: Text;
    private declare emitter?: NodeEmitter | undefined;

    constructor(string: string, debugName?: string) {
        this._type = RenderNodeType;
        this._commitPhase = RenderNodeCommitPhase.COMMIT_MOUNT;
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

    setMounted() {}
    retain() {
        retain(this);
    }
    release() {
        release(this);
    }
    commit() {
        // No children, no commit action
    }
    clone(): RenderNode {
        return new TextRenderNode(this.text.data);
    }

    // Retainable
    declare __debugName: string;
    declare __refcount: number;
    __alive() {}
    __dead() {
        this.emitter = undefined;
        removeRenderNode(this);
    }
}

/**
 * Renders a foreign managed DOM node
 */
export class ForeignRenderNode implements RenderNode {
    declare _type: typeof RenderNodeType;
    declare _commitPhase: RenderNodeCommitPhase;
    private declare node: Node;
    private declare emitter?: NodeEmitter | undefined;

    constructor(node: Node, debugName?: string) {
        this._type = RenderNodeType;
        this._commitPhase = RenderNodeCommitPhase.COMMIT_MOUNT;
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

    setMounted() {}
    retain() {
        retain(this);
    }
    release() {
        release(this);
    }
    commit() {
        // No children, no commit action
    }
    clone(): RenderNode {
        return new ForeignRenderNode(this.node);
    }

    // Retainable
    declare __debugName: string;
    declare __refcount: number;
    __alive() {}
    __dead() {
        this.emitter = undefined;
        removeRenderNode(this);
    }
}

/**
 * Renders an array of render nodes
 */
export class ArrayRenderNode implements RenderNode {
    declare _type: typeof RenderNodeType;
    declare _commitPhase: RenderNodeCommitPhase;
    private declare children: RenderNode[];
    private declare slotSizes: number[];
    private declare attached: boolean;

    constructor(children: RenderNode[], debugName?: string) {
        this._type = RenderNodeType;
        this._commitPhase = RenderNodeCommitPhase.COMMIT_MOUNT;
        this.children = children;
        this.slotSizes = children.map(() => 0);
        this.attached = false;

        this.__debugName = debugName ?? 'array';
        this.__refcount = 0;
    }

    detach() {
        if (this.attached) {
            for (const child of this.children) {
                child.detach();
            }
            this.attached = false;
        }
    }

    attach(emitter: NodeEmitter, parentXmlNamespace: string) {
        for (const [index, child] of this.children.entries()) {
            child.attach((event) => {
                if (event instanceof Error) {
                    emitter(event);
                } else {
                    shiftEvent(this.slotSizes, index, event);
                    emitter(event);
                }
            }, parentXmlNamespace);
        }
        this.attached = true;
    }

    setMounted(isMounted: boolean) {
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
    commit(phase: RenderNodeCommitPhase) {
        if (isNextRenderNodeCommitPhase(this._commitPhase, phase)) {
            for (const child of this.children) {
                child.commit(phase);
            }
            this._commitPhase = phase;
        }
    }
    clone(): RenderNode {
        return new ArrayRenderNode(this.children.map((child) => child.clone()));
    }

    // Retainable
    declare __debugName: string;
    declare __refcount: number;
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
    declare _commitPhase: RenderNodeCommitPhase;
    private declare tagName: string;
    private declare element?: Element | undefined;
    private declare emitter?: NodeEmitter | undefined;
    private declare detachedError?: Error | undefined;
    private declare xmlNamespace?: string | undefined;
    private declare props?: Record<string, any> | undefined;
    private declare children: ArrayRenderNode;
    private declare portalRenderNode?: PortalRenderNode | undefined;
    private declare boundAttributes?: Map<
        string,
        Field<any> | Calculation<any>
    >;
    private declare subscriptions?: Set<() => void>;

    constructor(
        tagName: string,
        props: Record<string, any> | undefined,
        children: RenderNode[],
        debugName?: string
    ) {
        this._type = RenderNodeType;
        this._commitPhase = RenderNodeCommitPhase.COMMIT_MOUNT;
        this.props = props;
        this.children = new ArrayRenderNode(children);
        this.tagName = tagName;

        this.__debugName = debugName ?? `intrinsic:${this.tagName}`;
        this.__refcount = 0;
    }

    private createElement(xmlNamespace: string) {
        let element: Element;
        if (
            this.tagName in webComponentTagConstructors &&
            typeof this.props?.is === 'string'
        ) {
            element = document.createElement(this.tagName, {
                is: this.props.is,
            });
        } else {
            element = document.createElementNS(xmlNamespace, this.tagName);
        }
        if (this.props) {
            for (const [prop, val] of Object.entries(this.props)) {
                if (prop === 'ref') continue; // specially handled by PortalRenderNode
                if (prop === 'is') continue; // specially handled above
                if (
                    EventProps.some(({ prefix, param }) => {
                        if (prop.startsWith(prefix)) {
                            element.addEventListener(
                                prop.slice(prefix.length),
                                (e) => {
                                    try {
                                        val(e, element);
                                    } catch (e) {
                                        flush();
                                        throw e;
                                    }
                                    flush();
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
                if (val instanceof Calculation) {
                    if (!this.boundAttributes) {
                        this.boundAttributes = new Map();
                    }
                    this.boundAttributes.set(prop, val);
                } else if (val instanceof Field) {
                    if (!this.boundAttributes) {
                        this.boundAttributes = new Map();
                    }
                    this.boundAttributes.set(prop, val);
                } else {
                    this.setProp(element, prop, val);
                }
            }
            if (this.boundAttributes) {
                if (!this.subscriptions) {
                    this.subscriptions = new Set();
                }
                for (const [
                    prop,
                    boundAttr,
                ] of this.boundAttributes.entries()) {
                    boundAttr.retain();
                    const currentVal = boundAttr.get();
                    this.setProp(element, prop, currentVal);
                    if (boundAttr instanceof Field) {
                        this.subscriptions.add(
                            boundAttr.subscribe((updatedVal) => {
                                this.setProp(element, prop, updatedVal);
                            })
                        );
                    } else {
                        this.subscriptions.add(
                            boundAttr.subscribeWithError(
                                (error, updatedVal) => {
                                    if (error) {
                                        log.error(
                                            'Unhandled error in bound prop',
                                            {
                                                prop,
                                                element,
                                                error: updatedVal,
                                            }
                                        );
                                    } else {
                                        this.setProp(element, prop, updatedVal);
                                    }
                                }
                            )
                        );
                    }
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

        if (
            (element instanceof HTMLElement || element instanceof SVGElement) &&
            (prop.startsWith('cssprop:') || prop.startsWith('style:'))
        ) {
            const attrName = prop.startsWith('cssprop:')
                ? '--' + prop.slice(8)
                : prop.slice(6);
            if (val === undefined || val === null || val === false) {
                element.style.removeProperty(attrName);
            } else if (typeof val === 'string') {
                element.style.setProperty(attrName, val);
            } else if (typeof val === 'number' || typeof val === 'bigint') {
                element.style.setProperty(attrName, val.toString());
            }
            return;
        }

        if (prop.startsWith('style:')) {
            const attrName = prop.slice(6);
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
                disown(this, this.portalRenderNode);
            }
            this.portalRenderNode = new PortalRenderNode(
                this.element,
                this.children,
                this.props?.ref
            );
            own(this, this.portalRenderNode);

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

    setMounted(isMounted: boolean) {
        this.portalRenderNode?.setMounted(isMounted);
    }

    retain() {
        retain(this);
    }

    release() {
        release(this);
    }

    commit(phase: RenderNodeCommitPhase) {
        if (isNextRenderNodeCommitPhase(this._commitPhase, phase)) {
            this.portalRenderNode?.commit(phase);
            this._commitPhase = phase;
        }
    }

    clone(props: {}, children?: RenderNode[]) {
        return new IntrinsicRenderNode(
            this.tagName,
            { ...this.props, ...props },
            children ? children : [this.children.clone()]
        );
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

        if (this.portalRenderNode) {
            own(this, this.portalRenderNode);
        }

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
        if (this.boundAttributes) {
            for (const calculation of this.boundAttributes.values()) {
                release(calculation);
            }
        }
        if (this.subscriptions) {
            for (const unsubscribe of this.subscriptions) {
                unsubscribe();
            }
            this.subscriptions.clear();
        }

        this.element = undefined;
        if (this.portalRenderNode) {
            disown(this, this.portalRenderNode);
            this.portalRenderNode = undefined;
        }
        removeRenderNode(this);
        this.emitter = undefined;
    }
}

// A shared document fragment; NOTE: always clear after use
const fragment = document.createDocumentFragment();

// TODO: fix this, this needs to be two flags: needs unmount notification; needs mount notification
enum MountState {
    MOUNTED,
    NOTIFY_MOUNT,
    NOTIFY_UNMOUNT,
    UNMOUNTED,
}

export class PortalRenderNode implements RenderNode {
    declare _type: typeof RenderNodeType;
    declare _commitPhase: RenderNodeCommitPhase;
    private declare element: Element | ShadowRoot;
    private declare childEvents: ArrayEvent<Node>[];
    private declare committedNodes: Node[];
    private declare liveNodes: Node[];
    private declare liveNodeSet: Set<Node>;
    private declare deadNodeSet: Set<Node>;
    private declare refProp?:
        | RefObjectOrCallback<Element | ShadowRoot | undefined>
        | undefined;
    private declare mountState?: MountState | undefined;
    private declare emitter?: NodeEmitter | undefined;
    private declare childrenRenderNode: RenderNode;
    private declare calculations?: Map<string, Calculation<any>>;
    private declare calculationSubscriptions?: Set<() => void>;

    constructor(
        element: Element | ShadowRoot,
        children: RenderNode,
        refProp:
            | RefObjectOrCallback<Element | ShadowRoot | undefined>
            | null
            | undefined,
        debugName?: string
    ) {
        this._type = RenderNodeType;
        this._commitPhase = RenderNodeCommitPhase.COMMIT_MOUNT;
        this.childrenRenderNode = children;
        this.childEvents = [];
        this.committedNodes = [];
        this.liveNodes = [];
        this.liveNodeSet = new Set();
        this.deadNodeSet = new Set();
        this.element = element;
        if (refProp) {
            this.refProp = refProp;
            this.mountState = MountState.UNMOUNTED;
        }

        this.__debugName =
            debugName ??
            `mount:${
                element instanceof Element
                    ? element.tagName
                    : `shadow:${element.host.tagName}`
            }`;
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
        addArrayEvent(this.childEvents, event);
        dirtyRenderNode(this);
    };

    detach() {
        this.emitter = undefined;
        this.childrenRenderNode.detach();
    }

    attach(emitter: NodeEmitter, parentXmlNamespace: string) {
        log.assert(!this.emitter, 'Invariant: Intrinsic node double attached');
        this.emitter = emitter;
        this.childrenRenderNode.attach(
            this.handleEvent,
            // Note: portal elements & namespaces are weird! parentXmlNamespace is not quite the right word -- it's the "child" XML namespace.
            parentXmlNamespace
        );
    }

    setMounted(isMounted: boolean) {
        if (isMounted) {
            this.childrenRenderNode.setMounted(true);
            if (this.refProp) {
                dirtyRenderNode(this);
                this.mountState = MountState.NOTIFY_MOUNT;
            }
        } else {
            if (this.refProp) {
                dirtyRenderNode(this);
                this.mountState = MountState.NOTIFY_UNMOUNT;
            }
            this.childrenRenderNode.setMounted(false);
        }
    }

    commit(phase: RenderNodeCommitPhase) {
        if (!isNextRenderNodeCommitPhase(this._commitPhase, phase)) {
            return;
        }
        this.childrenRenderNode.commit(phase);
        this._commitPhase = phase;
        if (
            phase === RenderNodeCommitPhase.COMMIT_UNMOUNT &&
            this.childEvents.length > 0
        ) {
            // Prep received events
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
        if (
            phase === RenderNodeCommitPhase.COMMIT_UNMOUNT &&
            this.refProp &&
            this.mountState === MountState.NOTIFY_UNMOUNT
        ) {
            if (this.refProp instanceof Ref) {
                this.refProp.current = undefined;
            } else if (typeof this.refProp === 'function') {
                this.refProp(undefined);
            }
            this.mountState = MountState.UNMOUNTED;
        }
        if (
            phase === RenderNodeCommitPhase.COMMIT_DEL &&
            this.deadNodeSet.size > 0
        ) {
            if (this.deadNodeSet.size === this.liveNodeSet.size) {
                this.element.replaceChildren();
                this.liveNodeSet.clear();
                this.committedNodes = [];
            } else {
                for (const toRemove of this.deadNodeSet) {
                    this.liveNodeSet.delete(toRemove);
                    this.element.removeChild(toRemove);
                }
                this.committedNodes = this.committedNodes.filter(
                    (node) => !this.deadNodeSet.has(node)
                );
            }
            this.deadNodeSet.clear();
        }
        if (
            phase === RenderNodeCommitPhase.COMMIT_INS &&
            this.liveNodes.length > 0
        ) {
            // At this point, we've removed all the nodes from this.element and this.committedNodes
            // And need to insert nodes in this.liveNodes in order to this.committedNodes
            //
            // Scan through this.liveNodes, if we hit the end corresponding missing node  and this.liveNodes
            let liveIndex = 0;
            while (liveIndex < this.liveNodes.length) {
                if (liveIndex >= this.committedNodes.length) {
                    // We're at the end of the committed set, insert the remaining liveNodes at the end
                    this.insertBefore(
                        this.liveNodes.slice(liveIndex),
                        liveIndex
                    );
                    break;
                }
                if (
                    this.liveNodes[liveIndex] !== this.committedNodes[liveIndex]
                ) {
                    let checkIndex = liveIndex + 1;
                    while (
                        checkIndex < this.liveNodes.length &&
                        checkIndex < this.committedNodes.length &&
                        this.liveNodes[checkIndex] !==
                            this.committedNodes[liveIndex]
                    ) {
                        checkIndex++;
                    }
                    // [liveIndex...checkIndex] need to be inserted before this.committedNodes[liveIndex]
                    this.insertBefore(
                        this.liveNodes.slice(liveIndex, checkIndex),
                        liveIndex
                    );
                    liveIndex = checkIndex;
                    continue;
                }
                liveIndex++;
            }
        }
        if (
            phase === RenderNodeCommitPhase.COMMIT_MOUNT &&
            this.refProp &&
            this.mountState === MountState.NOTIFY_MOUNT
        ) {
            if (this.refProp instanceof Ref) {
                this.refProp.current = this.element;
            } else if (typeof this.refProp === 'function') {
                this.refProp(this.element);
            }
            this.mountState = MountState.MOUNTED;
        }
    }

    clone(): RenderNode {
        return new PortalRenderNode(
            this.element,
            this.childrenRenderNode.clone(),
            this.refProp
        );
    }

    private insertBefore(nodes: Node[], targetIndex: number) {
        let toInsert: Node | undefined;
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
            this.element.insertBefore(
                toInsert,
                this.element.childNodes[targetIndex] || null
            );
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
        own(this, this.childrenRenderNode);
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

        disown(this, this.childrenRenderNode);
        removeRenderNode(this);
        this.emitter = undefined;
    }
}

/**
 * Renders the result of a calculation
 */
export class CalculationRenderNode implements RenderNode {
    declare _type: typeof RenderNodeType;
    declare _commitPhase: RenderNodeCommitPhase;
    private declare error?: Error | undefined;
    private declare renderNode?: RenderNode | undefined;
    private declare calculation: Calculation<any>;
    private declare calculationSubscription?: (() => void) | undefined;
    private declare isMounted: boolean;
    private declare emitter?: NodeEmitter | undefined;
    private declare parentXmlNamespace?: string | undefined;

    constructor(calculation: Calculation<any>, debugName?: string) {
        this._type = RenderNodeType;
        this._commitPhase = RenderNodeCommitPhase.COMMIT_MOUNT;
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

    setMounted(isMounted: boolean) {
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
            this.error = undefined;
            this.renderNode = undefined;
        }
    }

    subscribe(
        error: Error,
        val: undefined,
        addPostAction: (postAction: () => void) => void
    ): void;
    subscribe(
        error: undefined,
        val: any,
        addPostAction: (postAction: () => void) => void
    ): void;
    subscribe(
        error: undefined | Error,
        val: undefined | any,
        addPostAction: (postAction: () => void) => void
    ): void {
        this.cleanPrior();
        if (error) {
            this.error = error;
            if (this.emitter) {
                this.emitter(error);
            } else {
                log.warn(
                    'Unhandled error on detached CalculationRenderNode',
                    val
                );
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
    commit(phase: RenderNodeCommitPhase) {
        if (isNextRenderNodeCommitPhase(this._commitPhase, phase)) {
            this.renderNode?.commit(phase);
            this._commitPhase = phase;
        }
    }

    clone(): RenderNode {
        return new CalculationRenderNode(this.calculation);
    }

    // Retainable
    declare __debugName: string;
    declare __refcount: number;
    __alive() {
        try {
            this.calculationSubscription = this.calculation[
                CalculationSubscribeWithPostAction
            ](this.subscribe);
            this.subscribe(undefined, this.calculation.get(), (action) => {
                action();
            });
        } catch (e) {
            this.subscribe(wrapError(e), undefined, (action) => {
                action();
            });
        }
    }
    __dead() {
        this.calculationSubscription?.();
        this.calculationSubscription = undefined;
        this.cleanPrior();
        removeRenderNode(this);
        this.emitter = undefined;
    }
}

export class CollectionRenderNode implements RenderNode {
    declare _type: typeof RenderNodeType;
    declare _commitPhase: RenderNodeCommitPhase;
    private declare children: RenderNode[];
    private declare batchEvents?:
        | [childIndex: number, childEvent: ArrayEvent<Node>][]
        | undefined;
    private declare childIndex: Map<RenderNode, number>;
    private declare slotSizes: number[];
    private declare collection: Collection<any> | View<any>;
    private declare unsubscribe?: () => void;
    private declare isMounted: boolean;
    private declare emitter?: NodeEmitter | undefined;
    private declare parentXmlNamespace?: string | undefined;

    constructor(collection: Collection<any> | View<any>, debugName?: string) {
        this._type = RenderNodeType;
        this._commitPhase = RenderNodeCommitPhase.COMMIT_MOUNT;
        this.collection = collection;
        this.children = [];
        this.childIndex = new Map();
        this.slotSizes = [];
        this.isMounted = false;

        this.__debugName = debugName ?? `rendercoll`;
        this.__refcount = 0;
    }

    batchChildEvents(fn: () => void) {
        this.batchEvents = [];
        fn();
        this.batchEvents.sort((a, b) => a[0] - b[0]);
        let eventIndex = 0;
        let shiftAmount = 0;
        for (
            let slotIndex = 0;
            eventIndex < this.batchEvents.length &&
            slotIndex < this.slotSizes.length;
            ++slotIndex
        ) {
            while (
                eventIndex < this.batchEvents.length &&
                this.batchEvents[eventIndex][0] === slotIndex
            ) {
                const event = this.batchEvents[eventIndex][1];
                if (event.type === ArrayEventType.SPLICE) {
                    this.slotSizes[slotIndex] +=
                        (event.items?.length ?? 0) - event.count;
                }
                if (this.emitter) {
                    shiftEventBy(shiftAmount, event);
                    this.emitter(event);
                }
                eventIndex++;
            }
            shiftAmount += this.slotSizes[slotIndex];
        }
        this.batchEvents = undefined;
    }

    attach(emitter: NodeEmitter, parentXmlNamespace: string) {
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

        this.emitter = undefined;
    }

    handleChildEvent(event: ArrayEvent<Node> | Error, child: RenderNode) {
        if (this.emitter) {
            if (!(event instanceof Error)) {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                const index = this.childIndex.get(child)!;
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

    setMounted(isMounted: boolean) {
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

    private releaseChild(child: RenderNode) {
        if (this.emitter) {
            if (this.isMounted) {
                child.setMounted(false);
            }
            child.detach();
        }
        disown(this, child);
    }
    private retainChild(child: RenderNode) {
        own(this, child);
        if (this.emitter && this.parentXmlNamespace) {
            child.attach(
                (event) => this.handleChildEvent(event, child),
                this.parentXmlNamespace
            );
            if (this.isMounted) {
                child.setMounted(true);
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
                    this.batchChildEvents(() => {
                        for (const child of removed) {
                            this.releaseChild(child);
                            this.childIndex.delete(child);
                        }
                    });
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
                    this.batchChildEvents(() => {
                        for (const child of newChildren) {
                            this.retainChild(child);
                        }
                    });
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

    commit(phase: RenderNodeCommitPhase) {
        if (isNextRenderNodeCommitPhase(this._commitPhase, phase)) {
            for (const child of this.children) {
                child.commit(phase);
            }
            this._commitPhase = phase;
        }
    }

    clone(): RenderNode {
        return new CollectionRenderNode(this.collection);
    }

    // Retainable
    declare __debugName: string;
    declare __refcount: number;
    __alive() {
        retain(this.collection);
        this.unsubscribe = this.collection.subscribe(
            this.handleCollectionEvent
        );

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
        this.emitter = undefined;
        removeRenderNode(this);
    }
}

function isCalculationRenderNode(val: any): val is Calculation<JSXNode> {
    return val instanceof Calculation;
}

export class FieldRenderNode implements RenderNode {
    declare _type: typeof RenderNodeType;
    declare _commitPhase: RenderNodeCommitPhase;
    private declare field: Field<any>;
    private declare child: RenderNode;
    private declare isMounted: boolean;
    private declare emitter?: NodeEmitter | undefined;
    private declare parentXmlNamespace?: string | undefined;
    private declare unsubscribe?: () => void;

    constructor(field: Field<any>, debugName?: string) {
        this._type = RenderNodeType;
        this._commitPhase = RenderNodeCommitPhase.COMMIT_MOUNT;
        this.field = field;
        this.child = emptyRenderNode;
        this.isMounted = false;

        this.__debugName = debugName ?? `renderfield`;
        this.__refcount = 0;
    }

    attach(emitter: NodeEmitter, parentXmlNamespace: string) {
        this.emitter = emitter;
        this.parentXmlNamespace = parentXmlNamespace;

        this.child.attach(emitter, parentXmlNamespace);
    }

    detach() {
        this.child.detach();
        this.emitter = undefined;
    }

    setMounted(isMounted: boolean) {
        this.isMounted = isMounted;
        this.child.setMounted(isMounted);
    }

    retain() {
        retain(this);
    }
    release() {
        release(this);
    }

    private retainChild(child: RenderNode) {
        own(this, child);
        if (this.emitter && this.parentXmlNamespace) {
            child.attach(this.emitter, this.parentXmlNamespace);
            if (this.isMounted) {
                child.setMounted(true);
            }
        }
    }

    commit(phase: RenderNodeCommitPhase) {
        if (isNextRenderNodeCommitPhase(this._commitPhase, phase)) {
            this.child.commit(phase);
            this._commitPhase = phase;
        }
    }

    clone(): RenderNode {
        return new FieldRenderNode(this.field);
    }

    // Retainable
    declare __debugName: string;
    declare __refcount: number;

    releaseChild() {
        if (this.emitter) {
            if (this.isMounted) {
                this.child.setMounted(false);
            }
            this.child.detach();
        }
        disown(this, this.child);
    }

    renderChild(val: any) {
        this.releaseChild();
        this.child = renderJSXNode(val);

        // Retain
        own(this, this.child);
        if (this.emitter && this.parentXmlNamespace) {
            this.child.attach(this.emitter, this.parentXmlNamespace);
            if (this.isMounted) {
                this.child.setMounted(true);
            }
        }
    }

    __alive() {
        retain(this.field);
        this.unsubscribe = this.field.subscribe((val) => this.renderChild(val));

        untrackReads(() => {
            this.renderChild(this.field.get());
        });
    }
    __dead() {
        this.unsubscribe?.();
        this.releaseChild();
        this.emitter = undefined;
        removeRenderNode(this);
    }
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
    if (jsxNode instanceof Node) {
        return new ForeignRenderNode(jsxNode);
    }
    if (Array.isArray(jsxNode)) {
        return new ArrayRenderNode(jsxNode.map((item) => renderJSXNode(item)));
    }
    if (jsxNode instanceof Field) {
        return new FieldRenderNode(jsxNode);
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

export function mount(
    target: Element | ShadowRoot,
    node: RenderNode
): () => void {
    const children: RenderNode[] = [];
    for (let i = 0; i < target.childNodes.length; ++i) {
        children.push(new ForeignRenderNode(target.childNodes[i]));
    }
    children.push(node);
    const root = new PortalRenderNode(
        target,
        new ArrayRenderNode(children),
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
    }, (target instanceof Element ? target.namespaceURI : target.host.namespaceURI) ?? HTML_NAMESPACE);
    if (syncError) {
        release(root);
        throw syncError;
    }
    // WE HAVE A CONUNDRUM!
    // - When setMounted(true) is called _before_ flushing, IntrinsicObserver callbacks work as expected; but component onMount notifications fail
    // - When setMounted(true) is called _after_ flushing, IntrinsicObserver callbacks fail; but component onMount notifications work as expected
    // This is probably because the interaction between mounting and commit is very awkward when dealing with DOM nodes
    // - For onMount lifecycles to be able to observe nodes in the DOM, onMount needs to happen __after__ commit
    // - ref={} callbacks should be equivalent to onMount
    // - refRaw={} callbacks should be equivalent to retain() (NEEDS BETTER NAME)
    root.setMounted(true);
    flush();
    return () => {
        root.setMounted(false);
        root.detach();
        flush();
        release(root);
    };
}

export function defineCustomElement<
    TKeys extends string,
    TShadowMode extends 'open' | 'closed' | undefined = undefined,
    TExtends extends
        | keyof typeof webComponentTagConstructors
        | undefined = undefined
>(options: WebComponentOptions<TKeys, TShadowMode, TExtends>) {
    const Superclass = options.extends
        ? webComponentTagConstructors[options.extends]
        : HTMLElement;
    class GooeyCustomElement extends Superclass {
        _unmount: (() => void) | undefined;
        _portalRenderNode: PortalRenderNode | null;
        _renderNode: WebComponentRenderNode<
            TKeys,
            TShadowMode,
            TExtends
        > | null;
        static formAssociated = options.formAssociated || false;
        static observedAttributes = options.observedAttributes ?? [];
        _rendered: boolean;

        constructor() {
            super();
            const shadowRoot = options.shadowMode
                ? this.attachShadow({
                      delegatesFocus: options.delegatesFocus,
                      mode: options.shadowMode,
                  })
                : undefined;

            this._renderNode = new WebComponentRenderNode(
                this,
                shadowRoot,
                options
            );
            this._portalRenderNode = new PortalRenderNode(
                shadowRoot || this,
                this._renderNode,
                undefined
            );
            this._rendered = false;
        }

        destroy() {
            this._portalRenderNode?.setMounted(false);
            this._portalRenderNode?.release();
            this._portalRenderNode = null;
            this._renderNode = null;
        }

        connectedCallback() {
            if (!this._rendered) {
                let children: Node[] = [];
                if (!options.shadowMode) {
                    children = Array.from(this.childNodes);
                    this.replaceChildren();
                    this._renderNode?.childrenField.set(children);
                }
                this._portalRenderNode?.retain();
                this._portalRenderNode?.attach((event) => {
                    if (event instanceof Error) {
                        log.error('Unhandled web component mount error', event);
                    }
                }, this.namespaceURI ?? HTML_NAMESPACE);
                this._rendered = true;
            }
            this._portalRenderNode?.setMounted(true);
        }

        disconnectedCallback() {
            this._portalRenderNode?.setMounted(false);
        }

        adoptedCallback() {
            // TODO: what should be done here?
        }

        attributeChangedCallback(
            name: string,
            oldValue: string,
            newValue: string
        ) {
            this._renderNode?.fields[name as TKeys].set(newValue);
        }
    }
    if (options.extends) {
        customElements.define(options.tagName, GooeyCustomElement, {
            extends: options.extends,
        });
    } else {
        customElements.define(options.tagName, GooeyCustomElement);
    }
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
    declare _commitPhase: RenderNodeCommitPhase;
    declare nodeCallback?: IntrinsicObserverNodeCallback | undefined;
    declare elementCallback?: IntrinsicObserverElementCallback | undefined;
    declare child: ArrayRenderNode;
    declare childNodes: Node[];
    declare pendingMount: Node[];
    declare pendingUnmount: Node[];
    declare emitter?: NodeEmitter | undefined;
    declare isMounted: boolean;

    constructor(
        nodeCallback: IntrinsicObserverNodeCallback | undefined,
        elementCallback: IntrinsicObserverElementCallback | undefined,
        child: ArrayRenderNode,
        debugName?: string
    ) {
        this._type = RenderNodeType;
        this._commitPhase = RenderNodeCommitPhase.COMMIT_MOUNT;
        this.nodeCallback = nodeCallback;
        this.elementCallback = elementCallback;
        this.child = child;
        this.childNodes = [];
        this.pendingMount = [];
        this.pendingUnmount = [];
        this.isMounted = false;

        this.__debugName = debugName ?? `lifecycleobserver`;
        this.__refcount = 0;
    }

    notify(node: Node, type: IntrinsicObserverEventType) {
        switch (type) {
            case IntrinsicObserverEventType.MOUNT:
                this.pendingMount.push(node);
                break;
            case IntrinsicObserverEventType.UNMOUNT:
                this.pendingUnmount.push(node);
                break;
            default:
                log.assertExhausted(type);
        }
        dirtyRenderNode(this);
    }

    commit(phase: RenderNodeCommitPhase) {
        if (!isNextRenderNodeCommitPhase(this._commitPhase, phase)) {
            return;
        }
        this.child.commit(phase);
        this._commitPhase = phase;

        switch (phase) {
            case RenderNodeCommitPhase.COMMIT_UNMOUNT:
                if (this.pendingUnmount.length > 0) {
                    for (const node of this.pendingUnmount) {
                        this.nodeCallback?.(
                            node,
                            IntrinsicObserverEventType.UNMOUNT
                        );
                        if (node instanceof Element) {
                            this.elementCallback?.(
                                node,
                                IntrinsicObserverEventType.UNMOUNT
                            );
                        }
                    }
                    this.pendingUnmount = [];
                }
                break;
            case RenderNodeCommitPhase.COMMIT_MOUNT:
                if (this.pendingMount.length > 0) {
                    for (const node of this.pendingMount) {
                        this.nodeCallback?.(
                            node,
                            IntrinsicObserverEventType.MOUNT
                        );
                        if (node instanceof Element) {
                            this.elementCallback?.(
                                node,
                                IntrinsicObserverEventType.MOUNT
                            );
                        }
                    }
                    this.pendingMount = [];
                }
                break;
        }
    }

    clone(): RenderNode {
        return new IntrinsicObserverRenderNode(
            this.nodeCallback,
            this.elementCallback,
            this.child.clone() as ArrayRenderNode
        );
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

    setMounted(isMounted: boolean) {
        this.child.setMounted(isMounted);
        this.isMounted = isMounted;
        const event = isMounted
            ? IntrinsicObserverEventType.MOUNT
            : IntrinsicObserverEventType.UNMOUNT;
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

    // Retainable
    declare __debugName: string;
    declare __refcount: number;
    __alive() {
        own(this, this.child);
    }
    __dead() {
        disown(this, this.child);
        removeRenderNode(this);
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
        new ArrayRenderNode(renderJSXChildren(children))
    );
};

export class ComponentRenderNode<TProps> implements RenderNode {
    declare _type: typeof RenderNodeType;
    declare _commitPhase: RenderNodeCommitPhase;
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
    private declare needsMount?: boolean | undefined;

    constructor(
        Component: FunctionComponent<TProps>,
        props: TProps | null | undefined,
        children: JSX.Node[],
        debugName?: string
    ) {
        this._type = RenderNodeType;
        this._commitPhase = RenderNodeCommitPhase.COMMIT_MOUNT;
        this.Component = Component;
        this.props = props;
        this.children = children;
        this.owned = new Set();
        this.isMounted = false;

        this.resultAttached = false;

        this.__debugName = debugName ?? `component(${Component.name})`;
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
                own(this, this.result);
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
                        this.result.setMounted(false);
                    }
                    this.result.detach();
                    this.resultAttached = false;
                }
                disown(this, this.result);
                this.result = undefined;
            }
            const handledResult = this.errorHandler(event);
            this.result = handledResult
                ? renderJSXNode(handledResult)
                : emptyRenderNode;
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

    setMounted(isMounted: boolean) {
        log.assert(this.result, 'Invariant: missing result');
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

    commit(phase: RenderNodeCommitPhase) {
        if (!isNextRenderNodeCommitPhase(this._commitPhase, phase)) {
            return;
        }
        if (this.result && !(this.result instanceof Error)) {
            this.result.commit(phase);
        }
        this._commitPhase = phase;
        if (
            phase === RenderNodeCommitPhase.COMMIT_MOUNT &&
            this.needsMount &&
            this.onMountCallbacks
        ) {
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
            this.needsMount = false;
        }
    }

    clone(props: {} = {}, children: RenderNode[] = []) {
        return new ComponentRenderNode(
            this.Component,
            this.props && props
                ? { ...this.props, ...props }
                : ((props || this.props) as TProps),
            children
        );
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
            disown(this, this.result);
        }
        this.result = undefined;
        for (const item of this.owned) {
            release(item);
        }
        this.emitter = undefined;
        removeRenderNode(this);
    }
}

const webComponentTagConstructors = {
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
    wbr: HTMLElement,
};

type WebComponentShadowSupportedExtends =
    | undefined
    | 'article'
    | 'aside'
    | 'blockquote'
    | 'body'
    | 'div'
    | 'footer'
    | 'h1'
    | 'h2'
    | 'h3'
    | 'h4'
    | 'h5'
    | 'h6'
    | 'header'
    | 'main'
    | 'nav'
    | 'p'
    | 'section'
    | 'span';

interface WebComponentOptions<
    TKeys extends string,
    TShadowMode extends 'open' | 'closed' | undefined,
    TExtends extends keyof typeof webComponentTagConstructors | undefined
> {
    tagName: `${string}-${string}`;
    Component: WebComponent<TKeys, TShadowMode>;
    observedAttributes?: TKeys[] | undefined;
    formAssociated?: boolean | undefined;
    shadowMode?: TExtends extends WebComponentShadowSupportedExtends
        ? TShadowMode
        : undefined;
    delegatesFocus?: boolean | undefined;
    extends?: TExtends;
}

/**
 * Renders a set of children known only at attach time
 */
export class WebComponentChildrenRenderNode implements RenderNode {
    declare _type: typeof RenderNodeType;
    declare _commitPhase: RenderNodeCommitPhase;
    private declare children?: Node[] | undefined;
    private declare emitter?: NodeEmitter | undefined;

    constructor(debugName?: string) {
        this._type = RenderNodeType;
        this._commitPhase = RenderNodeCommitPhase.COMMIT_MOUNT;

        this.__debugName = debugName ?? 'web-component-children';
        this.__refcount = 0;
    }

    detach() {
        if (this.children) {
            this.emitter?.({
                type: ArrayEventType.SPLICE,
                index: 0,
                count: this.children.length,
            });
        }
        this.emitter = undefined;
    }

    setChildren(children: Node[]) {
        if (this.emitter) {
            this.emitter?.({
                type: ArrayEventType.SPLICE,
                index: 0,
                count: this.children?.length ?? 0,
                items: children,
            });
        }
        this.children = children;
    }

    hasChildren() {
        return !!this.children;
    }

    revokeChildren() {
        const children = this.children;
        this.children = undefined;
        return children;
    }

    attach(emitter: NodeEmitter) {
        log.assert(!this.emitter, 'Invariant: Foreign node double attached');
        this.emitter = emitter;
        if (this.children) {
            this.emitter?.({
                type: ArrayEventType.SPLICE,
                index: 0,
                count: 0,
                items: this.children,
            });
        }
    }

    setMounted() {}
    retain() {
        retain(this);
    }
    release() {
        release(this);
    }
    commit(phase: RenderNodeCommitPhase) {
        // No children, no commit action
    }
    clone(): RenderNode {
        return new WebComponentChildrenRenderNode();
    }

    // Retainable
    declare __debugName: string;
    declare __refcount: number;
    __alive() {}
    __dead() {
        this.emitter = undefined;
        removeRenderNode(this);
    }
}

export class WebComponentRenderNode<
    TKeys extends string,
    TShadowMode extends 'open' | 'closed' | undefined,
    TExtends extends keyof typeof webComponentTagConstructors | undefined
> implements RenderNode
{
    declare _type: typeof RenderNodeType;
    declare _commitPhase: RenderNodeCommitPhase;
    declare host: HTMLElement;
    declare shadowRoot: ShadowRoot | undefined;
    declare fields: Record<TKeys, Field<string | undefined>>;
    declare childrenField: Field<Node[] | undefined>;
    declare elementInternals?: ElementInternals;
    declare options: WebComponentOptions<TKeys, TShadowMode, TExtends>;
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
    private declare needsMount?: boolean | undefined;

    constructor(
        host: HTMLElement,
        shadowRoot: ShadowRoot | undefined,
        options: WebComponentOptions<TKeys, TShadowMode, TExtends>,
        debugName?: string
    ) {
        this._type = RenderNodeType;
        this._commitPhase = RenderNodeCommitPhase.COMMIT_MOUNT;
        this.host = host;
        this.shadowRoot = shadowRoot;
        this.options = options;
        this.childrenField = field<Node[] | undefined>(undefined);
        this.fields = {} as Record<TKeys, Field<string | undefined>>;
        this.options.observedAttributes?.forEach((attr) => {
            this.fields[attr] = field(undefined);
        });

        if (!options.extends) {
            this.elementInternals = this.host.attachInternals();
        }

        this.owned = new Set();
        this.isMounted = false;

        this.resultAttached = false;

        this.__debugName = debugName ?? `web-component(${options.tagName})`;
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
            const lifecycle: WebComponentLifecycle = {
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
                host: this.host,
                elementInternals: this.elementInternals,
                shadowRoot: this.shadowRoot,
                addEventListener: (
                    name: string,
                    handler: (
                        this: HTMLElement,
                        event: Event,
                        el: HTMLElement
                    ) => void,
                    options?: boolean | AddEventListenerOptions
                ) => {
                    const listener = (event: Event) => {
                        handler.call(this.host, event, this.host);
                    };
                    this.host.addEventListener(name, listener, options);
                    const unsubscribe = () => {
                        this.host.removeEventListener(name, listener, options);
                    };
                    if (!this.onDestroyCallbacks) this.onDestroyCallbacks = [];
                    this.onDestroyCallbacks.push(unsubscribe);
                    return unsubscribe;
                },
                bindElementInternalsAttribute: (param, value) => {
                    // @ts-expect-error // for some reason, ariaDescription is missing from the ARIAMixin definition. Probably need to update type dependencies
                    this.elementInternals[param] = dynGet(value);
                    const unsubscribe = dynSubscribe(value, (newValue) => {
                        // @ts-expect-error // for some reason, ariaDescription is missing from the ARIAMixin definition. Probably need to update type dependencies
                        this.elementInternals[param] = value;
                    });
                    if (!this.onDestroyCallbacks) this.onDestroyCallbacks = [];
                    this.onDestroyCallbacks.push(unsubscribe);
                    return unsubscribe;
                },
                bindFormValue: (formValue) => {
                    if (!this.elementInternals) {
                        throw new Error(
                            `ElementInternals not available on custom element ${this.options.tagName}`
                        );
                    }
                    const update = (formValue: FormValue) => {
                        if (
                            typeof formValue === 'string' ||
                            formValue instanceof File ||
                            formValue instanceof FormData
                        ) {
                            this.elementInternals?.setFormValue(formValue);
                        } else {
                            const { value, state } = formValue;
                            if (state === undefined) {
                                this.elementInternals?.setFormValue(value);
                            } else {
                                this.elementInternals?.setFormValue(
                                    value,
                                    state
                                );
                            }
                        }
                    };
                    update(dynGet(formValue));
                    const unsubscribe = dynSubscribe(formValue, (newVal) =>
                        update(newVal)
                    );
                    if (!this.onDestroyCallbacks) this.onDestroyCallbacks = [];
                    this.onDestroyCallbacks.push(unsubscribe);
                    return unsubscribe;
                },
                bindValidity: (validity) => {
                    if (!this.elementInternals) {
                        throw new Error(
                            `ElementInternals not available on custom element ${this.options.tagName}`
                        );
                    }
                    const update = (validity: Validity) => {
                        const { flags, message, anchor } = validity;
                        this.elementInternals?.setValidity(
                            flags,
                            message,
                            anchor
                        );
                    };
                    const val = dynGet(validity);
                    update(val);
                    const unsubscribe = dynSubscribe(validity, (val) =>
                        update(val)
                    );
                    if (!this.onDestroyCallbacks) this.onDestroyCallbacks = [];
                    this.onDestroyCallbacks.push(unsubscribe);
                    return unsubscribe;
                },
                checkValidity: () => {
                    if (!this.elementInternals) {
                        throw new Error(
                            `ElementInternals not available on custom element ${this.options.tagName}`
                        );
                    }
                    this.elementInternals?.checkValidity();
                },
                reportValidity: () => {
                    if (!this.elementInternals) {
                        throw new Error(
                            `ElementInternals not available on custom element ${this.options.tagName}`
                        );
                    }
                    this.elementInternals?.reportValidity();
                },
            };

            const componentProps: any =
                this.options.shadowMode === undefined
                    ? {
                          ...this.fields,
                          children: renderJSXNode(this.childrenField),
                      }
                    : {
                          ...this.fields,
                      };
            const Component = this.options.Component;
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
                own(this, this.result);
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
                        this.result.setMounted(false);
                    }
                    this.result.detach();
                    this.resultAttached = false;
                }
                disown(this, this.result);
                this.result = undefined;
            }
            const handledResult = this.errorHandler(event);
            this.result = handledResult
                ? renderJSXNode(handledResult)
                : emptyRenderNode;
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

    setMounted(isMounted: boolean) {
        log.assert(this.result, 'Invariant: missing result');
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

    commit(phase: RenderNodeCommitPhase) {
        if (!isNextRenderNodeCommitPhase(this._commitPhase, phase)) {
            return;
        }
        if (this.result && !(this.result instanceof Error)) {
            this.result.commit(phase);
        }
        this._commitPhase = phase;
        if (
            phase === RenderNodeCommitPhase.COMMIT_MOUNT &&
            this.needsMount &&
            this.onMountCallbacks
        ) {
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
            this.needsMount = false;
        }
    }

    clone(props: {} = {}, children: RenderNode[] = []) {
        return new WebComponentRenderNode(
            this.host,
            this.shadowRoot,
            this.options
        );
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
            disown(this, this.result);
        }
        this.result = undefined;
        for (const item of this.owned) {
            release(item);
        }
        this.emitter = undefined;
        removeRenderNode(this);
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
