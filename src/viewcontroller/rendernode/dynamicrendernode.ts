import type { Dynamic, DynamicSubscriptionHandler } from '../../common/dyn';
import * as log from '../../common/log';
import { wrapError } from '../../common/util';
import { RenderNodeCommitPhase } from './constants';
import type { RenderNode } from './rendernode';
import { emptyRenderNode, StaticRenderNode } from './rendernode';

/**
 * Renders the result of a dynamic value
 */
export function DynamicRenderNode(
    renderJSXNode: (jsxNode: JSX.Node) => RenderNode,
    dynamic: Dynamic<any>,
    debugName?: string
): RenderNode {
    let dynamicError: Error | undefined;
    let dynamicSubscription: (() => void) | undefined;
    let renderValue: JSX.Node | undefined;

    const subscribe: DynamicSubscriptionHandler<JSX.Node> = (error, val) => {
        renderNode.setChild(emptyRenderNode);
        if (error) {
            dynamicError = error;
            if (renderNode.isAttached()) {
                renderNode.emitError(error);
            } else {
                log.warn('Unhandled error on detached DynamicRenderNode', val);
            }
        } else {
            renderValue = val;
            renderNode.requestCommit(RenderNodeCommitPhase.COMMIT_RENDER);
        }
    };

    const renderNode = new StaticRenderNode(
        {
            onAttach: (parentContext) => {
                if (dynamicError) {
                    parentContext.errorEmitter(dynamicError);
                }
            },
            onCommit: (phase) => {
                if (phase === RenderNodeCommitPhase.COMMIT_RENDER) {
                    renderNode.setChild(renderJSXNode(renderValue));
                }
            },
            clone: () => {
                return DynamicRenderNode(renderJSXNode, dynamic, debugName);
            },
            onAlive: () => {
                try {
                    dynamicSubscription = dynamic.subscribe(subscribe);
                    renderNode.setChild(renderJSXNode(dynamic.get()));
                } catch (e) {
                    subscribe(wrapError(e), undefined);
                }
            },
            onDestroy: () => {
                dynamicError = undefined;
                dynamicSubscription?.();
                dynamicSubscription = undefined;
            },
        },
        emptyRenderNode,
        debugName ? `DynamicRenderNode(${debugName})` : `DynamicRenderNode`
    );
    return renderNode;
}
