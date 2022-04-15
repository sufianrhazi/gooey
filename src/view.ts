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
} from './types';
import * as log from './log';
import { uniqueid } from './util';
import {
    Component,
    JSXNode,
    JSXNodeSingle,
    RenderElement,
    getElementTypeMapping,
} from './jsx';
import { VNode, spliceVNode, callOnMount } from './vnode';

export function createElement(
    Constructor: string,
    props?: any,
    ...children: JSXNode[]
): RenderElement<any, any>;
export function createElement<TContext>(
    Constructor: Context<TContext>,
    props: { value: TContext },
    ...children: JSXNode[]
): RenderElement<TContext, any>;
export function createElement<TProps extends {}>(
    Constructor: Component<TProps>,
    props: TProps,
    ...children: JSXNode[]
): RenderElement<any, TProps>;
export function createElement<TContext, TProps extends {}>(
    ...args: RenderElement<TContext, TProps>['__node']
): RenderElement<TContext, TProps> {
    return { __node: args };
}

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

/**
 * Sadly needed for TypeScript only, since I want to narrow a
 * Collection<JSXNodeSingle> | View<JSXNodeSingle> | Other and you can't narrow
 * with a (v: any) => v is Collection<any> | View<any>, which makes sense.
 */
function isCollectionView(
    thing: JSXNode
): thing is Collection<JSXNodeSingle> | View<JSXNodeSingle> {
    return isCollection(thing);
}

function jsxNodeToVNode(
    jsxNode: JSXNode,
    domParent: VNode,
    parentOrdering: NodeOrdering,
    contextMap: Map<Context<any>, any>,
    documentFragment: DocumentFragment
): VNode {
    if (
        jsxNode === null ||
        jsxNode === undefined ||
        jsxNode === false ||
        jsxNode === true
    ) {
        return { domParent };
    }
    if (typeof jsxNode === 'string') {
        const domNode = document.createTextNode(jsxNode);
        documentFragment.appendChild(domNode);
        return {
            domNode,
            domParent,
        };
    }
    if (typeof jsxNode === 'number') {
        const domNode = document.createTextNode(jsxNode.toString());
        documentFragment.appendChild(domNode);
        return {
            domNode,
            domParent,
        };
    }
    if (isCalculation(jsxNode)) {
        return makeCalculationVNode(
            jsxNode,
            domParent,
            parentOrdering,
            contextMap,
            documentFragment
        );
    }
    if (isCollectionView(jsxNode)) {
        return makeCollectionVNode(
            jsxNode,
            domParent,
            parentOrdering,
            contextMap,
            documentFragment
        );
    }
    if (Array.isArray(jsxNode)) {
        return {
            domParent,
            children: (jsxNode as JSXNodeSingle[]).map((child) =>
                jsxNodeToVNode(
                    child,
                    domParent,
                    parentOrdering,
                    contextMap,
                    documentFragment
                )
            ),
        };
    }
    if (typeof jsxNode === 'function') {
        log.warn(
            'Attempted to render JSX node that was a function, not rendering anything'
        );
        return { domParent };
    }
    return renderElementToVNode(
        jsxNode,
        domParent,
        parentOrdering,
        contextMap,
        documentFragment
    );
}

function renderElementToVNode(
    renderElement: RenderElement<any, any>,
    domParent: VNode,
    nodeOrdering: NodeOrdering,
    contextMap: Map<Context<any>, any>,
    documentFragment: DocumentFragment
) {
    const [Constructor, props, ...children] = renderElement.__node;
    if (typeof Constructor === 'string') {
        DEBUG &&
            log.debug('view renderElementToVNode element', {
                Constructor,
                props,
                children,
            });
        return makeElementVNode(
            Constructor,
            props,
            children,
            domParent,
            nodeOrdering,
            contextMap,
            documentFragment
        );
    }
    if (isContext(Constructor)) {
        DEBUG &&
            log.debug('view renderElementToVNode context', {
                Constructor,
                props,
                children,
            });
        return makeContextVNode(
            Constructor,
            props.value,
            children,
            domParent,
            nodeOrdering,
            contextMap,
            documentFragment
        );
    }
    DEBUG &&
        log.debug('view renderElementToVNode component', {
            Constructor,
            props,
            children,
        });
    return makeComponentVNode(
        Constructor,
        props,
        children,
        domParent,
        nodeOrdering,
        contextMap,
        documentFragment
    );
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

function makeElementVNode(
    elementType: string,
    props: {} | undefined,
    children: JSXNode[] | undefined,
    domParent: VNode,
    nodeOrdering: NodeOrdering,
    contextMap: Map<Context<any>, any>,
    documentFragment: DocumentFragment
) {
    let subContextMap = contextMap;
    let elementXMLNamespace: string = contextMap.has(XmlNamespaceContext)
        ? contextMap.get(XmlNamespaceContext)
        : XmlNamespaceContext();
    let childElementXMLNamespace: null | string = null;
    const xmlNamespaceTransition =
        elementNamespaceTransitionMap[elementXMLNamespace]?.[elementType];
    if (xmlNamespaceTransition) {
        elementXMLNamespace = xmlNamespaceTransition.node;
        childElementXMLNamespace = xmlNamespaceTransition.children;
    }
    if (childElementXMLNamespace != null) {
        subContextMap = new Map(contextMap);
        subContextMap.set(XmlNamespaceContext, childElementXMLNamespace);
    }
    DEBUG &&
        log.debug('view makeElementVNode', {
            elementType,
            elementXMLNamespace,
            props,
            children,
        });
    const element = document.createElementNS(elementXMLNamespace, elementType);
    const elementBoundEvents: Record<string, (ev: Event) => void> = {};

    const onReleaseActions: (() => void)[] = [];
    let refCallback: any = undefined;

    // Bind props
    if (props) {
        Object.entries(props).forEach(([key, value]) => {
            if (key === 'ref') {
                if (isRef(value)) {
                    value.current = element;
                    return;
                }
                if (typeof value === 'function' && !isCalculation(value)) {
                    refCallback = value;
                    return;
                }
            }
            if (isCalculation(value)) {
                const boundEffect = effect(() => {
                    const computedValue = value();
                    setAttributeValue(
                        elementType,
                        element,
                        key,
                        computedValue,
                        elementBoundEvents
                    );
                }, `viewattr:${key}`);
                onReleaseActions.push(() => {
                    removeOrderingDep(boundEffect, nodeOrdering);
                    boundEffect.dispose();
                });
                addOrderingDep(boundEffect, nodeOrdering);

                boundEffect();
            } else {
                setAttributeValue(
                    elementType,
                    element,
                    key,
                    value,
                    elementBoundEvents
                );
            }
        });
    }

    const elementNode: VNode = {
        domParent,
        domNode: element,
        onMount: [
            () => {
                if (refCallback) {
                    refCallback(element);
                }
            },
        ],
        onUnmount: [
            () => {
                onReleaseActions.forEach((action) => action());
                if (refCallback) {
                    refCallback(undefined);
                }
            },
        ],
    };

    if (children && children.length > 0) {
        const childDocumentFragment = document.createDocumentFragment();
        const childVNodes = children.map((child) =>
            jsxNodeToVNode(
                child,
                elementNode,
                nodeOrdering,
                subContextMap,
                childDocumentFragment
            )
        );
        elementNode.children = childVNodes;
        element.appendChild(childDocumentFragment);
    }
    documentFragment.appendChild(element);

    return elementNode;
}

function makeContextVNode<TContext>(
    context: Context<TContext>,
    value: TContext,
    children: JSXNode[] | undefined,
    domParent: VNode,
    nodeOrdering: NodeOrdering,
    contextMap: Map<Context<any>, any>,
    documentFragment: DocumentFragment
): VNode {
    const subContextMap = new Map(contextMap);
    subContextMap.set(context, value);

    const providerNode: VNode = {
        domParent,
    };

    if (children) {
        providerNode.children = children.map((jsxChild) =>
            jsxNodeToVNode(
                jsxChild,
                domParent,
                nodeOrdering,
                subContextMap,
                documentFragment
            )
        );
    }

    return providerNode;
}

function makeComponentVNode<TProps>(
    Component: Component<TProps>,
    props: TProps,
    children: JSXNode[] | undefined,
    domParent: VNode,
    nodeOrdering: NodeOrdering,
    contextMap: Map<Context<any>, any>,
    documentFragment: DocumentFragment
): VNode {
    DEBUG &&
        log.debug('view makeComponentVNode', { Component, props, children });
    const onUnmount: Function[] = [];
    const onMount: Function[] = [];

    let jsxNode: JSXNode;
    const createdCalculations = trackCreatedCalculations(() => {
        jsxNode = Component(
            {
                ...props,
                children: children,
            },
            {
                onUnmount: (unmountCallback) => {
                    onUnmount.push(unmountCallback);
                },
                onMount: (mountCallback) => {
                    onMount.push(mountCallback);
                },
                onEffect: (effectCallback: () => void, debugName?: string) => {
                    const effectCalc = effect(
                        effectCallback,
                        `componenteffect:${Component.name}:${debugName ?? '?'}`
                    );
                    onMount.push(() => {
                        retain(effectCalc);
                        addOrderingDep(nodeOrdering, effectCalc);
                        effectCalc();
                    });
                    onUnmount.push(() => {
                        removeOrderingDep(nodeOrdering, effectCalc);
                        release(effectCalc);
                        effectCalc.dispose();
                    });
                },
                getContext: <TVal>(context: Context<TVal>): TVal => {
                    if (contextMap.has(context)) {
                        return contextMap.get(context);
                    }
                    return context();
                },
            }
        );
    });
    onUnmount.push(() => {
        createdCalculations.forEach((calculation) => {
            calculation.dispose();
        });
    });

    const childVNode = jsxNodeToVNode(
        jsxNode,
        domParent,
        nodeOrdering,
        contextMap,
        documentFragment
    );

    const componentNode = {
        domParent,
        children: [childVNode],
        onMount,
        onUnmount,
    };

    return componentNode;
}

function makeCalculationVNode(
    calculation: Calculation<JSXNode>,
    domParent: VNode,
    parentNodeOrdering: NodeOrdering,
    contextMap: Map<Context<any>, any>,
    documentFragment: DocumentFragment
): VNode {
    const onUnmount: (() => void)[] = [];
    const calculationNodeChildren: VNode[] = [];
    const calculationNode: VNode = {
        domParent,
        children: calculationNodeChildren,
        onUnmount,
    };

    const calculationNodeOrdering = makeNodeOrdering(
        DEBUG
            ? `viewcalc:${debugNameFor(calculation) ?? 'node'}:order`
            : 'viewcalc:order'
    );
    registerNode(calculationNodeOrdering);

    let firstRun = true;
    const resultEffect = effect(() => {
        const renderElement = calculation();
        const calculationChild = jsxNodeToVNode(
            renderElement,
            domParent,
            calculationNodeOrdering,
            contextMap,
            documentFragment
        );
        if (firstRun) {
            // TODO: can we just call spliceVNode here?
            firstRun = false;
            calculationNodeChildren.push(calculationChild);
        } else {
            spliceVNode(calculationNode, 0, calculationNodeChildren.length, [
                calculationChild,
            ]);
        }
    }, `viewcalc:${debugNameFor(calculation) ?? 'node'}`);

    addOrderingDep(calculationNodeOrdering, parentNodeOrdering);
    addOrderingDep(resultEffect, calculationNodeOrdering);

    onUnmount.push(() => {
        removeOrderingDep(calculationNodeOrdering, parentNodeOrdering);
        removeOrderingDep(resultEffect, calculationNodeOrdering);
        resultEffect.dispose();
        disposeNode(calculationNodeOrdering);
    });

    resultEffect();

    return calculationNode;
}

function makeCollectionVNode(
    collection: Collection<JSXNodeSingle> | View<JSXNodeSingle>,
    domParent: VNode,
    parentNodeOrdering: NodeOrdering,
    contextMap: Map<Context<any>, any>,
    documentFragment: DocumentFragment
): VNode {
    const onUnmount: (() => void)[] = [];

    const collectionNodeChildren: VNode[] = [];
    const collectionNode = {
        domParent,
        children: collectionNodeChildren,
        onUnmount,
    };

    const collectionNodeOrdering = makeNodeOrdering(
        DEBUG
            ? `viewcoll:${debugNameFor(collection) ?? 'node'}:order`
            : 'viewcoll:order'
    );
    registerNode(collectionNodeOrdering);
    addOrderingDep(collectionNodeOrdering, parentNodeOrdering);
    onUnmount.push(() => {
        removeOrderingDep(collectionNodeOrdering, parentNodeOrdering);
    });

    untracked(() => {
        collectionNode.children.push(
            ...collection.map((jsxChild) =>
                jsxNodeToVNode(
                    jsxChild,
                    domParent,
                    collectionNodeOrdering,
                    contextMap,
                    documentFragment
                )
            )
        );
    });

    const unobserve = collection[ObserveKey]((events) => {
        events.forEach((event) => {
            if (event.type === 'splice') {
                untracked(() => {
                    const { count, index, items } = event;
                    const childNodes = items.map((jsxChild) =>
                        jsxNodeToVNode(
                            jsxChild,
                            domParent,
                            collectionNodeOrdering,
                            contextMap,
                            documentFragment
                        )
                    );
                    spliceVNode(collectionNode, index, count, childNodes);
                });
            } else if (event.type === 'move') {
                const { fromIndex, fromCount, toIndex } = event;
                const moved = spliceVNode(
                    collectionNode,
                    fromIndex,
                    fromCount,
                    [],
                    { runOnUnmount: false }
                );
                spliceVNode(
                    collectionNode,
                    fromIndex < toIndex ? toIndex - fromCount : toIndex,
                    0,
                    moved,
                    { runOnMount: false }
                );
            } else if (event.type === 'sort') {
                const { indexes } = event;
                const removedVNodes = spliceVNode(
                    collectionNode,
                    0,
                    indexes.length,
                    [],
                    { runOnUnmount: false }
                );
                const sortedVNodes = indexes.map(
                    (newIndex) => removedVNodes[newIndex]
                );
                spliceVNode(collectionNode, 0, 0, sortedVNodes, {
                    runOnMount: false,
                });
            } else {
                log.assertExhausted(event, 'unhandled collection event');
            }
        });
    });

    const subscriptionNode = collection[GetSubscriptionNodeKey]();
    registerNode(subscriptionNode);
    addOrderingDep(subscriptionNode, collectionNodeOrdering);
    onUnmount.push(unobserve);
    onUnmount.push(() => {
        removeOrderingDep(subscriptionNode, collectionNodeOrdering);
    });

    return collectionNode;
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
export function mount(parentElement: Element, jsxNode: JSXNode) {
    const contextMap: Map<Context<any>, any> = new Map();
    if (
        parentElement.namespaceURI === SVG_NAMESPACE ||
        parentElement.namespaceURI === MATHML_NAMESPACE
    ) {
        contextMap.set(XmlNamespaceContext, parentElement.namespaceURI);
    }
    const nodeOrdering = makeNodeOrdering('mount');
    retain(nodeOrdering);
    const anchorNode: VNode = { domNode: parentElement };
    const documentFragment = document.createDocumentFragment();
    const rootNode = jsxNodeToVNode(
        jsxNode,
        anchorNode,
        nodeOrdering,
        contextMap,
        documentFragment
    );
    anchorNode.children = [rootNode];

    parentElement.appendChild(documentFragment);

    // Call onMount callbacks
    callOnMount(anchorNode);

    return () => {
        spliceVNode(anchorNode, 0, anchorNode.children?.length ?? 0, []);
        release(nodeOrdering);
    };
}

export const Fragment = ({ children }: { children: JSXNode[] }) => children;
