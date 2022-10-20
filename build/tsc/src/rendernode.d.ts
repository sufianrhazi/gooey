import { Retainable } from './engine';
import { SymDebugName, SymRefcount, SymAlive, SymDead } from './symbols';
import { RefObjectOrCallback } from './ref';
import { ArrayEvent } from './arrayevent';
import { Calculation, CalculationErrorType } from './calc';
import { Collection, View } from './collection';
export interface ComponentLifecycle {
    onMount: (callback: () => void) => (() => void) | void;
    onUnmount: (callback: () => void) => void;
    onDestroy: (callback: () => void) => void;
    onError: (handler: (e: Error) => JSX.Element | null) => void;
}
declare const UnusedSymbolForChildrenOmission: unique symbol;
export declare type EmptyProps = {
    [UnusedSymbolForChildrenOmission]?: boolean;
};
export declare type Component<TProps = {}> = FunctionComponent<TProps> | ClassComponentConstructor<TProps>;
export declare type FunctionComponent<TProps = {}> = (props: TProps & EmptyProps, lifecycle: ComponentLifecycle) => JSX.Element | null;
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
export declare type NodeEmitter = (event: ArrayEvent<Node> | Error) => void;
export declare const RenderNodeType: unique symbol;
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
export declare class EmptyRenderNode implements RenderNode {
    _type: typeof RenderNodeType;
    constructor();
    detach(): void;
    attach(): void;
    onMount(): void;
    onUnmount(): void;
    retain(): void;
    release(): void;
    [SymDebugName]: string;
    [SymRefcount]: number;
    [SymAlive](): void;
    [SymDead](): void;
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
    private text;
    private emitter?;
    constructor(string: string, debugName?: string);
    detach(): void;
    attach(emitter: NodeEmitter): void;
    onMount(): void;
    onUnmount(): void;
    retain(): void;
    release(): void;
    [SymDebugName]: string;
    [SymRefcount]: number;
    [SymAlive](): void;
    [SymDead](): void;
}
/**
 * Renders a foreign managed DOM node
 */
export declare class ForeignRenderNode implements RenderNode {
    _type: typeof RenderNodeType;
    private node;
    private emitter?;
    constructor(node: Node, debugName?: string);
    detach(): void;
    attach(emitter: NodeEmitter): void;
    onMount(): void;
    onUnmount(): void;
    retain(): void;
    release(): void;
    [SymDebugName]: string;
    [SymRefcount]: number;
    [SymAlive](): void;
    [SymDead](): void;
}
/**
 * Renders an array of render nodes
 */
export declare class ArrayRenderNode implements RenderNode {
    _type: typeof RenderNodeType;
    private children;
    private slotSizes;
    private attached;
    private emitter?;
    constructor(children: RenderNode[], debugName?: string);
    detach(): void;
    attach(emitter: NodeEmitter, parentXmlNamespace: string): void;
    onMount(): void;
    onUnmount(): void;
    retain(): void;
    release(): void;
    [SymDebugName]: string;
    [SymRefcount]: number;
    [SymAlive](): void;
    [SymDead](): void;
}
/**
 * Renders an intrinsic DOM node
 */
export declare class IntrinsicRenderNode implements RenderNode {
    _type: typeof RenderNodeType;
    private tagName;
    private element?;
    private emitter?;
    private detachedError?;
    private xmlNamespace?;
    private childXmlNamespace?;
    private props?;
    private children;
    private portalRenderNode?;
    private calculations?;
    private calculationSubscriptions?;
    constructor(tagName: string, props: Record<string, any> | undefined, children: RenderNode[], debugName?: string);
    private createElement;
    private setProp;
    private handleEvent;
    detach(): void;
    ensureElement(xmlNamespace: string, childXmlNamespace: string): Element;
    attach(emitter: NodeEmitter, parentXmlNamespace: string): void;
    onMount(): void;
    onUnmount(): void;
    retain(): void;
    release(): void;
    [SymDebugName]: string;
    [SymRefcount]: number;
    [SymAlive](): void;
    [SymDead](): void;
}
export declare class PortalRenderNode implements RenderNode {
    _type: typeof RenderNodeType;
    private tagName;
    private element;
    private refProp?;
    private emitter?;
    private existingOffset;
    private arrayRenderNode;
    private calculations?;
    private calculationSubscriptions?;
    constructor(element: Element, children: ArrayRenderNode, refProp: RefObjectOrCallback<Element> | null | undefined, debugName?: string);
    private handleEvent;
    detach(): void;
    attach(emitter: NodeEmitter, parentXmlNamespace: string): void;
    onMount(): void;
    onUnmount(): void;
    retain(): void;
    release(): void;
    [SymDebugName]: string;
    [SymRefcount]: number;
    [SymAlive](): void;
    [SymDead](): void;
}
/**
 * Renders the result of a calculation
 */
export declare class CalculationRenderNode implements RenderNode {
    _type: typeof RenderNodeType;
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
    onMount(): void;
    onUnmount(): void;
    retain(): void;
    release(): void;
    cleanPrior(): void;
    subscribe(errorType: undefined, val: any): void;
    subscribe(errorType: CalculationErrorType, val: Error): void;
    [SymDebugName]: string;
    [SymRefcount]: number;
    [SymAlive](): void;
    [SymDead](): void;
}
export declare class CollectionRenderNode implements RenderNode {
    _type: typeof RenderNodeType;
    private children;
    private childIndex;
    private slotSizes;
    private collection;
    private unsubscribe?;
    private isMounted;
    private emitter?;
    private parentXmlNamespace?;
    constructor(collection: Collection<any> | View<any>, debugName?: string);
    attach(emitter: NodeEmitter, parentXmlNamespace: string): void;
    detach(): void;
    handleChildEvent(event: ArrayEvent<Node> | Error, child: RenderNode): void;
    onMount(): void;
    onUnmount(): void;
    retain(): void;
    release(): void;
    private releaseChild;
    private retainChild;
    private handleCollectionEvent;
    [SymDebugName]: string;
    [SymRefcount]: number;
    [SymAlive](): void;
    [SymDead](): void;
}
export declare function renderJSXNode(jsxNode: JSX.Node): RenderNode;
export declare function renderJSXChildren(children?: JSX.Node | JSX.Node[]): RenderNode[];
export declare function mount(target: Element, node: RenderNode): () => void;
export declare enum IntrinsicObserverEventType {
    MOUNT = "mount",
    UNMOUNT = "unmount"
}
export declare type IntrinsicObserverNodeCallback = (node: Node, event: IntrinsicObserverEventType) => void;
export declare type IntrinsicObserverElementCallback = (element: Element, event: IntrinsicObserverEventType) => void;
export declare class IntrinsicObserverRenderNode implements RenderNode {
    _type: typeof RenderNodeType;
    nodeCallback?: IntrinsicObserverNodeCallback | undefined;
    elementCallback?: IntrinsicObserverElementCallback | undefined;
    child: RenderNode;
    childNodes: Node[];
    emitter?: NodeEmitter | undefined;
    isMounted: boolean;
    constructor(nodeCallback: IntrinsicObserverNodeCallback | undefined, elementCallback: IntrinsicObserverElementCallback | undefined, children: RenderNode[], debugName?: string);
    notify(node: Node, type: IntrinsicObserverEventType): void;
    handleEvent(event: ArrayEvent<Node> | Error): void;
    detach(): void;
    attach(emitter: NodeEmitter, parentXmlNamespace: string): void;
    onMount(): void;
    onUnmount(): void;
    retain(): void;
    release(): void;
    [SymDebugName]: string;
    [SymRefcount]: number;
    [SymAlive](): void;
    [SymDead](): void;
}
export declare const IntrinsicObserver: Component<{
    nodeCallback?: IntrinsicObserverNodeCallback;
    elementCallback?: IntrinsicObserverElementCallback;
    children?: JSX.Node | JSX.Node[];
}>;
export declare class ComponentRenderNode<TProps> implements RenderNode {
    _type: typeof RenderNodeType;
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
    constructor(Component: FunctionComponent<TProps>, props: TProps | null | undefined, children: JSX.Node[], debugName?: string);
    detach(): void;
    private ensureResult;
    attach(emitter: NodeEmitter, parentXmlNamespace: string): void;
    handleEvent: (event: ArrayEvent<Node> | Error) => void;
    onMount(): void;
    onUnmount(): void;
    retain(): void;
    release(): void;
    [SymDebugName]: string;
    [SymRefcount]: number;
    [SymAlive](): void;
    [SymDead](): void;
}
export declare function classComponentToFunctionComponentRenderNode<TProps>(Component: ClassComponentConstructor<TProps>, props: TProps, children: JSX.Node[]): ComponentRenderNode<TProps>;
export {};
//# sourceMappingURL=rendernode.d.ts.map