import { ArrayEventType } from '../arrayevent';
import type { RenderNode } from './rendernode';
import { emptyRenderNode, StaticRenderNode } from './rendernode';

/**
 * Renders a foreign managed DOM node
 */
export function ForeignRenderNode(node: Node, debugName?: string): RenderNode {
    return new StaticRenderNode(
        {
            onAttach: (nodeEmitter) => {
                nodeEmitter({
                    type: ArrayEventType.SPLICE,
                    index: 0,
                    count: 0,
                    items: [node],
                });
            },
            onDetach: (nodeEmitter) => {
                nodeEmitter({
                    type: ArrayEventType.SPLICE,
                    index: 0,
                    count: 1,
                });
            },
            clone: () => {
                return ForeignRenderNode(node, debugName);
            },
        },
        emptyRenderNode,
        debugName ?? 'foreign'
    );
}
