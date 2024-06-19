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
import {
    HTML_NAMESPACE,
    ELEMENT_NAMESPACE_GUESS,
    elementNamespaceTransitionMap,
} from './xmlnamespace';
import { RefObjectOrCallback, Ref } from './ref';
import { JSXNode, setAttribute, assignProp } from './jsx';
import { dynGet, dynSubscribe } from './dyn';
import type { Dyn } from './dyn';
import {
    ArrayEvent,
    ArrayEventType,
    applyArrayEvent,
    addArrayEvent,
} from './arrayevent';
import { SlotSizes } from './slotsizes';
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

interface CustomRenderNodeHandlers {
    /**
     * Called when the RenderNode is created, before it is attached and mounted
     */
    onAlive?: () => void;
    /**
     * Called before the RenderNode is destroyed; it may still be attached
     */
    onDestroy?: () => void;
    /**
     * Called just after the RenderNode is attached to a parent RenderNode -- it may start emitting ArrayEvent<Node> | Error events
     */
    onAttach?: (emitter: NodeEmitter, parentXmlNamespace: string) => void;
    /**
     * Called just before the RenderNode is detached from a parent RenderNode -- it may synchronously emit ArrayEvent<Node> | Error events, but cannot emit after it returns.
     */
    onDetach?: (emitter: NodeEmitter) => void;
    /**
     * Called just after the RenderNode is mounted to the DOM (specifically has been attached transitively to a mount() point)
     */
    onMount?: () => void;
    /**
     * Called just before the RenderNode is mounted to the DOM (specifically has been attached transitively to a mount() point)
     */
    onUnmount?: () => void;
    /**
     * Called when the RenderNode has received an error event from any child; return true to not pass the event to its parent
     */
    onError?: (error: Error) => boolean | void;
    /**
     * Called when the RenderNode has received an ArrayEvent<Node> event from any child; return true to not pass the event to its parent
     */
    onEvent?: (event: ArrayEvent<Node>) => boolean | void;
    /**
     * Called when the RenderNode is committed (all children have already been committed)
     */
    onCommit?: (phase: RenderNodeCommitPhase) => void;
    /**
     * Called when the RenderNode has received an ArrayEvent<Node> event from a specific child; return true to not pass the event to its parent
     */
    onChildEvent?: (
        child: RenderNode,
        event: ArrayEvent<Node>
    ) => boolean | void;
    /**
     * Called when the RenderNode is cloned; callers should clone the provided children (if passed to the cloned node) and return a new RenderNode
     */
    clone?: (props?: {}, children?: RenderNode[]) => RenderNode;
}

/**
 * CustomRenderNode: a generic render node
 */
export class CustomRenderNode implements RenderNode {
    declare _type: typeof RenderNodeType;
    declare _commitPhase: RenderNodeCommitPhase;
    declare handlers: CustomRenderNodeHandlers;
    declare emitter?: NodeEmitter | undefined;
    declare isMounted: boolean;
    declare slotSizes: SlotSizes<RenderNode>;
    declare parentXmlNamespace: string;

    constructor(
        handlers: CustomRenderNodeHandlers,
        children: RenderNode[],
        debugName?: string
    ) {
        this._type = RenderNodeType;
        this._commitPhase = RenderNodeCommitPhase.COMMIT_MOUNT;
        this.handlers = handlers;
        this.isMounted = false;
        this.slotSizes = new SlotSizes(children);
        this.parentXmlNamespace = HTML_NAMESPACE;

        this.__debugName = debugName ?? `custom`;
        this.__refcount = 0;
    }

    commit(phase: RenderNodeCommitPhase) {
        if (!isNextRenderNodeCommitPhase(this._commitPhase, phase)) {
            return;
        }
        for (const child of this.slotSizes.items) {
            child.commit(phase);
        }
        this._commitPhase = phase;
        this.handlers.onCommit?.(phase);
    }

    clone(props?: {}, children?: RenderNode[]): RenderNode {
        if (this.handlers.clone) {
            return this.handlers.clone(props, children);
        }
        const clonedChildren = this.slotSizes.items.map((child) =>
            child.clone()
        );
        return new CustomRenderNode(this.handlers, clonedChildren);
    }

    sortChildren(from: number, indexes: number[]) {
        const event = this.slotSizes.sort(from, indexes);
        this.emitter?.(event);
    }

    moveChildren(from: number, count: number, to: number) {
        const event = this.slotSizes.move(from, count, to);
        this.emitter?.(event);
    }

    spliceChildren(index: number, count: number, children: RenderNode[]) {
        // unmount & detach children before removing from slots (so they may emit their cleanup events)
        for (let i = index; i < index + count; ++i) {
            const child = this.slotSizes.items[i];
            if (this.isMounted) {
                child.setMounted(false);
            }
            if (this.emitter && this.parentXmlNamespace) {
                child.detach();
            }
        }
        const { removed } = this.slotSizes.splice(index, count, children);
        for (const child of removed) {
            disown(this, child);
        }
        for (const child of children) {
            own(this, child);
            if (this.emitter && this.parentXmlNamespace) {
                child.attach(
                    (e) => this.handleChildEvent(child, e),
                    this.parentXmlNamespace
                );
            }
            if (this.isMounted) {
                child.setMounted(true);
            }
        }
    }

    private handleChildEvent(
        child: RenderNode,
        event: ArrayEvent<Node> | Error
    ) {
        if (event instanceof Error) {
            this.handleEvent(event);
        } else if (!this.handlers.onChildEvent?.(child, event)) {
            this.handleEvent(
                event instanceof Error
                    ? event
                    : this.slotSizes.applyEvent(child, event)
            );
        }
    }

    private handleEvent(event: ArrayEvent<Node> | Error) {
        if (event instanceof Error) {
            if (!this.handlers.onError?.(event)) {
                if (this.emitter) {
                    this.emitter(event);
                } else {
                    log.warn(
                        'Unhandled error on detached CustomRenderNode',
                        event
                    );
                }
            }
            return;
        }
        if (!this.handlers.onEvent?.(event)) {
            log.assert(
                this.emitter,
                'Unexpected event on detached CustomRenderNode'
            );
            this.emitter(event);
        }
    }

    detach() {
        log.assert(this.emitter, 'double detached');
        this.handlers.onDetach?.(this.emitter);
        for (const child of this.slotSizes.items) {
            child.detach();
        }
        this.emitter = undefined;
        this.parentXmlNamespace = HTML_NAMESPACE;
    }

    attach(emitter: NodeEmitter, parentXmlNamespace: string) {
        log.assert(!this.emitter, 'Invariant: double attached');
        this.emitter = emitter;
        this.parentXmlNamespace = parentXmlNamespace;
        for (const child of this.slotSizes.items) {
            child.attach((event) => {
                this.handleChildEvent(child, event);
            }, parentXmlNamespace);
        }
        this.handlers.onAttach?.(emitter, parentXmlNamespace);
    }

    setMounted(isMounted: boolean) {
        this.isMounted = isMounted;
        for (const child of this.slotSizes.items) {
            child.setMounted(isMounted);
        }
        if (isMounted) {
            this.handlers.onMount?.();
        } else {
            this.handlers.onUnmount?.();
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
        for (const child of this.slotSizes.items) {
            own(this, child);
        }
        this.handlers.onAlive?.();
    }
    __dead() {
        this.handlers.onDestroy?.();
        for (const child of this.slotSizes.items) {
            disown(this, child);
        }
        removeRenderNode(this);
        this.emitter = undefined;
    }
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
    setMounted() {}
    retain() {}
    release() {}
    commit() {}
    clone(): RenderNode {
        return emptyRenderNode;
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
export function TextRenderNode(str: string, debugName?: string): RenderNode {
    const textNode = document.createTextNode(str);
    return new CustomRenderNode(
        {
            onAttach: (emitter) => {
                emitter({
                    type: ArrayEventType.SPLICE,
                    index: 0,
                    count: 0,
                    items: [textNode],
                });
            },
            onDetach: (emitter) => {
                emitter({
                    type: ArrayEventType.SPLICE,
                    index: 0,
                    count: 1,
                });
            },
            clone: () => {
                return TextRenderNode(str, debugName);
            },
        },
        [],
        debugName ?? 'text'
    );
}

/**
 * Renders a foreign managed DOM node
 */
export function ForeignRenderNode(node: Node, debugName?: string): RenderNode {
    return new CustomRenderNode(
        {
            onAttach: (emitter) => {
                emitter({
                    type: ArrayEventType.SPLICE,
                    index: 0,
                    count: 0,
                    items: [node],
                });
            },
            onDetach: (emitter) => {
                emitter({
                    type: ArrayEventType.SPLICE,
                    index: 0,
                    count: 1,
                });
            },
            clone: () => {
                return ForeignRenderNode(node, debugName);
            },
        },
        [],
        debugName ?? 'foreign'
    );
}

/**
 * Renders an array of render nodes
 */
export function ArrayRenderNode(
    children: RenderNode[],
    debugName?: string
): RenderNode {
    return new CustomRenderNode({}, children, debugName);
}

const EventProps = [
    { prefix: 'on:', param: false },
    { prefix: 'oncapture:', param: true },
    { prefix: 'onpassive:', param: { passive: true } },
] as const;

/**
 * Renders an intrinsic DOM node
 */
export function IntrinsicRenderNode(
    tagName: string,
    props: Record<string, any> | undefined,
    childRenderNode: RenderNode,
    debugName?: string
): RenderNode {
    let boundAttributes:
        | undefined
        | Map<string, Calculation<unknown> | Field<unknown>>;
    let subscriptions: undefined | Set<() => void>;
    let element: undefined | Element;
    let elementXmlNamespace: undefined | string;
    let isMounted = false;
    let portalRenderNode: undefined | RenderNode;
    let attachedState:
        | undefined
        | {
              emitter: NodeEmitter;
              parentXmlNamespace: string;
          };
    let detachedError: undefined | Error;

    function handleEvent(event: ArrayEvent<Node> | Error) {
        if (event instanceof Error) {
            if (attachedState) {
                // Pass up errors while attached
                attachedState.emitter(event);
            } else {
                // We are capable of handling errors while detached
                log.warn(
                    'Unhandled error on detached IntrinsicRenderNode',
                    debugName,
                    event
                );
                detachedError = event;
                return true;
            }
        } else {
            log.assert(
                false,
                'unexpected event in IntrinsicRenderNode from PortalRenderNode'
            );
        }
    }

    function ensureElement(xmlNamespace: string, childXmlNamespace: string) {
        if (!element || xmlNamespace !== elementXmlNamespace) {
            elementXmlNamespace = xmlNamespace;
            element = createElement(xmlNamespace);

            if (portalRenderNode) {
                if (isMounted) {
                    portalRenderNode.setMounted(false);
                }
                portalRenderNode.detach();
                disown(customRenderNode, portalRenderNode);
            }
            portalRenderNode = PortalRenderNode(
                element,
                childRenderNode,
                props?.ref
            );
            own(customRenderNode, portalRenderNode);
            portalRenderNode.attach(handleEvent, childXmlNamespace);
            if (isMounted) {
                portalRenderNode.setMounted(true);
            }
        }
        return element;
    }

    function createElement(xmlNamespace: string) {
        let element: Element;
        if (
            tagName in webComponentTagConstructors &&
            typeof props?.is === 'string'
        ) {
            element = document.createElement(tagName, {
                is: props.is,
            });
        } else {
            element = document.createElementNS(xmlNamespace, tagName);
        }
        if (props) {
            for (const [prop, val] of Object.entries(props)) {
                if (prop === 'ref') continue; // specially handled by PortalRenderNode
                if (prop === 'is') continue; // specially handled above
                if (
                    EventProps.some(({ prefix, param }) => {
                        if (prop.startsWith(prefix)) {
                            if (val) {
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
                            }
                            return true;
                        }
                        return false;
                    })
                ) {
                    continue;
                }
                if (val instanceof Calculation) {
                    if (!boundAttributes) {
                        boundAttributes = new Map();
                    }
                    boundAttributes.set(prop, val);
                } else if (val instanceof Field) {
                    if (!boundAttributes) {
                        boundAttributes = new Map();
                    }
                    boundAttributes.set(prop, val);
                } else {
                    setProp(element, prop, val);
                }
            }
            if (boundAttributes) {
                if (!subscriptions) {
                    subscriptions = new Set();
                }
                for (const [prop, boundAttr] of boundAttributes.entries()) {
                    boundAttr.retain();
                    const currentVal = boundAttr.get();
                    setProp(element, prop, currentVal);
                    if (boundAttr instanceof Field) {
                        subscriptions.add(
                            boundAttr.subscribe((updatedVal) => {
                                setProp(element, prop, updatedVal);
                            })
                        );
                    } else {
                        subscriptions.add(
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
                                        setProp(element, prop, updatedVal);
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

    function setProp(element: Element, prop: string, val: unknown) {
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

    const customRenderNode = new CustomRenderNode(
        {
            onAttach: (emitter, parentXmlNamespace) => {
                attachedState = { emitter, parentXmlNamespace };
                if (detachedError) {
                    emitter(detachedError);
                    return;
                }
                const namespaceTransition =
                    elementNamespaceTransitionMap[parentXmlNamespace]?.[
                        tagName
                    ];
                const xmlNamespace =
                    namespaceTransition?.node ?? parentXmlNamespace;
                const childXmlNamespace =
                    namespaceTransition?.children ?? parentXmlNamespace;

                element = ensureElement(xmlNamespace, childXmlNamespace);

                emitter({
                    type: ArrayEventType.SPLICE,
                    index: 0,
                    count: 0,
                    items: [element],
                });
            },
            onDetach: (emitter) => {
                emitter({
                    type: ArrayEventType.SPLICE,
                    index: 0,
                    count: 1,
                });
                attachedState = undefined;
            },
            onMount: () => {
                isMounted = true;
                portalRenderNode?.setMounted(true);
            },
            onUnmount: () => {
                isMounted = false;
                portalRenderNode?.setMounted(false);
            },
            onCommit: (phase) => {
                portalRenderNode?.commit(phase);
            },
            clone: (adjustedProps?: {}, newChildren?: RenderNode[]) => {
                return IntrinsicRenderNode(
                    tagName,
                    adjustedProps ? { ...props, ...adjustedProps } : props,
                    newChildren
                        ? ArrayRenderNode(newChildren ?? [])
                        : childRenderNode.clone()
                );
            },
            onAlive: () => {
                // At this point in time, we don't know for sure what the correct XML namespace is, as this could be an SVG
                // looking element that eventually gets placed within an SVG tree, which ought to result in an
                // SVGUnknownElement. So we take an educated guess;
                const xmlNamespaceGuess =
                    ELEMENT_NAMESPACE_GUESS[tagName] || HTML_NAMESPACE;

                // foreignObject is special; it should be created with an SVG namespace but children should have a HTML
                // namespace
                ensureElement(
                    xmlNamespaceGuess,
                    tagName === 'foreignObject'
                        ? HTML_NAMESPACE
                        : xmlNamespaceGuess
                );
            },
            onDestroy: () => {
                if (boundAttributes) {
                    for (const calculation of boundAttributes.values()) {
                        release(calculation);
                    }
                }
                if (subscriptions) {
                    for (const unsubscribe of subscriptions) {
                        unsubscribe();
                    }
                    subscriptions.clear();
                }

                element = undefined;
                if (portalRenderNode) {
                    disown(customRenderNode, portalRenderNode);
                    portalRenderNode = undefined;
                }
            },
        },
        [],
        debugName ?? `intrinsic(${tagName})`
    );
    return customRenderNode;
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

export function PortalRenderNode(
    element: Element | ShadowRoot,
    childrenRenderNode: RenderNode,
    refProp:
        | RefObjectOrCallback<Element | ShadowRoot | undefined>
        | null
        | undefined,
    debugName?: string
): RenderNode {
    let childEvents: ArrayEvent<Node>[] = [];
    let committedNodes: Node[] = [];
    const liveNodes: Node[] = [];
    const liveNodeSet: Set<Node> = new Set();
    const deadNodeSet: Set<Node> = new Set();
    let mountState: MountState | undefined;
    let calculations: Map<string, Calculation<any>> | undefined;
    let calculationSubscriptions: Set<() => void> | undefined;

    if (refProp) {
        mountState = MountState.UNMOUNTED;
    }

    function insertBefore(nodes: Node[], targetIndex: number) {
        let toInsert: Node | undefined;
        if (nodes.length === 1) {
            toInsert = nodes[0];
            liveNodeSet.add(nodes[0]);
            committedNodes.splice(targetIndex, 0, toInsert);
        } else if (nodes.length > 1) {
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

    const customRenderNode = new CustomRenderNode(
        {
            onEvent: (event: ArrayEvent<Node>) => {
                addArrayEvent(childEvents, event);
                // TODO: how do non-gooey CustomRenderNodes participate in the commit lifecycle?
                // Do we export dirtyRenderNode?
                dirtyRenderNode(customRenderNode);
                return true;
            },
            onMount: () => {
                if (refProp) {
                    dirtyRenderNode(customRenderNode);
                    mountState = MountState.NOTIFY_MOUNT;
                }
            },
            onUnmount: () => {
                if (refProp) {
                    dirtyRenderNode(customRenderNode);
                    mountState = MountState.NOTIFY_UNMOUNT;
                }
            },
            onCommit: (phase: RenderNodeCommitPhase) => {
                if (
                    phase === RenderNodeCommitPhase.COMMIT_UNMOUNT &&
                    childEvents.length > 0
                ) {
                    // Prep received events
                    const toProcess = childEvents;
                    childEvents = [];
                    for (const childEvent of toProcess) {
                        const removed = applyArrayEvent(liveNodes, childEvent);
                        for (const toRemove of removed) {
                            if (liveNodeSet.has(toRemove)) {
                                deadNodeSet.add(toRemove);
                            }
                        }
                    }
                }
                if (
                    phase === RenderNodeCommitPhase.COMMIT_UNMOUNT &&
                    refProp &&
                    mountState === MountState.NOTIFY_UNMOUNT
                ) {
                    if (refProp instanceof Ref) {
                        refProp.current = undefined;
                    } else if (typeof refProp === 'function') {
                        refProp(undefined);
                    }
                    mountState = MountState.UNMOUNTED;
                }
                if (
                    phase === RenderNodeCommitPhase.COMMIT_DEL &&
                    deadNodeSet.size > 0
                ) {
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
                if (
                    phase === RenderNodeCommitPhase.COMMIT_INS &&
                    liveNodes.length > 0
                ) {
                    // At this point, we've removed all the nodes from element and committedNodes
                    // And need to insert nodes in liveNodes in order to committedNodes
                    //
                    // Scan through liveNodes, if we hit the end corresponding missing node  and liveNodes
                    let liveIndex = 0;
                    while (liveIndex < liveNodes.length) {
                        if (liveIndex >= committedNodes.length) {
                            // We're at the end of the committed set, insert the remaining liveNodes at the end
                            insertBefore(liveNodes.slice(liveIndex), liveIndex);
                            break;
                        }
                        if (
                            liveNodes[liveIndex] !== committedNodes[liveIndex]
                        ) {
                            let checkIndex = liveIndex + 1;
                            while (
                                checkIndex < liveNodes.length &&
                                checkIndex < committedNodes.length &&
                                liveNodes[checkIndex] !==
                                    committedNodes[liveIndex]
                            ) {
                                checkIndex++;
                            }
                            // [liveIndex...checkIndex] need to be inserted before committedNodes[liveIndex]
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
                if (
                    phase === RenderNodeCommitPhase.COMMIT_MOUNT &&
                    refProp &&
                    mountState === MountState.NOTIFY_MOUNT
                ) {
                    if (refProp instanceof Ref) {
                        refProp.current = element;
                    } else if (typeof refProp === 'function') {
                        refProp(element);
                    }
                    mountState = MountState.MOUNTED;
                }
            },
            clone(): RenderNode {
                log.assert(
                    false,
                    "Attempted to clone a PortalRenderNode -- this operation doesn't make sense"
                );
            },
            onDestroy: () => {
                if (calculations) {
                    for (const calculation of calculations.values()) {
                        release(calculation);
                    }
                }
                if (calculationSubscriptions) {
                    for (const unsubscribe of calculationSubscriptions) {
                        unsubscribe();
                    }
                    calculationSubscriptions.clear();
                }
            },
        },
        [childrenRenderNode],
        `mount:${
            element instanceof Element
                ? element.tagName
                : `shadow:${element.host.tagName}`
        }`
    );
    return customRenderNode;
}

/**
 * Renders the result of a calculation
 */
export function CalculationRenderNode(
    calculation: Calculation<any>,
    debugName?: string
): RenderNode {
    let calculationError: Error | undefined;
    let calculationSubscription: (() => void) | undefined;
    let childRenderNode: RenderNode = emptyRenderNode;
    let nodeEmitter: undefined | NodeEmitter;

    function subscribe(
        error: undefined | Error,
        val: undefined | any,
        addPostAction: (postAction: () => void) => void
    ): void {
        disown(customRenderNode, childRenderNode);
        customRenderNode.spliceChildren(0, 1, []);
        if (error) {
            calculationError = error;
            if (nodeEmitter) {
                nodeEmitter(error);
            } else {
                log.warn(
                    'Unhandled error on detached CalculationRenderNode',
                    val
                );
            }
        } else {
            addPostAction(() => {
                childRenderNode = renderJSXNode(val);
                own(customRenderNode, childRenderNode);
                customRenderNode.spliceChildren(0, 0, [childRenderNode]);
            });
        }
    }

    const customRenderNode = new CustomRenderNode(
        {
            onDetach: () => {
                nodeEmitter = undefined;
            },
            onAttach: (emitter) => {
                nodeEmitter = emitter;
                if (calculationError) {
                    emitter(calculationError);
                }
            },
            clone: () => {
                return CalculationRenderNode(calculation, debugName);
            },
            onAlive: () => {
                try {
                    calculationSubscription =
                        calculation[CalculationSubscribeWithPostAction](
                            subscribe
                        );
                    subscribe(undefined, calculation.get(), (action) => {
                        action();
                    });
                } catch (e) {
                    subscribe(wrapError(e), undefined, (action) => {
                        action();
                    });
                }
            },
            onDestroy: () => {
                calculationError = undefined;
                calculationSubscription?.();
                calculationSubscription = undefined;
                disown(customRenderNode, childRenderNode);
                childRenderNode = emptyRenderNode;
                nodeEmitter = undefined;
            },
        },
        [childRenderNode],
        debugName ?? `rendercalc:${calculation.__debugName}`
    );
    return customRenderNode;
}

export function CollectionRenderNode(
    collection: Collection<any> | View<any>,
    debugName?: string
): RenderNode {
    let unsubscribe: undefined | (() => void);
    function handleEvent(events: ArrayEvent<any>[]) {
        for (const event of events) {
            switch (event.type) {
                case ArrayEventType.SPLICE:
                    customRenderNode.spliceChildren(
                        event.index,
                        event.count,
                        event.items?.map((item) => renderJSXNode(item)) ?? []
                    );
                    break;
                case ArrayEventType.MOVE:
                    customRenderNode.moveChildren(
                        event.from,
                        event.count,
                        event.to
                    );
                    break;
                case ArrayEventType.SORT:
                    customRenderNode.sortChildren(event.from, event.indexes);
                    break;
            }
        }
    }
    const customRenderNode = new CustomRenderNode(
        {
            onAlive: () => {
                retain(collection);
                unsubscribe = collection.subscribe(handleEvent);
                untrackReads(() => {
                    customRenderNode.spliceChildren(
                        0,
                        0,
                        collection.map((item) => renderJSXNode(item))
                    );
                });
            },
            onDestroy: () => {
                unsubscribe?.();
                release(collection);
            },
        },
        [],
        debugName ?? `CollectionRenderNode(${collection.__debugName})`
    );

    return customRenderNode;
}

function isCalculationRenderNode(val: any): val is Calculation<JSXNode> {
    return val instanceof Calculation;
}

export function FieldRenderNode(
    field: Field<any>,
    debugName?: string
): RenderNode {
    let subscription: (() => void) | undefined;
    let childRenderNode: RenderNode = emptyRenderNode;

    function subscribe(val: undefined | any): void {
        disown(customRenderNode, childRenderNode);
        childRenderNode = renderJSXNode(val);
        own(customRenderNode, childRenderNode);
        customRenderNode.spliceChildren(0, 1, [childRenderNode]);
    }

    const customRenderNode = new CustomRenderNode(
        {
            clone: () => {
                return FieldRenderNode(field, debugName);
            },
            onAlive: () => {
                subscription = field.subscribe(subscribe);
                subscribe(field.get());
            },
            onDestroy: () => {
                subscription?.();
                subscription = undefined;
                disown(customRenderNode, childRenderNode);
                childRenderNode = emptyRenderNode;
            },
        },
        [childRenderNode],
        debugName ?? `FieldRenderNode(${field.__debugName})`
    );
    return customRenderNode;
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
        return CalculationRenderNode(jsxNode);
    }
    if (isCollectionOrViewRenderNode(jsxNode)) {
        return CollectionRenderNode(jsxNode);
    }
    if (jsxNode instanceof Node) {
        return ForeignRenderNode(jsxNode);
    }
    if (Array.isArray(jsxNode)) {
        return ArrayRenderNode(jsxNode.map((item) => renderJSXNode(item)));
    }
    if (jsxNode instanceof Field) {
        return FieldRenderNode(jsxNode);
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
        return TextRenderNode(jsxNode);
    }
    if (typeof jsxNode === 'number' || typeof jsxNode === 'bigint') {
        return TextRenderNode(jsxNode.toString());
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
        children.push(ForeignRenderNode(target.childNodes[i]));
    }
    children.push(node);
    const root = PortalRenderNode(
        target,
        ArrayRenderNode(children),
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
    class GooeyCustomElement extends Superclass implements Retainable {
        __debugName: string;
        __refcount: number;
        _originalChildren: Node[] | null;
        _unmount: (() => void) | undefined;
        _portalRenderNode: RenderNode | null;
        _renderNode: RenderNode | null;
        _childrenField: Field<Node[] | undefined>;
        _fields: Record<TKeys, Field<string | undefined>>;
        static formAssociated = options.formAssociated || false;
        static observedAttributes = options.observedAttributes ?? [];

        constructor() {
            super();
            const shadowRoot = options.shadowMode
                ? this.attachShadow({
                      delegatesFocus: options.delegatesFocus,
                      mode: options.shadowMode,
                  })
                : undefined;

            const elementInternals = options.extends
                ? undefined
                : this.attachInternals();

            this._childrenField = field<Node[] | undefined>(undefined);
            this._fields = {} as Record<TKeys, Field<string | undefined>>;
            options.observedAttributes?.forEach((attr) => {
                this._fields[attr] = field(undefined);
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
                undefined
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
            if (
                options.hydrateTemplateChild !== false &&
                this.children.length === 1 &&
                this.children[0] instanceof HTMLTemplateElement
            ) {
                this._originalChildren = Array.from(this.childNodes);
                this.replaceChildren(
                    ...this._originalChildren.map((node) =>
                        node instanceof HTMLTemplateElement
                            ? node.content
                            : node
                    )
                );
            }
            let children: Node[] = [];
            if (!options.shadowMode) {
                children = Array.from(this.childNodes);
                this.replaceChildren();
                this._childrenField.set(children);
            }
            this._portalRenderNode?.retain();
            this._portalRenderNode?.attach((event) => {
                if (event instanceof Error) {
                    log.error('Unhandled web component mount error', event);
                }
            }, this.namespaceURI ?? HTML_NAMESPACE);
        }

        retain() {
            retain(this);
        }

        release() {
            release(this);
        }

        connectedCallback() {
            this.retain();
            this._portalRenderNode?.setMounted(true);
        }

        disconnectedCallback() {
            this._portalRenderNode?.setMounted(false);
            this.release();
        }

        adoptedCallback() {
            // TODO: what should be done here?
        }

        attributeChangedCallback(
            name: string,
            oldValue: string,
            newValue: string
        ) {
            this._fields[name as TKeys].set(newValue);
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

export function IntrinsicObserverRenderNode(
    nodeCallback: IntrinsicObserverNodeCallback | undefined,
    elementCallback: IntrinsicObserverElementCallback | undefined,
    child: RenderNode,
    debugName?: string
): RenderNode {
    const nodes: Node[] = [];
    const pendingEvent = new Map<Node, IntrinsicObserverEventType>();

    function notify(node: Node, eventType: IntrinsicObserverEventType) {
        nodeCallback?.(node, eventType);
        if (node instanceof Element) {
            elementCallback?.(node, eventType);
        }
    }
    const customRenderNode = new CustomRenderNode(
        {
            onEvent: (event) => {
                for (const removedNode of applyArrayEvent(nodes, event)) {
                    pendingEvent.set(
                        removedNode,
                        IntrinsicObserverEventType.UNMOUNT
                    );
                    dirtyRenderNode(customRenderNode);
                }
                if (event.type === ArrayEventType.SPLICE && event.items) {
                    for (const addedNode of event.items) {
                        pendingEvent.set(
                            addedNode,
                            IntrinsicObserverEventType.MOUNT
                        );
                    }
                    dirtyRenderNode(customRenderNode);
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
                    pendingEvent.set(node, IntrinsicObserverEventType.MOUNT);
                    dirtyRenderNode(customRenderNode);
                }
            },
            onUnmount: () => {
                for (const node of nodes) {
                    pendingEvent.set(node, IntrinsicObserverEventType.UNMOUNT);
                    dirtyRenderNode(customRenderNode);
                }
            },
            onCommit: (phase) => {
                switch (phase) {
                    case RenderNodeCommitPhase.COMMIT_UNMOUNT:
                        for (const [node, event] of pendingEvent.entries()) {
                            if (event === IntrinsicObserverEventType.UNMOUNT) {
                                notify(
                                    node,
                                    IntrinsicObserverEventType.UNMOUNT
                                );
                            }
                        }
                        break;
                    case RenderNodeCommitPhase.COMMIT_MOUNT:
                        for (const [node, event] of pendingEvent.entries()) {
                            if (event === IntrinsicObserverEventType.MOUNT) {
                                notify(node, IntrinsicObserverEventType.MOUNT);
                            }
                        }
                        pendingEvent.clear();
                        break;
                }
            },
        },
        [child],
        debugName ?? 'IntrinsicObserverRenderNode'
    );
    return customRenderNode;
}

export const IntrinsicObserver: Component<{
    nodeCallback?: IntrinsicObserverNodeCallback;
    elementCallback?: IntrinsicObserverElementCallback;
    children?: JSX.Node | JSX.Node[];
}> = ({ nodeCallback, elementCallback, children }) => {
    return IntrinsicObserverRenderNode(
        nodeCallback,
        elementCallback,
        ArrayRenderNode(renderJSXChildren(children))
    );
};

export function ComponentRenderNode<TProps>(
    Component: FunctionComponent<TProps>,
    props: TProps | null | undefined,
    children: JSX.Node[],
    debugName?: string
): RenderNode {
    let result: undefined | Error | RenderNode;
    let onMountCallbacks: undefined | (() => (() => void) | void)[];
    let onUnmountCallbacks: undefined | (() => void)[];
    let onDestroyCallbacks: undefined | (() => void)[];
    const owned: Set<Retainable> = new Set();
    let errorHandler: undefined | ((e: Error) => RenderNode | null);
    let needsMount = false;

    function ensureResult() {
        if (!result) {
            let callbacksAllowed = true;
            const lifecycle: ComponentLifecycle = {
                onMount: (handler: () => (() => void) | void) => {
                    log.assert(
                        callbacksAllowed,
                        'onMount must be called in component body'
                    );
                    if (!onMountCallbacks) onMountCallbacks = [];
                    onMountCallbacks.push(handler);
                },
                onUnmount: (handler: () => void) => {
                    log.assert(
                        callbacksAllowed,
                        'onUnmount must be called in component body'
                    );
                    if (!onUnmountCallbacks) onUnmountCallbacks = [];
                    onUnmountCallbacks.push(handler);
                },
                onDestroy: (handler: () => void) => {
                    log.assert(
                        callbacksAllowed,
                        'onDestroy must be called in component body'
                    );
                    if (!onDestroyCallbacks) onDestroyCallbacks = [];
                    onDestroyCallbacks.push(handler);
                },
                onError: (handler: (e: Error) => RenderNode | null) => {
                    log.assert(
                        callbacksAllowed,
                        'onError must be called in component body'
                    );
                    log.assert(!errorHandler, 'onError called multiple times');
                    errorHandler = handler;
                },
            };

            let componentProps: any;
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
                    owned,
                    () =>
                        Component(componentProps, lifecycle) || emptyRenderNode
                );
            } catch (e) {
                const error = wrapError(e, 'Unknown error rendering component');
                if (errorHandler) {
                    jsxResult = errorHandler(error) ?? emptyRenderNode;
                } else {
                    jsxResult = error;
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

    const customRenderNode = new CustomRenderNode(
        {
            onAlive: () => {
                const result = ensureResult();
                if (result instanceof Error) {
                    log.warn('Unhandled exception on detached component', {
                        error: result,
                        renderNode: customRenderNode,
                    });
                } else {
                    customRenderNode.spliceChildren(0, 1, [result]);
                }
            },
            onDestroy: () => {
                if (onDestroyCallbacks) {
                    for (const callback of onDestroyCallbacks) {
                        callback();
                    }
                }

                result = undefined;

                for (const item of owned) {
                    release(item);
                }
            },
            onAttach: (emitter) => {
                if (result instanceof Error) {
                    emitter(result);
                }
            },
            onError: (error: Error) => {
                if (errorHandler) {
                    const handledResult = errorHandler(error);
                    result = handledResult
                        ? renderJSXNode(handledResult)
                        : emptyRenderNode;
                    customRenderNode.spliceChildren(0, 1, [result]);
                    return true;
                }
            },
            onMount: () => {
                log.assert(result, 'Invariant: missing result');
                if (result instanceof Error) {
                    return;
                }
                needsMount = true;
                dirtyRenderNode(customRenderNode);
            },
            onUnmount: () => {
                log.assert(result, 'Invariant: missing result');
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
                if (
                    phase === RenderNodeCommitPhase.COMMIT_MOUNT &&
                    needsMount &&
                    onMountCallbacks
                ) {
                    for (const callback of onMountCallbacks) {
                        const maybeOnUnmount = callback();
                        if (typeof maybeOnUnmount === 'function') {
                            if (!onUnmountCallbacks) {
                                onUnmountCallbacks = [];
                            }
                            const onUnmount = () => {
                                maybeOnUnmount();
                                if (onUnmountCallbacks) {
                                    const index =
                                        onUnmountCallbacks.indexOf(onUnmount);
                                    if (index >= 0) {
                                        onUnmountCallbacks.splice(index, 1);
                                    }
                                }
                            };
                            onUnmountCallbacks.push(onUnmount);
                        }
                    }
                    needsMount = false;
                }
            },
            clone(newProps, newChildren) {
                return ComponentRenderNode(
                    Component,
                    props && newProps
                        ? { ...props, ...newProps }
                        : ((newProps || props) as TProps),
                    newChildren ?? children
                );
            },
        },
        [emptyRenderNode],
        debugName ?? `component(${Component.name})`
    );
    return customRenderNode;
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
    hydrateTemplateChild?: boolean | undefined;
    observedAttributes?: TKeys[] | undefined;
    formAssociated?: boolean | undefined;
    shadowMode?: TExtends extends WebComponentShadowSupportedExtends
        ? TShadowMode
        : undefined;
    delegatesFocus?: boolean | undefined;
    extends?: TExtends;
}

export function WebComponentRenderNode<
    TKeys extends string,
    TShadowMode extends 'open' | 'closed' | undefined,
    TExtends extends keyof typeof webComponentTagConstructors | undefined
>(
    host: HTMLElement,
    shadowRoot: ShadowRoot | undefined,
    elementInternals: ElementInternals | undefined,
    options: WebComponentOptions<TKeys, TShadowMode, TExtends>,
    childrenField: Field<Node[] | undefined>,
    fields: Record<TKeys, Field<string | undefined>>,
    debugName?: string
): RenderNode {
    let result: RenderNode | Error | undefined;
    let onMountCallbacks: undefined | (() => (() => void) | void)[];
    let onUnmountCallbacks: undefined | (() => void)[];
    let onDestroyCallbacks: undefined | (() => void)[];
    const owned: Set<Retainable> = new Set();
    let errorHandler: ((e: Error) => RenderNode | null) | undefined;
    let needsMount: boolean | undefined;

    function ensureResult() {
        if (!result) {
            let callbacksAllowed = true;
            const lifecycle: WebComponentLifecycle = {
                onMount: (handler: () => (() => void) | void) => {
                    log.assert(
                        callbacksAllowed,
                        'onMount must be called in component body'
                    );
                    if (!onMountCallbacks) onMountCallbacks = [];
                    onMountCallbacks.push(handler);
                },
                onUnmount: (handler: () => void) => {
                    log.assert(
                        callbacksAllowed,
                        'onUnmount must be called in component body'
                    );
                    if (!onUnmountCallbacks) onUnmountCallbacks = [];
                    onUnmountCallbacks.push(handler);
                },
                onDestroy: (handler: () => void) => {
                    log.assert(
                        callbacksAllowed,
                        'onDestroy must be called in component body'
                    );
                    if (!onDestroyCallbacks) onDestroyCallbacks = [];
                    onDestroyCallbacks.push(handler);
                },
                onError: (handler: (e: Error) => RenderNode | null) => {
                    log.assert(
                        callbacksAllowed,
                        'onError must be called in component body'
                    );
                    log.assert(!errorHandler, 'onError called multiple times');
                    errorHandler = handler;
                },
                host,
                elementInternals,
                shadowRoot,
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
                        handler.call(host, event, host);
                    };
                    host.addEventListener(name, listener, options);
                    const unsubscribe = () => {
                        host.removeEventListener(name, listener, options);
                    };
                    if (!onDestroyCallbacks) onDestroyCallbacks = [];
                    onDestroyCallbacks.push(unsubscribe);
                    return unsubscribe;
                },
                bindElementInternalsAttribute: (param, value) => {
                    // @ts-expect-error // for some reason, ariaDescription is missing from the ARIAMixin definition. Probably need to update type dependencies
                    elementInternals[param] = dynGet(value);
                    const unsubscribe = dynSubscribe(value, (newValue) => {
                        // @ts-expect-error // for some reason, ariaDescription is missing from the ARIAMixin definition. Probably need to update type dependencies
                        elementInternals[param] = value;
                    });
                    if (!onDestroyCallbacks) onDestroyCallbacks = [];
                    onDestroyCallbacks.push(unsubscribe);
                    return unsubscribe;
                },
                bindFormValue: (formValue) => {
                    if (!elementInternals) {
                        throw new Error(
                            `ElementInternals not available on custom element ${options.tagName}`
                        );
                    }
                    const update = (formValue: FormValue) => {
                        if (
                            typeof formValue === 'string' ||
                            formValue instanceof File ||
                            formValue instanceof FormData
                        ) {
                            elementInternals?.setFormValue(formValue);
                        } else {
                            const { value, state } = formValue;
                            if (state === undefined) {
                                elementInternals?.setFormValue(value);
                            } else {
                                elementInternals?.setFormValue(value, state);
                            }
                        }
                    };
                    update(dynGet(formValue));
                    const unsubscribe = dynSubscribe(formValue, (newVal) =>
                        update(newVal)
                    );
                    if (!onDestroyCallbacks) onDestroyCallbacks = [];
                    onDestroyCallbacks.push(unsubscribe);
                    return unsubscribe;
                },
                bindValidity: (validity) => {
                    if (!elementInternals) {
                        throw new Error(
                            `ElementInternals not available on custom element ${options.tagName}`
                        );
                    }
                    const update = (validity: Validity) => {
                        const { flags, message, anchor } = validity;
                        elementInternals?.setValidity(flags, message, anchor);
                    };
                    const val = dynGet(validity);
                    update(val);
                    const unsubscribe = dynSubscribe(validity, (val) =>
                        update(val)
                    );
                    if (!onDestroyCallbacks) onDestroyCallbacks = [];
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
                },
            };

            const componentProps: any =
                options.shadowMode === undefined
                    ? {
                          ...fields,
                          children: renderJSXNode(childrenField),
                      }
                    : {
                          ...fields,
                      };
            const Component = options.Component;
            let jsxResult: RenderNode | Error;
            try {
                jsxResult = trackCreates(
                    owned,
                    () =>
                        Component(componentProps, lifecycle) || emptyRenderNode
                );
            } catch (e) {
                const error = wrapError(e, 'Unknown error rendering component');
                if (errorHandler) {
                    jsxResult = errorHandler(error) ?? emptyRenderNode;
                } else {
                    jsxResult = error;
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

    const customRenderNode = new CustomRenderNode(
        {
            onAlive: () => {
                const result = ensureResult();
                if (result instanceof Error) {
                    log.warn('Unhandled exception on detached component', {
                        error: result,
                        renderNode: customRenderNode,
                    });
                } else {
                    customRenderNode.spliceChildren(0, 1, [result]);
                }
            },
            onDestroy: () => {
                if (onDestroyCallbacks) {
                    for (const callback of onDestroyCallbacks) {
                        callback();
                    }
                }

                result = undefined;
                onMountCallbacks = undefined;
                onUnmountCallbacks = undefined;
                onDestroyCallbacks = undefined;
                errorHandler = undefined;
                needsMount = false;

                for (const item of owned) {
                    release(item);
                }
                owned.clear();
            },
            onAttach: (emitter) => {
                if (result instanceof Error) {
                    emitter(result);
                }
            },
            onError: (error: Error) => {
                if (errorHandler) {
                    const handledResult = errorHandler(error);
                    result = handledResult
                        ? renderJSXNode(handledResult)
                        : emptyRenderNode;
                    customRenderNode.spliceChildren(0, 1, [result]);
                    return true;
                }
            },
            onMount() {
                log.assert(result, 'Invariant: missing result');
                if (result instanceof Error) {
                    return;
                }
                needsMount = true;
                dirtyRenderNode(customRenderNode);
            },
            onUnmount() {
                log.assert(result, 'Invariant: missing result');
                if (result instanceof Error) {
                    return;
                }
                if (onUnmountCallbacks) {
                    for (const callback of onUnmountCallbacks) {
                        callback();
                    }
                }
            },
            onCommit(phase: RenderNodeCommitPhase) {
                if (
                    phase === RenderNodeCommitPhase.COMMIT_MOUNT &&
                    needsMount &&
                    onMountCallbacks
                ) {
                    for (const callback of onMountCallbacks) {
                        const maybeOnUnmount = callback();
                        if (typeof maybeOnUnmount === 'function') {
                            if (!onUnmountCallbacks) {
                                onUnmountCallbacks = [];
                            }
                            const onUnmount = () => {
                                maybeOnUnmount();
                                if (onUnmountCallbacks) {
                                    const index =
                                        onUnmountCallbacks.indexOf(onUnmount);
                                    if (index >= 0) {
                                        onUnmountCallbacks.splice(index, 1);
                                    }
                                }
                            };
                            onUnmountCallbacks.push(onUnmount);
                        }
                    }
                    needsMount = false;
                }
            },
            clone() {
                log.assert(
                    false,
                    "Attempted to clone a WebComponentRenderNode -- this operation doesn't make sense"
                );
            },
        },
        [emptyRenderNode],
        debugName ?? `web-component(${options.tagName})`
    );
    return customRenderNode;
}

export function classComponentToFunctionComponentRenderNode<TProps>(
    Component: ClassComponentConstructor<TProps>,
    props: TProps,
    children: JSX.Node[]
) {
    return ComponentRenderNode(
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
