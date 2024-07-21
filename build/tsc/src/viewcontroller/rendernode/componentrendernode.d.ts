import type { RenderNode } from './rendernode';
export interface ComponentLifecycle {
    onMount: (callback: () => void) => (() => void) | void;
    onUnmount: (callback: () => void) => void;
    onDestroy: (callback: () => void) => void;
    onError: (handler: (e: Error) => JSX.Element | null) => void;
}
export type Component<TProps = {}> = FunctionComponent<TProps> | ClassComponentConstructor<TProps>;
declare const UnusedSymbolForChildrenOmission: unique symbol;
export type EmptyProps = {
    [UnusedSymbolForChildrenOmission]?: boolean;
};
export type FunctionComponent<TProps = {}> = (props: TProps & EmptyProps, lifecycle: ComponentLifecycle) => JSX.Element | null;
export interface ClassComponentConstructor<TProps> {
    new (props: TProps): ClassComponent<TProps>;
}
export interface ClassComponentInterface {
    render?(): JSX.Element | null;
    onMount?(): (() => void) | void;
    onUnmount?(): void;
    onDestroy?(): void;
    onError?(e: Error): JSX.Element | null;
}
export declare class ClassComponent<TProps = EmptyProps> implements ClassComponentInterface {
    props: TProps;
    constructor(props: TProps);
    render?(): JSX.Element | null;
    onMount?(): (() => void) | void;
    onUnmount?(): void;
    onDestroy?(): void;
    onError?(e: Error): JSX.Element | null;
}
export declare function ComponentRenderNode<TProps>(Component: FunctionComponent<TProps>, props: TProps | null | undefined, children: JSX.Node[], debugName?: string): RenderNode;
export {};
//# sourceMappingURL=componentrendernode.d.ts.map