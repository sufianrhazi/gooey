import { Retainable, SymDebugName, SymRefcount, SymAlive, SymDead } from './engine';
import { ArrayEvent } from './arrayevent';
import { Calculation } from './calc';
import { Collection, View } from './collection';
export interface ComponentLifecycle {
    onMount: (callback: () => void) => void;
    onUnmount: (callback: () => void) => void;
    onDestroy: (callback: () => void) => void;
    onContext: <TContext>(context: Context<TContext>, handler: (val: TContext) => void) => void;
}
declare const UnusedSymbolForChildrenOmission: unique symbol;
export declare type Component<TProps = {}> = (props: TProps & {
    [UnusedSymbolForChildrenOmission]?: boolean;
}, lifecycle: ComponentLifecycle) => JSX.Element | null;
declare type NodeEmitter = (event: ArrayEvent<Node>) => void;
declare const ContextType: unique symbol;
export interface Context<T> extends Component<{
    value: T;
    children?: JSX.Node | JSX.Node[];
}> {
    _type: typeof ContextType;
    _get: () => T;
}
export declare function createContext<T>(val: T): Context<T>;
declare type ContextMap = Map<Context<any>, any>;
declare const RenderNodeType: unique symbol;
export interface RenderNode extends Retainable {
    _type: typeof RenderNodeType;
    detach(emitter: NodeEmitter): void;
    attach(emitter: NodeEmitter): void;
    setContext(context: ContextMap): void;
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
    detach: () => void;
    attach: () => void;
    setContext: () => void;
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
    private isAttached;
    constructor(string: string, debugName?: string);
    detach(emitter: NodeEmitter): void;
    attach(emitter: NodeEmitter): void;
    setContext: () => void;
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
 * Renders a foreign managed DOM node
 */
export declare class ForeignRenderNode implements RenderNode {
    _type: typeof RenderNodeType;
    private node;
    constructor(node: Node, debugName?: string);
    detach(emitter: NodeEmitter): void;
    attach(emitter: NodeEmitter): void;
    setContext: () => void;
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
 * Renders an array of render nodes
 */
export declare class ArrayRenderNode implements RenderNode {
    _type: typeof RenderNodeType;
    private children;
    private slotSizes;
    constructor(children: RenderNode[], debugName?: string);
    detach(emitter: NodeEmitter): void;
    attach(emitter: NodeEmitter): void;
    setContext(context: ContextMap): void;
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
    private isPreexisting;
    private isPreexistingPopulated;
    private emitter;
    private xmlNamespace;
    private childXmlNamespace;
    private existingOffset;
    private props;
    private arrayRenderNode;
    private calculations?;
    private calculationSubscriptions?;
    constructor(elementOrTagName: string | Element, props: Record<string, any> | undefined, children: RenderNode[], debugName?: string);
    private createElement;
    private setProp;
    private handleEvent;
    detach(emitter: NodeEmitter): void;
    attach(emitter: NodeEmitter): void;
    setContext(context: ContextMap): void;
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
    private renderNode;
    private calculation;
    private calculationSubscription;
    private context;
    private isMounted;
    private emitter;
    private isCalculatedPendingAdd;
    constructor(calculation: Calculation<any>, debugName?: string);
    detach(emitter: NodeEmitter): void;
    attach(emitter: NodeEmitter): void;
    setContext(context: ContextMap): void;
    onMount(): void;
    onUnmount(): void;
    retain(): void;
    release(): void;
    cleanPrior(): void;
    renderCalculation: (val: any) => void;
    [SymDebugName]: string;
    [SymRefcount]: number;
    [SymAlive](): void;
    [SymDead](): void;
}
export declare class CollectionRenderNode implements RenderNode {
    _type: typeof RenderNodeType;
    private children;
    private childIndex;
    private childrenNodes;
    private slotSizes;
    private collection;
    private unsubscribe?;
    private context;
    private isMounted;
    private emitter;
    constructor(collection: Collection<any> | View<any>, debugName?: string);
    detach(emitter: NodeEmitter): void;
    attach(emitter: NodeEmitter): void;
    handleChildEvent(emitter: NodeEmitter, event: ArrayEvent<Node>, child: RenderNode): void;
    setContext(context: ContextMap): void;
    onMount(): void;
    onUnmount(): void;
    retain(): void;
    release(): void;
    private handleCollectionEvent;
    [SymDebugName]: string;
    [SymRefcount]: number;
    [SymAlive](): void;
    [SymDead](): void;
}
export declare function renderJSXNode(jsxNode: JSX.Node): RenderNode;
export declare function renderJSXChildren(children?: JSX.Node | JSX.Node[]): RenderNode[];
export declare function mount(target: Element, node: RenderNode): () => void;
export declare enum LifecycleObserverEventType {
    REMOVE = "remove",
    ADD = "add"
}
export declare type LifecycleObserverNodeCallback = (node: Node, event: LifecycleObserverEventType) => void;
export declare type LifecycleObserverElementCallback = (element: Element, event: LifecycleObserverEventType) => void;
export declare class LifecycleObserverRenderNode implements RenderNode {
    _type: typeof RenderNodeType;
    nodeCallback: LifecycleObserverNodeCallback | undefined;
    elementCallback: LifecycleObserverElementCallback | undefined;
    child: RenderNode;
    childNodes: Node[];
    constructor(nodeCallback: LifecycleObserverNodeCallback | undefined, elementCallback: LifecycleObserverElementCallback | undefined, children: RenderNode[], debugName?: string);
    handleEvent(emitter: NodeEmitter, event: ArrayEvent<Node>): void;
    detach(emitter: NodeEmitter): void;
    attach(emitter: NodeEmitter): void;
    setContext(context: ContextMap): void;
    onMount(): void;
    onUnmount(): void;
    retain(): void;
    release(): void;
    [SymDebugName]: string;
    [SymRefcount]: number;
    [SymAlive](): void;
    [SymDead](): void;
}
export declare function LifecycleObserver({ nodeCallback, elementCallback, children, }: {
    nodeCallback?: LifecycleObserverNodeCallback;
    elementCallback?: LifecycleObserverElementCallback;
    children?: JSX.Node | JSX.Node[];
}): LifecycleObserverRenderNode;
export declare class ComponentRenderNode<TProps> implements RenderNode {
    _type: typeof RenderNodeType;
    Component: Component<TProps>;
    props: TProps | null | undefined;
    children: JSX.Node[];
    result: RenderNode | null;
    onMountCallbacks?: (() => void)[];
    onUnmountCallbacks?: (() => void)[];
    onDestroyCallbacks?: (() => void)[];
    onContextCallbacks?: Map<Context<any>, ((val: any) => void)[]>;
    owned: Set<Retainable>;
    constructor(Component: Component<TProps>, props: TProps | null | undefined, children: JSX.Node[], debugName?: string);
    detach(emitter: NodeEmitter): void;
    attach(emitter: NodeEmitter): void;
    setContext(contextMap: ContextMap): void;
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
    detach(emitter: NodeEmitter): void;
    attach(emitter: NodeEmitter): void;
    setContext(context: ContextMap): void;
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