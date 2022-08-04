import {
    RenderNode,
    renderJSXNode,
    renderJSXChildren,
    ArrayRenderNode,
    ComponentRenderNode,
    IntrinsicRenderNode,
    Component,
} from './rendernode';

export { AttachmentObserver } from './rendernode';

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
    return new ComponentRenderNode(type, props, children);
}
createElement.Fragment = Fragment;
