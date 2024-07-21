import type { ArrayEvent } from '../../common/arrayevent';
import type { Retainable } from '../../model/engine';
import type { RenderNodeCommitPhase } from './constants';
export type NodeEmitter = (event: ArrayEvent<Node>) => void;
export type ErrorEmitter = (error: Error) => void;
export interface ParentContext {
    /**
     * RenderNode instances send a stream of ArrayEvent<Node> to their parents,
     * which take responsibility for placing them into the DOM.
     */
    nodeEmitter: NodeEmitter;
    /**
     * RenderNode instances may emit Error events to their parents in case of
     * an unrecoverable error in the RenderNode. The parents take
     * responsibility for handling those Errors.
     */
    errorEmitter: ErrorEmitter;
    xmlNamespace: string;
}
export interface RenderNode extends Retainable {
    clone(props?: {} | undefined, children?: JSX.Node[] | undefined): RenderNode;
    onMount(): void;
    onUnmount(): void;
    attach(parentContext: ParentContext): void;
    commit(phase: RenderNodeCommitPhase): void;
    detach(): void;
    retain(): void;
    release(): void;
    getDepth(): number;
    setDepth(depth: number): void;
}
interface RenderNodeHandlers {
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
    onAttach?: (parentContext: ParentContext) => void;
    /**
     * Called after the RenderNode has been detached from a parent RenderNode. Any nodes it has emitted have been already removed.
     */
    onDetach?: () => void;
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
    onChildEvent?: (child: RenderNode, event: ArrayEvent<Node>) => boolean | void;
    /**
     * Called when the RenderNode is cloned; callers should clone the provided children (if passed to the cloned node) and return a new RenderNode
     *
     * If omitted, an exception is thrown if the RenderNode is attempted to be cloned.
     */
    clone?: (props?: {}, children?: RenderNode[]) => RenderNode;
}
/**
 * SingleChildRenderNode: a virtual node in the tree that has exactly one child
 */
export declare class SingleChildRenderNode implements RenderNode, Retainable {
    private handlers;
    private parentContext;
    private _isMounted;
    private child;
    private liveNodes;
    private depth;
    constructor(handlers: RenderNodeHandlers, child: RenderNode, debugName?: string);
    isAttached(): boolean;
    isMounted(): boolean;
    emitEvent(event: ArrayEvent<Node>): void;
    emitError(error: Error): void;
    commit(phase: RenderNodeCommitPhase): void;
    requestCommit(phase: RenderNodeCommitPhase): void;
    clone(props?: {}, children?: RenderNode[]): RenderNode;
    setChild(child: RenderNode): void;
    private handleEvent;
    private handleError;
    detach(): void;
    attach(parentContext: ParentContext): void;
    onMount(): void;
    onUnmount(): void;
    retain(): void;
    release(): void;
    __debugName: string;
    __refcount: number;
    __alive(): void;
    __dead(): void;
    own(child: RenderNode): void;
    disown(child: RenderNode): void;
    getDepth(): number;
    setDepth(depth: number): void;
}
/**
 * MultiChildRenderNode: a virtual node in the tree that can have a variable number of children
 */
export declare class MultiChildRenderNode implements RenderNode, Retainable {
    private handlers;
    private parentContext;
    private _isMounted;
    private slotSizes;
    private depth;
    private pendingCommit;
    constructor(handlers: RenderNodeHandlers, children: RenderNode[], debugName?: string);
    isAttached(): boolean;
    isMounted(): boolean;
    emitEvent(event: ArrayEvent<Node>): void;
    emitError(error: Error): void;
    commit(phase: RenderNodeCommitPhase): void;
    requestCommit(phase: RenderNodeCommitPhase): void;
    clone(props?: {}, children?: RenderNode[]): RenderNode;
    sortChildren(from: number, indexes: number[]): void;
    moveChildren(from: number, count: number, to: number): void;
    spliceChildren(index: number, count: number, children: RenderNode[]): void;
    private handleChildEvent;
    private handleEvent;
    private handleError;
    detach(): void;
    attach(parentContext: ParentContext): void;
    onMount(): void;
    onUnmount(): void;
    retain(): void;
    release(): void;
    __debugName: string;
    __refcount: number;
    __alive(): void;
    __dead(): void;
    own(child: RenderNode): void;
    disown(child: RenderNode): void;
    getDepth(): number;
    setDepth(depth: number): void;
}
/**
 * Renders nothing
 */
export declare class EmptyRenderNode implements RenderNode {
    __debugName: string;
    __refcount: number;
    constructor();
    detach(): void;
    attach(): void;
    onMount(): void;
    onUnmount(): void;
    retain(): void;
    release(): void;
    commit(): void;
    getDepth(): number;
    setDepth(): void;
    clone(): RenderNode;
    __alive(): void;
    __dead(): void;
}
/**
 * Only need one of nothing
 */
export declare const emptyRenderNode: EmptyRenderNode;
export declare function isRenderNode(obj: any): obj is RenderNode;
export {};
//# sourceMappingURL=rendernode.d.ts.map