import { name, computation, effect, model, collection } from './index';
import { TrackedComputation, isTrackedComputation } from './types';

function assertUnreachable(value: never): never {
    throw new Error('Invariant');
}
function verifyExhausted(value: never): void {}

// General component props
type PropsWithChildren<P> = P & { children?: JsxChild[] };
type Component<P extends {}> = (props: PropsWithChildren<P>) => JsxChild;

/**
 * The type returnable by JSX
 */
type JsxChildWithoutTrackedComputation =
    | string
    | number
    | true
    | false
    | null
    | undefined
    | RenderNativeElement
    | RenderComponent;

type JsxChild =
    | JsxChildWithoutTrackedComputation
    | TrackedComputation<JsxChildWithoutTrackedComputation>;

/**
 * The intermediate type returnable by React.createElement
 */
type RenderChild =
    | RenderNull
    | RenderText
    | RenderNativeElement
    | RenderComponent
    | RenderComputation;

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

type RenderComputation = {
    [RenderTag]: 'computation';
    computation: TrackedComputation<JsxChild>;
};

function isRenderComputation(a: any): a is RenderComputation {
    return a && a[RenderTag] === 'computation';
}

function makeRenderComputation(
    computation: TrackedComputation<JsxChildWithoutTrackedComputation>
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

function jsxChildToRenderChild(jsxChild: JsxChild): RenderChild {
    if (
        jsxChild === true ||
        jsxChild === false ||
        jsxChild === null ||
        jsxChild === undefined
    )
        return RenderNull;
    if (typeof jsxChild === 'string') return makeRenderText(jsxChild);
    if (typeof jsxChild === 'number')
        return makeRenderText(jsxChild.toString());
    if (isTrackedComputation(jsxChild)) return makeRenderComputation(jsxChild);
    if (isRenderNativeElement(jsxChild)) return jsxChild;
    if (isRenderComponent(jsxChild)) return jsxChild;
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

type RangeMap = number[];
function getRealIndex(childIndex: number, rangeMap: RangeMap): number {
    let realIndex = 0;
    for (let i = 0; i < childIndex; ++i) {
        realIndex += rangeMap[childIndex];
    }
    return realIndex;
}

function insertAt(parentElement: Element, index: number, child: Node) {
    parentElement.insertBefore(child, parentElement.childNodes[index + 1]);
}

function bindChild(
    renderTarget: Element,
    rangeMap: RangeMap,
    child: RenderChild,
    childIndex: number
) {}

function bindAttribute(element: Element, key: string, value: unknown) {
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
        effect(
            name(() => {
                const computedValue = value();
                bindAttribute(element, key, computedValue);
            }, `view:bindAttribute:${key}`)
        );
    }
}

function mountTo(
    parentElement: Element,
    rangeMap: RangeMap,
    mountIndex: number,
    root: RenderChild
) {
    if (isRenderNull(root)) {
        rangeMap[mountIndex] = 0;
        return;
    }
    if (isRenderText(root)) {
        insertAt(parentElement, getRealIndex(mountIndex, rangeMap), root.text);
        rangeMap[mountIndex] = 1;
        return;
    }
    if (isRenderNativeElement(root)) {
        // Bind props
        Object.entries(root.props).forEach(([name, value]) => {
            bindAttribute(root.element, name, value);
        });

        // Bind children
        const childRangeMap: RangeMap = root.children.map(() => 0);
        root.children.forEach((child, childIndex) => {
            mountTo(root.element, childRangeMap, childIndex, child);
        });

        insertAt(
            parentElement,
            getRealIndex(mountIndex, rangeMap),
            root.element
        );
        rangeMap[mountIndex] = 1;
        return;
    }
    if (isRenderComputation(root) || isRenderComponent(root)) {
        // Note: we don't know the number of children yet!
        rangeMap[mountIndex] = 0;

        let prevValue: undefined | JsxChild = undefined;
        effect(
            name(() => {
                const jsxResult = isRenderComputation(root)
                    ? root.computation()
                    : root.component(root.props);
                if (prevValue === jsxResult) return; // Do... we ever really need to do this?
                prevValue = jsxResult;

                const renderChild = jsxChildToRenderChild(jsxResult);
                const numChildren = rangeMap[mountIndex];
                const realIndex = getRealIndex(mountIndex, rangeMap);

                // Remove any prior component render results
                for (let i = 0; i < numChildren; ++i) {
                    parentElement.removeChild(
                        parentElement.childNodes[realIndex] || null
                    );
                }

                bindChild(parentElement, rangeMap, renderChild, mountIndex);
            }, `view:${isRenderComputation(root) ? 'computation' : 'component'}:${mountIndex}`)
        );
        return;
    }
    assertUnreachable(root);
}

export function mount(parentElement: Element, root: RenderChild) {
    mountTo(parentElement, [], 0, root);
}

export const React = {
    createElement,
    Fragment: () => {
        throw new Error('Unsupported');
    },
};
