import type { ArrayEvent } from '../arrayevent';
import type { Retainable } from '../engine';
import { dirtyRenderNode, release, removeRenderNode, retain } from '../engine';
import * as log from '../log';
import { SlotSizes } from '../slotsizes';
import { HTML_NAMESPACE } from '../xmlnamespace';
import { RenderNodeCommitPhase } from './constants';

export type NodeEmitter = (event: ArrayEvent<Node>) => void;

export type ErrorEmitter = (error: Error) => void;

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
    onAttach?: (
        nodeEmitter: NodeEmitter,
        errorEmitter: ErrorEmitter,
        parentXmlNamespace: string
    ) => void;
    /**
     * Called just before the RenderNode is detached from a parent RenderNode -- it may synchronously emit ArrayEvent<Node> | Error events, but cannot emit after it returns.
     */
    onDetach?: (nodeEmitter: NodeEmitter, errorEmitter: ErrorEmitter) => void;
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
 * RenderNode: a virtual node in the tree
 */
export class RenderNode implements Retainable {
    declare commitPhase: number;
    declare handlers: RenderNodeHandlers;
    declare nodeEmitter: NodeEmitter | undefined;
    declare errorEmitter: ErrorEmitter | undefined;
    declare _isMounted: boolean;
    declare slotSizes: SlotSizes<RenderNode>;
    declare parentXmlNamespace: string;

    constructor(
        handlers: RenderNodeHandlers,
        children: RenderNode[],
        debugName?: string
    ) {
        this.commitPhase = 0;
        this.handlers = handlers;
        this._isMounted = false;
        this.slotSizes = new SlotSizes(children);
        this.parentXmlNamespace = HTML_NAMESPACE;
        this.nodeEmitter = undefined;
        this.errorEmitter = undefined;

        this.__debugName = debugName ?? `custom`;
        this.__refcount = 0;
    }

    isAttached() {
        return !!(this.nodeEmitter && this.errorEmitter);
    }

    isMounted() {
        return this._isMounted;
    }

    emitEvent(event: ArrayEvent<Node>) {
        log.assert(
            this.nodeEmitter,
            'RenderNode attempted to emit event when detached'
        );
        this.nodeEmitter(event);
    }

    emitError(error: Error) {
        log.assert(
            this.errorEmitter,
            'RenderNode attempted to emit error when detached'
        );
        this.errorEmitter(error);
    }

    commit(phase: RenderNodeCommitPhase) {
        for (const child of this.slotSizes.items) {
            child.commit(phase);
        }
        if (this.commitPhase & phase) {
            this.commitPhase = this.commitPhase & ~phase;
            this.handlers.onCommit?.(phase);
        }
    }

    clone(props?: {}, children?: RenderNode[]): RenderNode {
        if (this.handlers.clone) {
            return this.handlers.clone(props, children);
        }
        const clonedChildren = this.slotSizes.items.map((child) =>
            child.clone()
        );
        return new RenderNode(this.handlers, clonedChildren);
    }

    sortChildren(from: number, indexes: number[]) {
        const event = this.slotSizes.sort(from, indexes);
        this.nodeEmitter?.(event);
    }

    moveChildren(from: number, count: number, to: number) {
        const event = this.slotSizes.move(from, count, to);
        this.nodeEmitter?.(event);
    }

    spliceChildren(index: number, count: number, children: RenderNode[]) {
        // unmount & detach children before removing from slots (so they may emit their cleanup events)
        for (let i = index; i < index + count; ++i) {
            const child = this.slotSizes.items[i];
            if (this._isMounted) {
                child.setMounted(false);
            }
            if (this.nodeEmitter) {
                child.detach();
            }
        }
        const { removed } = this.slotSizes.splice(index, count, children);
        for (const child of removed) {
            this.disown(child);
        }
        for (const child of children) {
            this.own(child);
            if (this.nodeEmitter && this.parentXmlNamespace) {
                child.attach(
                    (event) => this.handleChildEvent(child, event),
                    this.handleError,
                    this.parentXmlNamespace
                );
            }
            if (this._isMounted) {
                child.setMounted(true);
            }
        }
    }

    private handleChildEvent(child: RenderNode, event: ArrayEvent<Node>) {
        if (!this.handlers.onChildEvent?.(child, event)) {
            this.handleEvent(
                event instanceof Error
                    ? event
                    : this.slotSizes.applyEvent(child, event)
            );
        }
    }

    private handleEvent(event: ArrayEvent<Node>) {
        if (!this.handlers.onEvent?.(event)) {
            log.assert(
                this.nodeEmitter,
                'Unexpected event on detached RenderNode'
            );
            this.nodeEmitter(event);
        }
    }

    private handleError = (event: Error) => {
        if (!this.handlers.onError?.(event)) {
            if (this.errorEmitter) {
                this.errorEmitter(event);
            } else {
                log.warn('Unhandled error on detached RenderNode', event);
            }
        }
    };

    detach() {
        log.assert(this.nodeEmitter && this.errorEmitter, 'double detached');
        this.handlers.onDetach?.(this.nodeEmitter, this.errorEmitter);
        for (const child of this.slotSizes.items) {
            child.detach();
        }
        this.nodeEmitter = undefined;
        this.errorEmitter = undefined;
        this.parentXmlNamespace = HTML_NAMESPACE;
    }

    attach(
        nodeEmitter: NodeEmitter,
        errorEmitter: ErrorEmitter,
        parentXmlNamespace: string
    ) {
        log.assert(
            !this.nodeEmitter && !this.errorEmitter,
            'Invariant: double attached'
        );
        this.nodeEmitter = nodeEmitter;
        this.errorEmitter = errorEmitter;
        this.parentXmlNamespace = parentXmlNamespace;
        for (const child of this.slotSizes.items) {
            child.attach(
                (event) => {
                    this.handleChildEvent(child, event);
                },
                this.handleError,
                parentXmlNamespace
            );
        }
        this.handlers.onAttach?.(nodeEmitter, errorEmitter, parentXmlNamespace);
    }

    setMounted(isMounted: boolean) {
        this._isMounted = isMounted;
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
            this.own(child);
        }
        this.handlers.onAlive?.();
    }
    __dead() {
        this.handlers.onDestroy?.();
        for (const child of this.slotSizes.items) {
            this.disown(child);
        }
        removeRenderNode(this);
        this.nodeEmitter = undefined;
        this.errorEmitter = undefined;
    }

    dirty(phase: RenderNodeCommitPhase) {
        this.commitPhase |= phase;
        dirtyRenderNode(this, phase);
    }

    own(child: RenderNode) {
        if (child === emptyRenderNode) return;
        retain(child);
    }

    disown(child: RenderNode) {
        if (child === emptyRenderNode) return;
        release(child);
    }
}

/**
 * Renders nothing
 */
export class EmptyRenderNode extends RenderNode {
    constructor() {
        super({}, []);
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
}

/**
 * Only need one of nothing
 */
export const emptyRenderNode = new EmptyRenderNode();
