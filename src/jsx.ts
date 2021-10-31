import { Ref, Calculation, Collection } from './types';

// General component props
type PropsWithChildren<P> = P & { children?: JSXNode[] };

type OnUnmountCallback = () => void;
type OnMountCallback = () => void;

type ComponentListeners = {
    onUnmount: (callback: OnUnmountCallback) => void;
    onMount: (callback: OnMountCallback) => void;
};
export type Component<P extends {}> = (
    props: PropsWithChildren<P>,
    listeners: ComponentListeners
) => JSXNode;

type JsxRawNode = string | number | boolean | null | undefined | Function;

/**
 * The type returnable by JSX (raw nodes)
 */
type JSXNodeSingle =
    | JsxRawNode
    | Calculation<JsxRawNode>
    | Calculation<JsxRawNode[]>
    | RenderElement
    | RenderComponent<any>;
export type JSXNode =
    | JSXNodeSingle
    | JSXNodeSingle[]
    | Collection<JSXNodeSingle>;

export type RenderElement = {
    type: 'element';
    element: string;
    props?: ElementProps;
    children: JSXNode[];
};
export function isRenderElement(jsxNode: JSXNode): jsxNode is RenderElement {
    return !!(
        jsxNode &&
        typeof jsxNode === 'object' &&
        'type' in jsxNode &&
        jsxNode.type === 'element'
    );
}

type EventHandler<T> = (event: T) => void;

export type ElementProps = {
    ref?: Ref<Element> | ((el?: Element) => void);

    // AnimationEvent
    'on:animationstart'?: EventHandler<AnimationEvent>;
    'on:animationiteration'?: EventHandler<AnimationEvent>;
    'on:animationend'?: EventHandler<AnimationEvent>;
    'on:animationcancel'?: EventHandler<AnimationEvent>;
    // ClipboardEvent
    'on:copy'?: EventHandler<ClipboardEvent>;
    'on:paste'?: EventHandler<ClipboardEvent>;
    // DOMContentLoaded
    'on:DOMContentLoaded'?: EventHandler<Event>;
    // DragEvent
    'on:dragend'?: EventHandler<DragEvent>;
    'on:dragenter'?: EventHandler<DragEvent>;
    'on:dragleave'?: EventHandler<DragEvent>;
    'on:dragover'?: EventHandler<DragEvent>;
    'on:dragstart'?: EventHandler<DragEvent>;
    'on:drag'?: EventHandler<DragEvent>;
    'on:drop'?: EventHandler<DragEvent>;
    // Full Screen
    'on:fullscreenchange'?: EventHandler<Event>;
    'on:fullscreenerror'?: EventHandler<Event>;
    // Pointer Capture
    'on:gotpointercapture'?: EventHandler<PointerEvent>;
    'on:lostpointercapture'?: EventHandler<PointerEvent>;
    // PointerEvent
    'on:pointercancel'?: EventHandler<PointerEvent>;
    'on:pointerdown'?: EventHandler<PointerEvent>;
    'on:pointerenter'?: EventHandler<PointerEvent>;
    'on:pointerleave'?: EventHandler<PointerEvent>;
    'on:pointerlockchange'?: EventHandler<PointerEvent>;
    'on:pointerlockerror'?: EventHandler<PointerEvent>;
    'on:pointermove'?: EventHandler<PointerEvent>;
    'on:pointerout'?: EventHandler<PointerEvent>;
    'on:pointerover'?: EventHandler<PointerEvent>;
    'on:pointerup'?: EventHandler<PointerEvent>;
    // KeyboardEvent
    'on:keydown'?: EventHandler<KeyboardEvent>;
    'on:keypress'?: EventHandler<KeyboardEvent>;
    'on:keyup'?: EventHandler<KeyboardEvent>;
    // readyState
    'on:readystatechange'?: EventHandler<Event>;
    // Scroll
    'on:scroll'?: EventHandler<Event>;
    // Selection
    'on:selectionchange'?: EventHandler<Event>;
    'on:selectstart'?: EventHandler<Event>;
    'on:select'?: EventHandler<Event | UIEvent>;
    // Touch
    'on:touchcancel'?: EventHandler<TouchEvent>;
    'on:touchend'?: EventHandler<TouchEvent>;
    'on:touchmove'?: EventHandler<TouchEvent>;
    'on:touchstart'?: EventHandler<TouchEvent>;
    // Transition
    'on:transitioncancel'?: EventHandler<TransitionEvent>;
    'on:transitionend'?: EventHandler<TransitionEvent>;
    'on:transitionrun'?: EventHandler<TransitionEvent>;
    'on:transitionstart'?: EventHandler<TransitionEvent>;
    // Visibility
    'on:visibilitychange'?: EventHandler<Event>;
    // Wheel
    'on:wheel'?: EventHandler<WheelEvent>;
    // Mouse
    'on:auxclick'?: EventHandler<MouseEvent>;
    'on:click'?: EventHandler<MouseEvent>;
    'on:dblclick'?: EventHandler<MouseEvent>;
    'on:contextmenu'?: EventHandler<MouseEvent>;
    'on:mousedown'?: EventHandler<MouseEvent>;
    'on:mouseenter'?: EventHandler<MouseEvent>;
    'on:mouseleave'?: EventHandler<MouseEvent>;
    'on:mouseout'?: EventHandler<MouseEvent>;
    'on:mouseover'?: EventHandler<MouseEvent>;
    'on:mouseup'?: EventHandler<MouseEvent>;
    // Focus
    'on:focus'?: EventHandler<FocusEvent>;
    'on:focusin'?: EventHandler<FocusEvent>;
    'on:focusout'?: EventHandler<FocusEvent>;
    'on:blur'?: EventHandler<FocusEvent>;
    // Composition
    'on:compositionend'?: EventHandler<CompositionEvent>;
    'on:compositionstart'?: EventHandler<CompositionEvent>;
    'on:compositionupdate'?: EventHandler<CompositionEvent>;
    // Error
    'on:error'?: EventHandler<Event | UIEvent>; // TODO: different elements have different events
    // TODO: generate this from spec
} & {
    [key: `on:${string}`]: EventHandler<Event>;
    [key: string]:
        | Function
        | string
        | number
        | boolean
        | null
        | undefined
        | Calculation<
              () => Function | string | number | boolean | null | undefined
          >;
};

export type RenderComponent<Props extends {}> = {
    type: 'component';
    component: Component<Props>;
    props?: Props;
    children: JSXNode[];
};
export function isRenderComponent(
    jsxNode: JSXNode
): jsxNode is RenderComponent<any> {
    return !!(
        jsxNode &&
        typeof jsxNode === 'object' &&
        'type' in jsxNode &&
        jsxNode.type === 'component'
    );
}
