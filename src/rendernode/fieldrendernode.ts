import type { Field } from '../field';
import { RenderNode, emptyRenderNode } from './rendernode';
import { renderJSXNode } from '../renderjsx';

export function FieldRenderNode(
    field: Field<any>,
    debugName?: string
): RenderNode {
    let subscription: (() => void) | undefined;
    let childRenderNode: RenderNode = emptyRenderNode;

    function subscribe(val: undefined | any): void {
        renderNode.disown(childRenderNode);
        childRenderNode = renderJSXNode(val);
        renderNode.own(childRenderNode);
        renderNode.spliceChildren(0, 1, [childRenderNode]);
    }

    const renderNode = new RenderNode(
        {
            clone: () => {
                return FieldRenderNode(field, debugName);
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
        [childRenderNode],
        debugName ?? `FieldRenderNode(${field.__debugName})`
    );
    return renderNode;
}
