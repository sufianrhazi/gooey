import { Retainable } from './engine';
import { SymDebugName, SymRefcount, SymAlive, SymDead } from './symbols';
import { Ref } from './ref';
import { ArrayEvent } from './arrayevent';
import { Calculation, CalculationErrorType } from './calc';
import { Collection, View } from './collection';
import { noopGenerator } from './util';
export interface ComponentLifecycle {
    onMount: (callback: () => void) => (() => void) | void;
    onUnmount: (callback: () => void) => void;
    onDestroy: (callback: () => void) => void;
    onError: (handler: (e: Error) => JSX.Element | null) => void;
    getContext: <TContext>(context: Context<TContext>, handler?: ((val: TContext) => void) | undefined) => TContext;
}
declare const UnusedSymbolForChildrenOmission: unique symbol;
export declare type Component<TProps = {}> = (props: TProps & {
    [UnusedSymbolForChildrenOmission]?: boolean;
}, lifecycle: ComponentLifecycle) => JSX.Element | null;
export declare type NodeEmitter = (event: ArrayEvent<Node> | Error) => void;
declare const ContextType: unique symbol;
export interface Context<T> extends Component<{
    value: T;
    children?: JSX.Node | JSX.Node[];
}> {
    _type: typeof ContextType;
    _get: () => T;
}
export declare function createContext<T>(val: T): Context<T>;
export declare type ContextMap = Map<Context<any>, any>;
export declare const RenderNodeType: unique symbol;
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
export declare class EmptyRenderNode implements RenderNode {
    _type: typeof RenderNodeType;
    constructor();
    detach: typeof noopGenerator;
    attach: () => void;
    onMount: () => void;
    onUnmount: () => void;
    retain(): void;
    release(): void;
    [SymDebugName]: string;
    [SymRefcount]: number;
    [SymAlive]: () => void;
    [SymDead]: () => void;
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
    private emitter;
    constructor(string: string, debugName?: string);
    detach(): void;
    attach(emitter: NodeEmitter, context: ContextMap): void;
    onMount: () => void;
    onUnmount: () => void;
    retain(): void;
    release(): void;
    [SymDebugName]: string;
    [SymRefcount]: number;
    [SymAlive]: () => void;
    [SymDead](): void;
}
/**
 * Renders a foreign managed DOM node
 */
export declare class ForeignRenderNode implements RenderNode {
    _type: typeof RenderNodeType;
    private node;
    private emitter;
    constructor(node: Node, debugName?: string);
    detach(): void;
    attach(emitter: NodeEmitter, context: ContextMap): void;
    onMount: () => void;
    onUnmount: () => void;
    retain(): void;
    release(): void;
    [SymDebugName]: string;
    [SymRefcount]: number;
    [SymAlive]: () => void;
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
    private emitter;
    constructor(children: RenderNode[], debugName?: string);
    detach(): void;
    attach(emitter: NodeEmitter, context: ContextMap): void;
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
    private element;
    private emitter;
    private xmlNamespace;
    private childXmlNamespace;
    private props;
    private children;
    private portalRenderNode;
    private calculations?;
    private calculationSubscriptions?;
    constructor(tagName: string, props: Record<string, any> | undefined, children: RenderNode[], debugName?: string);
    private createElement;
    private setProp;
    private handleEvent;
    detach(): void;
    attach(emitter: NodeEmitter, context: ContextMap): void;
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
    private refProp;
    private emitter;
    private xmlNamespace;
    private childXmlNamespace;
    private existingOffset;
    private arrayRenderNode;
    private calculations?;
    private calculationSubscriptions?;
    constructor(element: Element, children: ArrayRenderNode, refProp: Ref<Element> | null, debugName?: string);
    private handleEvent;
    detach(): void;
    attach(emitter: NodeEmitter, contextMap: ContextMap): void;
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
    private error;
    private renderNode;
    private calculation;
    private calculationSubscription;
    private context;
    private isMounted;
    private emitter;
    constructor(calculation: Calculation<any>, debugName?: string);
    detach(): void;
    attach(emitter: NodeEmitter, context: ContextMap): void;
    onMount(): void;
    onUnmount(): void;
    retain(): void;
    release(): void;
    cleanPrior(): void;
    onRecalc(errorType: undefined, val: any): void;
    onRecalc(errorType: CalculationErrorType, val: Error): void;
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
    private context;
    private isMounted;
    private emitter;
    constructor(collection: Collection<any> | View<any>, debugName?: string);
    attach(emitter: NodeEmitter, context: ContextMap): void;
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
    nodeCallback: IntrinsicObserverNodeCallback | undefined;
    elementCallback: IntrinsicObserverElementCallback | undefined;
    child: RenderNode;
    childNodes: Node[];
    emitter: NodeEmitter | null;
    isMounted: boolean;
    constructor(nodeCallback: IntrinsicObserverNodeCallback | undefined, elementCallback: IntrinsicObserverElementCallback | undefined, children: RenderNode[], debugName?: string);
    notify(node: Node, type: IntrinsicObserverEventType): void;
    handleEvent(event: ArrayEvent<Node> | Error): void;
    detach(): void;
    attach(emitter: NodeEmitter, context: ContextMap): void;
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
    constructor(Component: Component<TProps>, props: TProps | null | undefined, children: JSX.Node[], debugName?: string);
    detach(): void;
    attach(emitter: NodeEmitter, contextMap: ContextMap): void;
    handleEvent: (event: ArrayEvent<Node> | Error) => void;
    onMount(): void;
    onUnmount(): void;
    retain(): void;
    release(): void;
    [SymDebugName]: string;
    [SymRefcount]: number;
    [SymAlive]: () => void;
    [SymDead](): void;
}
export declare class ContextRenderNode<T> implements RenderNode {
    _type: typeof RenderNodeType;
    child: RenderNode;
    context: Context<T>;
    value: T;
    constructor(context: Context<T>, value: T, children: JSX.Element[], debugName?: string);
    detach(): void;
    attach(emitter: NodeEmitter, context: ContextMap): void;
    onMount(): void;
    onUnmount(): void;
    retain(): void;
    release(): void;
    [SymDebugName]: string;
    [SymRefcount]: number;
    [SymAlive](): void;
    [SymDead](): void;
}
export {};
//# sourceMappingURL=rendernode.d.ts.map