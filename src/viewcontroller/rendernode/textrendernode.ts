import { ArrayEventType } from '../../common/arrayevent';
import type { RenderNode } from './rendernode';
import { emptyRenderNode, StaticRenderNode } from './rendernode';

/**
 * Renders a Text DOM node
 */
export function TextRenderNode(str: string, debugName?: string): RenderNode {
    const textNode = document.createTextNode(str);
    return new StaticRenderNode(
        {
            onAttach: (parentContext) => {
                parentContext.nodeEmitter({
                    type: ArrayEventType.SPLICE,
                    index: 0,
                    count: 0,
                    items: [textNode],
                });
            },
            clone: () => {
                return TextRenderNode(str, debugName);
            },
        },
        emptyRenderNode,
        DEBUG
            ? debugName ?? `text(${JSON.stringify(str)})`
            : debugName ?? 'text'
    );
}
