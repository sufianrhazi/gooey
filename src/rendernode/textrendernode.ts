import { ArrayEventType } from '../arrayevent';
import { RenderNode } from './rendernode';

/**
 * Renders a Text DOM node
 */
export function TextRenderNode(str: string, debugName?: string): RenderNode {
    const textNode = document.createTextNode(str);
    return new RenderNode(
        {
            onAttach: (nodeEmitter) => {
                nodeEmitter({
                    type: ArrayEventType.SPLICE,
                    index: 0,
                    count: 0,
                    items: [textNode],
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
                return TextRenderNode(str, debugName);
            },
        },
        [],
        debugName ?? 'text'
    );
}
