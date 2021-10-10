import {
    name,
    computation,
    effect,
    model,
    collection,
    retain,
    release,
} from './index';
import { TrackedComputation, isTrackedComputation } from './types';
import * as log from './log';
import {
    Component,
    JsxChild,
    RenderChild,
    isRenderNull,
    makeRenderText,
    isRenderNativeElement,
    isRenderComponent,
    isRenderArray,
    makeRenderNull,
    makeRenderArray,
    makeRenderComputation,
    makeRenderFunction,
    makeRenderNativeElement,
    makeRenderComponent,
    isRenderText,
    isRenderFunction,
    isRenderComputation,
} from './renderchild';
import { TreeSlot, TreeSlotIndex, setTreeSlot, makeTreeSlot } from './treeslot';

declare global {
    namespace JSX {
        interface IntrinsicElements {
            [unknownElement: string]: {
                'on:click': (event: MouseEvent) => void;
            } & any;
        }
    }
}

function verifyExhausted(value: never): void {}

function jsxChildToRenderChild(jsxChild: JsxChild): RenderChild {
    if (
        jsxChild === true ||
        jsxChild === false ||
        jsxChild === null ||
        jsxChild === undefined ||
        isRenderNull(jsxChild)
    )
        return makeRenderNull();
    if (typeof jsxChild === 'string') return makeRenderText(jsxChild);
    if (typeof jsxChild === 'number')
        return makeRenderText(jsxChild.toString());
    if (Array.isArray(jsxChild))
        return makeRenderArray(
            jsxChild.map((item) => jsxChildToRenderChild(item))
        );
    if (isTrackedComputation(jsxChild)) return makeRenderComputation(jsxChild);
    if (typeof jsxChild === 'function') return makeRenderFunction(jsxChild);
    if (isRenderNativeElement(jsxChild)) return jsxChild;
    if (isRenderComponent(jsxChild)) return jsxChild;
    if (isRenderArray(jsxChild)) return jsxChild;
    if (isRenderText(jsxChild)) return jsxChild;
    if (isRenderFunction(jsxChild)) return jsxChild;
    if (isRenderComputation(jsxChild)) return jsxChild;
    log.assertExhausted(jsxChild, 'unexpected jsx child type');
}

function createElement<Props extends {}>(
    Constructor: string | Component<Props>,
    props?: Props,
    ...children: JsxChild[]
): RenderChild {
    const renderChildren = children.map((child) =>
        jsxChildToRenderChild(child)
    );
    if (typeof Constructor === 'string') {
        return makeRenderNativeElement(
            document.createElement(Constructor),
            props,
            renderChildren
        );
    }
    return makeRenderComponent(Constructor, props, renderChildren);
}

function insertAt(parentElement: Element, index: number, child: Node) {
    parentElement.insertBefore(
        child,
        parentElement.childNodes[index + 1] || null
    );
}

const boundEvents = new WeakMap<Element, Record<string, (ev: Event) => void>>();

function bindAttribute(
    element: Element,
    key: string,
    value: unknown
): null | TrackedComputation<void> {
    if (value === null || value === undefined || value === false) {
        element.removeAttribute(key);
        return null;
    }
    if (value === true) {
        element.setAttribute(key, '');
        return null;
    }
    if (typeof value === 'string') {
        element.setAttribute(key, value);
        return null;
    }
    if (typeof value === 'number') {
        element.setAttribute(key, value.toString());
        return null;
    }
    if (isTrackedComputation(value)) {
        // TODO: Technically we support nested computations for attributes? But that's weird...
        const bindEffect = name(
            effect(() => {
                const computedValue = value();
                bindAttribute(element, key, computedValue);
            }),
            `view:bindAttribute:${key}`
        );
        bindEffect();
        return bindEffect;
    }
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
        return null;
    }
    return null;
}

function mountTo(
    parentElement: Element,
    treeSlot: TreeSlot,
    mountIndex: TreeSlotIndex,
    root: RenderChild
) {
    if (isRenderFunction(root)) {
        setTreeSlot(
            treeSlot,
            mountIndex,
            makeTreeSlot({
                renderChild: root,
            })
        );
        // TODO: warning: you tried to mount a function to an element? What does react do?
        return;
    }
    if (isRenderNull(root)) {
        setTreeSlot(
            treeSlot,
            mountIndex,
            makeTreeSlot({
                renderChild: root,
            })
        );
        return;
    }
    if (isRenderText(root)) {
        setTreeSlot(
            treeSlot,
            mountIndex,
            makeTreeSlot({
                renderChild: root,
                domNode: root.text,
            })
        );
        return;
    }
    if (isRenderNativeElement(root)) {
        // Bind props
        if (root.props) {
            Object.entries(root.props).forEach(([name, value]) => {
                const boundEffect = bindAttribute(root.element, name, value);
                if (boundEffect) {
                    retain(boundEffect);
                    root.boundEffects.push(boundEffect);
                }
            });
        }

        const newTreeSlot = makeTreeSlot({
            renderChild: root,
            domNode: root.element,
        });

        root.children.forEach((child, childIndex) => {
            mountTo(root.element, newTreeSlot, [childIndex], child);
        });

        setTreeSlot(treeSlot, mountIndex, newTreeSlot);
        return;
    }
    if (isRenderComputation(root)) {
        const resultEffect = name(
            effect(() => {
                const jsxResult = root.computation();

                const renderChild = jsxChildToRenderChild(jsxResult);

                setTreeSlot(
                    treeSlot,
                    mountIndex,
                    makeTreeSlot({ renderChild })
                );

                mountTo(
                    parentElement,
                    treeSlot,
                    mountIndex.concat([0]),
                    renderChild
                );
            }),
            `view:computation:${JSON.stringify(mountIndex)}`
        );

        // Hold on to the new effect
        retain(resultEffect);
        // Place the effect on the RenderChild so we can release on unmount
        root.boundEffects.push(resultEffect);

        resultEffect();
        return;
    }
    if (isRenderComponent(root)) {
        const resultEffect = name(
            effect(() => {
                const jsxResult = root.component(
                    {
                        ...(root.props || {}), // TODO: how to pass dynamic effects to a component?
                        children: root.children,
                    },
                    {
                        onUnmount: (unmountCallback) => {
                            root.onUnmountListeners.push(unmountCallback);
                        },
                    }
                );

                const renderChild = jsxChildToRenderChild(jsxResult);

                setTreeSlot(
                    treeSlot,
                    mountIndex,
                    makeTreeSlot({ renderChild })
                );
                mountTo(
                    parentElement,
                    treeSlot,
                    mountIndex.concat([0]),
                    renderChild
                );
            }),
            `view:component:${JSON.stringify(mountIndex)}`
        );

        // Hold on to the new effect
        retain(resultEffect);
        // Place the effect on the RenderChild so we can release on unmount
        root.boundEffects.push(resultEffect);

        resultEffect();
        return;
    }
    if (isRenderArray(root)) {
        setTreeSlot(treeSlot, mountIndex, makeTreeSlot({ renderChild: root }));

        root.children.forEach((renderChild, childIndex) => {
            mountTo(
                parentElement,
                treeSlot,
                mountIndex.concat([childIndex]),
                renderChild
            );
        });
        return;
    }
    log.assertExhausted(root, 'unexpected render type');
}

export function mount(parentElement: Element, root: RenderChild) {
    mountTo(parentElement, makeTreeSlot({ domNode: parentElement }), [0], root);
}

export const React = {
    createElement,
    Fragment: ({ children }: { children: JsxChild[] }) => children,
};
