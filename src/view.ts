import {
    effect,
    retain,
    release,
    untracked,
    addOrderingDep,
    removeOrderingDep,
} from './calc';
import { name, debugNameFor } from './debug';
import {
    Collection,
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
} from './types';
import * as log from './log';
import {
    Component,
    JSXNode,
    isRenderComponent,
    isRenderElement,
    isRenderProvider,
    getElementTypeMapping,
} from './jsx';
import {
    VNode,
    ChildVNode,
    mountVNode,
    spliceVNode,
    makeChildVNode,
    makeRootVNode,
    callOnMount,
} from './vnode';

export function createElement(
    Constructor: string,
    props?: any,
    ...children: JSXNode[]
): JSXNode;
export function createElement<TContext>(
    Constructor: Context<TContext>,
    props: { value: TContext },
    ...children: JSXNode[]
): JSXNode;
export function createElement<Props extends {}>(
    Constructor: Component<Props>,
    props?: Props,
    ...children: JSXNode[]
): JSXNode;
export function createElement<Props extends {}>(
    Constructor: Component<Props>,
    props?: Props,
    ...children: JSXNode[]
): JSXNode;
export function createElement<TContext, Props extends {}>(
    Constructor: string | Component<Props> | Context<TContext>,
    props?: any | Props | { value: TContext },
    ...children: JSXNode[]
): JSXNode {
    if (typeof Constructor === 'string') {
        return {
            [TypeTag]: 'element',
            element: Constructor,
            props,
            children,
        };
    }
    if (isContext(Constructor)) {
        return {
            [TypeTag]: 'provider',
            context: Constructor,
            value: props.value,
            children,
        };
    }
    return {
        [TypeTag]: 'component',
        component: Constructor as Component<Props>,
        props,
        children,
    };
}

const boundEvents = new WeakMap<Element, Record<string, (ev: Event) => void>>();

function setAttributeValue(
    elementType: string,
    element: Element,
    key: string,
    value: unknown
) {
    if (key.startsWith('on:') && typeof value === 'function') {
        const eventName = key.slice(3);
        let attributes = boundEvents.get(element);
        if (!attributes) {
            attributes = {};
            boundEvents.set(element, attributes);
        }
        if (attributes[key]) {
            element.removeEventListener(eventName, attributes[key]);
        }
        element.addEventListener(eventName, value as any);
        attributes[key] = value as any;
    } else {
        const mapping = getElementTypeMapping(elementType, key);
        if (mapping) {
            if (mapping.makeAttrValue) {
                const attributeValue = mapping.makeAttrValue(value);
                if (attributeValue === undefined) {
                    element.removeAttribute(key);
                } else {
                    element.setAttribute(key, attributeValue);
                }
            }
            if (mapping.idlName && mapping.makeIdlValue) {
                (element as any)[mapping.idlName] = mapping.makeIdlValue(value);
            }
        } else if (value === false || value === undefined || value === null) {
            element.removeAttribute(key);
        } else if (value === true) {
            element.setAttribute(key, '');
        } else if (typeof value === 'string') {
            element.setAttribute(key, value);
        }
    }
}

function jsxNodeToVNode({
    domParent,
    jsxNode,
    contextMap,
    parentNodeOrdering,
}: {
    domParent: VNode;
    jsxNode: JSXNode;
    contextMap: Map<Context<any>, any>;
    parentNodeOrdering: NodeOrdering;
}): ChildVNode {
    if (
        jsxNode === null ||
        jsxNode === undefined ||
        jsxNode === false ||
        jsxNode === true
    ) {
        const emptyVNode = makeChildVNode({
            domParent: domParent,
            jsxNode: jsxNode,
            domNode: null,
            onMount: [],
            onUnmount: [],
        });
        mountVNode(emptyVNode);
        return emptyVNode;
    }
    if (typeof jsxNode === 'string') {
        const stringVNode = makeChildVNode({
            domParent: domParent,
            jsxNode: jsxNode,
            domNode: document.createTextNode(jsxNode),
            onMount: [],
            onUnmount: [],
        });
        mountVNode(stringVNode);
        return stringVNode;
    }
    if (typeof jsxNode === 'number') {
        const numberVNode = makeChildVNode({
            domParent: domParent,
            jsxNode: jsxNode,
            domNode: document.createTextNode(jsxNode.toString()),
            onMount: [],
            onUnmount: [],
        });
        mountVNode(numberVNode);
        return numberVNode;
    }
    if (isRenderElement(jsxNode)) {
        const element = document.createElement(jsxNode.element);

        const onReleaseActions: (() => void)[] = [];
        let refCallback: any = undefined;

        // Bind props
        if (jsxNode.props) {
            Object.entries(jsxNode.props).forEach(([key, value]) => {
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
                            jsxNode.element,
                            element,
                            key,
                            computedValue
                        );
                    }, `viewattr:${key}`);
                    onReleaseActions.push(() => {
                        removeOrderingDep(boundEffect, parentNodeOrdering);
                    });
                    addOrderingDep(boundEffect, parentNodeOrdering);

                    boundEffect();
                } else {
                    setAttributeValue(jsxNode.element, element, key, value);
                }
            });
        }

        const elementNode = makeChildVNode({
            domParent: domParent,
            jsxNode: jsxNode,
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
        });
        elementNode.children = jsxNode.children.map((childJsxNode) =>
            jsxNodeToVNode({
                domParent: elementNode,
                jsxNode: childJsxNode,
                contextMap,
                parentNodeOrdering,
            })
        );

        // Mount self
        if (elementNode.mountFragment) {
            element.appendChild(elementNode.mountFragment);
            elementNode.mountFragment = null;
        }
        mountVNode(elementNode);

        return elementNode;
    }
    if (isCollection(jsxNode)) {
        const trackedCollection: Collection<any> | View<any> = jsxNode;
        const onUnmount: (() => void)[] = [];

        const collectionNode = makeChildVNode({
            domParent: domParent,
            jsxNode: jsxNode,
            domNode: null,
            onMount: [],
            onUnmount,
        });

        const collectionNodeOrdering = makeNodeOrdering(
            DEBUG
                ? `viewcoll:${debugNameFor(jsxNode) ?? 'node'}:order`
                : 'viewcoll:order'
        );
        addOrderingDep(collectionNodeOrdering, parentNodeOrdering);
        onUnmount.push(() => {
            removeOrderingDep(collectionNodeOrdering, parentNodeOrdering);
        });

        untracked(() => {
            collectionNode.children.push(
                ...trackedCollection.map((jsxChild) =>
                    jsxNodeToVNode({
                        domParent: collectionNode.domParent,
                        jsxNode: jsxChild,
                        contextMap,
                        parentNodeOrdering: collectionNodeOrdering,
                    })
                )
            );
        });

        const unobserve = trackedCollection[ObserveKey]((events) => {
            events.forEach((event) => {
                if (event.type === 'splice') {
                    untracked(() => {
                        const { count, index, items } = event;
                        const childNodes = items.map((jsxChild) =>
                            jsxNodeToVNode({
                                domParent: collectionNode.domParent,
                                jsxNode: jsxChild,
                                contextMap,
                                parentNodeOrdering: collectionNodeOrdering,
                            })
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
                        { dispose: false, runOnUnmount: false }
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
                        { dispose: false, runOnUnmount: false }
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
        const subscriptionNode = trackedCollection[GetSubscriptionNodeKey]();

        addOrderingDep(subscriptionNode, collectionNodeOrdering);
        onUnmount.push(unobserve);
        onUnmount.push(() => {
            removeOrderingDep(subscriptionNode, collectionNodeOrdering);
        });

        // Mount self
        mountVNode(collectionNode);

        return collectionNode;
    }
    if (isCalculation(jsxNode)) {
        const trackedCalculation = jsxNode;
        const onUnmount: (() => void)[] = [];
        const calculationNode = makeChildVNode({
            domParent: domParent,
            jsxNode: jsxNode,
            domNode: null,
            onMount: [],
            onUnmount,
        });

        const calculationNodeOrdering = makeNodeOrdering(
            DEBUG
                ? `viewcalc:${debugNameFor(jsxNode) ?? 'node'}:order`
                : 'viewcalc:order'
        );
        addOrderingDep(calculationNodeOrdering, parentNodeOrdering);
        onUnmount.push(() => {
            removeOrderingDep(calculationNodeOrdering, parentNodeOrdering);
        });

        let firstRun = true;
        const resultEffect = effect(() => {
            const jsxChild = trackedCalculation();
            const childVNode = jsxNodeToVNode({
                domParent: calculationNode.domParent,
                jsxNode: jsxChild,
                contextMap,
                parentNodeOrdering: calculationNodeOrdering,
            });
            if (firstRun) {
                firstRun = false;
                calculationNode.children.push(childVNode);
            } else {
                spliceVNode(
                    calculationNode,
                    0,
                    calculationNode.children.length,
                    [childVNode]
                );
            }
        }, `viewcalc:${debugNameFor(jsxNode) ?? 'node'}`);

        onUnmount.push(() => {
            removeOrderingDep(resultEffect, calculationNodeOrdering);
        });
        addOrderingDep(resultEffect, calculationNodeOrdering);

        resultEffect();

        // Mount self
        mountVNode(calculationNode);

        return calculationNode;
    }
    if (isRenderProvider(jsxNode)) {
        const renderProvider = jsxNode;
        const providerNode = makeChildVNode({
            domParent: domParent,
            jsxNode,
            domNode: null,
            onMount: [],
            onUnmount: [],
        });

        const subMap = new Map(contextMap);
        subMap.set(renderProvider.context, renderProvider.value);

        providerNode.children.push(
            ...renderProvider.children.map((jsxChild) =>
                jsxNodeToVNode({
                    domParent: domParent,
                    jsxNode: jsxChild,
                    contextMap: subMap,
                    parentNodeOrdering,
                })
            )
        );

        // Mount self
        mountVNode(providerNode);

        return providerNode;
    }
    if (isRenderComponent(jsxNode)) {
        const onUnmount: Function[] = [];

        const componentNode = makeChildVNode({
            domParent: domParent,
            jsxNode: jsxNode,
            domNode: null,
            onMount: [],
            onUnmount,
        });

        const Component = jsxNode.component;
        const onComponentMount: Function[] = [];
        const jsxChild = Component(
            {
                ...(jsxNode.props || {}),
                children: jsxNode.children,
            },
            {
                onUnmount: (unmountCallback) => {
                    onUnmount.push(unmountCallback);
                },
                onMount: (mountCallback) => {
                    onComponentMount.push(mountCallback);
                },
                onEffect: (effectCallback: () => void, debugName?: string) => {
                    const effectCalc = effect(
                        effectCallback,
                        `componenteffect:${jsxNode.component.name}:${
                            debugName ?? onComponentMount.length
                        }`
                    );
                    onComponentMount.push(() => {
                        retain(effectCalc);
                        addOrderingDep(parentNodeOrdering, effectCalc);
                        effectCalc();
                    });
                    onUnmount.push(() => {
                        removeOrderingDep(parentNodeOrdering, effectCalc);
                        release(effectCalc);
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

        const childVNode = jsxNodeToVNode({
            domParent: componentNode.domParent,
            jsxNode: jsxChild,
            contextMap,
            parentNodeOrdering,
        });
        componentNode.children.push(childVNode);

        onComponentMount.forEach((mountCallback) =>
            componentNode.onMount.push(mountCallback)
        );

        // Mount self
        mountVNode(componentNode);

        return componentNode;
    }
    if (Array.isArray(jsxNode)) {
        const items = jsxNode;
        const arrayNode = makeChildVNode({
            domParent: domParent,
            jsxNode,
            domNode: null,
            onMount: [],
            onUnmount: [],
        });

        arrayNode.children.push(
            ...items.map((jsxChild) =>
                jsxNodeToVNode({
                    domParent: domParent,
                    jsxNode: jsxChild,
                    contextMap,
                    parentNodeOrdering,
                })
            )
        );

        // Mount self
        mountVNode(arrayNode);

        return arrayNode;
    }
    if (typeof jsxNode === 'function') {
        const functionVNode = makeChildVNode({
            domParent: domParent,
            jsxNode: jsxNode,
            domNode: null,
            onMount: [],
            onUnmount: [],
        });
        log.warn(
            'Attempted to render JSX node that was a function, not rendering anything'
        );

        // Mount self
        mountVNode(functionVNode);

        return functionVNode;
    }
    log.assertExhausted(jsxNode, 'unexpected render type');
}

function makeNodeOrdering(debugName?: string): NodeOrdering {
    const nodeOrdering: NodeOrdering = {
        [TypeTag]: 'nodeOrdering',
    };
    if (debugName) name(nodeOrdering, debugName);
    return nodeOrdering;
}

/**
 * Mount the provided JSX to an element
 */
export function mount(parentElement: Element, jsxNode: JSXNode) {
    const nodeOrdering = makeNodeOrdering('mount');
    retain(nodeOrdering);
    const rootNode = makeRootVNode({ domNode: parentElement });
    rootNode.children.push(
        jsxNodeToVNode({
            domParent: rootNode,
            jsxNode: jsxNode,
            contextMap: new Map(),
            parentNodeOrdering: nodeOrdering,
        })
    );

    // Mount self
    if (rootNode.mountFragment) {
        parentElement.appendChild(rootNode.mountFragment);
        rootNode.mountFragment = null;
    }

    // Call onMount callbacks
    callOnMount(rootNode);

    return () => {
        spliceVNode(rootNode, 0, rootNode.children.length, []);
        release(nodeOrdering);
    };
}

export const Fragment = ({ children }: { children: JSXNode[] }) => children;
