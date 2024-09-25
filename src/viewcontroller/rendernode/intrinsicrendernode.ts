import type { ArrayEvent } from '../../common/arrayevent';
import { ArrayEventType } from '../../common/arrayevent';
import type { Dyn } from '../../common/dyn';
import { dynGet, dynSubscribe, isDynamic } from '../../common/dyn';
import * as log from '../../common/log';
import { flush } from '../../model/engine';
import { assignProp, setAttribute } from '../jsx';
import { getWebComponentTagConstructors } from '../webcomponents';
import {
    ELEMENT_NAMESPACE_GUESS,
    elementNamespaceTransitionMap,
    HTML_NAMESPACE,
} from '../xmlnamespace';
import { ArrayRenderNode } from './arrayrendernode';
import { PortalRenderNode } from './portalrendernode';
import type { ParentContext, RenderNode } from './rendernode';
import { emptyRenderNode, SingleChildRenderNode } from './rendernode';

const EventProps = [
    { prefix: 'on:', param: false },
    { prefix: 'oncapture:', param: true },
    { prefix: 'onpassive:', param: { passive: true } },
] as const;

/**
 * Renders an intrinsic DOM node
 */
export function IntrinsicRenderNode(
    tagName: string,
    props: Record<string, any> | undefined,
    childRenderNode: RenderNode,
    debugName?: string
): RenderNode {
    let boundAttributes: undefined | Map<string, Dyn<unknown>>;
    let subscriptions: undefined | Set<() => void>;
    let element: undefined | Element;
    let elementXmlNamespace: undefined | string;
    let portalRenderNode: undefined | RenderNode;
    let detachedError: undefined | Error;

    function handleEvent(event: ArrayEvent<Node>) {
        log.assert(
            false,
            'unexpected event in IntrinsicRenderNode from PortalRenderNode'
        );
    }

    function handleError(error: Error) {
        if (renderNode.isAttached()) {
            // Pass up errors while attached
            renderNode.emitError(error);
        } else {
            // We are capable of handling errors while detached
            log.warn(
                'Unhandled error on detached IntrinsicRenderNode',
                debugName,
                error
            );
            detachedError = error;
            return true;
        }
    }

    function ensureElement(
        parentContext: ParentContext,
        xmlNamespace: string,
        childXmlNamespace: string
    ) {
        if (!element || xmlNamespace !== elementXmlNamespace) {
            elementXmlNamespace = xmlNamespace;
            element = createElement(xmlNamespace);

            if (portalRenderNode) {
                if (renderNode.isMounted()) {
                    portalRenderNode.onUnmount();
                }
                portalRenderNode.detach();
                renderNode.disown(portalRenderNode);
            }
            portalRenderNode = PortalRenderNode(
                element,
                childRenderNode,
                props?.ref
            );
            renderNode.own(portalRenderNode);
            portalRenderNode.attach({
                nodeEmitter: handleEvent,
                errorEmitter: handleError,
                xmlNamespace: childXmlNamespace,
            });
            if (renderNode.isMounted()) {
                portalRenderNode.onMount();
            }
        }
        return element;
    }

    function createElement(xmlNamespace: string) {
        let element: Element;
        if (
            typeof props?.is === 'string' &&
            tagName in getWebComponentTagConstructors()
        ) {
            element = document.createElement(tagName, {
                is: props.is,
            });
        } else {
            element = document.createElementNS(xmlNamespace, tagName);
        }
        if (props) {
            for (const [prop, val] of Object.entries(props)) {
                if (prop === 'ref') continue; // specially handled by PortalRenderNode
                if (prop === 'is') continue; // specially handled above
                if (
                    EventProps.some(({ prefix, param }) => {
                        if (prop.startsWith(prefix)) {
                            if (val) {
                                element.addEventListener(
                                    prop.slice(prefix.length),
                                    (e) => {
                                        val(e, element);
                                        flush(); // TODO: this is probably not necessary, and may even lead to surprising behavior (read calc A, trigger event, read calc B -> both reads differ!). Consider not flushing after events are triggered.
                                    },
                                    param
                                );
                            }
                            return true;
                        }
                        return false;
                    })
                ) {
                    continue;
                }
                if (isDynamic(val)) {
                    if (!boundAttributes) {
                        boundAttributes = new Map();
                    }
                    boundAttributes.set(prop, val);
                } else {
                    setProp(element, prop, dynGet(val));
                }
            }
            if (boundAttributes) {
                if (!subscriptions) {
                    subscriptions = new Set();
                }
                for (const [prop, boundAttr] of boundAttributes.entries()) {
                    subscriptions.add(
                        dynSubscribe(boundAttr, (error, updatedVal) => {
                            if (error) {
                                log.error('Unhandled error in bound prop', {
                                    prop,
                                    element,
                                    error: updatedVal,
                                });
                            } else {
                                setProp(element, prop, updatedVal);
                            }
                        })
                    );
                    const currentVal = dynGet(boundAttr);
                    setProp(element, prop, currentVal);
                }
            }
        }
        return element;
    }

    function setProp(element: Element, prop: string, val: unknown) {
        if (prop.startsWith('prop:')) {
            const propName = prop.slice(5);
            (element as any)[propName] = val;
            return;
        }

        if (prop.startsWith('attr:')) {
            const attrName = prop.slice(5);
            setAttribute(element, attrName, val);
            return;
        }

        if (
            (element instanceof HTMLElement || element instanceof SVGElement) &&
            (prop.startsWith('cssprop:') || prop.startsWith('style:'))
        ) {
            const attrName = prop.startsWith('cssprop:')
                ? '--' + prop.slice(8)
                : prop.slice(6);
            if (val === undefined || val === null || val === false) {
                element.style.removeProperty(attrName);
            } else if (typeof val === 'string') {
                element.style.setProperty(attrName, val);
            } else if (typeof val === 'number' || typeof val === 'bigint') {
                element.style.setProperty(attrName, val.toString());
            }
            return;
        }

        if (prop.startsWith('style:')) {
            const attrName = prop.slice(6);
            setAttribute(element, attrName, val);
            return;
        }

        assignProp(element, prop, val);
    }

    const renderNode = new SingleChildRenderNode(
        {
            onAttach: (parentContext) => {
                if (detachedError) {
                    parentContext.errorEmitter(detachedError);
                    return;
                }
                const namespaceTransition =
                    elementNamespaceTransitionMap[parentContext.xmlNamespace]?.[
                        tagName
                    ];
                const xmlNamespace =
                    namespaceTransition?.node ?? parentContext.xmlNamespace;
                const childXmlNamespace =
                    namespaceTransition?.children ?? parentContext.xmlNamespace;

                element = ensureElement(
                    parentContext,
                    xmlNamespace,
                    childXmlNamespace
                );

                parentContext.nodeEmitter({
                    type: ArrayEventType.SPLICE,
                    index: 0,
                    count: 0,
                    items: [element],
                });
            },
            onDetach: () => {},
            onMount: () => {
                portalRenderNode?.onMount();
            },
            onUnmount: () => {
                portalRenderNode?.onUnmount();
            },
            clone: (adjustedProps?: {}, newChildren?: RenderNode[]) => {
                return IntrinsicRenderNode(
                    tagName,
                    adjustedProps ? { ...props, ...adjustedProps } : props,
                    newChildren
                        ? ArrayRenderNode(newChildren ?? [])
                        : childRenderNode.clone()
                );
            },
            onAlive: () => {
                const xmlNamespaceGuess =
                    ELEMENT_NAMESPACE_GUESS[tagName] ?? HTML_NAMESPACE;
                const childXmlNamespaceGuess =
                    elementNamespaceTransitionMap[xmlNamespaceGuess]?.[tagName]
                        ?.children ?? xmlNamespaceGuess;
                element = ensureElement(
                    {
                        nodeEmitter: (nodeEvent) => {
                            log.fail(
                                'IntrinsicRenderNode got unexpected node event',
                                nodeEvent
                            );
                        },
                        errorEmitter: (err) => {
                            log.fail(
                                'IntrinsicRenderNode got unexpected error event',
                                err
                            );
                        },
                        xmlNamespace: xmlNamespaceGuess,
                    },
                    xmlNamespaceGuess,
                    childXmlNamespaceGuess
                );
            },
            onDestroy: () => {
                boundAttributes = undefined;
                if (subscriptions) {
                    for (const unsubscribe of subscriptions) {
                        unsubscribe();
                    }
                    subscriptions = undefined;
                }

                element = undefined;
                elementXmlNamespace = undefined;
                if (portalRenderNode) {
                    renderNode.disown(portalRenderNode);
                    portalRenderNode = undefined;
                }

                detachedError = undefined;
            },
        },
        emptyRenderNode,
        debugName ?? `intrinsic(${tagName})`
    );
    return renderNode;
}
