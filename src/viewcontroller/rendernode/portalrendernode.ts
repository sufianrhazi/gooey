import type { ArrayEvent } from '../../common/arrayevent';
import {
    addArrayEvent,
    applyArrayEvent,
    ArrayEventType,
} from '../../common/arrayevent';
import * as log from '../../common/log';
import type { RefObjectOrCallback } from '../ref';
import { Ref } from '../ref';
import { RenderNodeCommitPhase } from './constants';
import type { RenderNode } from './rendernode';
import { StaticRenderNode } from './rendernode';

// TODO: fix this, this needs to be two flags: needs unmount notification; needs mount notification
enum MountState {
    MOUNTED,
    NOTIFY_MOUNT,
    NOTIFY_UNMOUNT,
    UNMOUNTED,
}

// A shared document fragment; NOTE: always clear after use
const fragment = document.createDocumentFragment();

export function PortalRenderNode(
    element: Element | ShadowRoot,
    childrenRenderNode: RenderNode,
    refProp:
        | RefObjectOrCallback<Element | ShadowRoot | undefined>
        | null
        | undefined,
    debugName?: string
) {
    let childEvents: ArrayEvent<Node>[] = [];
    let committedNodes: Node[] = [];
    let liveNodes: Node[] = [];
    let liveNodeSet: Set<Node> = new Set();
    let deadNodeSet: Set<Node> = new Set();
    let mountState: MountState | undefined;

    if (refProp) {
        mountState = MountState.UNMOUNTED;
    }

    function insertBefore(nodes: Node[], targetIndex: number) {
        let toInsert: Node | undefined;
        if (nodes.length === 1) {
            toInsert = nodes[0];
            liveNodeSet.add(nodes[0]);
            committedNodes.splice(targetIndex, 0, toInsert);
        } else if (nodes.length > 1) {
            for (const node of nodes) {
                liveNodeSet.add(node);
                fragment.appendChild(node);
            }
            committedNodes.splice(targetIndex, 0, ...nodes);
            toInsert = fragment;
        }
        if (toInsert) {
            element.insertBefore(
                toInsert,
                element.childNodes[targetIndex] || null
            );
        }
    }

    const renderNode = new StaticRenderNode(
        {
            onEvent: (event: ArrayEvent<Node>) => {
                addArrayEvent(childEvents, event);
                const isDelete =
                    event.type !== ArrayEventType.SPLICE || event.count > 0;
                const isInsert =
                    event.type !== ArrayEventType.SPLICE || event.items?.length;
                if (isDelete) {
                    renderNode.requestCommit(
                        RenderNodeCommitPhase.COMMIT_DELETE
                    );
                }
                if (isInsert) {
                    renderNode.requestCommit(
                        RenderNodeCommitPhase.COMMIT_INSERT
                    );
                }
                return true;
            },
            onMount: () => {
                if (refProp) {
                    renderNode.requestCommit(
                        RenderNodeCommitPhase.COMMIT_MOUNT
                    );
                    mountState = MountState.NOTIFY_MOUNT;
                }
            },
            onUnmount: () => {
                if (refProp) {
                    renderNode.requestCommit(
                        RenderNodeCommitPhase.COMMIT_UNMOUNT
                    );
                    mountState = MountState.NOTIFY_UNMOUNT;
                }
            },
            onCommit: (phase: RenderNodeCommitPhase) => {
                if (childEvents.length > 0) {
                    // Prep received events
                    const toProcess = childEvents;
                    childEvents = [];
                    for (const childEvent of toProcess) {
                        const removed = applyArrayEvent(liveNodes, childEvent);
                        for (const toRemove of removed) {
                            if (liveNodeSet.has(toRemove)) {
                                deadNodeSet.add(toRemove);
                            }
                        }
                    }
                }
                if (
                    phase === RenderNodeCommitPhase.COMMIT_UNMOUNT &&
                    refProp &&
                    mountState === MountState.NOTIFY_UNMOUNT
                ) {
                    if (refProp instanceof Ref) {
                        refProp.current = undefined;
                    } else if (typeof refProp === 'function') {
                        refProp(undefined);
                    }
                    mountState = MountState.UNMOUNTED;
                }
                if (
                    phase === RenderNodeCommitPhase.COMMIT_DELETE &&
                    deadNodeSet.size > 0
                ) {
                    if (deadNodeSet.size === liveNodeSet.size) {
                        element.replaceChildren();
                        liveNodeSet.clear();
                        committedNodes = [];
                    } else {
                        for (const toRemove of deadNodeSet) {
                            liveNodeSet.delete(toRemove);
                            element.removeChild(toRemove);
                        }
                        committedNodes = committedNodes.filter(
                            (node) => !deadNodeSet.has(node)
                        );
                    }
                    deadNodeSet.clear();
                }
                if (
                    phase === RenderNodeCommitPhase.COMMIT_INSERT &&
                    liveNodes.length > 0
                ) {
                    // At this point, we've removed all the nodes from element and committedNodes
                    // And need to insert nodes in liveNodes in order to committedNodes
                    //
                    // Scan through liveNodes, if we hit the end corresponding missing node  and liveNodes
                    let liveIndex = 0;
                    while (liveIndex < liveNodes.length) {
                        if (liveIndex >= committedNodes.length) {
                            // We're at the end of the committed set, insert the remaining liveNodes at the end
                            insertBefore(liveNodes.slice(liveIndex), liveIndex);
                            break;
                        }
                        if (
                            liveNodes[liveIndex] !== committedNodes[liveIndex]
                        ) {
                            let checkIndex = liveIndex + 1;
                            while (
                                checkIndex < liveNodes.length &&
                                checkIndex < committedNodes.length &&
                                liveNodes[checkIndex] !==
                                    committedNodes[liveIndex]
                            ) {
                                checkIndex++;
                            }
                            // [liveIndex...checkIndex] need to be inserted before committedNodes[liveIndex]
                            insertBefore(
                                liveNodes.slice(liveIndex, checkIndex),
                                liveIndex
                            );
                            liveIndex = checkIndex;
                            continue;
                        }
                        liveIndex++;
                    }
                }
                if (
                    phase === RenderNodeCommitPhase.COMMIT_MOUNT &&
                    refProp &&
                    mountState === MountState.NOTIFY_MOUNT
                ) {
                    if (refProp instanceof Ref) {
                        refProp.current = element;
                    } else if (typeof refProp === 'function') {
                        refProp(element);
                    }
                    mountState = MountState.MOUNTED;
                }
            },
            clone(): RenderNode {
                log.assert(
                    false,
                    "Attempted to clone a PortalRenderNode -- this operation doesn't make sense"
                );
            },
            onDestroy: () => {
                childEvents = [];
                committedNodes = [];
                liveNodes = [];
                liveNodeSet = new Set();
                deadNodeSet = new Set();
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
