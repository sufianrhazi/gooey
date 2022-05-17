import {
    effect,
    retain,
    release,
    untracked,
    addOrderingDep,
    removeOrderingDep,
    registerNode,
    disposeNode, // TODO: dispose nodes!
    trackCreatedCalculations,
    afterFlush,
} from './calc';
import { name, debugNameFor } from './debug';
import {
    Collection,
    Calculation,
    View,
    Context,
    NodeOrdering,
    isContext,
    isCalculation,
    isCollection,
    isRef,
    ObserveKey,
    GetSubscriptionNodeKey,
    TypeTag,
    createContext,
    getContext,
    IntrinsicNodeObserverNodeCallback,
    IntrinsicNodeObserverElementCallback,
} from './types';
import * as log from './log';
import { uniqueid } from './util';
import {
    Component,
    ComponentListeners,
    JSXNode,
    RenderNode,
    RenderEvent,
    RenderEventHandler,
    RenderContext,
    RenderNodeType,
    makeRenderNode,
    isRenderNode,
    getElementTypeMapping,
} from './jsx';

export const Fragment = ({ children }: { children: JSXNode[] }) => children;

export const LifecycleObserver = (_props: {
    nodeCallback?: IntrinsicNodeObserverNodeCallback | undefined;
    elementCallback?: IntrinsicNodeObserverElementCallback | undefined;
    children?: JSXNode | JSXNode[];
}): JSX.Element | null => {
    // Note: this function is never actually called; see createElement
    return null;
};

/**
 * Given an array of indexes (indexes), and an array of childInfo containing
 * sizes, produce an array of "expanded" indexes so that each index in indexes
 * is expanded to account for the size in the corresponding childInfo.
 *
 * For example,
 *
 * If the underlying collection looks like: [a, b, c, d]
 * And the indexes provided look like: [2, 0, 3, 1]
 * And the childInfo sizes look like: [3, 2, 4, 0]
 *
 * This means the underlying real elements look like: [a1, a2, a3, b1, b2, c1, c2, c3, c4]
 * And if sorted by indexes accounting for size, the desired sort would be:
 *   [c1, c2, c3, c4, a1, a2, a3, b1, b2]
 *
 * So we calculate the expanded indexes to be the index of this desired sort:
 *   [5, 6, 7, 8, 0, 1, 2, 3, 4]
 */
function getExpandedSortIndexes(
    indexes: readonly number[],
    childInfo: readonly { size: number }[]
) {
    // Build [[0, 1, 2], [3, 4], [5, 6, 7, 8], []]
    const nestedCurrentIndexes: number[][] = [];
    let n = 0;
    for (let i = 0; i < childInfo.length; ++i) {
        const arr: number[] = [];
        for (let j = 0; j < childInfo[i].size; ++j) {
            arr.push(n);
            n += 1;
        }
        nestedCurrentIndexes.push(arr);
    }

    // Shuffle [[0, 1, 2], [3, 4], [5, 6, 7, 8], []] -> [[5, 6, 7, 8], [0, 1, 2], [], [3, 4]]
    const nestedSortedIndexes = [];
    for (let i = 0; i < indexes.length; ++i) {
        const newIndex = indexes[i];
        nestedSortedIndexes.push(nestedCurrentIndexes[newIndex]);
    }

    // Flatten
    return Array<number>().concat(...nestedSortedIndexes);
}

/**
 * Note: this is a lie and a cast that only checks that `obj` is a Calculation<any>
 */
function isCalculationOfJsxNode(obj: any): obj is Calculation<JSXNode> {
    return isCalculation(obj);
}

const emptyLifecycle = {};
function createEmptyRenderNode(): RenderNode {
    return makeRenderNode(
        RenderNodeType.empty,
        DEBUG && {},
        () => emptyLifecycle
    );
}

function createTextRenderNode(text: string): RenderNode {
    let textNode: null | Text = null;
    let isAttached = false;
    const type = RenderNodeType.text;

    return makeRenderNode(type, DEBUG && { text }, () => {
        textNode = document.createTextNode(text);
        return {
            attach: (handler, context) => {
                log.assert(textNode, 'operation on dead node');
                log.assert(
                    !isAttached,
                    `Invariant: RenderNode ${type} double attached`
                );
                isAttached = true;
                handler({
                    type: 'splice',
                    index: 0,
                    count: 0,
                    nodes: [textNode],
                });
            },
            detach: (handler, context) => {
                log.assert(
                    isAttached,
                    `Invariant: RenderNode ${type} double detached`
                );
                isAttached = false;
                handler({
                    type: 'splice',
                    index: 0,
                    count: 1,
                    nodes: [],
                });
            },
            destroy: () => {
                textNode = null;
                isAttached = false;
            },
        };
    });
}

function createForeignElementRenderNode(node: Element | Text): RenderNode {
    const type = RenderNodeType.foreignElement;
    let isAttached = false;
    return makeRenderNode(type, DEBUG && { node }, () => {
        return {
            attach: (handler, context) => {
                log.assert(
                    !isAttached,
                    `Invariant: RenderNode ${type} double attached`
                );
                isAttached = true;
                handler({
                    type: 'splice',
                    index: 0,
                    count: 0,
                    nodes: [node],
                });
            },
            detach: (handler, context) => {
                log.assert(
                    isAttached,
                    `Invariant: RenderNode ${type} double detached`
                );
                isAttached = false;
                handler({
                    type: 'splice',
                    index: 0,
                    count: 1,
                    nodes: [],
                });
            },
            destroy: () => {
                isAttached = false;
            },
        };
    });
}

function createCalculationRenderNode(
    calculation: Calculation<JSXNode>
): RenderNode {
    const type = RenderNodeType.calculation;
    let attachedState: null | {
        handler: RenderEventHandler;
        context: RenderContext;
    } = null;
    let isMounted = false;
    return makeRenderNode(type, DEBUG && { calculation }, () => {
        let child: null | RenderNode = null;

        const maintenanceEffect = effect(
            () => {
                const jsxNode = calculation();

                const newChild = jsxNodeToRenderNode(jsxNode);

                // It's possible that the calculation has returned the same node; no need to detach/destroy/retain/remount
                if (child === newChild) return;

                // Hold onto the new child so it isn't destroyed/recreated if it is being moved
                newChild.retain();

                // Relinquish old child
                if (child) {
                    if (attachedState) {
                        if (isMounted) {
                            child._lifecycle?.beforeUnmount?.();
                        }
                        child._lifecycle?.detach?.(
                            attachedState.handler,
                            attachedState.context
                        );
                    }
                    child.release();
                    child = null;
                }

                // Gain responsibility for new child after flush, so that it may be relinquished elsewhere
                afterFlush(() => {
                    // Attach new child
                    if (attachedState) {
                        newChild._lifecycle?.attach?.(
                            attachedState.handler,
                            attachedState.context
                        );
                        if (isMounted) {
                            newChild._lifecycle?.afterMount?.();
                        }
                    }
                    child = newChild;
                });
            },
            DEBUG
                ? `render:effect->${debugNameFor(calculation)}`
                : 'render:effect'
        );

        return {
            attach: (handler, context) => {
                log.assert(
                    attachedState === null,
                    `Invariant: RenderNode ${type} double attached`
                );
                attachedState = { handler, context };

                addOrderingDep(
                    attachedState.context.nodeOrdering,
                    maintenanceEffect
                );
                retain(maintenanceEffect);
                maintenanceEffect();
            },
            detach: (handler, context) => {
                log.assert(
                    attachedState !== null,
                    `Invariant: RenderNode ${type} double detached`
                );

                removeOrderingDep(
                    attachedState.context.nodeOrdering,
                    maintenanceEffect
                );
                release(maintenanceEffect);
                // TODO: Do I need to do this? Probably
                //   maintenanceEffect[CalculationInvalidateTag]();

                // Detach prior result
                if (child) {
                    if (attachedState) {
                        child._lifecycle?.detach?.(
                            attachedState.handler,
                            attachedState.context
                        );
                    }
                    child.release();
                    child = null;
                }

                attachedState = null;
            },
            afterMount: () => {
                isMounted = true;
                child?._lifecycle?.afterMount?.();
            },
            beforeUnmount: () => {
                child?._lifecycle?.beforeUnmount?.();
                isMounted = false;
            },
            destroy: () => {
                child?.release();
                child = null;
                isMounted = false;
                attachedState = null;
            },
        };
    });
}

function createArrayRenderNode(children: readonly JSXNode[]): RenderNode {
    if (children.length === 0) {
        return createEmptyRenderNode();
    }
    if (children.length === 1) {
        return jsxNodeToRenderNode(children[0]);
    }

    const type = RenderNodeType.array;

    type ChildInfoRecord = {
        renderNode: RenderNode;
        handler: RenderEventHandler;
        size: number;
    };

    const childRenderNodes = children.map((jsxNode) =>
        jsxNodeToRenderNode(jsxNode)
    );

    let childInfo: ChildInfoRecord[] = [];

    let attachedState: null | {
        handler: RenderEventHandler;
        context: RenderContext;
    } = null;
    let isMounted = false;

    const childEventHandler = (
        event: RenderEvent,
        childRenderNode: RenderNode
    ) => {
        log.assert(attachedState, 'Array RenderNode got event when detached');
        let insertionIndex = 0;
        let infoRecord: null | ChildInfoRecord = null;
        for (const info of childInfo) {
            if (info.renderNode === childRenderNode) {
                infoRecord = info;
                break;
            }
            insertionIndex += info.size;
        }
        log.assert(infoRecord, 'event on removed child');
        switch (event.type) {
            case 'splice': {
                attachedState.handler({
                    type: 'splice',
                    index: event.index + insertionIndex,
                    count: event.count,
                    nodes: event.nodes,
                });
                infoRecord.size =
                    infoRecord.size - event.count + event.nodes.length;
                break;
            }
            case 'move': {
                attachedState.handler({
                    type: 'move',
                    fromIndex: event.fromIndex + insertionIndex,
                    count: event.count,
                    toIndex: event.toIndex + insertionIndex,
                });
                break;
            }
            case 'sort': {
                attachedState.handler({
                    type: 'sort',
                    fromIndex: insertionIndex + event.fromIndex,
                    indexes: event.indexes.map(
                        (index) => index + insertionIndex
                    ),
                });
                break;
            }
            default:
                log.assertExhausted(event, 'unexpected render event');
        }
    };

    return makeRenderNode(type, DEBUG && { array: children }, () => {
        childInfo = childRenderNodes.map((renderNode, childIndex) => {
            renderNode.retain();

            return {
                renderNode,
                handler: (event: RenderEvent) => {
                    childEventHandler(event, renderNode);
                },
                size: 0,
            };
        });

        return {
            attach: (handler, context) => {
                log.assert(
                    attachedState === null,
                    `Invariant: RenderNode ${type} double attached`
                );
                attachedState = { handler, context };

                for (const info of childInfo) {
                    info.renderNode._lifecycle?.attach?.(info.handler, context);
                }
            },
            detach: (handler, context) => {
                log.assert(
                    attachedState !== null,
                    `Invariant: RenderNode ${type} double detached`
                );
                for (const info of childInfo) {
                    info.renderNode._lifecycle?.detach?.(info.handler, context);
                }

                attachedState = null;
            },
            afterMount: () => {
                isMounted = true;
                for (const info of childInfo) {
                    if (isMounted) {
                        info.renderNode._lifecycle?.afterMount?.();
                    }
                }
            },
            beforeUnmount: () => {
                for (const info of childInfo) {
                    if (isMounted) {
                        info.renderNode._lifecycle?.beforeUnmount?.();
                    }
                }
                isMounted = false;
            },
            destroy: () => {
                childRenderNodes.forEach((renderNode) => {
                    renderNode.release();
                });
                childInfo = [];
                isMounted = false;
                attachedState = null;
            },
        };
    });
}

function jsxNodeToRenderNode(child: JSXNode): RenderNode {
    if (typeof child === 'string') {
        return createTextRenderNode(child);
    } else if (typeof child === 'number' || typeof child === 'bigint') {
        return createTextRenderNode(child.toString());
    } else if (
        typeof child === 'boolean' ||
        child === null ||
        child === undefined
    ) {
        return createEmptyRenderNode();
    } else if (child instanceof Element || child instanceof Text) {
        return createForeignElementRenderNode(child);
    } else if (isCalculationOfJsxNode(child)) {
        return createCalculationRenderNode(child);
    } else if (isCollection(child) || isCollectionView(child)) {
        return createCollectionRenderNode(child);
    } else if (Array.isArray(child)) {
        return createArrayRenderNode(child);
    } else if (isRenderNode(child)) {
        return child;
    } else if (typeof child === 'symbol') {
        log.warn(
            'Attempted to render JSX node that was a symbol, not rendering anything'
        );
        return createEmptyRenderNode();
    } else if (typeof child === 'function') {
        log.warn(
            'Attempted to render JSX node that was a function, not rendering anything'
        );
        return createEmptyRenderNode();
    } else {
        log.assertExhausted(
            child,
            'Attempted to render unexpected value',
            child
        );
    }
    return createEmptyRenderNode();
}

const HTML_NAMESPACE = 'http://www.w3.org/1999/xhtml';
const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';
const MATHML_NAMESPACE = 'http://www.w3.org/1998/Math/MathML';
const XLINK_NAMESPACE = 'http://www.w3.org/1999/xlink';
const XML_NAMESPACE = 'http://www.w3.org/XML/1998/namespace';
const XMLNS_NAMESPACE = 'http://www.w3.org/2000/xmlns/';

const attributeNamespaceMap: Record<string, string> = {
    'xlink:actuate': XLINK_NAMESPACE,
    'xlink:arcrole': XLINK_NAMESPACE,
    'xlink:href': XLINK_NAMESPACE,
    'xlink:role': XLINK_NAMESPACE,
    'xlink:show': XLINK_NAMESPACE,
    'xlink:title': XLINK_NAMESPACE,
    'xlink:type': XLINK_NAMESPACE,
    'xml:lang': XML_NAMESPACE,
    'xml:space': XML_NAMESPACE,
    xmlns: XMLNS_NAMESPACE,
    'xmlns:xlink': XMLNS_NAMESPACE,
};
const elementNamespaceTransitionMap: Record<
    string,
    Record<string, { node: string; children: string } | undefined> | undefined
> = {
    [HTML_NAMESPACE]: {
        svg: {
            node: SVG_NAMESPACE,
            children: SVG_NAMESPACE,
        },
        math: {
            node: MATHML_NAMESPACE,
            children: MATHML_NAMESPACE,
        },
    },
    [SVG_NAMESPACE]: {
        foreignObject: {
            node: SVG_NAMESPACE,
            children: HTML_NAMESPACE,
        },
    },
} as const;

const XmlNamespaceContext = createContext(HTML_NAMESPACE);

function createIntrinsicRenderNode<TProps>(
    elementType: string,
    props: TProps,
    children: RenderNode[]
): RenderNode {
    const type = RenderNodeType.intrinsicElement;
    let renderNodeElement: null | Element = null;
    let xmlNamespaceTransition:
        | {
              node: string;
              children: string;
          }
        | undefined;
    const elementBoundEvents: Record<string, (ev: Event) => void> = {};
    const onMountActions = new Set<() => void>();
    const onUnmountActions = new Set<() => void>();
    let nodeOrdering: NodeOrdering | null = null;
    const initOrdering = () => {
        if (!nodeOrdering) {
            nodeOrdering = makeNodeOrdering('intrinsic:${elementType}:order');
            registerNode(nodeOrdering);
        }
    };
    const boundEffects: Calculation<any>[] = [];

    let isAttached = false;
    let isMounted = false;

    const childrenRenderNode = createArrayRenderNode(children);

    const childEventHandler = (event: RenderEvent) => {
        log.assert(
            renderNodeElement,
            'IntrinsicRenderNode received child event prior to attaching'
        );
        const element = renderNodeElement;
        switch (event.type) {
            case 'splice': {
                for (let i = 0; i < event.count; ++i) {
                    const toRemove = element.childNodes[event.index];
                    element.removeChild(toRemove);
                }
                const referenceElement = element.childNodes[event.index];
                event.nodes.forEach((node) => {
                    element.insertBefore(node, referenceElement);
                });
                break;
            }
            case 'move': {
                const removed: Node[] = [];
                for (let i = 0; i < event.count; ++i) {
                    const toRemove = element.childNodes[event.fromIndex];
                    removed.push(toRemove);
                    element.removeChild(toRemove);
                }
                const referenceNode = element.childNodes[event.toIndex];
                removed.forEach((node) => {
                    element.insertBefore(node, referenceNode);
                });
                break;
            }
            case 'sort': {
                const toReorder: Node[] = [];
                for (const sortedIndex of event.indexes) {
                    toReorder.push(element.childNodes[sortedIndex]);
                }
                toReorder.forEach((node) => element.removeChild(node));
                const referenceNode = element.childNodes[event.fromIndex];
                for (const node of toReorder) {
                    element.insertBefore(node, referenceNode);
                }
                break;
            }
            default:
                log.assertExhausted(event, 'unexpected render event');
        }
    };

    return makeRenderNode(
        type,
        DEBUG && { elementType, props, childrenRenderNode },
        () => {
            const lifecycle = childrenRenderNode.retain();

            return {
                attach: (handler, context) => {
                    log.assert(
                        !isAttached,
                        `Invariant: RenderNode ${type} double attached`
                    );
                    isAttached = true;

                    // Note: we need to lazily create the element
                    if (!renderNodeElement) {
                        const parentXmlNamespace = readContext(
                            context.contextMap,
                            XmlNamespaceContext
                        );
                        xmlNamespaceTransition =
                            elementNamespaceTransitionMap[parentXmlNamespace]?.[
                                elementType
                            ];
                        const elementXMLNamespace =
                            elementNamespaceTransitionMap[parentXmlNamespace]?.[
                                elementType
                            ]?.node ??
                            readContext(
                                context.contextMap,
                                XmlNamespaceContext
                            );
                        renderNodeElement = document.createElementNS(
                            elementXMLNamespace,
                            elementType
                        );

                        const createdElement = renderNodeElement;

                        // Bind element properties
                        Object.entries(props || {}).forEach(([key, value]) => {
                            if (key === 'ref') {
                                if (isRef(value)) {
                                    value.current = createdElement;
                                    return;
                                }
                                if (
                                    typeof value === 'function' &&
                                    !isCalculation(value)
                                ) {
                                    onMountActions.add(() =>
                                        value(createdElement)
                                    );
                                    onUnmountActions.add(() =>
                                        value(undefined)
                                    );
                                    return;
                                }
                            }
                            if (isCalculation(value)) {
                                const boundEffect = effect(() => {
                                    const computedValue = value();
                                    setAttributeValue(
                                        elementType,
                                        createdElement,
                                        key,
                                        computedValue,
                                        elementBoundEvents
                                    );
                                }, `viewattr:${key}`);
                                boundEffects.push(boundEffect);
                                initOrdering();
                            } else {
                                setAttributeValue(
                                    elementType,
                                    createdElement,
                                    key,
                                    value,
                                    elementBoundEvents
                                );
                            }
                        });

                        let subContext = context;
                        if (nodeOrdering) {
                            subContext = {
                                ...context,
                                nodeOrdering,
                            };
                        }
                        if (xmlNamespaceTransition) {
                            const subContextMap = new Map(context.contextMap);
                            subContextMap.set(
                                XmlNamespaceContext,
                                xmlNamespaceTransition.children
                            );
                            subContext = {
                                ...context,
                                contextMap: subContextMap,
                            };
                        }

                        if (nodeOrdering) {
                            addOrderingDep(nodeOrdering, context.nodeOrdering);
                            for (const boundEffect of boundEffects) {
                                addOrderingDep(boundEffect, nodeOrdering);
                                boundEffect();
                            }
                        }

                        // TODO: architectural flaw: we need some sort of "reparent" event to for contexts to work in the presence of node relocation
                        // Currently, if an element is moved while being retained, it keeps the context that it had from where it was created.
                        // Maybe this isn't that big of a problem?
                        // Wait... do we need one? This needs to be revisited.... add some tests to suss out what should happen
                        lifecycle.attach?.(childEventHandler, subContext);
                    }

                    handler({
                        type: 'splice',
                        index: 0,
                        count: 0,
                        nodes: [renderNodeElement],
                    });

                    if (isMounted) {
                        lifecycle.afterMount?.();
                    }
                },
                detach: (handler, context) => {
                    log.assert(
                        isAttached,
                        `Invariant: RenderNode ${type} double detached`
                    );
                    isAttached = false;

                    if (nodeOrdering) {
                        for (const boundEffect of boundEffects) {
                            removeOrderingDep(boundEffect, nodeOrdering);
                        }
                        removeOrderingDep(nodeOrdering, context.nodeOrdering);
                    }

                    handler({
                        type: 'splice',
                        index: 0,
                        count: 1,
                        nodes: [],
                    });
                },
                afterMount: () => {
                    isMounted = true;

                    lifecycle.afterMount?.();

                    onMountActions.forEach((action) => action());
                },
                beforeUnmount: () => {
                    lifecycle.beforeUnmount?.();

                    onUnmountActions.forEach((action) => action());

                    isMounted = false;
                },
                destroy: () => {
                    childrenRenderNode.release();
                    renderNodeElement = null;
                    onMountActions.clear();
                    onUnmountActions.clear();
                    isAttached = false;
                    isMounted = false;
                },
            };
        }
    );
}

function createComponentRenderNode(
    Component: Component<any>,
    props: any,
    children: JSXNode[]
): RenderNode {
    const type = RenderNodeType.component;
    const mountHandlers = new Set<() => void>();
    const unmountHandlers = new Set<() => void>();
    const createdEffects: Calculation<any>[] = [];
    const createdCalculations: Calculation<any>[] = [];
    let isInitialized = false;

    let componentRenderNode: RenderNode | null = null;

    let isMounted = false;

    return makeRenderNode(type, DEBUG && { Component, props, children }, () => {
        return {
            attach: (handler, context) => {
                if (!componentRenderNode) {
                    const listeners: ComponentListeners = {
                        onMount: (handler) => {
                            log.assert(
                                !isInitialized,
                                'Component cannot call onMount after render'
                            );
                            mountHandlers.add(handler);
                        },
                        onUnmount: (handler) => {
                            log.assert(
                                !isInitialized,
                                'Component cannot call onUnmount after render'
                            );
                            unmountHandlers.add(handler);
                        },
                        onEffect: (effectCallback, debugName?: string) => {
                            log.assert(
                                !isInitialized,
                                'Component cannot call onEffect after render'
                            );
                            const effectCalc = effect(
                                effectCallback,
                                `componenteffect:${Component.name}:${
                                    debugName ?? '?'
                                }`
                            );
                            createdEffects.push(effectCalc);
                        },
                        getContext: (targetContext) => {
                            return readContext(
                                context.contextMap,
                                targetContext
                            );
                        },
                    };
                    const propsObj = props || {};
                    let propsWithChildren: any;
                    if (children.length === 0) {
                        propsWithChildren = propsObj;
                    } else if (children.length === 1) {
                        propsWithChildren = {
                            ...propsObj,
                            children: children[0],
                        };
                    } else {
                        propsWithChildren = { ...propsObj, children };
                    }
                    componentRenderNode = untracked(() => {
                        let jsxNode: JSXNode = null;
                        createdCalculations.push(
                            ...trackCreatedCalculations(() => {
                                jsxNode = Component(
                                    propsWithChildren,
                                    listeners
                                );
                            })
                        );
                        return jsxNodeToRenderNode(jsxNode);
                    });
                    isInitialized = true;
                    componentRenderNode.retain();
                }

                createdEffects.forEach((eff) => {
                    addOrderingDep(context.nodeOrdering, eff);
                });
                createdCalculations.forEach((calculation) => {
                    retain(calculation);
                    calculation(); // it may have been dirtied and flushed; re-cache
                });

                componentRenderNode._lifecycle?.attach?.(handler, context);

                if (isMounted) {
                    mountHandlers.forEach((handler) => handler());
                }
            },
            detach: (handler, context) => {
                componentRenderNode?._lifecycle?.detach?.(handler, context);

                createdEffects.forEach((eff) => {
                    removeOrderingDep(context.nodeOrdering, eff);
                });
                createdCalculations.forEach((calculation) => {
                    release(calculation);
                });
            },
            afterMount: () => {
                isMounted = true;

                componentRenderNode?._lifecycle?.afterMount?.();

                mountHandlers.forEach((handler) => handler());
            },
            beforeUnmount: () => {
                componentRenderNode?._lifecycle?.beforeUnmount?.();

                unmountHandlers.forEach((handler) => handler());

                isMounted = false;
            },
            destroy: () => {
                mountHandlers.clear();
                unmountHandlers.clear();
                createdEffects.splice(0, createdEffects.length);
                createdCalculations.splice(0, createdEffects.length);
                isInitialized = false;
                componentRenderNode?.release();
                componentRenderNode = null;
                isMounted = false;
            },
        };
    });
}

function createContextRenderNode<TContext>(
    Context: Context<TContext>,
    value: TContext,
    children: RenderNode[]
) {
    const childrenRenderNode = createArrayRenderNode(children);
    const type = RenderNodeType.context;

    return makeRenderNode(
        type,
        DEBUG && { Context, value, childrenRenderNode },
        () => {
            const lifecycle = childrenRenderNode.retain();
            let subContext: null | RenderContext = null;

            return {
                attach: (handler, context) => {
                    const contextMap = new Map(context.contextMap);
                    contextMap.set(Context, value);
                    subContext = { ...context, contextMap };
                    childrenRenderNode._lifecycle?.attach?.(
                        handler,
                        subContext
                    );
                },
                detach: (handler, context) => {
                    log.assert(
                        subContext,
                        `RenderNode ${type} detach without attach?`
                    );
                    childrenRenderNode._lifecycle?.detach?.(
                        handler,
                        subContext
                    );
                    subContext = null;
                },
                destroy: () => {
                    childrenRenderNode.release();
                },
                afterMount: lifecycle.afterMount,
                beforeUnmount: lifecycle.beforeUnmount,
            };
        }
    );
}

function createLifecycleObserverRenderNode(
    {
        nodeCallback,
        elementCallback,
    }: {
        nodeCallback: IntrinsicNodeObserverNodeCallback | undefined;
        elementCallback: IntrinsicNodeObserverElementCallback | undefined;
    },
    children: RenderNode[]
) {
    const type = RenderNodeType.lifecycleObserver;
    let attachedState: null | {
        handler: RenderEventHandler;
        context: RenderContext;
    } = null;
    const childrenRenderNode = createArrayRenderNode(children);
    let isMounted = false;

    return makeRenderNode(
        type,
        DEBUG && { nodeCallback, elementCallback, childrenRenderNode },
        () => {
            const lifecycle = childrenRenderNode.retain();

            let childNodes: Node[] = [];

            const childLifecycleHandler = (event: RenderEvent) => {
                log.assert(
                    attachedState,
                    'LifecycleObserver RenderNode got event when detached'
                );
                switch (event.type) {
                    case 'splice': {
                        const removed = childNodes.splice(
                            event.index,
                            event.count,
                            ...event.nodes
                        );
                        if (isMounted) {
                            removed.forEach((node) => {
                                nodeCallback?.(node, 'remove');
                                if (node instanceof Element) {
                                    elementCallback?.(node, 'remove');
                                }
                            });
                        }
                        attachedState.handler(event);
                        if (isMounted) {
                            event.nodes.forEach((node) => {
                                nodeCallback?.(node, 'add');
                                if (node instanceof Element) {
                                    elementCallback?.(node, 'add');
                                }
                            });
                        }
                        break;
                    }
                    case 'move': {
                        const removed = childNodes.splice(
                            event.fromIndex,
                            event.count
                        );
                        let adjustedToIndex: number;
                        // TODO: this is dumb, toIndex should be the index _after_ removal; not the index _before_ removal
                        if (event.toIndex > event.fromIndex + event.count) {
                            adjustedToIndex = event.toIndex - event.count;
                        } else if (event.toIndex > event.fromIndex) {
                            adjustedToIndex = event.fromIndex;
                        } else {
                            adjustedToIndex = event.toIndex;
                        }
                        childNodes.splice(adjustedToIndex, 0, ...removed);
                        attachedState.handler(event);
                        break;
                    }
                    case 'sort': {
                        const sortedSlice = Array(event.indexes.length);
                        for (let i = 0; i < event.indexes.length; ++i) {
                            sortedSlice[i] = childNodes[event.indexes[i]];
                        }
                        childNodes.splice(
                            event.fromIndex,
                            event.indexes.length,
                            ...sortedSlice
                        );
                        attachedState.handler(event);
                        break;
                    }
                    default:
                        log.assertExhausted(
                            event,
                            'LifecycleObserver RenderNode got unexpected event'
                        );
                }
            };

            return {
                attach: (handler, context) => {
                    log.assert(
                        attachedState === null,
                        `Invariant: RenderNode ${type} double attached`
                    );
                    attachedState = { handler, context };
                    lifecycle.attach?.(childLifecycleHandler, context);
                },
                detach: (handler, context) => {
                    log.assert(
                        attachedState !== null,
                        `Invariant: RenderNode ${type} double detached`
                    );
                    lifecycle.detach?.(childLifecycleHandler, context);
                    log.assert(
                        childNodes.length === 0,
                        'LifecycleObserver had leftover nodes after detach'
                    );
                    attachedState = null;
                },
                afterMount: () => {
                    isMounted = true;

                    lifecycle.afterMount?.();

                    childNodes.forEach((node) => {
                        nodeCallback?.(node, 'add');
                        if (node instanceof Element) {
                            elementCallback?.(node, 'add');
                        }
                    });
                },
                beforeUnmount: () => {
                    lifecycle.beforeUnmount?.();

                    isMounted = false;

                    childNodes.forEach((node) => {
                        nodeCallback?.(node, 'remove');
                        if (node instanceof Element) {
                            elementCallback?.(node, 'remove');
                        }
                    });
                },
                destroy: () => {
                    childNodes = [];
                    attachedState = null;
                    childrenRenderNode.release();
                    isMounted = false;
                },
            };
        }
    );
}

export function createElement<TProps>(
    Constructor: string | Context<any> | Component<TProps>,
    props: TProps,
    ...children: JSXNode[]
): RenderNode {
    if (typeof Constructor === 'string') {
        return createIntrinsicRenderNode(
            Constructor,
            props,
            children.map((child) => jsxNodeToRenderNode(child))
        );
    }
    if (isContext(Constructor)) {
        return createContextRenderNode(
            Constructor,
            (props as any).value,
            children.map((child) => jsxNodeToRenderNode(child))
        );
    }
    if (Constructor === LifecycleObserver) {
        return createLifecycleObserverRenderNode(
            props as any,
            children.map((child) => jsxNodeToRenderNode(child))
        );
    }

    return createComponentRenderNode(Constructor, props, children);
}

createElement.Fragment = Fragment;

function setAttributeValue(
    elementType: string,
    element: Element,
    key: string,
    value: unknown,
    boundEvents: Record<string, (ev: Event) => void>
) {
    if (key.startsWith('on:') && typeof value === 'function') {
        const eventName = key.slice(3);
        if (boundEvents[key]) {
            element.removeEventListener(eventName, boundEvents[key]);
        }
        element.addEventListener(eventName, value as any);
        boundEvents[key] = value as any;
    } else {
        const attributeNamespace = attributeNamespaceMap[key] || null;
        const mapping = getElementTypeMapping(elementType, key);
        if (mapping) {
            if (mapping.makeAttrValue !== null) {
                const attributeValue = mapping.makeAttrValue
                    ? mapping.makeAttrValue(value)
                    : (value as any);
                if (
                    attributeValue === undefined ||
                    attributeValue === null ||
                    attributeValue === false
                ) {
                    element.removeAttribute(key);
                } else if (attributeValue === true) {
                    element.setAttributeNS(attributeNamespace, key, '');
                } else {
                    element.setAttributeNS(
                        attributeNamespace,
                        key,
                        attributeValue
                    );
                }
            }
            if (mapping.idlName !== null) {
                (element as any)[mapping.idlName ?? key] = mapping.makeIdlValue
                    ? mapping.makeIdlValue(value)
                    : value;
            }
        } else if (value === false || value === undefined || value === null) {
            element.removeAttributeNS(attributeNamespace, key);
        } else if (value === true) {
            element.setAttributeNS(attributeNamespace, key, '');
        } else if (typeof value === 'string' || typeof value === 'number') {
            element.setAttributeNS(attributeNamespace, key, value.toString());
        }
    }
}

function isCollectionView(
    thing: JSXNode
): thing is Collection<JSXNode> | View<JSXNode> {
    return isCollection(thing);
}

function readContext<TContext>(
    contextMap: Map<Context<any>, any>,
    context: Context<TContext>
): TContext {
    if (contextMap.has(context)) {
        return contextMap.get(context);
    }
    return getContext(context);
}

function createCollectionRenderNode(
    collection: Collection<JSXNode> | View<JSXNode>
): RenderNode {
    const type = RenderNodeType.collection;
    let attachedState: null | {
        handler: RenderEventHandler;
        context: RenderContext;
    } = null;
    let isMounted = false;

    return makeRenderNode(type, DEBUG && { collection }, () => {
        const collectionNodeOrdering = makeNodeOrdering(
            DEBUG
                ? `viewcoll:${debugNameFor(collection) ?? 'node'}:order`
                : 'viewcoll:order'
        );
        registerNode(collectionNodeOrdering);

        type ChildInfoRecord = {
            renderNode: RenderNode;
            handler: RenderEventHandler;
            size: number;
        };
        let childInfo: ChildInfoRecord[] = [];

        // TODO: consolidate duplication between createArrayRenderNode and createCollectionRenderNode and
        const childEventHandler = (
            event: RenderEvent,
            childNode: RenderNode
        ) => {
            log.assert(
                attachedState,
                'Collection RenderNode got event when detached'
            );
            let insertionIndex = 0;
            let infoRecord: null | ChildInfoRecord = null;
            for (const info of childInfo) {
                if (info.renderNode === childNode) {
                    infoRecord = info;
                    break;
                }
                insertionIndex += info.size;
            }
            log.assert(
                infoRecord,
                'Collection RenderNode got event for unknown node'
            );
            switch (event.type) {
                case 'splice': {
                    attachedState.handler({
                        type: 'splice',
                        index: event.index + insertionIndex,
                        count: event.count,
                        nodes: event.nodes,
                    });
                    infoRecord.size =
                        infoRecord.size - event.count + event.nodes.length;
                    break;
                }
                case 'move': {
                    attachedState.handler({
                        type: 'move',
                        fromIndex: event.fromIndex + insertionIndex,
                        count: event.count,
                        toIndex: event.toIndex + insertionIndex,
                    });
                    break;
                }
                case 'sort': {
                    attachedState.handler({
                        type: 'sort',
                        fromIndex: insertionIndex + event.fromIndex,
                        indexes: event.indexes.map(
                            (index) => index + insertionIndex
                        ),
                    });
                    break;
                }
                default:
                    log.assertExhausted(event, 'unexpected render event');
            }
        };

        const subscriptionNode = collection[GetSubscriptionNodeKey]();
        registerNode(subscriptionNode); // TODO: Wait what the fuck? Why am I doing this? This should be the responsible of the collection, right?

        let unobserve: null | (() => void) = null;

        return {
            attach: (handler, context) => {
                log.assert(
                    attachedState === null,
                    `Invariant: RenderNode ${type} double attached`
                );
                attachedState = { handler, context };
                addOrderingDep(subscriptionNode, collectionNodeOrdering);
                addOrderingDep(collectionNodeOrdering, context.nodeOrdering);

                // Populate the initial collection
                untracked(() => {
                    childInfo = collection.map((child, childIndex) => {
                        const childNode = jsxNodeToRenderNode(child);
                        return {
                            renderNode: childNode,
                            handler: (event) =>
                                childEventHandler(event, childNode),
                            size: 0,
                        };
                    });

                    childInfo.forEach((infoRecord) => {
                        infoRecord.renderNode.retain();
                        infoRecord.renderNode._lifecycle?.attach?.(
                            infoRecord.handler,
                            context
                        );
                        if (isMounted) {
                            infoRecord.renderNode._lifecycle?.afterMount?.();
                        }
                    });
                });

                // Observe for changes in the collection
                unobserve = collection[ObserveKey]((events) => {
                    events.forEach((event) => {
                        if (event.type === 'splice') {
                            untracked(() => {
                                const { count, index, items } = event;
                                // Why iterate first and then splice?
                                // - We asking the child to remove itself, which will make us update the .size childInfo for the corresponding children
                                // - Once deleted, we still have remaining childInfo records at those indexes, and then remove our tracking record of the items
                                for (let i = index; i < index + count; ++i) {
                                    const infoRecord = childInfo[i];
                                    if (isMounted) {
                                        infoRecord.renderNode._lifecycle?.beforeUnmount?.();
                                    }
                                    infoRecord.renderNode._lifecycle?.detach?.(
                                        infoRecord.handler,
                                        context
                                    );
                                    infoRecord.renderNode.release();
                                }

                                const newInfo = items.map(
                                    (child, itemIndex) => {
                                        const childNode =
                                            jsxNodeToRenderNode(child);
                                        return {
                                            renderNode: childNode,
                                            handler: (event: RenderEvent) =>
                                                childEventHandler(
                                                    event,
                                                    childNode
                                                ),
                                            size: 0,
                                        };
                                    }
                                );

                                childInfo.splice(index, count, ...newInfo);

                                newInfo.forEach((infoRecord) => {
                                    infoRecord.renderNode.retain();
                                    infoRecord.renderNode._lifecycle?.attach?.(
                                        infoRecord.handler,
                                        context
                                    );
                                    if (isMounted) {
                                        infoRecord.renderNode._lifecycle?.afterMount?.();
                                    }
                                });
                            });
                        } else if (event.type === 'move') {
                            const { fromIndex, fromCount, toIndex } = event;
                            let realFromIndex = 0;
                            for (let i = 0; i < fromIndex; ++i) {
                                realFromIndex += childInfo[i].size;
                            }
                            let size = 0;
                            for (
                                let i = fromIndex;
                                i < fromIndex + fromCount;
                                ++i
                            ) {
                                size += childInfo[i].size;
                            }
                            const removed = childInfo.splice(
                                fromIndex,
                                fromCount
                            );
                            let adjustedToIndex: number;
                            // TODO: this is dumb, toIndex should be the index _after_ removal; not the index _before_ removal
                            if (toIndex > fromIndex + fromCount) {
                                adjustedToIndex = toIndex - fromCount;
                            } else if (toIndex > fromIndex) {
                                adjustedToIndex = fromIndex;
                            } else {
                                adjustedToIndex = toIndex;
                            }
                            let realToIndex = 0;
                            for (let i = 0; i < adjustedToIndex; ++i) {
                                realToIndex += childInfo[i].size;
                            }
                            childInfo.splice(adjustedToIndex, 0, ...removed);

                            handler({
                                type: 'move',
                                fromIndex: realFromIndex,
                                count: size,
                                toIndex: realToIndex,
                            });
                        } else if (event.type === 'sort') {
                            const { indexes } = event;

                            const realIndexes = getExpandedSortIndexes(
                                indexes,
                                childInfo
                            );

                            // Update childInfo to match indexes
                            const oldChildInfo = childInfo;
                            childInfo = Array(oldChildInfo.length);
                            for (let i = 0; i < indexes.length; ++i) {
                                childInfo[i] = oldChildInfo[indexes[i]];
                            }

                            handler({
                                type: 'sort',
                                fromIndex: 0,
                                indexes: realIndexes,
                            });
                        } else {
                            log.assertExhausted(
                                event,
                                'unhandled collection event'
                            );
                        }
                    });
                });
            },
            detach: (handler, context) => {
                log.assert(
                    attachedState !== null,
                    `Invariant: RenderNode ${type} double detached`
                );
                removeOrderingDep(collectionNodeOrdering, context.nodeOrdering);
                removeOrderingDep(subscriptionNode, collectionNodeOrdering);

                // Stop observing for changes
                unobserve?.();

                // Detach and abandon children
                childInfo.forEach((infoRecord) => {
                    if (isMounted) {
                        infoRecord.renderNode._lifecycle?.beforeUnmount?.();
                    }
                    infoRecord.renderNode._lifecycle?.detach?.(
                        infoRecord.handler,
                        context
                    );
                    infoRecord.renderNode.release();
                });
                childInfo = [];

                attachedState = null;
            },
            afterMount: () => {
                isMounted = true;

                childInfo.forEach((info) =>
                    info.renderNode._lifecycle?.afterMount?.()
                );
            },
            beforeUnmount: () => {
                childInfo.forEach((info) =>
                    info.renderNode._lifecycle?.beforeUnmount?.()
                );

                isMounted = false;
            },
            destroy: () => {
                childInfo.forEach((info) => info.renderNode.release());
                childInfo = [];
                attachedState = null;
            },
        };
    });
}

function makeNodeOrdering(debugName?: string): NodeOrdering {
    const nodeOrdering: NodeOrdering = {
        $__id: uniqueid(),
        [TypeTag]: 'nodeOrdering',
    };
    if (debugName) name(nodeOrdering, debugName);
    return nodeOrdering;
}

/**
 * Mount the provided JSX to an element
 */
export function mount(parentElement: Element, jsxNode: JSX.Element) {
    if (jsxNode instanceof Text || jsxNode instanceof Element) {
        parentElement.appendChild(jsxNode);
        return () => {
            parentElement.removeChild(jsxNode);
        };
    }

    // Initially we mount to a detached fragment
    // Once we have started, then we can mount the fragment correctly, which changes the insertionIndex
    let mountNode: Node = document.createDocumentFragment();
    let insertionIndex = 0;

    const contextMap = new Map<Context<any>, any>();
    const nodeOrdering = makeNodeOrdering('root:mount');
    registerNode(nodeOrdering);
    retain(nodeOrdering);

    const nodes = new Set<Text | Element>();

    const renderEventHandler: RenderEventHandler = (event) => {
        switch (event.type) {
            case 'splice': {
                const modificationIndex = insertionIndex + event.index;
                for (let i = 0; i < event.count; ++i) {
                    const toRemove = mountNode.childNodes[modificationIndex];
                    if (
                        toRemove instanceof Text ||
                        toRemove instanceof Element
                    ) {
                        if (nodes.has(toRemove)) {
                            nodes.delete(toRemove);
                        } else {
                            log.warn(
                                'Root mount inconsistency error, removed a child it did not create',
                                toRemove
                            );
                        }
                    } else {
                        log.warn(
                            'Root mount removed unexpected node',
                            toRemove
                        );
                    }
                    mountNode.removeChild(toRemove);
                }
                const referenceElement =
                    mountNode.childNodes[modificationIndex];
                event.nodes.forEach((node, i) => {
                    mountNode.insertBefore(node, referenceElement);
                    nodes.add(node);
                });
                break;
            }
            case 'move': {
                const removed: Node[] = [];
                for (let i = 0; i < event.count; ++i) {
                    const toRemove = mountNode.childNodes[event.fromIndex];
                    removed.push(toRemove);
                    mountNode.removeChild(toRemove);
                }
                const referenceNode = mountNode.childNodes[event.toIndex];
                removed.forEach((node) => {
                    mountNode.insertBefore(node, referenceNode);
                });
                break;
            }
            case 'sort': {
                const removed: Node[] = [];
                for (let i = event.fromIndex; i < event.indexes.length; ++i) {
                    const toRemove = mountNode.childNodes[event.fromIndex];
                    removed.push(toRemove);
                    mountNode.removeChild(toRemove);
                }
                const referenceNode = mountNode.childNodes[event.fromIndex];
                event.indexes.forEach((newIndex) => {
                    mountNode.insertBefore(removed[newIndex], referenceNode);
                });
                break;
            }
            default:
                log.assertExhausted(event, 'unexpected render event');
        }
    };
    const subContext = { contextMap, nodeOrdering };

    const renderNode = jsxNodeToRenderNode(jsxNode);
    const lifecycle = renderNode.retain();
    lifecycle.attach?.(renderEventHandler, subContext);

    // Mount the documentFragment, updating the insertionIndex
    insertionIndex = parentElement.childNodes.length;
    parentElement.appendChild(mountNode);
    mountNode = parentElement;

    lifecycle.afterMount?.();

    return () => {
        lifecycle.beforeUnmount?.();
        lifecycle.detach?.(renderEventHandler, subContext);
        renderNode.release();

        if (nodes.size > 0) {
            log.error(
                'Internal consistency error: nodes remain after unmounting!',
                nodes
            );
        }
    };
}
