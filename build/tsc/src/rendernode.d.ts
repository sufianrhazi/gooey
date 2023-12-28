import { Retainable } from './engine';
import { RefObjectOrCallback } from './ref';
import { JSXNode } from './jsx';
import type { Dyn } from './dyn';
import { ArrayEvent } from './arrayevent';
import { Calculation } from './calc';
import { Collection, View } from './collection';
import { Field } from './field';
export interface ComponentLifecycle {
    onMount: (callback: () => void) => (() => void) | void;
    onUnmount: (callback: () => void) => void;
    onDestroy: (callback: () => void) => void;
    onError: (handler: (e: Error) => JSX.Element | null) => void;
}
type WebComponentInternalsKey = 'ariaAtomic' | 'ariaAutoComplete' | 'ariaBusy' | 'ariaChecked' | 'ariaColCount' | 'ariaColIndex' | 'ariaColSpan' | 'ariaCurrent' | 'ariaDescription' | 'ariaDisabled' | 'ariaExpanded' | 'ariaHasPopup' | 'ariaHidden' | 'ariaKeyShortcuts' | 'ariaLabel' | 'ariaLevel' | 'ariaLive' | 'ariaModal' | 'ariaMultiLine' | 'ariaMultiSelectable' | 'ariaOrientation' | 'ariaPlaceholder' | 'ariaPosInSet' | 'ariaPressed' | 'ariaReadOnly' | 'ariaRequired' | 'ariaRoleDescription' | 'ariaRowCount' | 'ariaRowIndex' | 'ariaRowSpan' | 'ariaSelected' | 'ariaSetSize' | 'ariaSort' | 'ariaValueMax' | 'ariaValueMin' | 'ariaValueNow' | 'ariaValueText' | 'role' | 'ariaRelevant' | 'ariaRowIndexText' | 'ariaColIndexText';
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
type FormValue = string | File | FormData | {
    value: string | File | FormData;
    state?: string | File | FormData | undefined;
};
export interface WebComponentLifecycle extends ComponentLifecycle {
    host: HTMLElement;
    shadowRoot: ShadowRoot | undefined;
    elementInternals: ElementInternals | undefined;
    addEventListener<K extends keyof HTMLElementEventMap>(type: K, listener: (this: HTMLElement, ev: HTMLElementEventMap[K], el: HTMLElement) => any, options?: boolean | AddEventListenerOptions): () => void;
    addEventListener(type: string, listener: (this: HTMLElement, ev: Event, el: HTMLElement) => any, options?: boolean | AddEventListenerOptions): void;
    bindElementInternalsAttribute: (param: WebComponentInternalsKey, value: Dyn<string | null>) => () => void;
    bindFormValue: (formValue: Dyn<FormValue>) => () => void;
    bindValidity: (validity: Dyn<Validity>) => () => void;
    checkValidity: () => void;
    reportValidity: () => void;
}
declare const UnusedSymbolForChildrenOmission: unique symbol;
export type EmptyProps = {
    [UnusedSymbolForChildrenOmission]?: boolean;
};
export type Component<TProps = {}> = FunctionComponent<TProps> | ClassComponentConstructor<TProps>;
export type WebComponent<TKeys extends string, TShadowMode extends 'open' | 'closed' | undefined> = WebFunctionComponent<TKeys, TShadowMode>;
type WebComponentProps<TKeys extends string, TShadowMode extends 'open' | 'closed' | undefined> = TShadowMode extends undefined ? {
    [Key in TKeys]?: Dyn<string | undefined>;
} & {
    children: JSXNode;
} : {
    [Key in TKeys]?: Dyn<string | undefined>;
};
export type WebFunctionComponent<TKeys extends string, TShadowMode extends 'open' | 'closed' | undefined> = (props: WebComponentProps<TKeys, TShadowMode>, lifecycle: WebComponentLifecycle) => JSX.Element | null;
export type FunctionComponent<TProps = {}> = (props: TProps & EmptyProps, lifecycle: ComponentLifecycle) => JSX.Element | null;
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
export declare function isClassComponent(val: any): val is ClassComponentConstructor<unknown>;
export declare class ClassComponent<TProps = EmptyProps> implements ClassComponentInterface {
    props: TProps;
    constructor(props: TProps);
    render?(): JSX.Element | null;
    onMount?(): (() => void) | void;
    onUnmount?(): void;
    onDestroy?(): void;
    onError?(e: Error): JSX.Element | null;
}
export type NodeEmitter = (event: ArrayEvent<Node> | Error) => void;
export declare const RenderNodeType: unique symbol;
export declare enum RenderNodeCommitPhase {
    COMMIT_UNMOUNT = 0,
    COMMIT_DEL = 1,
    COMMIT_INS = 2,
    COMMIT_MOUNT = 3
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
/**
 * Renders nothing
 */
export declare class EmptyRenderNode implements RenderNode {
    _type: typeof RenderNodeType;
    _commitPhase: RenderNodeCommitPhase;
    constructor();
    detach(): void;
    attach(): void;
    setMounted(): void;
    retain(): void;
    release(): void;
    commit(): void;
    clone(): RenderNode;
    __debugName: string;
    __refcount: number;
    __alive(): void;
    __dead(): void;
}
/**
 * Only need one of nothing
 */
export declare const emptyRenderNode: EmptyRenderNode;
/**
 * Renders a Text DOM node
 */
export declare class TextRenderNode implements RenderNode {
    _type: typeof RenderNodeType;
    _commitPhase: RenderNodeCommitPhase;
    private text;
    private emitter?;
    constructor(string: string, debugName?: string);
    detach(): void;
    attach(emitter: NodeEmitter): void;
    setMounted(): void;
    retain(): void;
    release(): void;
    commit(): void;
    clone(): RenderNode;
    __debugName: string;
    __refcount: number;
    __alive(): void;
    __dead(): void;
}
/**
 * Renders a foreign managed DOM node
 */
export declare class ForeignRenderNode implements RenderNode {
    _type: typeof RenderNodeType;
    _commitPhase: RenderNodeCommitPhase;
    private node;
    private emitter?;
    constructor(node: Node, debugName?: string);
    detach(): void;
    attach(emitter: NodeEmitter): void;
    setMounted(): void;
    retain(): void;
    release(): void;
    commit(): void;
    clone(): RenderNode;
    __debugName: string;
    __refcount: number;
    __alive(): void;
    __dead(): void;
}
/**
 * Renders an array of render nodes
 */
export declare class ArrayRenderNode implements RenderNode {
    _type: typeof RenderNodeType;
    _commitPhase: RenderNodeCommitPhase;
    private children;
    private slotSizes;
    private attached;
    constructor(children: RenderNode[], debugName?: string);
    detach(): void;
    attach(emitter: NodeEmitter, parentXmlNamespace: string): void;
    setMounted(isMounted: boolean): void;
    retain(): void;
    release(): void;
    commit(phase: RenderNodeCommitPhase): void;
    clone(): RenderNode;
    __debugName: string;
    __refcount: number;
    __alive(): void;
    __dead(): void;
}
/**
 * Renders an intrinsic DOM node
 */
export declare class IntrinsicRenderNode implements RenderNode {
    _type: typeof RenderNodeType;
    _commitPhase: RenderNodeCommitPhase;
    private tagName;
    private element?;
    private emitter?;
    private detachedError?;
    private xmlNamespace?;
    private props?;
    private children;
    private portalRenderNode?;
    private boundAttributes?;
    private subscriptions?;
    constructor(tagName: string, props: Record<string, any> | undefined, children: RenderNode[], debugName?: string);
    private createElement;
    private setProp;
    private handleEvent;
    detach(): void;
    ensureElement(xmlNamespace: string, childXmlNamespace: string): Element;
    attach(emitter: NodeEmitter, parentXmlNamespace: string): void;
    setMounted(isMounted: boolean): void;
    retain(): void;
    release(): void;
    commit(phase: RenderNodeCommitPhase): void;
    clone(props: {}, children?: RenderNode[]): IntrinsicRenderNode;
    __debugName: string;
    __refcount: number;
    __alive(): void;
    __dead(): void;
}
export declare class PortalRenderNode implements RenderNode {
    _type: typeof RenderNodeType;
    _commitPhase: RenderNodeCommitPhase;
    private element;
    private childEvents;
    private committedNodes;
    private liveNodes;
    private liveNodeSet;
    private deadNodeSet;
    private refProp?;
    private mountState?;
    private emitter?;
    private childrenRenderNode;
    private calculations?;
    private calculationSubscriptions?;
    constructor(element: Element | ShadowRoot, children: RenderNode, refProp: RefObjectOrCallback<Element | ShadowRoot | undefined> | null | undefined, debugName?: string);
    private handleEvent;
    detach(): void;
    attach(emitter: NodeEmitter, parentXmlNamespace: string): void;
    setMounted(isMounted: boolean): void;
    commit(phase: RenderNodeCommitPhase): void;
    clone(): RenderNode;
    private insertBefore;
    retain(): void;
    release(): void;
    __debugName: string;
    __refcount: number;
    __alive(): void;
    __dead(): void;
}
/**
 * Renders the result of a calculation
 */
export declare class CalculationRenderNode implements RenderNode {
    _type: typeof RenderNodeType;
    _commitPhase: RenderNodeCommitPhase;
    private error?;
    private renderNode?;
    private calculation;
    private calculationSubscription?;
    private isMounted;
    private emitter?;
    private parentXmlNamespace?;
    constructor(calculation: Calculation<any>, debugName?: string);
    detach(): void;
    attach(emitter: NodeEmitter, parentXmlNamespace: string): void;
    setMounted(isMounted: boolean): void;
    retain(): void;
    release(): void;
    cleanPrior(): void;
    subscribe(error: Error, val: undefined, addPostAction: (postAction: () => void) => void): void;
    subscribe(error: undefined, val: any, addPostAction: (postAction: () => void) => void): void;
    commit(phase: RenderNodeCommitPhase): void;
    clone(): RenderNode;
    __debugName: string;
    __refcount: number;
    __alive(): void;
    __dead(): void;
}
export declare class CollectionRenderNode implements RenderNode {
    _type: typeof RenderNodeType;
    _commitPhase: RenderNodeCommitPhase;
    private children;
    private batchEvents?;
    private childIndex;
    private slotSizes;
    private collection;
    private unsubscribe?;
    private isMounted;
    private emitter?;
    private parentXmlNamespace?;
    constructor(collection: Collection<any> | View<any>, debugName?: string);
    batchChildEvents(fn: () => void): void;
    attach(emitter: NodeEmitter, parentXmlNamespace: string): void;
    detach(): void;
    handleChildEvent(event: ArrayEvent<Node> | Error, child: RenderNode): void;
    setMounted(isMounted: boolean): void;
    retain(): void;
    release(): void;
    private releaseChild;
    private retainChild;
    private handleCollectionEvent;
    commit(phase: RenderNodeCommitPhase): void;
    clone(): RenderNode;
    __debugName: string;
    __refcount: number;
    __alive(): void;
    __dead(): void;
}
export declare class FieldRenderNode implements RenderNode {
    _type: typeof RenderNodeType;
    _commitPhase: RenderNodeCommitPhase;
    private field;
    private child;
    private isMounted;
    private emitter?;
    private parentXmlNamespace?;
    private unsubscribe?;
    constructor(field: Field<any>, debugName?: string);
    attach(emitter: NodeEmitter, parentXmlNamespace: string): void;
    detach(): void;
    setMounted(isMounted: boolean): void;
    retain(): void;
    release(): void;
    private retainChild;
    commit(phase: RenderNodeCommitPhase): void;
    clone(): RenderNode;
    __debugName: string;
    __refcount: number;
    releaseChild(): void;
    renderChild(val: any): void;
    __alive(): void;
    __dead(): void;
}
export declare function renderJSXNode(jsxNode: JSX.Node): RenderNode;
export declare function renderJSXChildren(children?: JSX.Node | JSX.Node[]): RenderNode[];
export declare function mount(target: Element | ShadowRoot, node: RenderNode): () => void;
export declare function defineCustomElement<TKeys extends string, TShadowMode extends 'open' | 'closed' | undefined = undefined, TExtends extends keyof typeof webComponentTagConstructors | undefined = undefined>(options: WebComponentOptions<TKeys, TShadowMode, TExtends>): void;
export declare enum IntrinsicObserverEventType {
    MOUNT = "mount",
    UNMOUNT = "unmount"
}
export type IntrinsicObserverNodeCallback = (node: Node, event: IntrinsicObserverEventType) => void;
export type IntrinsicObserverElementCallback = (element: Element, event: IntrinsicObserverEventType) => void;
export declare class IntrinsicObserverRenderNode implements RenderNode {
    _type: typeof RenderNodeType;
    _commitPhase: RenderNodeCommitPhase;
    nodeCallback?: IntrinsicObserverNodeCallback | undefined;
    elementCallback?: IntrinsicObserverElementCallback | undefined;
    child: ArrayRenderNode;
    childNodes: Node[];
    pendingMount: Node[];
    pendingUnmount: Node[];
    emitter?: NodeEmitter | undefined;
    isMounted: boolean;
    constructor(nodeCallback: IntrinsicObserverNodeCallback | undefined, elementCallback: IntrinsicObserverElementCallback | undefined, child: ArrayRenderNode, debugName?: string);
    notify(node: Node, type: IntrinsicObserverEventType): void;
    commit(phase: RenderNodeCommitPhase): void;
    clone(): RenderNode;
    handleEvent(event: ArrayEvent<Node> | Error): void;
    detach(): void;
    attach(emitter: NodeEmitter, parentXmlNamespace: string): void;
    setMounted(isMounted: boolean): void;
    retain(): void;
    release(): void;
    __debugName: string;
    __refcount: number;
    __alive(): void;
    __dead(): void;
}
export declare const IntrinsicObserver: Component<{
    nodeCallback?: IntrinsicObserverNodeCallback;
    elementCallback?: IntrinsicObserverElementCallback;
    children?: JSX.Node | JSX.Node[];
}>;
export declare class ComponentRenderNode<TProps> implements RenderNode {
    _type: typeof RenderNodeType;
    _commitPhase: RenderNodeCommitPhase;
    Component: FunctionComponent<TProps>;
    props: TProps | null | undefined;
    children: JSX.Node[];
    result?: RenderNode | Error | undefined;
    resultAttached: boolean;
    onMountCallbacks?: (() => (() => void) | void)[];
    onUnmountCallbacks?: (() => void)[];
    onDestroyCallbacks?: (() => void)[];
    owned: Set<Retainable>;
    errorHandler?: ((e: Error) => RenderNode | null) | undefined;
    emitter?: NodeEmitter | undefined;
    parentXmlNamespace?: string | undefined;
    isMounted: boolean;
    private needsMount?;
    constructor(Component: FunctionComponent<TProps>, props: TProps | null | undefined, children: JSX.Node[], debugName?: string);
    detach(): void;
    private ensureResult;
    attach(emitter: NodeEmitter, parentXmlNamespace: string): void;
    handleEvent: (event: ArrayEvent<Node> | Error) => void;
    setMounted(isMounted: boolean): void;
    commit(phase: RenderNodeCommitPhase): void;
    clone(props?: {}, children?: RenderNode[]): ComponentRenderNode<TProps>;
    retain(): void;
    release(): void;
    __debugName: string;
    __refcount: number;
    __alive(): void;
    __dead(): void;
}
declare const webComponentTagConstructors: {
    a: {
        new (): HTMLAnchorElement;
        prototype: HTMLAnchorElement;
    };
    abbr: {
        new (): HTMLElement;
        prototype: HTMLElement;
    };
    address: {
        new (): HTMLElement;
        prototype: HTMLElement;
    };
    area: {
        new (): HTMLAreaElement;
        prototype: HTMLAreaElement;
    };
    article: {
        new (): HTMLElement;
        prototype: HTMLElement;
    };
    aside: {
        new (): HTMLElement;
        prototype: HTMLElement;
    };
    audio: {
        new (): HTMLAudioElement;
        prototype: HTMLAudioElement;
    };
    b: {
        new (): HTMLElement;
        prototype: HTMLElement;
    };
    base: {
        new (): HTMLBaseElement;
        prototype: HTMLBaseElement;
    };
    bdi: {
        new (): HTMLElement;
        prototype: HTMLElement;
    };
    bdo: {
        new (): HTMLElement;
        prototype: HTMLElement;
    };
    blockquote: {
        new (): HTMLQuoteElement;
        prototype: HTMLQuoteElement;
    };
    body: {
        new (): HTMLBodyElement;
        prototype: HTMLBodyElement;
    };
    br: {
        new (): HTMLBRElement;
        prototype: HTMLBRElement;
    };
    button: {
        new (): HTMLButtonElement;
        prototype: HTMLButtonElement;
    };
    canvas: {
        new (): HTMLCanvasElement;
        prototype: HTMLCanvasElement;
    };
    caption: {
        new (): HTMLTableCaptionElement;
        prototype: HTMLTableCaptionElement;
    };
    cite: {
        new (): HTMLElement;
        prototype: HTMLElement;
    };
    code: {
        new (): HTMLElement;
        prototype: HTMLElement;
    };
    col: {
        new (): HTMLTableColElement;
        prototype: HTMLTableColElement;
    };
    colgroup: {
        new (): HTMLTableColElement;
        prototype: HTMLTableColElement;
    };
    data: {
        new (): HTMLDataElement;
        prototype: HTMLDataElement;
    };
    datalist: {
        new (): HTMLDataListElement;
        prototype: HTMLDataListElement;
    };
    dd: {
        new (): HTMLElement;
        prototype: HTMLElement;
    };
    del: {
        new (): HTMLModElement;
        prototype: HTMLModElement;
    };
    details: {
        new (): HTMLDetailsElement;
        prototype: HTMLDetailsElement;
    };
    dfn: {
        new (): HTMLElement;
        prototype: HTMLElement;
    };
    dialog: {
        new (): HTMLDialogElement;
        prototype: HTMLDialogElement;
    };
    div: {
        new (): HTMLDivElement;
        prototype: HTMLDivElement;
    };
    dl: {
        new (): HTMLDListElement;
        prototype: HTMLDListElement;
    };
    dt: {
        new (): HTMLElement;
        prototype: HTMLElement;
    };
    em: {
        new (): HTMLElement;
        prototype: HTMLElement;
    };
    embed: {
        new (): HTMLEmbedElement;
        prototype: HTMLEmbedElement;
    };
    fieldset: {
        new (): HTMLFieldSetElement;
        prototype: HTMLFieldSetElement;
    };
    figcaption: {
        new (): HTMLElement;
        prototype: HTMLElement;
    };
    figure: {
        new (): HTMLElement;
        prototype: HTMLElement;
    };
    footer: {
        new (): HTMLElement;
        prototype: HTMLElement;
    };
    form: {
        new (): HTMLFormElement;
        prototype: HTMLFormElement;
    };
    h1: {
        new (): HTMLHeadingElement;
        prototype: HTMLHeadingElement;
    };
    h2: {
        new (): HTMLHeadingElement;
        prototype: HTMLHeadingElement;
    };
    h3: {
        new (): HTMLHeadingElement;
        prototype: HTMLHeadingElement;
    };
    h4: {
        new (): HTMLHeadingElement;
        prototype: HTMLHeadingElement;
    };
    h5: {
        new (): HTMLHeadingElement;
        prototype: HTMLHeadingElement;
    };
    h6: {
        new (): HTMLHeadingElement;
        prototype: HTMLHeadingElement;
    };
    head: {
        new (): HTMLHeadElement;
        prototype: HTMLHeadElement;
    };
    header: {
        new (): HTMLElement;
        prototype: HTMLElement;
    };
    hgroup: {
        new (): HTMLElement;
        prototype: HTMLElement;
    };
    hr: {
        new (): HTMLHRElement;
        prototype: HTMLHRElement;
    };
    html: {
        new (): HTMLHtmlElement;
        prototype: HTMLHtmlElement;
    };
    i: {
        new (): HTMLElement;
        prototype: HTMLElement;
    };
    iframe: {
        new (): HTMLIFrameElement;
        prototype: HTMLIFrameElement;
    };
    img: {
        new (): HTMLImageElement;
        prototype: HTMLImageElement;
    };
    input: {
        new (): HTMLInputElement;
        prototype: HTMLInputElement;
    };
    ins: {
        new (): HTMLModElement;
        prototype: HTMLModElement;
    };
    kbd: {
        new (): HTMLElement;
        prototype: HTMLElement;
    };
    label: {
        new (): HTMLLabelElement;
        prototype: HTMLLabelElement;
    };
    legend: {
        new (): HTMLLegendElement;
        prototype: HTMLLegendElement;
    };
    li: {
        new (): HTMLLIElement;
        prototype: HTMLLIElement;
    };
    link: {
        new (): HTMLLinkElement;
        prototype: HTMLLinkElement;
    };
    main: {
        new (): HTMLElement;
        prototype: HTMLElement;
    };
    map: {
        new (): HTMLMapElement;
        prototype: HTMLMapElement;
    };
    mark: {
        new (): HTMLElement;
        prototype: HTMLElement;
    };
    menu: {
        new (): HTMLMenuElement;
        prototype: HTMLMenuElement;
    };
    meta: {
        new (): HTMLMetaElement;
        prototype: HTMLMetaElement;
    };
    meter: {
        new (): HTMLMeterElement;
        prototype: HTMLMeterElement;
    };
    nav: {
        new (): HTMLElement;
        prototype: HTMLElement;
    };
    noscript: {
        new (): HTMLElement;
        prototype: HTMLElement;
    };
    object: {
        new (): HTMLObjectElement;
        prototype: HTMLObjectElement;
    };
    ol: {
        new (): HTMLOListElement;
        prototype: HTMLOListElement;
    };
    optgroup: {
        new (): HTMLOptGroupElement;
        prototype: HTMLOptGroupElement;
    };
    option: {
        new (): HTMLOptionElement;
        prototype: HTMLOptionElement;
    };
    output: {
        new (): HTMLOutputElement;
        prototype: HTMLOutputElement;
    };
    p: {
        new (): HTMLParagraphElement;
        prototype: HTMLParagraphElement;
    };
    picture: {
        new (): HTMLPictureElement;
        prototype: HTMLPictureElement;
    };
    pre: {
        new (): HTMLPreElement;
        prototype: HTMLPreElement;
    };
    progress: {
        new (): HTMLProgressElement;
        prototype: HTMLProgressElement;
    };
    q: {
        new (): HTMLQuoteElement;
        prototype: HTMLQuoteElement;
    };
    rp: {
        new (): HTMLElement;
        prototype: HTMLElement;
    };
    rt: {
        new (): HTMLElement;
        prototype: HTMLElement;
    };
    ruby: {
        new (): HTMLElement;
        prototype: HTMLElement;
    };
    s: {
        new (): HTMLElement;
        prototype: HTMLElement;
    };
    samp: {
        new (): HTMLElement;
        prototype: HTMLElement;
    };
    script: {
        new (): HTMLScriptElement;
        prototype: HTMLScriptElement;
        supports(type: string): boolean;
    };
    section: {
        new (): HTMLElement;
        prototype: HTMLElement;
    };
    select: {
        new (): HTMLSelectElement;
        prototype: HTMLSelectElement;
    };
    slot: {
        new (): HTMLSlotElement;
        prototype: HTMLSlotElement;
    };
    small: {
        new (): HTMLElement;
        prototype: HTMLElement;
    };
    source: {
        new (): HTMLSourceElement;
        prototype: HTMLSourceElement;
    };
    span: {
        new (): HTMLSpanElement;
        prototype: HTMLSpanElement;
    };
    strong: {
        new (): HTMLElement;
        prototype: HTMLElement;
    };
    style: {
        new (): HTMLStyleElement;
        prototype: HTMLStyleElement;
    };
    sub: {
        new (): HTMLElement;
        prototype: HTMLElement;
    };
    summary: {
        new (): HTMLElement;
        prototype: HTMLElement;
    };
    sup: {
        new (): HTMLElement;
        prototype: HTMLElement;
    };
    table: {
        new (): HTMLTableElement;
        prototype: HTMLTableElement;
    };
    tbody: {
        new (): HTMLTableSectionElement;
        prototype: HTMLTableSectionElement;
    };
    td: {
        new (): HTMLTableCellElement;
        prototype: HTMLTableCellElement;
    };
    template: {
        new (): HTMLTemplateElement;
        prototype: HTMLTemplateElement;
    };
    textarea: {
        new (): HTMLTextAreaElement;
        prototype: HTMLTextAreaElement;
    };
    tfoot: {
        new (): HTMLTableSectionElement;
        prototype: HTMLTableSectionElement;
    };
    th: {
        new (): HTMLTableCellElement;
        prototype: HTMLTableCellElement;
    };
    thead: {
        new (): HTMLTableSectionElement;
        prototype: HTMLTableSectionElement;
    };
    time: {
        new (): HTMLTimeElement;
        prototype: HTMLTimeElement;
    };
    title: {
        new (): HTMLTitleElement;
        prototype: HTMLTitleElement;
    };
    tr: {
        new (): HTMLTableRowElement;
        prototype: HTMLTableRowElement;
    };
    track: {
        new (): HTMLTrackElement;
        prototype: HTMLTrackElement;
        readonly ERROR: number;
        readonly LOADED: number;
        readonly LOADING: number;
        readonly NONE: number;
    };
    u: {
        new (): HTMLElement;
        prototype: HTMLElement;
    };
    ul: {
        new (): HTMLUListElement;
        prototype: HTMLUListElement;
    };
    var: {
        new (): HTMLElement;
        prototype: HTMLElement;
    };
    video: {
        new (): HTMLVideoElement;
        prototype: HTMLVideoElement;
    };
    wbr: {
        new (): HTMLElement;
        prototype: HTMLElement;
    };
};
type WebComponentShadowSupportedExtends = undefined | 'article' | 'aside' | 'blockquote' | 'body' | 'div' | 'footer' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'header' | 'main' | 'nav' | 'p' | 'section' | 'span';
interface WebComponentOptions<TKeys extends string, TShadowMode extends 'open' | 'closed' | undefined, TExtends extends keyof typeof webComponentTagConstructors | undefined> {
    tagName: `${string}-${string}`;
    Component: WebComponent<TKeys, TShadowMode>;
    hydrateTemplateChild?: boolean | undefined;
    observedAttributes?: TKeys[] | undefined;
    formAssociated?: boolean | undefined;
    shadowMode?: TExtends extends WebComponentShadowSupportedExtends ? TShadowMode : undefined;
    delegatesFocus?: boolean | undefined;
    extends?: TExtends;
}
/**
 * Renders a set of children known only at attach time
 */
export declare class WebComponentChildrenRenderNode implements RenderNode {
    _type: typeof RenderNodeType;
    _commitPhase: RenderNodeCommitPhase;
    private children?;
    private emitter?;
    constructor(debugName?: string);
    detach(): void;
    setChildren(children: Node[]): void;
    hasChildren(): boolean;
    revokeChildren(): Node[] | undefined;
    attach(emitter: NodeEmitter): void;
    setMounted(): void;
    retain(): void;
    release(): void;
    commit(phase: RenderNodeCommitPhase): void;
    clone(): RenderNode;
    __debugName: string;
    __refcount: number;
    __alive(): void;
    __dead(): void;
}
export declare class WebComponentRenderNode<TKeys extends string, TShadowMode extends 'open' | 'closed' | undefined, TExtends extends keyof typeof webComponentTagConstructors | undefined> implements RenderNode {
    _type: typeof RenderNodeType;
    _commitPhase: RenderNodeCommitPhase;
    host: HTMLElement;
    shadowRoot: ShadowRoot | undefined;
    fields: Record<TKeys, Field<string | undefined>>;
    childrenField: Field<Node[] | undefined>;
    elementInternals?: ElementInternals | undefined;
    options: WebComponentOptions<TKeys, TShadowMode, TExtends>;
    result?: RenderNode | Error | undefined;
    resultAttached: boolean;
    onMountCallbacks?: (() => (() => void) | void)[];
    onUnmountCallbacks?: (() => void)[];
    onDestroyCallbacks?: (() => void)[];
    owned: Set<Retainable>;
    errorHandler?: ((e: Error) => RenderNode | null) | undefined;
    emitter?: NodeEmitter | undefined;
    parentXmlNamespace?: string | undefined;
    isMounted: boolean;
    private needsMount?;
    constructor(host: HTMLElement, shadowRoot: ShadowRoot | undefined, elementInternals: ElementInternals | undefined, options: WebComponentOptions<TKeys, TShadowMode, TExtends>, debugName?: string);
    detach(): void;
    private ensureResult;
    attach(emitter: NodeEmitter, parentXmlNamespace: string): void;
    handleEvent: (event: ArrayEvent<Node> | Error) => void;
    setMounted(isMounted: boolean): void;
    commit(phase: RenderNodeCommitPhase): void;
    clone(props?: {}, children?: RenderNode[]): WebComponentRenderNode<TKeys, TShadowMode, TExtends>;
    retain(): void;
    release(): void;
    __debugName: string;
    __refcount: number;
    __alive(): void;
    __dead(): void;
}
export declare function classComponentToFunctionComponentRenderNode<TProps>(Component: ClassComponentConstructor<TProps>, props: TProps, children: JSX.Node[]): ComponentRenderNode<TProps>;
export {};
//# sourceMappingURL=rendernode.d.ts.map