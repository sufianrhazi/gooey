import {
    RenderNode,
    renderJSXNode,
    renderJSXChildren,
    ArrayRenderNode,
    FunctionComponentRenderNode,
    classComponentToFunctionComponentRenderNode,
    IntrinsicRenderNode,
    Component,
    FunctionComponent,
    isClassComponent,
} from './rendernode';

export { IntrinsicObserver } from './rendernode';

export { mount } from './rendernode';

export const Fragment: Component<{ children?: JSX.Node | JSX.Node[] }> = ({
    children,
}) => new ArrayRenderNode(renderJSXChildren(children));

export function createElement<TProps>(
    type: string | Component<TProps>,
    props: TProps,
    ...children: JSX.Node[]
) {
    if (typeof type === 'string') {
        const childNodes: RenderNode[] = [];
        for (const jsxNode of children) {
            childNodes.push(renderJSXNode(jsxNode));
        }
        return new IntrinsicRenderNode(type, props, childNodes);
    }
    if (isClassComponent(type)) {
        return classComponentToFunctionComponentRenderNode(
            type,
            props,
            children
        );
    }
    return new FunctionComponentRenderNode(
        type as FunctionComponent<TProps>,
        props,
        children
    );
}
createElement.Fragment = Fragment;
