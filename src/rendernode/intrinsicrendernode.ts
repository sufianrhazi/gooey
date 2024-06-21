import type { ArrayEvent } from '../arrayevent';
import { ArrayEventType } from '../arrayevent';
import { Calculation } from '../calc';
import { flush } from '../engine';
import { Field } from '../field';
import { assignProp, setAttribute } from '../jsx';
import * as log from '../log';
import { webComponentTagConstructors } from '../webcomponents';
import {
    ELEMENT_NAMESPACE_GUESS,
    elementNamespaceTransitionMap,
    HTML_NAMESPACE,
} from '../xmlnamespace';
import { ArrayRenderNode } from './arrayrendernode';
import { PortalRenderNode } from './portalrendernode';
import { RenderNode } from './rendernode';

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
    let boundAttributes:
        | undefined
        | Map<string, Calculation<unknown> | Field<unknown>>;
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

    function ensureElement(xmlNamespace: string, childXmlNamespace: string) {
        if (!element || xmlNamespace !== elementXmlNamespace) {
            elementXmlNamespace = xmlNamespace;
            element = createElement(xmlNamespace);

            if (portalRenderNode) {
                if (renderNode.isMounted()) {
                    portalRenderNode.setMounted(false);
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
            portalRenderNode.attach(
                handleEvent,
                handleError,
                childXmlNamespace
            );
            if (renderNode.isMounted()) {
                portalRenderNode.setMounted(true);
            }
        }
        return element;
    }

    function createElement(xmlNamespace: string) {
        let element: Element;
        if (
            tagName in webComponentTagConstructors &&
            typeof props?.is === 'string'
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
                                        try {
                                            val(e, element);
                                        } catch (e) {
                                            flush();
                                            throw e;
                                        }
                                        flush();
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
                if (val instanceof Calculation) {
                    if (!boundAttributes) {
                        boundAttributes = new Map();
                    }
                    boundAttributes.set(prop, val);
                } else if (val instanceof Field) {
                    if (!boundAttributes) {
                        boundAttributes = new Map();
                    }
                    boundAttributes.set(prop, val);
                } else {
                    setProp(element, prop, val);
                }
            }
            if (boundAttributes) {
                if (!subscriptions) {
                    subscriptions = new Set();
                }
                for (const [prop, boundAttr] of boundAttributes.entries()) {
                    boundAttr.retain();
                    const currentVal = boundAttr.get();
                    setProp(element, prop, currentVal);
                    if (boundAttr instanceof Field) {
                        subscriptions.add(
                            boundAttr.subscribe((updatedVal) => {
                                setProp(element, prop, updatedVal);
                            })
                        );
                    } else {
                        subscriptions.add(
                            boundAttr.subscribeWithError(
                                (error, updatedVal) => {
                                    if (error) {
                                        log.error(
                                            'Unhandled error in bound prop',
                                            {
                                                prop,
                                                element,
                                                error: updatedVal,
                                            }
                                        );
                                    } else {
                                        setProp(element, prop, updatedVal);
                                    }
                                }
                            )
                        );
                    }
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

    const renderNode = new RenderNode(
        {
            onAttach: (nodeEmitter, errorEmitter, parentXmlNamespace) => {
                if (detachedError) {
                    errorEmitter(detachedError);
                    return;
                }
                const namespaceTransition =
                    elementNamespaceTransitionMap[parentXmlNamespace]?.[
                        tagName
                    ];
                const xmlNamespace =
                    namespaceTransition?.node ?? parentXmlNamespace;
                const childXmlNamespace =
                    namespaceTransition?.children ?? parentXmlNamespace;

                element = ensureElement(xmlNamespace, childXmlNamespace);

                nodeEmitter({
                    type: ArrayEventType.SPLICE,
                    index: 0,
                    count: 0,
                    items: [element],
                });
            },
            onDetach: (nodeEmitter) => {
                nodeEmitter({
                    type: ArrayEventType.SPLICE,
                    index: 0,
                    count: 1,
                });
            },
            onMount: () => {
                portalRenderNode?.setMounted(true);
            },
            onUnmount: () => {
                portalRenderNode?.setMounted(false);
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
                // At this point in time, we don't know for sure what the correct XML namespace is, as this could be an SVG
                // looking element that eventually gets placed within an SVG tree, which ought to result in an
                // SVGUnknownElement. So we take an educated guess;
                const xmlNamespaceGuess =
                    ELEMENT_NAMESPACE_GUESS[tagName] || HTML_NAMESPACE;

                // foreignObject is special; it should be created with an SVG namespace but children should have a HTML
                // namespace
                ensureElement(
                    xmlNamespaceGuess,
                    tagName === 'foreignObject'
                        ? HTML_NAMESPACE
                        : xmlNamespaceGuess
                );
            },
            onDestroy: () => {
                if (boundAttributes) {
                    for (const calculation of boundAttributes.values()) {
                        calculation.release();
                    }
                    boundAttributes = undefined;
                }
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
        [],
        debugName ?? `intrinsic(${tagName})`
    );
    return renderNode;
}
