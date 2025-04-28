import type { ArrayEvent } from '../../common/arrayevent';
import { ArrayEventType } from '../../common/arrayevent';
import * as log from '../../common/log';
import { SlotSizes } from '../../common/slotsizes';
import type { Retainable } from '../../model/engine';
import { release, retain } from '../../model/engine';
import { requestCommit } from '../commit';
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
    clone(
        props?: {} | undefined,
        children?: JSX.Node[] | undefined
    ): RenderNode;

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
    onChildEvent?: (
        child: RenderNode,
        event: ArrayEvent<Node>
    ) => boolean | void;
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
export class SingleChildRenderNode implements RenderNode, Retainable {
    private declare handlers: RenderNodeHandlers;
    private declare parentContext: ParentContext | undefined;
    private declare _isMounted: boolean;
    private declare child: RenderNode;
    private declare liveNodes: number;
    private declare depth: number;

    constructor(
        handlers: RenderNodeHandlers,
        child: RenderNode,
        debugName?: string
    ) {
        this.handlers = handlers;
        this.child = child;
        this._isMounted = false;
        this.parentContext = undefined;
        this.liveNodes = 0;
        this.depth = 0;

        this.__debugName = debugName ?? `custom`;
        this.__refcount = 0;
    }

    isAttached() {
        return !!this.parentContext;
    }

    isMounted() {
        return this._isMounted;
    }

    emitEvent(event: ArrayEvent<Node>) {
        log.assert(
            this.parentContext,
            'RenderNode attempted to emit event when detached'
        );
        this.parentContext.nodeEmitter(event);
    }

    emitError(error: Error) {
        log.assert(
            this.parentContext,
            'RenderNode attempted to emit error when detached'
        );
        this.parentContext.errorEmitter(error);
    }

    commit(phase: RenderNodeCommitPhase) {
        this.handlers.onCommit?.(phase);
    }

    requestCommit(phase: RenderNodeCommitPhase) {
        requestCommit(this, phase);
    }

    clone(props?: {}, children?: RenderNode[]): RenderNode {
        if (this.handlers.clone) {
            return this.handlers.clone(props, children);
        }
        const clonedChild = this.child.clone();
        return new SingleChildRenderNode(this.handlers, clonedChild);
    }

    setChild(child: RenderNode) {
        console.log('setChild', child);
        const toRemove = this.child;
        this.child = child;
        if (this._isMounted) {
            toRemove.onUnmount();
        }
        if (this.parentContext) {
            if (this.liveNodes > 0) {
                this.parentContext.nodeEmitter({
                    type: ArrayEventType.SPLICE,
                    index: 0,
                    count: this.liveNodes,
                });
            }
            toRemove.detach();
        }
        this.liveNodes = 0;
        this.disown(toRemove);
        this.own(this.child);
        if (this.parentContext) {
            this.child.attach({
                nodeEmitter: this.handleEvent,
                errorEmitter: this.handleError,
                xmlNamespace: this.parentContext.xmlNamespace,
            });
        }
        if (this._isMounted) {
            this.child.onMount();
        }
    }

    private handleEvent = (event: ArrayEvent<Node>) => {
        if (event.type === ArrayEventType.SPLICE) {
            this.liveNodes += (event.items?.length ?? 0) - event.count;
        }
        if (!this.handlers.onEvent?.(event)) {
            log.assert(
                this.parentContext,
                'Unexpected event on detached RenderNode'
            );
            this.parentContext.nodeEmitter(event);
        }
    };

    private handleError = (event: Error) => {
        if (!this.handlers.onError?.(event)) {
            if (this.parentContext) {
                this.parentContext.errorEmitter(event);
            } else {
                log.warn('Unhandled error on detached RenderNode', event);
            }
        }
    };

    detach() {
        log.assert(this.parentContext, 'double detached');
        this.child.detach();
        this.parentContext = undefined;
        this.handlers.onDetach?.();
    }

    attach(parentContext: ParentContext) {
        log.assert(!this.parentContext, 'Invariant: double attached');
        this.parentContext = parentContext;
        this.child.attach({
            nodeEmitter: this.handleEvent,
            errorEmitter: this.handleError,
            xmlNamespace: this.parentContext.xmlNamespace,
        });
        this.handlers.onAttach?.(parentContext);
    }

    onMount() {
        this._isMounted = true;
        this.child.onMount();
        this.handlers.onMount?.();
    }

    onUnmount() {
        this._isMounted = false;
        this.child.onUnmount();
        this.handlers.onUnmount?.();
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
        this.own(this.child);
        this.handlers.onAlive?.();
    }
    __dead() {
        this.handlers.onDestroy?.();
        this.disown(this.child);
        this.parentContext = undefined;
    }

    own(child: RenderNode) {
        if (child === emptyRenderNode) return;
        child.setDepth(this.depth + 1);
        child.retain();
    }

    disown(child: RenderNode) {
        if (child === emptyRenderNode) return;
        child.release();
        child.setDepth(0);
    }

    getDepth() {
        return this.depth;
    }

    setDepth(depth: number) {
        this.depth = depth;
    }
}

/**
 * MultiChildRenderNode: a virtual node in the tree that can have a variable number of children
 */
export class MultiChildRenderNode implements RenderNode, Retainable {
    private declare handlers: RenderNodeHandlers;
    private declare parentContext: ParentContext | undefined;
    private declare _isMounted: boolean;
    private declare slotSizes: SlotSizes<RenderNode>;
    private declare depth: number;
    private declare pendingCommit: undefined | Map<RenderNode, number>;

    constructor(
        handlers: RenderNodeHandlers,
        children: RenderNode[],
        debugName?: string
    ) {
        this.depth = 0;
        this.handlers = handlers;
        this._isMounted = false;
        this.slotSizes = new SlotSizes(children);
        this.parentContext = undefined;
        this.pendingCommit = undefined;

        this.__debugName = debugName ?? `custom`;
        this.__refcount = 0;
    }

    isAttached() {
        return !!this.parentContext;
    }

    isMounted() {
        return this._isMounted;
    }

    emitEvent(event: ArrayEvent<Node>) {
        log.assert(
            this.parentContext,
            'RenderNode attempted to emit event when detached'
        );
        this.parentContext.nodeEmitter(event);
    }

    emitError(error: Error) {
        log.assert(
            this.parentContext,
            'RenderNode attempted to emit error when detached'
        );
        this.parentContext.errorEmitter(error);
    }

    commit(phase: RenderNodeCommitPhase) {
        this.handlers.onCommit?.(phase);
    }

    requestCommit(phase: RenderNodeCommitPhase) {
        requestCommit(this, phase);
    }

    clone(props?: {}, children?: RenderNode[]): RenderNode {
        if (this.handlers.clone) {
            return this.handlers.clone(props, children);
        }
        const clonedChildren = this.slotSizes.items.map((child) =>
            child.clone()
        );
        return new MultiChildRenderNode(this.handlers, clonedChildren);
    }

    sortChildren(from: number, indexes: number[]) {
        const event = this.slotSizes.sort(from, indexes);
        this.parentContext?.nodeEmitter(event);
    }

    moveChildren(from: number, count: number, to: number) {
        const event = this.slotSizes.move(from, count, to);
        this.parentContext?.nodeEmitter(event);
    }

    spliceChildren(index: number, count: number, children: RenderNode[]) {
        // unmount & detach children before removing from slots (so they may emit their cleanup events)
        for (let i = index; i < index + count; ++i) {
            const child = this.slotSizes.items[i];
            if (this._isMounted) {
                child.onUnmount();
            }
        }
        const { removed, event } = this.slotSizes.splice(
            index,
            count,
            children
        );
        if (this.parentContext && event.count > 0) {
            this.parentContext.nodeEmitter({
                type: ArrayEventType.SPLICE,
                index: event.index,
                count: event.count,
                // Note: we do *not* take the responsibility of emitting the new nodes -- the children do that on attach
            });
        }
        for (const child of removed) {
            if (this.parentContext) {
                child.detach();
            }
            this.disown(child);
        }
        for (const child of children) {
            this.own(child);
            if (this.parentContext) {
                child.attach({
                    nodeEmitter: (event: ArrayEvent<Node>) =>
                        this.handleChildEvent(child, event),
                    errorEmitter: this.handleError,
                    xmlNamespace: this.parentContext.xmlNamespace,
                });
            }
            if (this._isMounted) {
                child.onMount();
            }
        }
    }

    private handleChildEvent(child: RenderNode, event: ArrayEvent<Node>) {
        if (!this.handlers.onChildEvent?.(child, event)) {
            const shifted = this.slotSizes.applyEvent(child, event);
            this.handleEvent(shifted);
        }
    }

    private handleEvent(event: ArrayEvent<Node>) {
        if (!this.handlers.onEvent?.(event)) {
            log.assert(
                this.parentContext,
                'Unexpected event on detached RenderNode'
            );
            this.parentContext.nodeEmitter(event);
        }
    }

    private handleError = (event: Error) => {
        if (!this.handlers.onError?.(event)) {
            if (this.parentContext) {
                this.parentContext.errorEmitter(event);
            } else {
                log.warn('Unhandled error on detached RenderNode', event);
            }
        }
    };

    detach() {
        log.assert(this.parentContext, 'double detached');
        this.slotSizes.clearSlots();
        for (const child of this.slotSizes.items) {
            child.detach();
        }
        this.parentContext = undefined;
        this.handlers.onDetach?.();
    }

    attach(parentContext: ParentContext) {
        log.assert(!this.parentContext, 'Invariant: double attached');
        this.parentContext = parentContext;
        for (const child of this.slotSizes.items) {
            child.attach({
                nodeEmitter: (event) => {
                    this.handleChildEvent(child, event);
                },
                errorEmitter: this.handleError,
                xmlNamespace: this.parentContext.xmlNamespace,
            });
        }
        this.handlers.onAttach?.(parentContext);
    }

    onMount() {
        this._isMounted = true;
        for (const child of this.slotSizes.items) {
            child.onMount();
        }
        this.handlers.onMount?.();
    }

    onUnmount() {
        this._isMounted = false;
        for (const child of this.slotSizes.items) {
            child.onUnmount();
        }
        this.handlers.onUnmount?.();
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
            this.own(child);
        }
        this.handlers.onAlive?.();
    }
    __dead() {
        this.handlers.onDestroy?.();
        for (const child of this.slotSizes.items) {
            this.disown(child);
        }
        this.parentContext = undefined;
    }

    own(child: RenderNode) {
        if (child === emptyRenderNode) return;
        child.setDepth(this.depth + 1);
        child.retain();
    }

    disown(child: RenderNode) {
        if (child === emptyRenderNode) return;
        child.release();
        child.setDepth(0);
    }

    getDepth() {
        return this.depth;
    }

    setDepth(depth: number) {
        this.depth = depth;
    }
}

/**
 * Renders nothing
 */
export class EmptyRenderNode implements RenderNode {
    __debugName: string;
    __refcount: number;
    constructor() {
        this.__debugName = '<empty>';
        this.__refcount = 1; // Intentional: always alive, never dead
    }

    detach() {}
    attach() {}
    onMount() {}
    onUnmount() {}
    retain() {}
    release() {}
    commit() {}
    getDepth() {
        return 0;
    }
    setDepth() {}
    clone(): RenderNode {
        return emptyRenderNode;
    }
    __alive() {}
    __dead() {}
}

/**
 * Only need one of nothing
 */
export const emptyRenderNode = new EmptyRenderNode();

export function isRenderNode(obj: any): obj is RenderNode {
    return (
        obj &&
        (obj instanceof SingleChildRenderNode ||
            obj instanceof MultiChildRenderNode ||
            obj instanceof EmptyRenderNode)
    );
}
