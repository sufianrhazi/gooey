import { Component, JSXNode, ElementProps } from './jsx';
declare global {
    namespace JSX {
        interface IntrinsicElements {
            [unknownElement: string]: {
                'on:click': (event: MouseEvent) => void;
            } & any;
        }
        type Element = JSXNode;
    }
}
export declare function createElement(Constructor: string, props?: ElementProps, ...children: JSXNode[]): JSXNode;
export declare function createElement<Props extends {}>(Constructor: Component<Props>, props?: Props, ...children: JSXNode[]): JSXNode;
export declare function createElement<Props extends {}>(Constructor: Component<Props>, props?: Props, ...children: JSXNode[]): JSXNode;
export declare function mount(parentElement: Element, jsxNode: JSXNode): void;
export declare const Fragment: ({ children }: {
    children: JSXNode[];
}) => JSXNode[];
//# sourceMappingURL=view.d.ts.map