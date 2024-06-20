import type { Collection, View } from '../collection';
import { RenderNode } from './rendernode';
import type { ArrayEvent} from '../arrayevent';
import { ArrayEventType } from '../arrayevent';
import { renderJSXNode } from '../renderjsx';
import { retain, untrackReads, release } from '../engine';

export function CollectionRenderNode(
    collection: Collection<any> | View<any>,
    debugName?: string
): RenderNode {
    let unsubscribe: undefined | (() => void);
    function handleEvent(events: ArrayEvent<any>[]) {
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
    const renderNode = new RenderNode(
        {
            onAlive: () => {
                retain(collection);
                unsubscribe = collection.subscribe(handleEvent);
                untrackReads(() => {
                    renderNode.spliceChildren(
                        0,
                        0,
                        collection.map((item) => renderJSXNode(item))
                    );
                });
            },
            onDestroy: () => {
                unsubscribe?.();
                release(collection);
            },
        },
        [],
        debugName ?? `CollectionRenderNode(${collection.__debugName})`
    );

    return renderNode;
}
