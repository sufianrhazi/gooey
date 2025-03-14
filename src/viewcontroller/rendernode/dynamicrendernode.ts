import type { Dynamic, DynamicSubscriptionHandler } from '../../common/dyn';
import * as log from '../../common/log';
import { RenderNodeCommitPhase } from './constants';
import type { RenderNode } from './rendernode';
import { emptyRenderNode, SingleChildRenderNode } from './rendernode';

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
    let syncSubscription = false;

    const subscribe: DynamicSubscriptionHandler<JSX.Node> = (error, val) => {
        if (error) {
            renderNode.setChild(emptyRenderNode);
            dynamicError = error;
            if (renderNode.isAttached()) {
                renderNode.emitError(error);
            } else {
                log.warn('Unhandled error on detached DynamicRenderNode', val);
            }
        } else if (syncSubscription) {
            renderNode.setChild(renderJSXNode(val));
        } else {
            renderNode.setChild(emptyRenderNode);
            renderValue = val;
            renderNode.requestCommit(RenderNodeCommitPhase.COMMIT_EMIT);
        }
    };

    const renderNode = new SingleChildRenderNode(
        {
            onAttach: (parentContext) => {
                if (dynamicError) {
                    parentContext.errorEmitter(dynamicError);
                }
            },
            onCommit: (phase) => {
                if (phase === RenderNodeCommitPhase.COMMIT_EMIT) {
                    renderNode.setChild(renderJSXNode(renderValue));
                }
            },
            clone: () => {
                return DynamicRenderNode(renderJSXNode, dynamic, debugName);
            },
            onAlive: () => {
                syncSubscription = true;
                dynamicSubscription = dynamic.subscribe(subscribe);
                syncSubscription = false;
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
