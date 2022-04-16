import { Context } from './types';
import { Component, JSXNode, RenderElement } from './jsx';
export declare const Fragment: ({ children }: {
    children: JSXNode[];
}) => JSXNode[];
export declare function createElement(Constructor: string, props?: any, ...children: JSXNode[]): RenderElement<any, any>;
export declare function createElement<TContext>(Constructor: Context<TContext>, props: {
    value: TContext;
}, ...children: JSXNode[]): RenderElement<TContext, any>;
export declare function createElement<TProps extends {}>(Constructor: Component<TProps>, props: TProps, ...children: JSXNode[]): RenderElement<any, TProps>;
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