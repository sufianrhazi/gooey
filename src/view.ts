import { name, computation, effect, model, collection } from './index';
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
type Component<P extends {}> = (props: PropsWithChildren<P>) => JsxChild;

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

interface TreeSlot {
    [n: number]: 0 | Node | TreeSlot;
    length: number;
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
        if (Array.isArray(item)) {
            node = item;
        } else {
            console.error('Bad TreeSlot index', { childIndex, treeSlot });
            throw new Error('Bad TreeSlot index');
        }
    }
    return [node, childIndex[childIndex.length - 1]];
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
            if (Array.isArray(item)) {
                recurse(item);
            } else if (item) {
                count += 1;
            }
        }
    }
    recurse(treeSlot);
    for (let i = 0; i < upTo; ++i) {
        const item = parentTreeSlot[i];
        if (Array.isArray(item)) {
            recurse(item);
        } else if (item) {
            count += 1;
        }
    }
    return count;
}

function getNumChildren(childIndex: number[], treeSlot: TreeSlot): number {
    const [node, index] = getTreeSlot(childIndex, treeSlot);
    let count = 0;
    function recurse(treeSlot: TreeSlot | 0 | Node) {
        if (Array.isArray(treeSlot)) {
            for (let i = 0; i < treeSlot.length; ++i) {
                recurse(treeSlot[i]);
            }
        } else if (treeSlot) {
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

function bindAttribute(element: Element, key: string, value: unknown) {
    console.log('bindAttribute', element, key, value);
    if (value === null || value === undefined || value === false) {
        element.removeAttribute(key);
    }
    if (value === true) {
        element.setAttribute(key, '');
    }
    if (typeof value === 'string') {
        element.setAttribute(key, value);
    }
    if (typeof value === 'number') {
        element.setAttribute(key, value.toString());
    }
    if (isTrackedComputation(value)) {
        // TODO: Technically we support nested computations for attributes? But that's weird...
        name(
            effect(() => {
                const computedValue = value();
                bindAttribute(element, key, computedValue);
            }),
            `view:bindAttribute:${key}`
        )();
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
    }
}

function mountTo(
    parentElement: Element,
    treeSlot: TreeSlot,
    mountIndex: number[],
    root: RenderChild
) {
    const [slot, slotOffset] = getTreeSlot(mountIndex, treeSlot);

    if (isRenderFunction(root)) {
        // TODO: warning: you tried to mount a function to an element? What does react do?
        slot[slotOffset] = 0;
        return;
    }
    if (isRenderNull(root)) {
        slot[slotOffset] = 0;
        return;
    }
    if (isRenderText(root)) {
        insertAt(parentElement, getRealIndex(mountIndex, treeSlot), root.text);
        slot[slotOffset] = root.text;
        return;
    }
    if (isRenderNativeElement(root)) {
        // Bind props
        if (root.props) {
            Object.entries(root.props).forEach(([name, value]) => {
                bindAttribute(root.element, name, value);
            });
        }

        // Bind children
        const childTreeSlot: TreeSlot = root.children.map(() => 0 as const);
        root.children.forEach((child, childIndex) => {
            mountTo(root.element, childTreeSlot, [childIndex], child);
        });

        insertAt(
            parentElement,
            getRealIndex(mountIndex, treeSlot),
            root.element
        );
        slot[slotOffset] = [root.element];
        return;
    }
    if (isRenderComputation(root) || isRenderComponent(root)) {
        // Note: we don't know the number of children yet!
        slot[slotOffset] = [0];

        let prevValue: undefined | JsxChild = undefined;
        name(
            effect(() => {
                const jsxResult = isRenderComputation(root)
                    ? root.computation()
                    : root.component({
                          ...(root.props || {}),
                          children: root.children,
                      });
                if (prevValue === jsxResult) return; // Do... we ever really need to do this?
                prevValue = jsxResult;

                const renderChild = jsxChildToRenderChild(jsxResult);
                const numChildren = getNumChildren(mountIndex, treeSlot);
                const realIndex = getRealIndex(mountIndex, treeSlot);

                // Remove any prior component render results
                for (let i = 0; i < numChildren; ++i) {
                    parentElement.removeChild(
                        parentElement.childNodes[realIndex] || null
                    );
                }

                mountTo(parentElement, treeSlot, mountIndex, renderChild);
            }),
            `view:${
                isRenderComputation(root) ? 'computation' : 'component'
            }:${JSON.stringify(mountIndex)}`
        )();
        return;
    }
    if (isRenderArray(root)) {
        // Note: we don't know the number of children yet!
        slot[slotOffset] = root.children.map(() => 0);
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
    mountTo(parentElement, [0], [0], root);
}

export const React = {
    createElement,
    Fragment: ({ children }: { children: JsxChild[] }) => children,
};
