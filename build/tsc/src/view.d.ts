import { ComponentRenderNode, IntrinsicRenderNode, Component, FunctionComponent } from './rendernode';
export { IntrinsicObserver } from './rendernode';
export { mount, defineCustomElement } from './rendernode';
export declare const Fragment: Component<{
    children?: JSX.Node | JSX.Node[];
}>;
export declare function createElement<TProps extends {} | undefined>(type: string | Component<TProps>, props: TProps, ...children: JSX.Node[]): IntrinsicRenderNode | ComponentRenderNode<TProps>;
export declare namespace createElement {
    var Fragment: FunctionComponent<{
        children?: import("./jsx").JSXNode | import("./jsx").JSXNode[];
    }>;
}
//# sourceMappingURL=view.d.ts.map