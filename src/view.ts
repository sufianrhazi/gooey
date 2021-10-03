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

declare global {
    namespace JSX {
        interface IntrinsicElements {
            [unknownElement: string]: {
                'on:click': (event: MouseEvent) => void;
            } & any;
        }
    }
}

function assertUnreachable(value: never): never {
    throw new Error('Invariant');
}
function verifyExhausted(value: never): void {}

// General component props
type PropsWithChildren<P> = P & { children?: RenderChild[] };
type ComponentListeners = {
    onUnmount: (callback: () => void) => void;
};
export type Component<P extends {}> = (
    props: PropsWithChildren<P>,
    listeners: ComponentListeners
) => JsxChild;

type JsxRawNode = string | number | true | false | null | undefined | Function;

/**
 * The type returnable by JSX (raw nodes)
 */
type JsxChild =
    | JsxRawNode
    | RenderChild
    | TrackedComputation<JsxRawNode | RenderChild>
    | TrackedComputation<(JsxRawNode | RenderChild)[]>
    | (
          | JsxRawNode
          | RenderChild
          | TrackedComputation<JsxRawNode | RenderChild>
      )[];

/**
 * The intermediate type returnable by React.createElement
 */
type RenderChild =
    | RenderNull
    | RenderText
    | RenderFunction
    | RenderNativeElement
    | RenderComponent
    | RenderComputation
    | RenderArray;

const RenderTag = Symbol('RenderTag');

type RenderNull = {
    [RenderTag]: 'null';
};

const RenderNull: RenderNull = { [RenderTag]: 'null' };

function isRenderNull(a: any): a is RenderNull {
    return a === RenderNull;
}

function makeRenderNull(): RenderNull {
    return RenderNull;
}

type RenderText = {
    [RenderTag]: 'text';
    text: Text;
};

function isRenderText(a: any): a is RenderText {
    return a && a[RenderTag] === 'text';
}

function makeRenderText(str: string): RenderText {
    return { [RenderTag]: 'text', text: document.createTextNode(str) };
}

type RenderFunction = {
    [RenderTag]: 'function';
    fn: Function;
};

function isRenderFunction(a: any): a is RenderFunction {
    return a && a[RenderTag] === 'function';
}

function makeRenderFunction(fn: Function): RenderFunction {
    return { [RenderTag]: 'function', fn };
}

type RenderComputation = {
    [RenderTag]: 'computation';
    computation: TrackedComputation<JsxChild>;
};

function isRenderComputation(a: any): a is RenderComputation {
    return a && a[RenderTag] === 'computation';
}

function makeRenderComputation(
    computation: TrackedComputation<JsxChild>
): RenderComputation {
    return { [RenderTag]: 'computation', computation };
}

type NativeRenderProps = {
    [key: string]:
        | string
        | number
        | true
        | false
        | null
        | undefined
        | TrackedComputation<
              () => string | number | true | false | null | undefined
          >;
};

type RenderNativeElement = {
    [RenderTag]: 'element';
    element: Element;
    props: {};
    children: RenderChild[];
};

function isRenderNativeElement(p: any): p is RenderNativeElement {
    return p && p[RenderTag] === 'element';
}

function makeRenderNativeElement(
    element: Element,
    props: {} = {},
    children: RenderChild[]
): RenderNativeElement {
    return { [RenderTag]: 'element', element, props, children };
}

type RenderComponent = {
    [RenderTag]: 'component';
    component: Component<any>;
    props: {};
    children: RenderChild[];
};

function isRenderComponent(p: any): p is RenderComponent {
    return p && p[RenderTag] === 'component';
}

function makeRenderComponent(
    component: Component<any>,
    props: {} = {},
    children: RenderChild[]
): RenderComponent {
    return { [RenderTag]: 'component', component, props, children };
}

type RenderArray = {
    [RenderTag]: 'array';
    children: RenderChild[];
};

function isRenderArray(p: any): p is RenderArray {
    return p && p[RenderTag] === 'array';
}

function makeRenderArray(children: RenderChild[]): RenderArray {
    return { [RenderTag]: 'array', children };
}

function jsxChildToRenderChild(jsxChild: JsxChild): RenderChild {
    if (
        jsxChild === true ||
        jsxChild === false ||
        jsxChild === null ||
        jsxChild === undefined ||
        isRenderNull(jsxChild)
    )
        return RenderNull;
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
    assertUnreachable(jsxChild);
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

type SlotData = {
    node: Node | null;
    unmountCallbacks: (() => void)[];
};
type TreeSlotNode = {
    treeSlot: TreeSlot;
    unmountCallbacks: (() => void)[];
};
type TreeSlot = Array<SlotData | TreeSlotNode>;

function isTreeSlotNode(item: SlotData | TreeSlotNode): item is TreeSlotNode {
    return 'treeSlot' in item;
}

// A TreeSlot represents the number of currently mounted Nodes in a node.
// - A null node is: 0
// - A single node is: 1
// - An array of mixed null/single nodes is: [0,1,0,1,0]
// - Arrays may be nested arbitrarily deeply: [0,[1,0],[0],[[1,0],[1]],1,0]

function getTreeSlot(
    childIndex: number[],
    treeSlot: TreeSlot
): [TreeSlot, number] {
    let node: TreeSlot = treeSlot;
    for (let i = 0; i < childIndex.length - 1; ++i) {
        let item = node[childIndex[i]];
        if (isTreeSlotNode(item)) {
            node = item.treeSlot;
        } else {
            console.error('Bad TreeSlot index', { childIndex, treeSlot });
            throw new Error('Bad TreeSlot index');
        }
    }
    return [node, childIndex[childIndex.length - 1]];
}

function setTreeSlot(
    childIndex: number[],
    treeSlot: TreeSlot,
    newSlot: SlotData | TreeSlotNode
) {
    console.log('setTreeSlot', { childIndex, treeSlot, newSlot });
    const [slot, slotOffset] = getTreeSlot(childIndex, treeSlot);
    const visit = (item: SlotData | TreeSlotNode) => {
        if (isTreeSlotNode(item)) {
            item.treeSlot.forEach((child) => {
                visit(child);
            });
        }
        item.unmountCallbacks.forEach((onUnmount) => onUnmount());
    };
    const replacement = slot[slotOffset];
    if (replacement) {
        visit(replacement);
    }
    slot[slotOffset] = newSlot;
}

function getRealIndex(childIndex: number[], treeSlot: TreeSlot): number {
    const [parentTreeSlot, upTo] = getTreeSlot(childIndex, treeSlot);
    let count = 0;
    let lastNode: TreeSlot = treeSlot;
    function recurse(treeSlot: TreeSlot) {
        if (treeSlot === parentTreeSlot) {
            return;
        }
        for (let i = 0; i < treeSlot.length; ++i) {
            const item = treeSlot[i];
            if (isTreeSlotNode(item)) {
                recurse(item.treeSlot);
            } else if (item.node) {
                count += 1;
            }
        }
    }
    recurse(treeSlot);
    for (let i = 0; i < upTo; ++i) {
        const item = parentTreeSlot[i];
        if (isTreeSlotNode(item)) {
            recurse(item.treeSlot);
        } else if (item.node) {
            count += 1;
        }
    }
    return count;
}

function getNumChildren(childIndex: number[], treeSlot: TreeSlot): number {
    const [node, index] = getTreeSlot(childIndex, treeSlot);
    let count = 0;
    function recurse(treeSlot: TreeSlotNode | SlotData) {
        if (isTreeSlotNode(treeSlot)) {
            for (let i = 0; i < treeSlot.treeSlot.length; ++i) {
                recurse(treeSlot.treeSlot[i]);
            }
        } else if (treeSlot.node) {
            count += 1;
        }
    }
    recurse(node[index]);
    return count;
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
    console.log('bindAttribute', element, key, value);
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
    mountIndex: number[],
    root: RenderChild
) {
    if (isRenderFunction(root)) {
        // TODO: warning: you tried to mount a function to an element? What does react do?
        setTreeSlot(mountIndex, treeSlot, {
            node: null,
            unmountCallbacks: [],
        });
        return;
    }
    if (isRenderNull(root)) {
        setTreeSlot(mountIndex, treeSlot, {
            node: null,
            unmountCallbacks: [],
        });
        return;
    }
    if (isRenderText(root)) {
        insertAt(parentElement, getRealIndex(mountIndex, treeSlot), root.text);
        setTreeSlot(mountIndex, treeSlot, {
            node: root.text,
            unmountCallbacks: [],
        });
        return;
    }
    if (isRenderNativeElement(root)) {
        const boundEffects: TrackedComputation<any>[] = [];
        // Bind props
        if (root.props) {
            Object.entries(root.props).forEach(([name, value]) => {
                const boundEffect = bindAttribute(root.element, name, value);
                if (boundEffect) {
                    retain(boundEffect);
                    boundEffects.push(boundEffect);
                }
            });
        }

        // Bind children
        const childTreeSlot: TreeSlot = root.children.map(() => ({
            node: null,
            unmountCallbacks: [],
        }));
        root.children.forEach((child, childIndex) => {
            mountTo(root.element, childTreeSlot, [childIndex], child);
        });

        insertAt(
            parentElement,
            getRealIndex(mountIndex, treeSlot),
            root.element
        );
        setTreeSlot(mountIndex, treeSlot, {
            node: root.element,
            unmountCallbacks: [
                () => {
                    boundEffects.forEach((boundEffect) => {
                        release(boundEffect);
                    });
                },
            ],
        });
        return;
    }
    if (isRenderComputation(root)) {
        // Note: we don't know the number of children yet!
        setTreeSlot(mountIndex, treeSlot, {
            node: null,
            unmountCallbacks: [],
        });

        const resultEffect = name(
            effect(() => {
                console.log(
                    'Running computation',
                    `view:computation:${JSON.stringify(mountIndex)}`
                );
                const jsxResult = root.computation();

                const renderChild = jsxChildToRenderChild(jsxResult);
                const numChildren = getNumChildren(mountIndex, treeSlot);
                const realIndex = getRealIndex(mountIndex, treeSlot);

                // Remove any prior component render results
                for (let i = 0; i < numChildren; ++i) {
                    parentElement.removeChild(
                        parentElement.childNodes[realIndex] || null
                    );
                }

                retain(resultEffect); // Uhh.... wut
                mountTo(parentElement, treeSlot, mountIndex, renderChild);
                const [slot, slotOffset] = getTreeSlot(mountIndex, treeSlot);
                slot[slotOffset].unmountCallbacks.push(() => {
                    release(resultEffect);
                });
            }),
            `view:computation:${JSON.stringify(mountIndex)}`
        );
        resultEffect();
        return;
    }
    if (isRenderComponent(root)) {
        // Note: we don't know the number of children yet!
        setTreeSlot(mountIndex, treeSlot, {
            node: null,
            unmountCallbacks: [],
        });

        const resultEffect = name(
            effect(() => {
                console.log(
                    'Running effect',
                    `view:component:${JSON.stringify(mountIndex)}`
                );
                const unmountCallbacks: (() => void)[] = [];
                let canCallOnUnmount = true;
                const jsxResult = root.component(
                    {
                        ...(root.props || {}), // TODO: how to pass dynamic effects to a component?
                        children: root.children,
                    },
                    {
                        onUnmount: (unmountCallback) => {
                            if (!canCallOnUnmount) {
                                throw new Error(
                                    'Invariant error: onUnmount only can be called synchronously in a component'
                                );
                            }
                            unmountCallbacks.push(unmountCallback);
                        },
                    }
                );
                canCallOnUnmount = false;

                const renderChild = jsxChildToRenderChild(jsxResult);
                const numChildren = getNumChildren(mountIndex, treeSlot);
                const realIndex = getRealIndex(mountIndex, treeSlot);

                // Remove any prior component render results
                for (let i = 0; i < numChildren; ++i) {
                    parentElement.removeChild(
                        parentElement.childNodes[realIndex] || null
                    );
                }

                retain(resultEffect); // Uhh... this is weird
                mountTo(parentElement, treeSlot, mountIndex, renderChild);

                const [slot, slotOffset] = getTreeSlot(mountIndex, treeSlot);
                slot[slotOffset].unmountCallbacks.push(() => {
                    release(resultEffect);
                }, ...unmountCallbacks);
            }),
            `view:component:${JSON.stringify(mountIndex)}`
        );
        resultEffect();
        return;
    }
    if (isRenderArray(root)) {
        // Note: we don't know the number of children yet!
        setTreeSlot(mountIndex, treeSlot, {
            treeSlot: root.children.map(() => ({
                node: null,
                unmountCallbacks: [],
            })),
            unmountCallbacks: [],
        });
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
    assertUnreachable(root);
}

export function mount(parentElement: Element, root: RenderChild) {
    mountTo(parentElement, [{ node: null, unmountCallbacks: [] }], [0], root);
}

export const React = {
    createElement,
    Fragment: ({ children }: { children: JsxChild[] }) => children,
};
