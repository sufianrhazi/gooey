import { name, effect, retain, release } from './index';
import { Calculation, isCalculation, isCollection, isRef } from './types';
import * as log from './log';
import {
    Component,
    JSXNode,
    ElementProps,
    isRenderComponent,
    isRenderElement,
} from './jsx';
import {
    VNode,
    ChildVNode,
    replaceVNode,
    spliceVNode,
    makeChildVNode,
    makeRootVNode,
    makeEmptyVNode,
} from './vnode';

declare global {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace JSX {
        interface IntrinsicElements {
            [unknownElement: string]: {
                'on:click': (event: MouseEvent) => void;
            } & any;
        }
        type Element = JSXNode;
    }
}

export function createElement(
    Constructor: string,
    props?: ElementProps,
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
    props?: ElementProps | Props,
    ...children: JSXNode[]
): JSXNode {
    if (typeof Constructor === 'string') {
        return {
            type: 'element',
            element: Constructor,
            props,
            children,
        };
    }
    return {
        type: 'component',
        component: Constructor,
        props,
        children,
    };
}

const boundEvents = new WeakMap<Element, Record<string, (ev: Event) => void>>();

function setAttributeValue(element: Element, key: string, value: unknown) {
    if (value === null || value === undefined || value === false) {
        element.removeAttribute(key);
    } else if (value === true) {
        element.setAttribute(key, '');
    } else if (typeof value === 'string') {
        element.setAttribute(key, value);
    } else if (typeof value === 'number') {
        element.setAttribute(key, value.toString());
    } else if (key.startsWith('on:') && typeof value === 'function') {
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
    }
}

function renderAppending({
    domParent,
    parentNode,
    jsxNode,
}: {
    domParent: VNode;
    parentNode: VNode;
    jsxNode: JSXNode;
}) {
    const emptyChildVNode = makeEmptyVNode({
        domParent,
        parentNode,
    });
    parentNode.children.push(emptyChildVNode);
    renderReplacing({
        nodeToReplace: emptyChildVNode,
        jsxNode,
    });
}

function renderReplacing({
    nodeToReplace,
    jsxNode,
}: {
    nodeToReplace: ChildVNode;
    jsxNode: JSXNode;
}): ChildVNode {
    if (
        jsxNode === null ||
        jsxNode === undefined ||
        jsxNode === false ||
        jsxNode === true
    ) {
        const emptyVNode = makeChildVNode({
            parentNode: nodeToReplace.parentNode,
            domParent: nodeToReplace.domParent,
            jsxNode: jsxNode,
            domNode: null,
            onUnmount: [],
        });
        replaceVNode(nodeToReplace, emptyVNode);
        return emptyVNode;
    }
    if (typeof jsxNode === 'string') {
        const stringVNode = makeChildVNode({
            parentNode: nodeToReplace.parentNode,
            domParent: nodeToReplace.domParent,
            jsxNode: jsxNode,
            domNode: document.createTextNode(jsxNode),
            onUnmount: [],
        });
        replaceVNode(nodeToReplace, stringVNode);
        return stringVNode;
    }
    if (typeof jsxNode === 'number') {
        const numberVNode = makeChildVNode({
            parentNode: nodeToReplace.parentNode,
            domParent: nodeToReplace.domParent,
            jsxNode: jsxNode,
            domNode: document.createTextNode(jsxNode.toString()),
            onUnmount: [],
        });
        replaceVNode(nodeToReplace, numberVNode);
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
                    const boundEffect = name(
                        effect(() => {
                            const computedValue = value();
                            setAttributeValue(element, key, computedValue);
                        }),
                        `view:bindAttribute:${key}:` // TODO: figure out how to serialize where we are in the tree. Or maybe it doesn't matter
                    );
                    retain(boundEffect);
                    boundEffects.push(boundEffect);
                    boundEffect();
                } else {
                    setAttributeValue(element, key, value);
                }
            });
        }

        const elementNode = makeChildVNode({
            parentNode: nodeToReplace.parentNode,
            domParent: nodeToReplace.domParent,
            jsxNode: jsxNode,
            domNode: element,
            onUnmount: [
                () => {
                    boundEffects.forEach((boundEffect) => release(boundEffect));
                    if (refCallback) {
                        refCallback(undefined);
                    }
                },
            ],
        });
        replaceVNode(nodeToReplace, elementNode);

        jsxNode.children.forEach((child) => {
            renderAppending({
                domParent: elementNode,
                parentNode: elementNode,
                jsxNode: child,
            });
        });

        if (refCallback) {
            refCallback(element);
        }

        return elementNode;
    }
    if (isCollection(jsxNode)) {
        const trackedCollection = jsxNode;
        const onUnmount: (() => void)[] = [];

        const collectionNode = makeChildVNode({
            parentNode: nodeToReplace.parentNode,
            domParent: nodeToReplace.domParent,
            jsxNode: jsxNode,
            domNode: null,
            onUnmount,
        });
        replaceVNode(nodeToReplace, collectionNode);

        const unobserve = trackedCollection.observe((event) => {
            if (event.type === 'init') {
                const { items } = event;
                items.forEach((jsxChild) => {
                    renderAppending({
                        domParent: collectionNode.domParent,
                        parentNode: collectionNode,
                        jsxNode: jsxChild,
                    });
                });
            } else if (event.type === 'sort') {
                // TODO: figure out how to do this
            } else if (event.type === 'splice') {
                const { count, index, items } = event;
                const childNodes = items.map(() =>
                    makeEmptyVNode({
                        domParent: collectionNode.domParent,
                        parentNode: collectionNode,
                    })
                );
                spliceVNode(
                    collectionNode,
                    collectionNode.children[index],
                    count,
                    childNodes
                );
                items.forEach((jsxChild, index) => {
                    renderReplacing({
                        nodeToReplace: childNodes[index],
                        jsxNode: jsxChild,
                    });
                });
            }
        });

        retain(trackedCollection);
        onUnmount.push(unobserve);
        onUnmount.push(() => {
            release(trackedCollection);
        });

        return collectionNode;
    }
    if (isCalculation(jsxNode)) {
        const trackedCalculation = jsxNode;
        const onUnmount: Function[] = [];
        const calculationNode = makeChildVNode({
            parentNode: nodeToReplace.parentNode,
            domParent: nodeToReplace.domParent,
            jsxNode: jsxNode,
            domNode: null,
            onUnmount,
        });
        replaceVNode(nodeToReplace, calculationNode);

        // Create a virtual node for the result of the calculation
        let calculationResultNode = makeEmptyVNode({
            parentNode: calculationNode,
            domParent: calculationNode.domParent,
        });
        calculationNode.children.push(calculationResultNode);

        const resultEffect = name(
            effect(() => {
                const jsxChild = trackedCalculation();

                calculationResultNode = renderReplacing({
                    nodeToReplace: calculationResultNode,
                    jsxNode: jsxChild,
                });
            }),
            `view:calc:` // TODO: figure out how to serialize where we are in the tree. Or maybe it doesn't matter
        );

        retain(resultEffect);
        onUnmount.push(() => release(resultEffect));

        resultEffect();
        return calculationNode;
    }
    if (isRenderComponent(jsxNode)) {
        const onUnmount: Function[] = [];
        const componentNode = makeChildVNode({
            parentNode: nodeToReplace.parentNode,
            domParent: nodeToReplace.domParent,
            jsxNode: jsxNode,
            domNode: null,
            onUnmount,
        });
        replaceVNode(nodeToReplace, componentNode);

        // Create a virtual node for the result of the component render
        let componentResultNode = makeEmptyVNode({
            parentNode: componentNode,
            domParent: componentNode.domParent,
        });
        componentNode.children.push(componentResultNode);

        const Component = jsxNode.component;
        const resultEffect = name(
            effect(() => {
                const onComponentUnmount: Function[] = [];
                const onComponentMount: Function[] = [];
                const jsxChild = Component(
                    {
                        ...(jsxNode.props || {}),
                        children: jsxNode.children,
                    },
                    {
                        onUnmount: (unmountCallback) => {
                            onComponentUnmount.push(unmountCallback);
                        },
                        onMount: (mountCallback) => {
                            onComponentMount.push(mountCallback);
                        },
                    }
                );

                componentResultNode = renderReplacing({
                    nodeToReplace: componentResultNode,
                    jsxNode: jsxChild,
                });

                onComponentMount.forEach((mountCallback) => mountCallback());
            }),
            `view:component:${jsxNode.component.name}:` // TODO: figure out how to serialize where we are in the tree. Or maybe it doesn't matter
        );

        retain(resultEffect);
        onUnmount.push(() => release(resultEffect));

        resultEffect();
        return componentNode;
    }
    if (Array.isArray(jsxNode)) {
        const items = jsxNode;
        const arrayNode = makeChildVNode({
            parentNode: nodeToReplace.parentNode,
            domParent: nodeToReplace.domParent,
            jsxNode,
            domNode: null,
            onUnmount: [],
        });
        replaceVNode(nodeToReplace, arrayNode);

        items.forEach((jsxChild) => {
            renderAppending({
                domParent: arrayNode.domParent,
                parentNode: arrayNode,
                jsxNode: jsxChild,
            });
        });
        return arrayNode;
    }
    if (typeof jsxNode === 'function') {
        const functionVNode = makeChildVNode({
            parentNode: nodeToReplace.parentNode,
            domParent: nodeToReplace.domParent,
            jsxNode: jsxNode,
            domNode: null,
            onUnmount: [],
        });
        replaceVNode(nodeToReplace, functionVNode);
        log.warn(
            'Attempted to render JSX node that was a function, not rendering anything'
        );
        return functionVNode;
    }
    log.assertExhausted(jsxNode, 'unexpected render type');
}

export function mount(parentElement: Element, jsxNode: JSXNode) {
    const rootNode = makeRootVNode({ domNode: parentElement });
    renderAppending({
        domParent: rootNode,
        parentNode: rootNode,
        jsxNode: jsxNode,
    });
}

export const Fragment = ({ children }: { children: JSXNode[] }) => children;
