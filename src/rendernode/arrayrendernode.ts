import type { RenderNode } from './rendernode';
import { DynamicRenderNode, emptyRenderNode } from './rendernode';

/**
 * Renders an array of render nodes
 */
export function ArrayRenderNode(
    children: RenderNode[],
    debugName?: string
): RenderNode {
    if (children.length === 0) {
        return emptyRenderNode;
    }
    if (children.length === 1) {
        return children[0];
    }
    return new DynamicRenderNode({}, children, debugName);
}
