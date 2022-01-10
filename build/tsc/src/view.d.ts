import { Context } from './types';
import { Component, JSXNode } from './jsx';
export declare function createElement(Constructor: string, props?: any, ...children: JSXNode[]): JSXNode;
export declare function createElement<TContext>(Constructor: Context<TContext>, props: {
    value: TContext;
}, ...children: JSXNode[]): JSXNode;
export declare function createElement<Props extends {}>(Constructor: Component<Props>, props?: Props, ...children: JSXNode[]): JSXNode;
export declare function createElement<Props extends {}>(Constructor: Component<Props>, props?: Props, ...children: JSXNode[]): JSXNode;
/**
 * Mount the provided JSX to an element
 */
export declare function mount(parentElement: Element, jsxNode: JSXNode): () => void;
export declare const Fragment: ({ children }: {
    children: JSXNode[];
}) => JSXNode[];
//# sourceMappingURL=view.d.ts.map