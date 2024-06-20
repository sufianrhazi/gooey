import { ArrayEventType } from '../arrayevent';
import { RenderNode } from './rendernode';

/**
 * Renders a foreign managed DOM node
 */
export function ForeignRenderNode(node: Node, debugName?: string): RenderNode {
    return new RenderNode(
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
        [],
        debugName ?? 'foreign'
    );
}
