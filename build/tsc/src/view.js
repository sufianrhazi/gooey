import { effect, retain, release } from './calc';
import { debugNameFor } from './debug';
import { isCalculation, isCollection, isRef, ObserveKey, } from './types';
import * as log from './log';
import { isRenderComponent, isRenderElement, getElementTypeMapping, } from './jsx';
import { mountVNode, spliceVNode, makeChildVNode, makeRootVNode, callOnMount, } from './vnode';
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
function setAttributeValue(elementType, element, key, value) {
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
        element.addEventListener(eventName, value);
        attributes[key] = value;
    }
    else {
        const mapping = getElementTypeMapping(elementType, key);
        if (mapping) {
            if (mapping.makeAttrValue) {
                const attributeValue = mapping.makeAttrValue(value);
                if (attributeValue === undefined) {
                    element.removeAttribute(key);
                }
                else {
                    element.setAttribute(key, attributeValue);
                }
            }
            if (mapping.idlName && mapping.makeIdlValue) {
                element[mapping.idlName] = mapping.makeIdlValue(value);
            }
        }
        else if (value === false || value === undefined || value === null) {
            element.removeAttribute(key);
        }
        else if (value === true) {
            element.setAttribute(key, '');
        }
        else if (typeof value === 'string') {
            element.setAttribute(key, value);
        }
    }
}
function jsxNodeToVNode({ parentNode, domParent, jsxNode, }) {
    var _a;
    if (jsxNode === null ||
        jsxNode === undefined ||
        jsxNode === false ||
        jsxNode === true) {
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
                        setAttributeValue(jsxNode.element, element, key, computedValue);
                    }, `viewattr:${key}`);
                    retain(boundEffect);
                    boundEffects.push(boundEffect);
                    boundEffect();
                }
                else {
                    setAttributeValue(jsxNode.element, element, key, value);
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
        elementNode.children.push(...jsxNode.children.map((childJsxNode) => jsxNodeToVNode({
            domParent: elementNode,
            parentNode: elementNode,
            jsxNode: childJsxNode,
        })));
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
        const onUnmount = [];
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
                collectionNode.children.push(...items.map((jsxChild) => jsxNodeToVNode({
                    domParent: collectionNode.domParent,
                    parentNode: collectionNode,
                    jsxNode: jsxChild,
                })));
            }
            else if (event.type === 'splice') {
                const { count, index, items } = event;
                const childNodes = items.map((jsxChild) => jsxNodeToVNode({
                    domParent: collectionNode.domParent,
                    parentNode: collectionNode,
                    jsxNode: jsxChild,
                }));
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
        const onUnmount = [];
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
            }
            else {
                spliceVNode(calculationNode, 0, calculationNode.children.length, [childVNode]);
            }
        }, `viewcalc:${(_a = debugNameFor(jsxNode)) !== null && _a !== void 0 ? _a : 'node'}`);
        retain(resultEffect);
        onUnmount.push(() => release(resultEffect));
        resultEffect();
        // Mount self
        mountVNode(calculationNode);
        return calculationNode;
    }
    if (isRenderComponent(jsxNode)) {
        const onUnmount = [];
        const componentNode = makeChildVNode({
            parentNode: parentNode,
            domParent: domParent,
            jsxNode: jsxNode,
            domNode: null,
            onMount: [],
            onUnmount,
        });
        const Component = jsxNode.component;
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
        const childVNode = jsxNodeToVNode({
            parentNode: componentNode,
            domParent: componentNode.domParent,
            jsxNode: jsxChild,
        });
        componentNode.children.push(childVNode);
        onComponentMount.forEach((mountCallback) => componentNode.onMount.push(mountCallback));
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
        arrayNode.children.push(...items.map((jsxChild) => jsxNodeToVNode({
            parentNode: arrayNode,
            domParent: domParent,
            jsxNode: jsxChild,
        })));
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
        log.warn('Attempted to render JSX node that was a function, not rendering anything');
        // Mount self
        mountVNode(functionVNode);
        return functionVNode;
    }
    log.assertExhausted(jsxNode, 'unexpected render type');
}
/**
 * Mount the provided JSX to an element
 */
export function mount(parentElement, jsxNode) {
    const rootNode = makeRootVNode({ domNode: parentElement });
    rootNode.children.push(jsxNodeToVNode({
        parentNode: rootNode,
        domParent: rootNode,
        jsxNode: jsxNode,
    }));
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
export const Fragment = ({ children }) => children;
//# sourceMappingURL=view.js.map