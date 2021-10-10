import { TrackedComputation, isTrackedComputation } from './types';

// General component props
type PropsWithChildren<P> = P & { children?: RenderChild[] };

type OnUnmountCallback = () => void;

type ComponentListeners = {
    onUnmount: (callback: OnUnmountCallback) => void;
};
export type Component<P extends {}> = (
    props: PropsWithChildren<P>,
    listeners: ComponentListeners
) => JsxChild;

type JsxRawNode = string | number | true | false | null | undefined | Function;

/**
 * The type returnable by JSX (raw nodes)
 */
export type JsxChild =
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
export type RenderChild =
    | RenderNull
    | RenderText
    | RenderFunction
    | RenderNativeElement
    | RenderComponent
    | RenderComputation
    | RenderArray;

const RenderTag = Symbol('RenderTag');

export type RenderNull = {
    [RenderTag]: 'null';
};

const RenderNull: RenderNull = { [RenderTag]: 'null' };

export function isRenderNull(a: any): a is RenderNull {
    return a === RenderNull;
}

export function makeRenderNull(): RenderNull {
    return RenderNull;
}

export type RenderText = {
    [RenderTag]: 'text';
    text: Text;
};

export function isRenderText(a: any): a is RenderText {
    return a && a[RenderTag] === 'text';
}

export function makeRenderText(str: string): RenderText {
    return { [RenderTag]: 'text', text: document.createTextNode(str) };
}

export type RenderFunction = {
    [RenderTag]: 'function';
    fn: Function;
};

export function isRenderFunction(a: any): a is RenderFunction {
    return a && a[RenderTag] === 'function';
}

export function makeRenderFunction(fn: Function): RenderFunction {
    return { [RenderTag]: 'function', fn };
}

export type RenderComputation = {
    [RenderTag]: 'computation';
    computation: TrackedComputation<JsxChild>;
    boundEffects: TrackedComputation<any>[];
};

export function isRenderComputation(a: any): a is RenderComputation {
    return a && a[RenderTag] === 'computation';
}

export function makeRenderComputation(
    computation: TrackedComputation<JsxChild>
): RenderComputation {
    return { [RenderTag]: 'computation', computation, boundEffects: [] };
}

export type NativeRenderProps = {
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

export type RenderNativeElement = {
    [RenderTag]: 'element';
    element: Element;
    props: {};
    children: RenderChild[];
    boundEffects: TrackedComputation<any>[];
};

export function isRenderNativeElement(p: any): p is RenderNativeElement {
    return p && p[RenderTag] === 'element';
}

export function makeRenderNativeElement(
    element: Element,
    props: {} = {},
    children: RenderChild[]
): RenderNativeElement {
    return {
        [RenderTag]: 'element',
        element,
        props,
        children,
        boundEffects: [],
    };
}

export type RenderComponent = {
    [RenderTag]: 'component';
    component: Component<any>;
    props: {};
    children: RenderChild[];
    onUnmountListeners: OnUnmountCallback[];
    boundEffects: TrackedComputation<any>[];
};

export function isRenderComponent(p: any): p is RenderComponent {
    return p && p[RenderTag] === 'component';
}

export function makeRenderComponent(
    component: Component<any>,
    props: {} = {},
    children: RenderChild[]
): RenderComponent {
    return {
        [RenderTag]: 'component',
        component,
        props,
        children,
        onUnmountListeners: [],
        boundEffects: [],
    };
}

export type RenderArray = {
    [RenderTag]: 'array';
    children: RenderChild[];
};

export function isRenderArray(p: any): p is RenderArray {
    return p && p[RenderTag] === 'array';
}

export function makeRenderArray(children: RenderChild[]): RenderArray {
    return { [RenderTag]: 'array', children };
}
