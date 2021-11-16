import { Ref, Calculation, Collection } from './types';
declare type PropsWithChildren<P> = P & {
    children?: JSXNode[];
};
declare type OnUnmountCallback = () => void;
declare type OnMountCallback = () => void;
declare type EffectCallback = () => void;
declare type ComponentListeners = {
    onUnmount: (callback: OnUnmountCallback) => void;
    onMount: (callback: OnMountCallback) => void;
    onEffect: (callback: EffectCallback) => void;
};
export declare type Component<P extends {}> = (props: PropsWithChildren<P>, listeners: ComponentListeners) => JSXNode;
declare type JsxRawNode = string | number | boolean | null | undefined | Function;
/**
 * The type returnable by JSX (raw nodes)
 */
declare type JSXNodeSingle = JsxRawNode | Calculation<JsxRawNode> | Calculation<JsxRawNode[]> | RenderElement | RenderComponent<any>;
export declare type JSXNode = JSXNodeSingle | JSXNodeSingle[] | Collection<JSXNodeSingle>;
export declare type RenderElement = {
    type: 'element';
    element: string;
    props?: ElementProps;
    children: JSXNode[];
};
export declare function isRenderElement(jsxNode: JSXNode): jsxNode is RenderElement;
declare type EventHandler<T> = (event: T) => void;
export declare type ElementProps = {
    ref?: Ref<Element> | ((el?: Element) => void);
    'on:animationstart'?: EventHandler<AnimationEvent>;
    'on:animationiteration'?: EventHandler<AnimationEvent>;
    'on:animationend'?: EventHandler<AnimationEvent>;
    'on:animationcancel'?: EventHandler<AnimationEvent>;
    'on:copy'?: EventHandler<ClipboardEvent>;
    'on:paste'?: EventHandler<ClipboardEvent>;
    'on:DOMContentLoaded'?: EventHandler<Event>;
    'on:dragend'?: EventHandler<DragEvent>;
    'on:dragenter'?: EventHandler<DragEvent>;
    'on:dragleave'?: EventHandler<DragEvent>;
    'on:dragover'?: EventHandler<DragEvent>;
    'on:dragstart'?: EventHandler<DragEvent>;
    'on:drag'?: EventHandler<DragEvent>;
    'on:drop'?: EventHandler<DragEvent>;
    'on:fullscreenchange'?: EventHandler<Event>;
    'on:fullscreenerror'?: EventHandler<Event>;
    'on:gotpointercapture'?: EventHandler<PointerEvent>;
    'on:lostpointercapture'?: EventHandler<PointerEvent>;
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
    'on:keydown'?: EventHandler<KeyboardEvent>;
    'on:keypress'?: EventHandler<KeyboardEvent>;
    'on:keyup'?: EventHandler<KeyboardEvent>;
    'on:readystatechange'?: EventHandler<Event>;
    'on:scroll'?: EventHandler<Event>;
    'on:selectionchange'?: EventHandler<Event>;
    'on:selectstart'?: EventHandler<Event>;
    'on:select'?: EventHandler<Event | UIEvent>;
    'on:touchcancel'?: EventHandler<TouchEvent>;
    'on:touchend'?: EventHandler<TouchEvent>;
    'on:touchmove'?: EventHandler<TouchEvent>;
    'on:touchstart'?: EventHandler<TouchEvent>;
    'on:transitioncancel'?: EventHandler<TransitionEvent>;
    'on:transitionend'?: EventHandler<TransitionEvent>;
    'on:transitionrun'?: EventHandler<TransitionEvent>;
    'on:transitionstart'?: EventHandler<TransitionEvent>;
    'on:visibilitychange'?: EventHandler<Event>;
    'on:wheel'?: EventHandler<WheelEvent>;
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
    'on:focus'?: EventHandler<FocusEvent>;
    'on:focusin'?: EventHandler<FocusEvent>;
    'on:focusout'?: EventHandler<FocusEvent>;
    'on:blur'?: EventHandler<FocusEvent>;
    'on:compositionend'?: EventHandler<CompositionEvent>;
    'on:compositionstart'?: EventHandler<CompositionEvent>;
    'on:compositionupdate'?: EventHandler<CompositionEvent>;
    'on:error'?: EventHandler<Event | UIEvent>;
} & {
    [key: `on:${string}`]: EventHandler<Event>;
    [key: string]: Function | string | number | boolean | null | undefined | Calculation<() => Function | string | number | boolean | null | undefined>;
};
export declare type RenderComponent<Props extends {}> = {
    type: 'component';
    component: Component<Props>;
    props?: Props;
    children: JSXNode[];
};
export declare function isRenderComponent(jsxNode: JSXNode): jsxNode is RenderComponent<any>;
export {};
//# sourceMappingURL=jsx.d.ts.map