import type { Component, FunctionComponent } from './rendernode/componentrendernode';
import { ClassComponent } from './rendernode/componentrendernode';
import type { RenderNode } from './rendernode/rendernode';
export declare const Fragment: Component<{
    children?: JSX.Node | JSX.Node[];
}>;
export interface ClassComponentConstructor<TProps> {
    new (props: TProps): ClassComponent<TProps>;
}
export declare function isClassComponent(val: any): val is ClassComponentConstructor<unknown>;
export declare function classComponentToFunctionComponent<TProps>(Component: ClassComponentConstructor<TProps>): FunctionComponent<TProps>;
export declare function createElement<TProps extends {} | undefined>(type: string | Component<TProps>, props: TProps, ...children: JSX.Node[]): RenderNode;
export declare namespace createElement {
    var Fragment: FunctionComponent<{
        children?: JSX.Node | JSX.Node[];
    }>;
    var replaceComponent: typeof import("../model/engine").replaceComponent;
}
//# sourceMappingURL=createelement.d.ts.map