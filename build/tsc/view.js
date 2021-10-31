import { name, effect, retain, release, } from './index';
import { isCalculation, isCollection, isRef, } from './types';
import * as log from './log';
import { isRenderComponent, isRenderElement, } from './renderchild';
import { getTreeSlotParent, setTreeSlot, spliceTreeSlot, makeTreeSlot, } from './treeslot';
function verifyExhausted(value) { }
export function createElement(Constructor, props, ...children) {
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
function insertAt(parentElement, index, child) {
    parentElement.insertBefore(child, parentElement.childNodes[index + 1] || null);
}
const boundEvents = new WeakMap();
function setAttributeValue(element, key, value) {
    if (value === null || value === undefined || value === false) {
        element.removeAttribute(key);
    }
    else if (value === true) {
        element.setAttribute(key, '');
    }
    else if (typeof value === 'string') {
        element.setAttribute(key, value);
    }
    else if (typeof value === 'number') {
        element.setAttribute(key, value.toString());
    }
    else if (key.startsWith('on:') && typeof value === 'function') {
        const eventName = key.slice(3);
        let attributes = boundEvents.get(element);
        if (!attributes) {
            attributes = {};
            boundEvents.set(element, attributes);
        }
        if (attributes[key]) {
            element.removeEventListener(eventName, attributes[key]);
        }
        element.addEventListener(eventName, value);
        attributes[key] = value;
    }
}
function mountTo({ parentElement, treeSlot, mountIndex, root, replacedTreeSlot, }) {
    if (root === null ||
        root === undefined ||
        root === false ||
        root === true) {
        setTreeSlot(treeSlot, mountIndex, makeTreeSlot({
            renderChild: root,
            domNode: null,
            onUnmount: [],
        }));
        return;
    }
    if (typeof root === 'string') {
        setTreeSlot(treeSlot, mountIndex, makeTreeSlot({
            renderChild: root,
            domNode: document.createTextNode(root),
            onUnmount: [],
        }));
        return;
    }
    if (typeof root === 'number') {
        setTreeSlot(treeSlot, mountIndex, makeTreeSlot({
            renderChild: root,
            domNode: document.createTextNode(root.toString()),
            onUnmount: [],
        }));
        return;
    }
    if (isRenderElement(root)) {
        const element = document.createElement(root.element);
        const boundEffects = [];
        let refCallback = undefined;
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
                    const boundEffect = name(effect(() => {
                        const computedValue = value();
                        setAttributeValue(element, key, computedValue);
                    }), `view:bindAttribute:${key}:${JSON.stringify(mountIndex)}`);
                    retain(boundEffect);
                    boundEffects.push(boundEffect);
                    boundEffect();
                }
                else {
                    setAttributeValue(element, key, value);
                }
            });
        }
        const newTreeSlot = makeTreeSlot({
            renderChild: root,
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
        setTreeSlot(treeSlot, mountIndex, newTreeSlot);
        root.children.forEach((child, childIndex) => {
            mountTo({
                parentElement: element,
                treeSlot,
                mountIndex: mountIndex.concat([childIndex]),
                root: child,
            });
        });
        if (refCallback) {
            refCallback(element);
        }
        return;
    }
    if (isCollection(root)) {
        const trackedCollection = root;
        const onUnmount = [];
        setTreeSlot(treeSlot, mountIndex, makeTreeSlot({
            renderChild: root,
            domNode: null,
            onUnmount,
        }));
        const unobserve = trackedCollection.observe((event) => {
            if (event.type === 'init') {
                const { items } = event;
                items.forEach((renderChild, childIndex) => {
                    mountTo({
                        parentElement,
                        treeSlot,
                        mountIndex: mountIndex.concat([childIndex]),
                        root: renderChild,
                    });
                });
            }
            else if (event.type === 'sort') {
                // TODO: figure out how to do this
            }
            else if (event.type === 'splice') {
                const { count, index, items } = event;
                const replaceCount = Math.min(count, items.length);
                const removeCount = count - replaceCount;
                const insertCount = items.length - replaceCount;
                const removed = spliceTreeSlot(treeSlot, mountIndex.concat([index]), count, items.map((item) => makeTreeSlot({
                    renderChild: null,
                    domNode: null,
                    onUnmount: [],
                })));
                items.forEach((renderChild, childIndex) => {
                    mountTo({
                        parentElement,
                        treeSlot,
                        mountIndex: mountIndex.concat([index + childIndex]),
                        root: renderChild,
                    });
                });
            }
        });
        retain(trackedCollection);
        onUnmount.push(unobserve);
        onUnmount.push(() => {
            release(trackedCollection);
        });
        return;
    }
    if (isCalculation(root)) {
        const trackedCalculation = root;
        const onUnmount = [];
        const resultEffect = name(effect(() => {
            const renderChild = trackedCalculation();
            const { immediateParent, childIndex } = getTreeSlotParent(treeSlot, mountIndex);
            // Note: We retain ourselves each time it's executed and
            // release each time we are unmounted.
            // On update (unmount followed by render), we want to keep this effect alive
            // If unmounted (unmount not followed by render), we must be culled
            const replaced = setTreeSlot(treeSlot, mountIndex, makeTreeSlot({
                renderChild,
                domNode: null,
                onUnmount: [() => release(resultEffect)],
            }));
            // Hold on to the new effect and release on unmount
            retain(resultEffect);
            mountTo({
                parentElement,
                treeSlot,
                mountIndex: mountIndex.concat([0]),
                root: renderChild,
                replacedTreeSlot: replaced,
            });
        }), `view:calc:${JSON.stringify(mountIndex)}`);
        resultEffect();
        return;
    }
    if (isRenderComponent(root)) {
        const Component = root.component;
        const resultEffect = name(effect(() => {
            const onUnmount = [];
            const onMount = [];
            const renderChild = Component(Object.assign(Object.assign({}, (root.props || {})), { children: root.children }), {
                onUnmount: (unmountCallback) => {
                    onUnmount.push(unmountCallback);
                },
                onMount: (mountCallback) => {
                    onMount.push(mountCallback);
                },
            });
            // Note: We retain ourselves each time it's executed and
            // release each time we are unmounted.
            // On update (unmount followed by render), we want to keep this effect alive
            // If unmounted (unmount not followed by render), we must be culled
            setTreeSlot(treeSlot, mountIndex, makeTreeSlot({
                renderChild,
                domNode: null,
                onUnmount: [() => release(resultEffect), ...onUnmount],
            }));
            // Hold on to the new effect and release on unmount
            retain(resultEffect);
            mountTo({
                parentElement,
                treeSlot,
                mountIndex: mountIndex.concat([0]),
                root: renderChild,
            });
            onMount.forEach((mountCallback) => mountCallback());
        }), `view:component:${root.component.name}:${JSON.stringify(mountIndex)}`);
        resultEffect();
        return;
    }
    if (Array.isArray(root)) {
        const items = root;
        setTreeSlot(treeSlot, mountIndex, makeTreeSlot({
            renderChild: root,
            domNode: null,
            onUnmount: [],
        }));
        items.forEach((renderChild, childIndex) => {
            mountTo({
                parentElement,
                treeSlot,
                mountIndex: mountIndex.concat([childIndex]),
                root: renderChild,
            });
        });
        return;
    }
    if (typeof root === 'function') {
        setTreeSlot(treeSlot, mountIndex, makeTreeSlot({
            renderChild: root,
            domNode: null,
            onUnmount: [],
        }));
        // TODO: warning: you tried to mount a function to an element? What does react do?
        return;
    }
    log.assertExhausted(root, 'unexpected render type');
}
export function mount(parentElement, root) {
    mountTo({
        parentElement,
        treeSlot: makeTreeSlot({
            renderChild: null,
            domNode: parentElement,
            onUnmount: [],
        }),
        mountIndex: [0],
        root,
    });
}
export const Fragment = ({ children }) => children;
//# sourceMappingURL=view.js.map