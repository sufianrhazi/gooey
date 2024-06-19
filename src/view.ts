import {
    RenderNode,
    renderJSXChildren,
    ArrayRenderNode,
    ComponentRenderNode,
    ClassComponentConstructor,
    classComponentToFunctionComponentRenderNode,
    IntrinsicRenderNode,
    Component,
    FunctionComponent,
    isClassComponent,
} from './rendernode';

export { IntrinsicObserver } from './rendernode';

export { mount, defineCustomElement } from './rendernode';

export const Fragment: Component<{ children?: JSX.Node | JSX.Node[] }> = ({
    children,
}) => ArrayRenderNode(renderJSXChildren(children));

export function createElement<TProps extends {} | undefined>(
    type: string | Component<TProps>,
    props: TProps,
    ...children: JSX.Node[]
): RenderNode | ComponentRenderNode<TProps> {
    if (typeof type === 'string') {
        return IntrinsicRenderNode(
            type,
            props,
            ArrayRenderNode(renderJSXChildren(children))
        );
    }
    if (isClassComponent(type)) {
        return classComponentToFunctionComponentRenderNode<TProps>(
            type as ClassComponentConstructor<TProps>,
            props,
            children
        );
    }
    return new ComponentRenderNode<TProps>(
        type as FunctionComponent<TProps>,
        props,
        children
    );
}
createElement.Fragment = Fragment;
