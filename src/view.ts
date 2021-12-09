import { effect, retain, release } from './calc';
import { debugNameFor } from './debug';
import {
    Calculation,
    isCalculation,
    isCollection,
    isRef,
    ObserveKey,
} from './types';
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
    mountVNode,
    spliceVNode,
    makeChildVNode,
    makeRootVNode,
    callOnMount,
} from './vnode';

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

function setBooleanPropertyValue(
    element: Element,
    key: string,
    value: boolean
) {
    if (
        element instanceof HTMLInputElement &&
        (key === 'checked' || key === 'indeterminate') &&
        element[key] !== value
    ) {
        element[key] = value;
    }
    if (
        element instanceof HTMLOptionElement &&
        key == 'selected' &&
        element[key] !== value
    ) {
        element[key] = value;
    }
    if (
        element instanceof HTMLDetailsElement &&
        key == 'open' &&
        element[key] !== value
    ) {
        element[key] = value;
    }
}

function setStringPropertyValue(element: Element, key: string, value: string) {
    if (
        element instanceof HTMLInputElement &&
        key === 'value' &&
        element[key] !== value
    ) {
        element[key] = value;
    }
    if (
        element instanceof HTMLTextAreaElement &&
        key === 'value' &&
        element[key] !== value
    ) {
        element[key] = value;
    }
    if (
        element instanceof HTMLOptionElement &&
        key === 'value' &&
        element[key] !== value
    ) {
        element[key] = value;
    }
}

function setAttributeValue(element: Element, key: string, value: unknown) {
    if (value === null || value === undefined || value === false) {
        element.removeAttribute(key);
        setBooleanPropertyValue(element, key, false);
        setStringPropertyValue(element, key, '');
    } else if (value === true) {
        element.setAttribute(key, '');
        setBooleanPropertyValue(element, key, true);
    } else if (typeof value === 'string') {
        element.setAttribute(key, value);
        setStringPropertyValue(element, key, value);
    } else if (typeof value === 'number') {
        element.setAttribute(key, value.toString());
        setStringPropertyValue(element, key, value.toString());
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

function jsxNodeToVNode({
    parentNode,
    domParent,
    jsxNode,
}: {
    parentNode: VNode;
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
            parentNode: parentNode,
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
            parentNode: parentNode,
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
            parentNode: parentNode,
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
                        setAttributeValue(element, key, computedValue);
                    }, `viewattr:${key}`);
                    retain(boundEffect);
                    boundEffects.push(boundEffect);
                    boundEffect();
                } else {
                    setAttributeValue(element, key, value);
                }
            });
        }

        const elementNode = makeChildVNode({
            parentNode: parentNode,
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

        elementNode.children.push(
            ...jsxNode.children.map((childJsxNode) =>
                jsxNodeToVNode({
                    domParent: elementNode,
                    parentNode: elementNode,
                    jsxNode: childJsxNode,
                })
            )
        );

        // Mount self
        if (elementNode.mountFragment) {
            element.appendChild(elementNode.mountFragment);
            elementNode.mountFragment = null;
        }
        mountVNode(elementNode);
        // TODO: At this point, the element's children are mounted to the newly created element, the newly created
        // element is mounted to the domParent's mountFragment. How do we call all the onMount callbacks? Maybe
        // the mount() function should call them after it's been mounted?

        return elementNode;
    }
    if (isCollection(jsxNode)) {
        const trackedCollection = jsxNode;
        const onUnmount: (() => void)[] = [];

        const collectionNode = makeChildVNode({
            parentNode: parentNode,
            domParent: domParent,
            jsxNode: jsxNode,
            domNode: null,
            onMount: [],
            onUnmount,
        });

        const unobserve = trackedCollection[ObserveKey]((event) => {
            if (event.type === 'init') {
                const { items } = event;
                collectionNode.children.push(
                    ...items.map((jsxChild) =>
                        jsxNodeToVNode({
                            domParent: collectionNode.domParent,
                            parentNode: collectionNode,
                            jsxNode: jsxChild,
                        })
                    )
                );
            } else if (event.type === 'splice') {
                const { count, index, items } = event;
                const childNodes = items.map((jsxChild) =>
                    jsxNodeToVNode({
                        domParent: collectionNode.domParent,
                        parentNode: collectionNode,
                        jsxNode: jsxChild,
                    })
                );
                spliceVNode(collectionNode, index, count, childNodes);
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
            parentNode: parentNode,
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
                parentNode: calculationNode,
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
            parentNode: parentNode,
            domParent: domParent,
            jsxNode: jsxNode,
            domNode: null,
            onMount: [],
            onUnmount,
        });

        const Component = jsxNode.component;
        let firstRun = true;
        const resultEffect = effect(() => {
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
                    onEffect: (
                        effectCallback: () => void,
                        debugName?: string
                    ) => {
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
                parentNode: componentNode,
                domParent: componentNode.domParent,
                jsxNode: jsxChild,
            });
            if (firstRun) {
                firstRun = false;
                componentNode.children.push(childVNode);

                onComponentMount.forEach((mountCallback) =>
                    componentNode.onMount.push(mountCallback)
                );
            } else {
                spliceVNode(componentNode, 0, componentNode.children.length, [
                    childVNode,
                ]);

                onComponentMount.forEach((mountCallback) => mountCallback());
            }
        }, `component:${jsxNode.component.name}`);

        retain(resultEffect);
        onUnmount.push(() => release(resultEffect));

        resultEffect();

        // Mount self
        mountVNode(componentNode);

        return componentNode;
    }
    if (Array.isArray(jsxNode)) {
        const items = jsxNode;
        const arrayNode = makeChildVNode({
            parentNode: parentNode,
            domParent: domParent,
            jsxNode,
            domNode: null,
            onMount: [],
            onUnmount: [],
        });

        arrayNode.children.push(
            ...items.map((jsxChild) =>
                jsxNodeToVNode({
                    parentNode: arrayNode,
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
            parentNode: parentNode,
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
            parentNode: rootNode,
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
