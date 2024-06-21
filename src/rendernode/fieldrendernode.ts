import type { Field } from '../field';
import type { RenderNode } from './rendernode';
import { emptyRenderNode, StaticRenderNode } from './rendernode';

export function FieldRenderNode(
    renderJSXNode: (jsxNode: JSX.Node) => RenderNode,
    field: Field<any>,
    debugName?: string
): RenderNode {
    let subscription: (() => void) | undefined;
    let childRenderNode: RenderNode = emptyRenderNode;

    function subscribe(val: undefined | any): void {
        renderNode.disown(childRenderNode);
        childRenderNode = renderJSXNode(val);
        renderNode.own(childRenderNode);
        renderNode.setChild(childRenderNode);
    }

    const renderNode = new StaticRenderNode(
        {
            clone: () => {
                return FieldRenderNode(renderJSXNode, field, debugName);
            },
            onAlive: () => {
                subscription = field.subscribe(subscribe);
                subscribe(field.get());
            },
            onDestroy: () => {
                subscription?.();
                subscription = undefined;
                renderNode.disown(childRenderNode);
                childRenderNode = emptyRenderNode;
            },
        },
        childRenderNode,
        debugName ?? `FieldRenderNode(${field.__debugName})`
    );
    return renderNode;
}
