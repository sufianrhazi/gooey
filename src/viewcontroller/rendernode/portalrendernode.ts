import type { ArrayEvent } from '../../common/arrayevent';
import { addArrayEvent, ArrayEventType } from '../../common/arrayevent';
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

    const renderNode = new SingleChildRenderNode(
        {
            onEvent: (event: ArrayEvent<Node>) => {
                addArrayEvent(pendingEvents, event);
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
                    for (const event of pendingEvents) {
                        switch (event.type) {
                            case ArrayEventType.SPLICE: {
                                if (
                                    event.index === 0 &&
                                    event.count > 0 &&
                                    event.count === element.childNodes.length
                                ) {
                                    element.replaceChildren();
                                } else {
                                    for (let i = event.count - 1; i >= 0; --i) {
                                        const toRemove =
                                            element.childNodes[event.index + i];
                                        element.removeChild(toRemove);
                                    }
                                }
                                if (event.items) {
                                    const referenceNode =
                                        element.childNodes[event.index] || null;
                                    for (const node of event.items) {
                                        moveOrInsertBefore(
                                            element,
                                            node,
                                            referenceNode
                                        );
                                    }
                                }
                                break;
                            }
                            case ArrayEventType.SORT: {
                                const toInsert: Node[] = [];
                                for (let i = 0; i < event.indexes.length; ++i) {
                                    toInsert.push(
                                        element.childNodes[event.indexes[i]]
                                    );
                                }
                                const referenceNode =
                                    element.childNodes[
                                        event.from + event.indexes.length
                                    ] || null;
                                for (const node of toInsert) {
                                    moveOrInsertBefore(
                                        element,
                                        node,
                                        referenceNode
                                    );
                                }
                                break;
                            }
                            case ArrayEventType.MOVE: {
                                const toMove: Node[] = [];
                                for (let i = 0; i < event.count; ++i) {
                                    toMove.push(
                                        element.childNodes[event.from + i]
                                    );
                                }
                                const referenceIndex =
                                    event.to > event.from
                                        ? event.to + event.count
                                        : event.to;
                                const referenceNode =
                                    element.childNodes[referenceIndex] || null;
                                for (const node of toMove) {
                                    moveOrInsertBefore(
                                        element,
                                        node,
                                        referenceNode
                                    );
                                }
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
