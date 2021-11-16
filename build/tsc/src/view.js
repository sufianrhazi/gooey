import { effect, retain, release } from './calc';
import { debugNameFor } from './debug';
import { isCalculation, isCollection, isRef, ObserveKey, } from './types';
import * as log from './log';
import { isRenderComponent, isRenderElement, } from './jsx';
import { replaceVNode, spliceVNode, makeChildVNode, makeRootVNode, makeEmptyVNode, } from './vnode';
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
const boundEvents = new WeakMap();
function setBooleanPropertyValue(element, key, value) {
    if (element instanceof HTMLInputElement &&
        (key === 'checked' || key === 'indeterminate') &&
        element[key] !== value) {
        element[key] = value;
    }
    if (element instanceof HTMLOptionElement &&
        key == 'selected' &&
        element[key] !== value) {
        element[key] = value;
    }
    if (element instanceof HTMLDetailsElement &&
        key == 'open' &&
        element[key] !== value) {
        element[key] = value;
    }
}
function setStringPropertyValue(element, key, value) {
    if (element instanceof HTMLInputElement &&
        key === 'value' &&
        element[key] !== value) {
        element[key] = value;
    }
    if (element instanceof HTMLTextAreaElement &&
        key === 'value' &&
        element[key] !== value) {
        element[key] = value;
    }
    if (element instanceof HTMLOptionElement &&
        key === 'value' &&
        element[key] !== value) {
        element[key] = value;
    }
}
function setAttributeValue(element, key, value) {
    if (value === null || value === undefined || value === false) {
        element.removeAttribute(key);
        setBooleanPropertyValue(element, key, false);
        setStringPropertyValue(element, key, '');
    }
    else if (value === true) {
        element.setAttribute(key, '');
        setBooleanPropertyValue(element, key, true);
    }
    else if (typeof value === 'string') {
        element.setAttribute(key, value);
        setStringPropertyValue(element, key, value);
    }
    else if (typeof value === 'number') {
        element.setAttribute(key, value.toString());
        setStringPropertyValue(element, key, value.toString());
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
function renderAppending({ domParent, parentNode, jsxNode, }) {
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
function renderReplacing({ nodeToReplace, jsxNode, }) {
    var _a;
    if (jsxNode === null ||
        jsxNode === undefined ||
        jsxNode === false ||
        jsxNode === true) {
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
        const boundEffects = [];
        let refCallback = undefined;
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
                }
                else {
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
        const onUnmount = [];
        const collectionNode = makeChildVNode({
            parentNode: nodeToReplace.parentNode,
            domParent: nodeToReplace.domParent,
            jsxNode: jsxNode,
            domNode: null,
            onUnmount,
        });
        replaceVNode(nodeToReplace, collectionNode);
        const unobserve = trackedCollection[ObserveKey]((event) => {
            if (event.type === 'init') {
                const { items } = event;
                items.forEach((jsxChild) => {
                    renderAppending({
                        domParent: collectionNode.domParent,
                        parentNode: collectionNode,
                        jsxNode: jsxChild,
                    });
                });
            }
            else if (event.type === 'splice') {
                const { count, index, items } = event;
                const childNodes = items.map(() => makeEmptyVNode({
                    domParent: collectionNode.domParent,
                    parentNode: collectionNode,
                }));
                spliceVNode(collectionNode, collectionNode.children[index], count, childNodes);
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
        const onUnmount = [];
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
        const resultEffect = effect(() => {
            const jsxChild = trackedCalculation();
            calculationResultNode = renderReplacing({
                nodeToReplace: calculationResultNode,
                jsxNode: jsxChild,
            });
        }, `viewcalc:${(_a = debugNameFor(jsxNode)) !== null && _a !== void 0 ? _a : 'node'}`);
        retain(resultEffect);
        onUnmount.push(() => release(resultEffect));
        resultEffect();
        return calculationNode;
    }
    if (isRenderComponent(jsxNode)) {
        const onUnmount = [];
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
        const resultEffect = effect(() => {
            const onComponentMount = [];
            const jsxChild = Component({
                ...(jsxNode.props || {}),
                children: jsxNode.children,
            }, {
                onUnmount: (unmountCallback) => {
                    onUnmount.push(unmountCallback);
                },
                onMount: (mountCallback) => {
                    onComponentMount.push(mountCallback);
                },
                onEffect: (effectCallback, debugName) => {
                    const effectCalc = effect(effectCallback, `componenteffect:${jsxNode.component.name}:${debugName !== null && debugName !== void 0 ? debugName : onComponentMount.length}`);
                    onComponentMount.push(() => {
                        retain(effectCalc);
                        effectCalc();
                    });
                    onUnmount.push(() => {
                        release(effectCalc);
                    });
                },
            });
            componentResultNode = renderReplacing({
                nodeToReplace: componentResultNode,
                jsxNode: jsxChild,
            });
            onComponentMount.forEach((mountCallback) => mountCallback());
        }, `component:${jsxNode.component.name}`);
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
        log.warn('Attempted to render JSX node that was a function, not rendering anything');
        return functionVNode;
    }
    log.assertExhausted(jsxNode, 'unexpected render type');
}
/**
 * Mount the provided JSX to an element
 */
export function mount(parentElement, jsxNode) {
    const rootNode = makeRootVNode({ domNode: parentElement });
    renderAppending({
        domParent: rootNode,
        parentNode: rootNode,
        jsxNode: jsxNode,
    });
}
export const Fragment = ({ children }) => children;
//# sourceMappingURL=view.js.map