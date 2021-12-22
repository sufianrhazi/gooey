import { effect, retain, release, untracked } from './calc';
import { debugNameFor } from './debug';
import {
    Calculation,
    isCalculation,
    isCollection,
    isRef,
    ObserveKey,
    TypeTag,
} from './types';
import * as log from './log';
import {
    Component,
    JSXNode,
    isRenderComponent,
    isRenderElement,
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
export function createElement<Props extends {}>(
    Constructor: string | Component<Props>,
    props?: any | Props,
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
    return {
        [TypeTag]: 'component',
        component: Constructor,
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
}: {
    domParent: VNode;
    jsxNode: JSXNode;
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

        const boundEffects: Calculation<any>[] = [];
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
                    retain(boundEffect);
                    boundEffects.push(boundEffect);
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
                    boundEffects.forEach((boundEffect) => release(boundEffect));
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
        const trackedCollection = jsxNode;
        const onUnmount: (() => void)[] = [];

        const collectionNode = makeChildVNode({
            domParent: domParent,
            jsxNode: jsxNode,
            domNode: null,
            onMount: [],
            onUnmount,
        });

        untracked(() => {
            collectionNode.children.push(
                ...trackedCollection.map((jsxChild) =>
                    jsxNodeToVNode({
                        domParent: collectionNode.domParent,
                        jsxNode: jsxChild,
                    })
                )
            );
        });

        const unobserve = trackedCollection[ObserveKey]((event) => {
            if (event.type === 'splice') {
                untracked(() => {
                    const { count, index, items } = event;
                    const childNodes = items.map((jsxChild) =>
                        jsxNodeToVNode({
                            domParent: collectionNode.domParent,
                            jsxNode: jsxChild,
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
                    { runOnUnmount: false }
                );
                spliceVNode(
                    collectionNode,
                    fromIndex < toIndex ? toIndex - fromCount : toIndex,
                    0,
                    moved,
                    { runOnMount: false }
                );
            }
        });

        retain(trackedCollection);
        onUnmount.push(unobserve);
        onUnmount.push(() => {
            release(trackedCollection);
        });

        // Mount self
        mountVNode(collectionNode);

        return collectionNode;
    }
    if (isCalculation(jsxNode)) {
        const trackedCalculation = jsxNode;
        const onUnmount: Function[] = [];
        const calculationNode = makeChildVNode({
            domParent: domParent,
            jsxNode: jsxNode,
            domNode: null,
            onMount: [],
            onUnmount,
        });

        let firstRun = true;
        const resultEffect = effect(() => {
            const jsxChild = trackedCalculation();
            const childVNode = jsxNodeToVNode({
                domParent: calculationNode.domParent,
                jsxNode: jsxChild,
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

        retain(resultEffect);
        onUnmount.push(() => release(resultEffect));

        resultEffect();

        // Mount self
        mountVNode(calculationNode);

        return calculationNode;
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
                        effectCalc();
                    });
                    onUnmount.push(() => {
                        release(effectCalc);
                    });
                },
            }
        );

        const childVNode = jsxNodeToVNode({
            domParent: componentNode.domParent,
            jsxNode: jsxChild,
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

/**
 * Mount the provided JSX to an element
 */
export function mount(parentElement: Element, jsxNode: JSXNode) {
    const rootNode = makeRootVNode({ domNode: parentElement });
    rootNode.children.push(
        jsxNodeToVNode({
            domParent: rootNode,
            jsxNode: jsxNode,
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
    };
}

export const Fragment = ({ children }: { children: JSXNode[] }) => children;
