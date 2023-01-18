import { Retainable } from './engine';
import { RefObjectOrCallback } from './ref';
import { ArrayEvent } from './arrayevent';
import { Calculation, CalculationErrorType } from './calc';
import { Collection, View } from './collection';
import { Field } from './field';
export interface ComponentLifecycle {
    onMount: (callback: () => void) => (() => void) | void;
    onUnmount: (callback: () => void) => void;
    onDestroy: (callback: () => void) => void;
    onError: (handler: (e: Error) => JSX.Element | null) => void;
}
declare const UnusedSymbolForChildrenOmission: unique symbol;
export type EmptyProps = {
    [UnusedSymbolForChildrenOmission]?: boolean;
};
export type Component<TProps = {}> = FunctionComponent<TProps> | ClassComponentConstructor<TProps>;
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
    private arrayRenderNode;
    private calculations?;
    private calculationSubscriptions?;
    constructor(element: Element, children: ArrayRenderNode, refProp: RefObjectOrCallback<Element> | null | undefined, debugName?: string);
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
    subscribe(errorType: undefined, val: any, addPostAction: (postAction: () => void) => void): void;
    subscribe(errorType: CalculationErrorType, val: Error, addPostAction: (postAction: () => void) => void): void;
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
export declare function mount(target: Element, node: RenderNode): () => void;
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
export declare function classComponentToFunctionComponentRenderNode<TProps>(Component: ClassComponentConstructor<TProps>, props: TProps, children: JSX.Node[]): ComponentRenderNode<TProps>;
export {};
//# sourceMappingURL=rendernode.d.ts.map