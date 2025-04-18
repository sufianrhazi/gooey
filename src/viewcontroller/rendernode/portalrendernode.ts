import type { ArrayEvent } from '../../common/arrayevent';
import {
    applyArrayEvent,
    ArrayEventType,
    mergeArrayEvents,
} from '../../common/arrayevent';
import * as log from '../../common/log';
import type { RefObjectOrCallback } from '../ref';
import { Ref } from '../ref';
import { RenderNodeCommitPhase } from './constants';
import type { RenderNode } from './rendernode';
import { SingleChildRenderNode } from './rendernode';

const moveOrInsertBeforeFunction =
    'moveBefore' in Element.prototype
        ? (Element.prototype
              .moveBefore as typeof Element.prototype.insertBefore)
        : Element.prototype.insertBefore;

function moveOrInsertBefore(
    element: Element | ShadowRoot,
    node: Node,
    target: Node | null
) {
    const destRoot = element.getRootNode();
    const srcRoot = node.getRootNode();
    if (destRoot === srcRoot) {
        moveOrInsertBeforeFunction.call(element, node, target);
    } else {
        element.insertBefore(node, target);
    }
}

export function PortalRenderNode(
    element: Element | ShadowRoot,
    childrenRenderNode: RenderNode,
    refProp:
        | RefObjectOrCallback<Element | ShadowRoot | undefined>
        | null
        | undefined,
    debugName?: string
) {
    let pendingEvents: ArrayEvent<Node>[] = [];
    let committedNodes: (Node | undefined)[] = [];

    function getReferenceNode(index: number): Node | null {
        for (let i = index; i < committedNodes.length; ++i) {
            const node = committedNodes[i];
            if (node) {
                return node;
            }
        }
        return null;
    }

    const renderNode = new SingleChildRenderNode(
        {
            onEvent: (event: ArrayEvent<Node>) => {
                pendingEvents.push(event);
                renderNode.requestCommit(RenderNodeCommitPhase.COMMIT_UPDATE);
                return true;
            },
            onMount: () => {
                if (refProp) {
                    renderNode.requestCommit(
                        RenderNodeCommitPhase.COMMIT_MOUNT
                    );
                }
            },
            onUnmount: () => {
                if (refProp) {
                    renderNode.requestCommit(
                        RenderNodeCommitPhase.COMMIT_UNMOUNT
                    );
                }
            },
            onCommit: (phase: RenderNodeCommitPhase) => {
                if (phase === RenderNodeCommitPhase.COMMIT_UNMOUNT && refProp) {
                    if (refProp instanceof Ref) {
                        refProp.current = undefined;
                    } else if (typeof refProp === 'function') {
                        refProp(undefined);
                    }
                }
                if (phase === RenderNodeCommitPhase.COMMIT_UPDATE) {
                    // It's possible that another RenderNode has committed first and inserted a Node which was a direct
                    // child of this node. See the test case "jsx relocation can occur in complex situations"
                    //
                    // This will cause the inserted node to be removed from this RenderNode's element and placed as the
                    // other RenderNode's child.
                    //
                    // We can detect if this stolen node has occurred if the actual sequence of children does not match
                    // what is in our committedNodes array.
                    //
                    // In this case, we can assume the stolen node will be removed by this commit, and "skip" over it
                    // when picking the reference node for insertions.
                    for (
                        let i = 0, childIndex = 0;
                        i < committedNodes.length;
                        ++i
                    ) {
                        const expectedNode = committedNodes[i];
                        const realNode = element.childNodes[childIndex];
                        if (expectedNode && expectedNode === realNode) {
                            childIndex += 1;
                        } else {
                            // Assume the child was stolen, work around its absence
                            committedNodes[i] = undefined;
                        }
                    }

                    for (const event of mergeArrayEvents(pendingEvents)) {
                        switch (event.type) {
                            case ArrayEventType.SPLICE: {
                                if (
                                    event.index === 0 &&
                                    event.count > 0 &&
                                    event.count === committedNodes.length
                                ) {
                                    element.replaceChildren();
                                    committedNodes = [];
                                } else {
                                    for (let i = event.count - 1; i >= 0; --i) {
                                        const toRemove =
                                            committedNodes[event.index + i];
                                        if (toRemove) {
                                            element.removeChild(toRemove);
                                        }
                                    }
                                    committedNodes.splice(
                                        event.index,
                                        event.count
                                    );
                                }
                                if (event.items) {
                                    const referenceNode = getReferenceNode(
                                        event.index
                                    );
                                    if (
                                        event.items.length > 1 &&
                                        event.items.every(
                                            (node) => node.parentNode === null
                                        )
                                    ) {
                                        // Performance optimization:
                                        // If we're adding new nodes (not
                                        // *moving* them), we can quickly batch
                                        // add in one swoop via a document
                                        // fragment
                                        const fragment =
                                            document.createDocumentFragment();
                                        fragment.replaceChildren(
                                            ...event.items
                                        );
                                        moveOrInsertBefore(
                                            element,
                                            fragment,
                                            referenceNode
                                        );
                                    } else {
                                        for (const node of event.items) {
                                            moveOrInsertBefore(
                                                element,
                                                node,
                                                referenceNode
                                            );
                                        }
                                    }
                                    committedNodes.splice(
                                        event.index,
                                        0,
                                        ...event.items
                                    );
                                }
                                break;
                            }
                            case ArrayEventType.SORT: {
                                const toInsert: Node[] = [];
                                for (let i = 0; i < event.indexes.length; ++i) {
                                    const node =
                                        committedNodes[event.indexes[i]];
                                    if (node) {
                                        toInsert.push(node);
                                    }
                                }
                                const referenceNode = getReferenceNode(
                                    event.from + event.indexes.length
                                );
                                for (const node of toInsert) {
                                    moveOrInsertBefore(
                                        element,
                                        node,
                                        referenceNode
                                    );
                                }
                                applyArrayEvent(committedNodes, event);
                                break;
                            }
                            case ArrayEventType.MOVE: {
                                const toMove: Node[] = [];
                                for (let i = 0; i < event.count; ++i) {
                                    const node = committedNodes[event.from + i];
                                    if (node) {
                                        toMove.push(node);
                                    }
                                }
                                const referenceIndex =
                                    event.to > event.from
                                        ? event.to + event.count
                                        : event.to;
                                const referenceNode =
                                    getReferenceNode(referenceIndex);
                                for (const node of toMove) {
                                    moveOrInsertBefore(
                                        element,
                                        node,
                                        referenceNode
                                    );
                                }
                                applyArrayEvent(committedNodes, event);
                                break;
                            }
                        }
                    }
                    pendingEvents = [];
                }
                if (phase === RenderNodeCommitPhase.COMMIT_MOUNT && refProp) {
                    if (refProp instanceof Ref) {
                        refProp.current = element;
                    } else if (typeof refProp === 'function') {
                        refProp(element);
                    }
                }
            },
            clone(): RenderNode {
                log.assert(
                    false,
                    "Attempted to clone a PortalRenderNode -- this operation doesn't make sense"
                );
            },
            onDestroy: () => {
                pendingEvents = [];
                committedNodes = [];
            },
        },
        childrenRenderNode,
        `mount(${
            element instanceof Element
                ? element.tagName
                : `shadow(${element.host.tagName})`
        })`
    );
    return renderNode;
}
