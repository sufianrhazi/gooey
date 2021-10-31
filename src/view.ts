import {
    name,
    effect,
    retain,
    release,
} from './index';
import {
    Calculation,
    isCalculation,
    isCollection,
    isRef,
} from './types';
import * as log from './log';
import {
    Component,
    JSXChild,
    ElementProps,
    isRenderComponent,
    RenderComponent,
    isRenderElement,
    RenderElement,
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
    namespace JSX {
        interface IntrinsicElements {
            [unknownElement: string]: {
                'on:click': (event: MouseEvent) => void;
            } & any;
        }
        type Element = JSXChild;
    }
}

function verifyExhausted(value: never): void {}

export function createElement<Props extends {}>(
    Constructor: string,
    props?: ElementProps,
    ...children: JSXChild[]
): JSXChild;
export function createElement<Props extends {}>(
    Constructor: Component<Props>,
    props?: Props,
    ...children: JSXChild[]
): JSXChild;
export function createElement<Props extends {}>(
    Constructor: Component<Props>,
    props?: Props,
    ...children: JSXChild[]
): JSXChild;
export function createElement<Props extends {}>(
    Constructor: string | Component<Props>,
    props?: ElementProps | Props,
    ...children: JSXChild[]
): JSXChild {
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

function insertAt(parentElement: Element, index: number, child: Node) {
    parentElement.insertBefore(
        child,
        parentElement.childNodes[index + 1] || null
    );
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

interface MountToParams {
    nodeToReplace: VNode;
    root: JSXChild;
}
function renderReplacing({ nodeToReplace, root }: MountToParams): ChildVNode {
    if (
        root === null ||
        root === undefined ||
        root === false ||
        root === true
    ) {
        const emptyVNode = makeChildVNode({
            parentNode: nodeToReplace.parentNode!,
            domParent: nodeToReplace.domParent,
            jsxChild: root,
            domNode: null,
            onUnmount: [],
        });
        replaceVNode(nodeToReplace, emptyVNode);
        return emptyVNode;
    }
    if (typeof root === 'string') {
        const stringVNode = makeChildVNode({
            parentNode: nodeToReplace.parentNode!,
            domParent: nodeToReplace.domParent,
            jsxChild: root,
            domNode: document.createTextNode(root),
            onUnmount: [],
        });
        replaceVNode(nodeToReplace, stringVNode);
        return stringVNode;
    }
    if (typeof root === 'number') {
        const numberVNode = makeChildVNode({
            parentNode: nodeToReplace.parentNode!,
            domParent: nodeToReplace.domParent,
            jsxChild: root,
            domNode: document.createTextNode(root.toString()),
            onUnmount: [],
        });
        replaceVNode(nodeToReplace, numberVNode);
        return numberVNode;
    }
    if (isRenderElement(root)) {
        const element = document.createElement(root.element);

        const boundEffects: Calculation<any>[] = [];
        let refCallback: any = undefined;

        // Bind props
        if (root.props) {
            Object.entries(root.props).forEach(([key, value]) => {
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
            parentNode: nodeToReplace.parentNode!,
            domParent: nodeToReplace.domParent,
            jsxChild: root,
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

        root.children.forEach((child, childIndex) => {
            const elementChildNode = makeEmptyVNode({
                domParent: elementNode,
                parentNode: elementNode,
            });
            elementNode.children.push(elementChildNode);
            renderReplacing({
                nodeToReplace: elementChildNode,
                root: child,
            });
        });

        if (refCallback) {
            refCallback(element);
        }

        return elementNode;
    }
    if (isCollection(root)) {
        const trackedCollection = root;
        const onUnmount: (() => void)[] = [];

        const collectionNode = makeChildVNode({
            parentNode: nodeToReplace.parentNode!,
            domParent: nodeToReplace.domParent,
            jsxChild: root,
            domNode: null,
            onUnmount,
        });
        replaceVNode(nodeToReplace, collectionNode);

        const unobserve = trackedCollection.observe((event) => {
            if (event.type === 'init') {
                const { items } = event;
                items.forEach((jsxChild) => {
                    const childNode = makeEmptyVNode({
                        domParent: collectionNode.domParent,
                        parentNode: collectionNode,
                    });
                    collectionNode.children.push(childNode);
                    renderReplacing({
                        nodeToReplace: childNode,
                        root: jsxChild,
                    });
                });
            } else if (event.type === 'sort') {
                // TODO: figure out how to do this
            } else if (event.type === 'splice') {
                const { count, index, items } = event;
                const replaceCount = Math.min(count, items.length);
                const removeCount = count - replaceCount;
                const insertCount = items.length - replaceCount;
                const childNodes = items.map((item) =>
                    makeEmptyVNode({
                        domParent: collectionNode.domParent,
                        parentNode: collectionNode,
                    })
                );
                const removed = spliceVNode(
                    collectionNode,
                    collectionNode.children[index],
                    count,
                    childNodes
                );
                items.forEach((jsxChild, index) => {
                    renderReplacing({
                        nodeToReplace: childNodes[index],
                        root: jsxChild,
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
    if (isCalculation(root)) {
        const trackedCalculation = root;
        const onUnmount: Function[] = [];
        const calculationNode = makeChildVNode({
            parentNode: nodeToReplace.parentNode!,
            domParent: nodeToReplace.domParent,
            jsxChild: root,
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
                    root: jsxChild,
                });
            }),
            `view:calc:` // TODO: figure out how to serialize where we are in the tree. Or maybe it doesn't matter
        );

        retain(resultEffect);
        onUnmount.push(() => release(resultEffect));

        resultEffect();
        return calculationNode;
    }
    if (isRenderComponent(root)) {
        const onUnmount: Function[] = [];
        const componentNode = makeChildVNode({
            parentNode: nodeToReplace.parentNode!,
            domParent: nodeToReplace.domParent,
            jsxChild: root,
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

        const Component = root.component;
        const resultEffect = name(
            effect(() => {
                const onComponentUnmount: Function[] = [];
                const onComponentMount: Function[] = [];
                const jsxChild = Component(
                    {
                        ...(root.props || {}),
                        children: root.children,
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
                    root: jsxChild,
                });

                onComponentMount.forEach((mountCallback) => mountCallback());
            }),
            `view:component:${root.component.name}:` // TODO: figure out how to serialize where we are in the tree. Or maybe it doesn't matter
        );

        retain(resultEffect);
        onUnmount.push(() => release(resultEffect));

        resultEffect();
        return componentNode;
    }
    if (Array.isArray(root)) {
        const items = root;
        const arrayNode = makeChildVNode({
            parentNode: nodeToReplace.parentNode!,
            domParent: nodeToReplace.domParent,
            jsxChild: root,
            domNode: null,
            onUnmount: [],
        });
        replaceVNode(nodeToReplace, arrayNode);

        items.forEach((jsxChild, childIndex) => {
            const emptyVNode = makeEmptyVNode({
                domParent: arrayNode.domParent,
                parentNode: arrayNode,
            });
            arrayNode.children.push(emptyVNode);
            renderReplacing({
                nodeToReplace: emptyVNode,
                root: jsxChild,
            });
        });
        return arrayNode;
    }
    if (typeof root === 'function') {
        const functionVNode = makeChildVNode({
            parentNode: nodeToReplace.parentNode!,
            domParent: nodeToReplace.domParent,
            jsxChild: root,
            domNode: null,
            onUnmount: [],
        });
        replaceVNode(nodeToReplace, functionVNode);
        log.warn(
            'Attempted to render JSX node that was a function, not rendering anything'
        );
        return functionVNode;
    }
    log.assertExhausted(root, 'unexpected render type');
}

export function mount(parentElement: Element, root: JSXChild) {
    const rootNode = makeRootVNode({ domNode: parentElement });
    const emptyChildNode = makeEmptyVNode({
        domParent: rootNode,
        parentNode: rootNode,
    });
    rootNode.children.push(emptyChildNode);

    renderReplacing({
        nodeToReplace: emptyChildNode,
        root,
    });
}

export const Fragment = ({ children }: { children: JSXChild[] }) => children;
