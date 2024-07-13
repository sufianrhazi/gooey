import { applyArrayEvent, ArrayEventType } from '../../common/arrayevent';
import { RenderNodeCommitPhase } from './constants';
import type { RenderNode } from './rendernode';
import { StaticRenderNode } from './rendernode';

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
    const renderNode = new StaticRenderNode(
        {
            onEvent: (event) => {
                for (const removedNode of applyArrayEvent(nodes, event)) {
                    pendingEvent.set(
                        removedNode,
                        IntrinsicObserverEventType.UNMOUNT
                    );
                    renderNode.requestCommit(
                        RenderNodeCommitPhase.COMMIT_MOUNT
                    );
                    renderNode.requestCommit(
                        RenderNodeCommitPhase.COMMIT_UNMOUNT
                    );
                }
                if (event.type === ArrayEventType.SPLICE && event.items) {
                    for (const addedNode of event.items) {
                        pendingEvent.set(
                            addedNode,
                            IntrinsicObserverEventType.MOUNT
                        );
                    }
                    renderNode.requestCommit(
                        RenderNodeCommitPhase.COMMIT_MOUNT
                    );
                    renderNode.requestCommit(
                        RenderNodeCommitPhase.COMMIT_UNMOUNT
                    );
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
                    renderNode.requestCommit(
                        RenderNodeCommitPhase.COMMIT_MOUNT
                    );
                    renderNode.requestCommit(
                        RenderNodeCommitPhase.COMMIT_UNMOUNT
                    );
                }
            },
            onUnmount: () => {
                for (const node of nodes) {
                    pendingEvent.set(node, IntrinsicObserverEventType.UNMOUNT);
                    renderNode.requestCommit(
                        RenderNodeCommitPhase.COMMIT_MOUNT
                    );
                    renderNode.requestCommit(
                        RenderNodeCommitPhase.COMMIT_UNMOUNT
                    );
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
        child,
        debugName ?? 'IntrinsicObserverRenderNode'
    );
    return renderNode;
}
