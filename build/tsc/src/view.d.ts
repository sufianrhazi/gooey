import { Context, IntrinsicNodeObserverNodeCallback, IntrinsicNodeObserverElementCallback } from './types';
import { Component, JSXNode, RenderedElement } from './jsx';
export declare const Fragment: ({ children }: {
    children: JSXNode[];
}) => JSXNode[];
export declare const LifecycleObserver: (_props: {
    nodeCallback?: IntrinsicNodeObserverNodeCallback | undefined;
    elementCallback?: IntrinsicNodeObserverElementCallback | undefined;
    children?: JSXNode | JSXNode[];
}) => JSX.Element;
export declare function createElement<TProps, TChildren extends JSXNode>(Constructor: string, props: TProps, ...children: TChildren[]): RenderedElement<TProps, unknown, TChildren>;
export declare function createElement<TContext, TProps extends {
    value: TContext;
}, TChildren extends JSXNode>(Constructor: Context<TContext>, props: TProps, ...children: TChildren[]): RenderedElement<unknown, TContext, TChildren>;
export declare function createElement<TChildren extends JSXNode, TProps extends {
    children: TChildren;
}>(Constructor: Component<TProps>, props: Omit<TProps, 'children'>, children: TChildren): RenderedElement<Omit<TProps, 'children'>, any, TChildren>;
export declare function createElement<TChildren extends JSXNode, TProps extends {
    children: TChildren[];
}>(Constructor: Component<TProps>, props: Omit<TProps, 'children'>, ...children: TChildren[]): RenderedElement<Omit<TProps, 'children'>, any, TChildren>;
export declare function createElement<TChildren extends JSXNode, TProps extends {
    children?: TChildren | undefined;
}>(Constructor: Component<TProps>, props: Omit<TProps, 'children'>, children?: TChildren | undefined): RenderedElement<Omit<TProps, 'children'>, any, TChildren>;
export declare function createElement<TChildren extends JSXNode, TProps extends {
    children?: TChildren[] | undefined;
}>(Constructor: Component<TProps>, props: Omit<TProps, 'children'>, ...children: TChildren[]): RenderedElement<Omit<TProps, 'children'>, any, TChildren>;
export declare function createElement<TChildren extends JSXNode, TProps extends {}>(Constructor: Component<TProps>, props: TProps): RenderedElement<Omit<TProps, 'children'>, any, TChildren>;
export declare namespace createElement {
    var Fragment: ({ children }: {
        children: JSXNode[];
    }) => JSXNode[];
}
/**
 * Mount the provided JSX to an element
 */
export declare function mount(parentElement: Element, jsxNode: JSXNode): () => void;
//# sourceMappingURL=view.d.ts.map