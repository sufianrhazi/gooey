import { Component, RenderChild, ElementProps } from './renderchild';
declare global {
    namespace JSX {
        interface IntrinsicElements {
            [unknownElement: string]: {
                'on:click': (event: MouseEvent) => void;
            } & any;
        }
        type Element = RenderChild;
    }
}
export declare function createElement<Props extends {}>(Constructor: string, props?: ElementProps, ...children: RenderChild[]): RenderChild;
export declare function createElement<Props extends {}>(Constructor: Component<Props>, props?: Props, ...children: RenderChild[]): RenderChild;
export declare function createElement<Props extends {}>(Constructor: Component<Props>, props?: Props, ...children: RenderChild[]): RenderChild;
export declare function mount(parentElement: Element, root: RenderChild): void;
export declare const Fragment: ({ children }: {
    children: RenderChild[];
}) => RenderChild[];
//# sourceMappingURL=view.d.ts.map