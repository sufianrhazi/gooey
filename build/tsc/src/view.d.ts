import { Context, IntrinsicNodeObserverNodeCallback, IntrinsicNodeObserverElementCallback } from './types';
import { Component, JSXNode, RenderNode } from './jsx';
export declare const Fragment: ({ children }: {
    children: JSXNode[];
}) => JSXNode[];
export declare const LifecycleObserver: (_props: {
    nodeCallback?: IntrinsicNodeObserverNodeCallback | undefined;
    elementCallback?: IntrinsicNodeObserverElementCallback | undefined;
    children?: JSXNode | JSXNode[];
}) => JSX.Element | null;
export declare function createElement<TProps>(Constructor: string | Context<any> | Component<TProps>, props: TProps, ...children: JSXNode[]): RenderNode;
export declare namespace createElement {
    var Fragment: ({ children }: {
        children: JSXNode[];
    }) => JSXNode[];
}
/**
 * Mount the provided JSX to an element
 */
export declare function mount(parentElement: Element, jsxNode: JSX.Element): () => void;
//# sourceMappingURL=view.d.ts.map