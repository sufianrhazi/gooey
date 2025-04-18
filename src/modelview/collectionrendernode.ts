import type { ArrayEvent } from '../common/arrayevent';
import { ArrayEventType } from '../common/arrayevent';
import type { Collection, View } from '../model/collection';
import { untrackReads } from '../model/engine';
import type { RenderNode } from '../viewcontroller/rendernode/rendernode';
import { MultiChildRenderNode } from '../viewcontroller/rendernode/rendernode';

export function CollectionRenderNode(
    renderJSXNode: (jsxNode: JSX.Node) => RenderNode,
    collection: Collection<any> | View<any>,
    debugName?: string
): RenderNode {
    let unsubscribe: undefined | (() => void);
    function handleEvent(events: Iterable<ArrayEvent<any>>) {
        for (const event of events) {
            switch (event.type) {
                case ArrayEventType.SPLICE:
                    renderNode.spliceChildren(
                        event.index,
                        event.count,
                        event.items?.map((item) => renderJSXNode(item)) ?? []
                    );
                    break;
                case ArrayEventType.MOVE:
                    renderNode.moveChildren(event.from, event.count, event.to);
                    break;
                case ArrayEventType.SORT:
                    renderNode.sortChildren(event.from, event.indexes);
                    break;
            }
        }
    }
    const renderNode = new MultiChildRenderNode(
        {
            onAlive: () => {
                unsubscribe = collection.subscribe(handleEvent);
            },
            onDestroy: () => {
                unsubscribe?.();
                untrackReads(() => {
                    renderNode.spliceChildren(0, collection.length, []);
                });
            },
        },
        [],
        debugName ?? `CollectionRenderNode(${collection.__debugName})`
    );

    return renderNode;
}
