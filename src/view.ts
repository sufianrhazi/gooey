import {
    effect,
    retain,
    release,
    untracked,
    addOrderingDep,
    removeOrderingDep,
    registerNode,
    disposeNode,
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
import { noop } from './util';
import * as log from './log';
import { uniqueid } from './util';
import {
    Component,
    ComponentListeners,
    JSXNode,
    RenderNode,
    RenderNodeLifecycle,
    RenderEvent,
    RenderEventHandler,
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
}): JSX.Element => {
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

function createTextRenderNode(text: string): RenderNode {
    const textNode = document.createTextNode(text);
    let isMounted = false;
    return makeRenderNode(
        RenderNodeType.text,
        DEBUG && { text },
        (callback, context, isAttached) => {
            const mountSelf = () => {
                log.assert(
                    !isMounted,
                    'Invariant: Text rendered twice! Did you write a component that renders children multiple times?'
                );
                callback({
                    type: 'splice',
                    index: 0,
                    count: 0,
                    nodes: [textNode],
                });
                isMounted = true;
            };
            const unmountSelf = () => {
                log.assert(
                    isMounted,
                    'Invariant: Text unmounted twice! Did you write a component that renders children multiple times?'
                );
                callback({
                    type: 'splice',
                    index: 0,
                    count: 1,
                    nodes: [],
                });
                isMounted = false;
            };
            mountSelf();

            return {
                attachSelf: mountSelf,
                detachSelf: unmountSelf,
                onBeforeAttach: noop,
                onAfterAttach: noop,
                onBeforeDetach: noop,
                onAfterDetach: noop,
                stop: () => {
                    isMounted = false;
                },
            };
        }
    );
}

const emptyRenderNode = makeRenderNode(
    RenderNodeType.empty,
    DEBUG && {},
    (callback, context, isAttached) => ({
        attachSelf: noop,
        detachSelf: noop,
        onBeforeAttach: noop,
        onAfterAttach: noop,
        onBeforeDetach: noop,
        onAfterDetach: noop,
        stop: noop,
    })
);
function createEmptyRenderNode(): RenderNode {
    return emptyRenderNode;
}

function createForeignElementRenderNode(node: Element | Text): RenderNode {
    let isMounted = false;
    return makeRenderNode(
        RenderNodeType.foreignElement,
        DEBUG && { node },
        (callback, context, isAttached) => {
            const mountSelf = () => {
                log.assert(
                    !isMounted,
                    'Invariant: Foreign element rendered twice! Did you write a component that renders children multiple times?'
                );
                callback({
                    type: 'splice',
                    index: 0,
                    count: 0,
                    nodes: [node],
                });
                isMounted = true;
            };
            const unmountSelf = () => {
                log.assert(
                    isMounted,
                    'Invariant: Foreign element unmounted twice! Did you write a component that renders children multiple times?'
                );
                callback({
                    type: 'splice',
                    index: 0,
                    count: 1,
                    nodes: [],
                });
                isMounted = false;
            };
            mountSelf();

            return {
                attachSelf: mountSelf,
                detachSelf: unmountSelf,
                onBeforeAttach: noop,
                onAfterAttach: noop,
                onBeforeDetach: noop,
                onAfterDetach: noop,
                stop: noop,
            };
        }
    );
}

function createCalculationRenderNode(
    calculation: Calculation<JSXNode>
): RenderNode {
    return makeRenderNode(
        RenderNodeType.calculation,
        DEBUG && { calculation },
        (callback, context, isAttached) => {
            let renderNode: RenderNode = createEmptyRenderNode();
            let renderNodeLifecycle: RenderNodeLifecycle = renderNode.start(
                callback,
                context,
                isAttached
            );

            const maintenanceEffect = effect(() => {
                const jsxNode = calculation();

                // Destroy prior result
                if (isAttached) {
                    renderNodeLifecycle.detachSelf();
                }
                renderNodeLifecycle.stop(); // oh shit! we could destroy something that is reused!

                afterFlush(() => {
                    // Initialize new result
                    renderNode = jsxNodeToRenderNode(jsxNode);
                    renderNodeLifecycle = renderNode.start(
                        callback,
                        context,
                        isAttached
                    );
                });
            }, 'calceffect');

            const connectEffect = () => {
                addOrderingDep(context.nodeOrdering, maintenanceEffect);
                retain(maintenanceEffect);
                maintenanceEffect();
            };
            const disconnectEffect = () => {
                removeOrderingDep(context.nodeOrdering, maintenanceEffect);
                release(maintenanceEffect);
            };

            if (isAttached) {
                connectEffect();
            }

            return {
                stop: () => {
                    renderNodeLifecycle.stop();
                },
                onBeforeAttach: () => {
                    connectEffect();
                    renderNodeLifecycle.onBeforeAttach();
                    isAttached = true;
                },
                attachSelf: () => {
                    connectEffect();
                    renderNodeLifecycle.attachSelf();
                    isAttached = true;
                },
                onAfterAttach: () => {
                    renderNodeLifecycle.onAfterAttach();
                },
                onBeforeDetach: () => {
                    renderNodeLifecycle.onBeforeDetach();
                },
                detachSelf: () => {
                    renderNodeLifecycle.detachSelf();
                    isAttached = false;
                    disconnectEffect();
                },
                onAfterDetach: () => {
                    isAttached = false;
                    renderNodeLifecycle.onAfterDetach();
                    disconnectEffect();
                },
            };
        }
    );
}

function createArrayRenderNode(children: readonly JSXNode[]): RenderNode {
    if (children.length === 0) {
        return createEmptyRenderNode();
    }
    if (children.length === 1) {
        return jsxNodeToRenderNode(children[0]);
    }
    return makeRenderNode(
        RenderNodeType.array,
        DEBUG && { array: children },
        (callback, renderContext, isAttached) => {
            type ChildInfoRecord = {
                renderNode: RenderNode;
                renderNodeLifecycle: RenderNodeLifecycle | null;
                size: number;
            };
            const childInfo: ChildInfoRecord[] = [];

            const getInsertionIndex = (childIndex: number) => {
                let insertionIndex = 0;
                for (let i = 0; i < childIndex; ++i) {
                    insertionIndex += childInfo[i].size;
                }
                return insertionIndex;
            };

            // TODO: consolidate duplication between createArrayRenderNode and createCollectionRenderNode
            const childEventHandler = (
                event: RenderEvent,
                childIndex: number
            ) => {
                switch (event.type) {
                    case 'splice': {
                        const insertionIndex = getInsertionIndex(childIndex);
                        callback({
                            type: 'splice',
                            index: event.index + insertionIndex,
                            count: event.count,
                            nodes: event.nodes,
                        });
                        childInfo[childIndex].size =
                            childInfo[childIndex].size -
                            event.count +
                            event.nodes.length;
                        break;
                    }
                    case 'move': {
                        const insertionIndex = getInsertionIndex(childIndex);
                        callback({
                            type: 'move',
                            fromIndex: event.fromIndex + insertionIndex,
                            count: event.count,
                            toIndex: event.toIndex + insertionIndex,
                        });
                        break;
                    }
                    case 'sort': {
                        const insertionIndex = getInsertionIndex(childIndex);
                        callback({
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
            children.forEach((child, childIndex) => {
                const childNode = jsxNodeToRenderNode(child);
                childInfo[childIndex] = {
                    renderNode: childNode,
                    renderNodeLifecycle: null,
                    size: 0,
                };
                childInfo[childIndex].renderNodeLifecycle = childNode.start(
                    (event) => {
                        const realIndex = childInfo.findIndex(
                            (i) => i.renderNode === childNode
                        );
                        log.assert(realIndex !== -1, 'event on removed child');
                        childEventHandler(event, realIndex);
                    },
                    renderContext,
                    isAttached
                );
            });

            return {
                stop: () => {
                    childInfo.forEach((info, childIndex) => {
                        info.renderNodeLifecycle?.stop();
                    });
                    childInfo.splice(0, childInfo.length);
                },
                onBeforeAttach: () => {
                    childInfo.forEach((info) =>
                        info.renderNodeLifecycle?.onBeforeAttach()
                    );
                },
                attachSelf: () => {
                    childInfo.forEach((info) =>
                        info.renderNodeLifecycle?.attachSelf()
                    );
                },
                onAfterAttach: () => {
                    childInfo.forEach((info) =>
                        info.renderNodeLifecycle?.onAfterAttach()
                    );
                },
                onBeforeDetach: () => {
                    childInfo.forEach((info) =>
                        info.renderNodeLifecycle?.onBeforeDetach()
                    );
                },
                detachSelf: () => {
                    childInfo.forEach((info) =>
                        info.renderNodeLifecycle?.detachSelf()
                    );
                },
                onAfterDetach: () => {
                    childInfo.forEach((info) =>
                        info.renderNodeLifecycle?.onAfterDetach()
                    );
                },
            };
        }
    );
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
    let renderNodeElement: Element | null = null;
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
    let isMounted = false;

    const childrenRenderNode = createArrayRenderNode(children);

    return makeRenderNode(
        RenderNodeType.intrinsicElement,
        DEBUG && { elementType, props, childrenRenderNode },
        (callback, context, isAttached) => {
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
                    readContext(context.contextMap, XmlNamespaceContext);
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
                            onMountActions.add(() => value(createdElement));
                            onUnmountActions.add(() => value(undefined));
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
            }
            const element = renderNodeElement;

            const nodes = new Set<Text | Element>();

            const childEventHandler = (event: RenderEvent) => {
                switch (event.type) {
                    case 'splice': {
                        for (let i = 0; i < event.count; ++i) {
                            const toRemove = element.childNodes[event.index];
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
                            element.removeChild(toRemove);
                        }
                        const referenceElement =
                            element.childNodes[event.index];
                        event.nodes.forEach((node) => {
                            element.insertBefore(node, referenceElement);
                            nodes.add(node);
                        });
                        break;
                    }
                    case 'move': {
                        const removed: Node[] = [];
                        for (let i = 0; i < event.count; ++i) {
                            const toRemove =
                                element.childNodes[event.fromIndex];
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
                        const referenceNode =
                            element.childNodes[event.fromIndex];
                        for (const node of toReorder) {
                            element.insertBefore(node, referenceNode);
                        }
                        break;
                    }
                    default:
                        log.assertExhausted(event, 'unexpected render event');
                }
            };

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

            const connectEffects = () => {
                if (nodeOrdering) {
                    addOrderingDep(nodeOrdering, context.nodeOrdering);
                    for (const boundEffect of boundEffects) {
                        addOrderingDep(boundEffect, nodeOrdering);
                        boundEffect();
                    }
                }
            };

            const disconnectEffects = () => {
                if (nodeOrdering) {
                    for (const boundEffect of boundEffects) {
                        removeOrderingDep(boundEffect, nodeOrdering);
                    }
                    removeOrderingDep(nodeOrdering, context.nodeOrdering);
                }
            };

            const mountSelf = () => {
                log.assert(
                    !isMounted,
                    'Invariant: Element rendered twice! Did you write a component that renders children multiple times?'
                );
                callback({
                    type: 'splice',
                    index: 0,
                    count: 0,
                    nodes: [element],
                });
                isMounted = true;
            };
            const unmountSelf = () => {
                log.assert(
                    isMounted,
                    'Invariant: Element unmounted twice! Did you write a component that renders children multiple times?'
                );
                callback({
                    type: 'splice',
                    index: 0,
                    count: 1,
                    nodes: [],
                });
                isMounted = false;
            };

            const callOnMount = () => {
                onMountActions.forEach((action) => action());
            };

            const callOnUnmount = () => {
                onUnmountActions.forEach((action) => action());
            };

            if (isAttached) {
                connectEffects();
            }
            mountSelf();

            const childrenLifecycle = childrenRenderNode.start(
                childEventHandler,
                subContext,
                isAttached
            );
            if (isAttached) {
                callOnMount();
            }

            return {
                stop: () => {
                    childrenLifecycle.stop();
                    isMounted = false;
                },
                onBeforeAttach: () => {
                    connectEffects();
                    childrenLifecycle.onBeforeAttach();
                },
                attachSelf: () => {
                    connectEffects();
                    childrenLifecycle.onBeforeAttach();
                    mountSelf();
                    childrenLifecycle.onAfterAttach();
                    callOnMount();
                },
                onAfterAttach: () => {
                    childrenLifecycle.onAfterAttach();
                    callOnMount();
                },
                onBeforeDetach: () => {
                    childrenLifecycle.onBeforeDetach();
                    callOnUnmount();
                },
                detachSelf: () => {
                    childrenLifecycle.onBeforeDetach();
                    callOnUnmount();
                    unmountSelf();
                    childrenLifecycle.onAfterDetach();
                    disconnectEffects();
                },
                onAfterDetach: () => {
                    childrenLifecycle.onAfterDetach();
                    disconnectEffects();
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
    let renderNode: RenderNode | null = null;

    const mountHandlers = new Set<() => void>();
    const unmountHandlers = new Set<() => void>();
    const createdEffects: Calculation<any>[] = [];
    const createdCalculations: Calculation<any>[] = [];
    let isInitialized = false;

    const childrenRenderNode = createArrayRenderNode(children);

    return makeRenderNode(
        RenderNodeType.component,
        DEBUG && { Component, props, childrenRenderNode },
        (handler, renderContext, isAttached) => {
            if (!renderNode) {
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
                    getContext: (context) => {
                        return readContext(renderContext.contextMap, context);
                    },
                };
                const propsObj = props || {};
                let propsWithChildren: any;
                if (children.length === 0) {
                    propsWithChildren = propsObj;
                } else if (children.length === 1) {
                    propsWithChildren = { ...propsObj, children: children[0] };
                } else {
                    propsWithChildren = { ...propsObj, children };
                }
                renderNode = untracked(() => {
                    let jsxNode: JSXNode = null;
                    createdCalculations.push(
                        ...trackCreatedCalculations(() => {
                            jsxNode = Component(propsWithChildren, listeners);
                        })
                    );
                    return jsxNodeToRenderNode(jsxNode);
                });
                isInitialized = true;
            }

            const connectCalculations = () => {
                createdEffects.forEach((eff) => {
                    addOrderingDep(renderContext.nodeOrdering, eff);
                    retain(eff);
                    eff(); // it may have been dirtied and flushed; re-cache
                });
                createdCalculations.forEach((calculation) => {
                    retain(calculation);
                    calculation(); // it may have been dirtied and flushed; re-cache
                });
            };
            const callOnMount = () => {
                mountHandlers.forEach((handler) => handler());
            };
            const callOnUnmount = () => {
                unmountHandlers.forEach((handler) => handler());
            };
            const disconnectCalculations = () => {
                createdEffects.forEach((eff) => {
                    removeOrderingDep(renderContext.nodeOrdering, eff);
                    release(eff);
                });
                createdCalculations.forEach((calculation) => {
                    release(calculation);
                });
            };

            if (isAttached) {
                connectCalculations();
            }
            const childLifecycle = renderNode.start(
                handler,
                renderContext,
                isAttached
            );
            if (isAttached) {
                callOnMount();
            }

            return {
                stop: () => {
                    childLifecycle.stop();

                    createdCalculations.forEach((calculation) => {
                        disposeNode(calculation);
                    });
                },
                onBeforeAttach: () => {
                    childLifecycle.onBeforeAttach();
                    connectCalculations();
                },
                attachSelf: () => {
                    connectCalculations();
                    childLifecycle.attachSelf();
                    callOnMount();
                },
                onAfterAttach: () => {
                    childLifecycle.onAfterAttach();
                    callOnMount();
                },
                onBeforeDetach: () => {
                    childLifecycle.onBeforeDetach();
                    callOnUnmount();
                },
                detachSelf: () => {
                    callOnUnmount();
                    childLifecycle.detachSelf();
                    disconnectCalculations();
                },
                onAfterDetach: () => {
                    childLifecycle.onAfterDetach();
                    disconnectCalculations();
                },
            };
        }
    );
}

function createContextRenderNode<TContext>(
    Context: Context<TContext>,
    value: TContext,
    children: RenderNode[]
) {
    const childrenRenderNode = createArrayRenderNode(children);

    return makeRenderNode(
        RenderNodeType.context,
        DEBUG && { Context, value, childrenRenderNode },
        (handler, context, isAttached) => {
            const subContextMap = new Map(context.contextMap);
            subContextMap.set(Context, value);
            return childrenRenderNode.start(
                handler,
                {
                    ...context,
                    contextMap: subContextMap,
                },
                isAttached
            );
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
    const childrenRenderNode = createArrayRenderNode(children);

    return makeRenderNode(
        RenderNodeType.lifecycleObserver,
        DEBUG && { nodeCallback, elementCallback, childrenRenderNode },
        (handler, context, isAttached) => {
            const childNodes: Node[] = [];
            const childLifecycleHandler = childrenRenderNode.start(
                (event) => {
                    switch (event.type) {
                        case 'splice': {
                            const removed = childNodes.splice(
                                event.index,
                                event.count,
                                ...event.nodes
                            );
                            if (isAttached) {
                                removed.forEach((node) => {
                                    nodeCallback?.(node, 'remove');
                                    if (node instanceof Element) {
                                        elementCallback?.(node, 'remove');
                                    }
                                });
                            }
                            handler(event);
                            if (isAttached) {
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
                            handler(event);
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
                            handler(event);
                            break;
                        }
                        default:
                            log.assertExhausted(
                                event,
                                'LifecycleObserver RenderNode got unexpected event'
                            );
                    }
                },
                context,
                isAttached
            );

            const notifyExistingAttached = () => {
                childNodes.forEach((node) => {
                    nodeCallback?.(node, 'add');
                    if (node instanceof Element) {
                        elementCallback?.(node, 'add');
                    }
                });
            };

            const notifyExistingDetached = () => {
                childNodes.forEach((node) => {
                    nodeCallback?.(node, 'remove');
                    if (node instanceof Element) {
                        elementCallback?.(node, 'remove');
                    }
                });
            };

            // TODO: write some tests to check cases where detached LifecycleObserver RenderNodes have their subtree modified... somehow... maybe this can't happen?
            return {
                stop: () => {
                    childLifecycleHandler.stop();
                },
                onBeforeAttach: () => {
                    childLifecycleHandler.onBeforeAttach();
                },
                attachSelf: () => {
                    notifyExistingAttached();
                    isAttached = true;
                    childLifecycleHandler.attachSelf();
                },
                onAfterAttach: () => {
                    notifyExistingAttached();
                    isAttached = true;
                    childLifecycleHandler.onAfterAttach();
                },
                onBeforeDetach: () => {
                    childLifecycleHandler.onBeforeDetach();
                    isAttached = false;
                    notifyExistingDetached();
                },
                detachSelf: () => {
                    childLifecycleHandler.detachSelf();
                    isAttached = false;
                    notifyExistingDetached();
                },
                onAfterDetach: () => {
                    childLifecycleHandler.onAfterDetach();
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
    return makeRenderNode(
        RenderNodeType.collection,
        DEBUG && { collection },
        (callback, renderContext, isAttached) => {
            const collectionNodeOrdering = makeNodeOrdering(
                DEBUG
                    ? `viewcoll:${debugNameFor(collection) ?? 'node'}:order`
                    : 'viewcoll:order'
            );
            registerNode(collectionNodeOrdering);

            type ChildInfoRecord = {
                renderNode: RenderNode;
                renderNodeLifecycle: RenderNodeLifecycle | null;
                size: number;
            };
            let childInfo: ChildInfoRecord[] = [];

            const getInsertionIndex = (childIndex: number) => {
                let insertionIndex = 0;
                for (let i = 0; i < childIndex; ++i) {
                    insertionIndex += childInfo[i].size;
                }
                return insertionIndex;
            };

            // TODO: consolidate duplication between createArrayRenderNode and createCollectionRenderNode and
            const childEventHandler = (
                event: RenderEvent,
                childIndex: number
            ) => {
                switch (event.type) {
                    case 'splice': {
                        const insertionIndex = getInsertionIndex(childIndex);
                        callback({
                            type: 'splice',
                            index: event.index + insertionIndex,
                            count: event.count,
                            nodes: event.nodes,
                        });
                        childInfo[childIndex].size =
                            childInfo[childIndex].size -
                            event.count +
                            event.nodes.length;
                        break;
                    }
                    case 'move': {
                        const insertionIndex = getInsertionIndex(childIndex);
                        callback({
                            type: 'move',
                            fromIndex: event.fromIndex + insertionIndex,
                            count: event.count,
                            toIndex: event.toIndex + insertionIndex,
                        });
                        break;
                    }
                    case 'sort': {
                        const insertionIndex = getInsertionIndex(childIndex);
                        callback({
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

            let unobserve: () => void = noop;

            const initAndObserve = () => {
                untracked(() => {
                    collection.forEach((child, childIndex) => {
                        const childNode = jsxNodeToRenderNode(child);
                        childInfo[childIndex] = {
                            renderNode: childNode,
                            renderNodeLifecycle: null,
                            size: 0,
                        };
                        childInfo[childIndex].renderNodeLifecycle =
                            childNode.start(
                                (event) => {
                                    const realIndex = childInfo.findIndex(
                                        (i) => i.renderNode === childNode
                                    );
                                    log.assert(
                                        realIndex !== -1,
                                        'event on removed child'
                                    );
                                    childEventHandler(event, realIndex);
                                },
                                renderContext, // TODO: I think the child renderContext needs to be set to have the nodeOrdering to be something else!
                                isAttached
                            );
                    });
                });

                unobserve = collection[ObserveKey]((events) => {
                    events.forEach((event) => {
                        if (event.type === 'splice') {
                            untracked(() => {
                                const { count, index, items } = event;
                                // Why iterate first and then splice?
                                // - We asking the child to remove itself, which will make us update the .size childInfo for the corresponding children
                                // - Once deleted, we still have remaining childInfo records at those indexes, and then remove our tracking record of the items
                                for (let i = index; i < index + count; ++i) {
                                    childInfo[
                                        i
                                    ].renderNodeLifecycle?.detachSelf();
                                    childInfo[i].renderNodeLifecycle?.stop();
                                }
                                childInfo.splice(index, count);

                                items.forEach((child, itemIndex) => {
                                    const childIndex = index + itemIndex;
                                    const childNode =
                                        jsxNodeToRenderNode(child);
                                    childInfo.splice(childIndex, 0, {
                                        renderNode: childNode,
                                        renderNodeLifecycle: null,
                                        size: 0,
                                    });
                                    childInfo[childIndex].renderNodeLifecycle =
                                        childNode.start(
                                            (event) => {
                                                const realIndex =
                                                    childInfo.findIndex(
                                                        (i) =>
                                                            i.renderNode ===
                                                            child
                                                    );
                                                log.assert(
                                                    realIndex !== -1,
                                                    'event on removed child'
                                                );
                                                childEventHandler(
                                                    event,
                                                    realIndex
                                                );
                                            },
                                            renderContext,
                                            isAttached
                                        );
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

                            callback({
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

                            callback({
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
            };

            const subscriptionNode = collection[GetSubscriptionNodeKey]();
            registerNode(subscriptionNode);

            const connectOrdering = () => {
                addOrderingDep(subscriptionNode, collectionNodeOrdering);
                addOrderingDep(
                    collectionNodeOrdering,
                    renderContext.nodeOrdering
                );
            };
            const disconnectOrdering = () => {
                removeOrderingDep(
                    collectionNodeOrdering,
                    renderContext.nodeOrdering
                );
                removeOrderingDep(subscriptionNode, collectionNodeOrdering);
            };

            if (isAttached) {
                connectOrdering();
                initAndObserve();
            }

            // TODO: why do we have subscriptionNode **and** collectionNodeOrdering?

            return {
                stop: () => {
                    childInfo.forEach((info) =>
                        info.renderNodeLifecycle?.stop()
                    );
                },
                onBeforeAttach: () => {
                    connectOrdering();
                    initAndObserve();
                    // TODO: is this right?
                    childInfo.forEach((info) =>
                        info.renderNodeLifecycle?.onBeforeAttach()
                    );
                    isAttached = true;
                },
                attachSelf: () => {
                    connectOrdering();
                    initAndObserve();

                    childInfo.forEach((info) =>
                        info.renderNodeLifecycle?.attachSelf()
                    );

                    isAttached = true;
                },
                onAfterAttach: () => {
                    childInfo.forEach((info) =>
                        info.renderNodeLifecycle?.onAfterAttach()
                    );
                },
                onBeforeDetach: () => {
                    childInfo.forEach((info) =>
                        info.renderNodeLifecycle?.onBeforeDetach()
                    );
                },
                detachSelf: () => {
                    childInfo.forEach((info) =>
                        info.renderNodeLifecycle?.detachSelf()
                    );

                    isAttached = false;

                    unobserve();
                    disconnectOrdering();
                },
                onAfterDetach: () => {
                    isAttached = false;

                    childInfo.forEach((info) =>
                        info.renderNodeLifecycle?.onAfterDetach()
                    );

                    unobserve();
                    disconnectOrdering();
                },
            };
        }
    );
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

    const renderNode = jsxNodeToRenderNode(jsxNode);
    const lifecycle = renderNode.start(
        renderEventHandler,
        {
            contextMap,
            nodeOrdering,
        },
        false
    );

    lifecycle.onBeforeAttach();
    insertionIndex = parentElement.childNodes.length;
    parentElement.appendChild(mountNode);
    mountNode = parentElement;
    lifecycle.onAfterAttach();

    return () => {
        lifecycle.detachSelf();
        lifecycle.stop();
        release(nodeOrdering);

        if (nodes.size > 0) {
            log.error(
                'Internal consistency error: nodes remain after unmounting!',
                nodes
            );
        }
    };
}
