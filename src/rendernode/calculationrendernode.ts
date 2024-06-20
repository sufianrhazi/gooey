import type { Calculation } from '../calc';
import { CalculationSubscribeWithPostAction } from '../calc';
import * as log from '../log';
import { wrapError } from '../util';
import { emptyRenderNode, RenderNode } from './rendernode';

/**
 * Renders the result of a calculation
 */
export function CalculationRenderNode(
    renderJSXNode: (jsxNode: JSX.Node) => RenderNode,
    calculation: Calculation<any>,
    debugName?: string
): RenderNode {
    let calculationError: Error | undefined;
    let calculationSubscription: (() => void) | undefined;
    let childRenderNode: RenderNode = emptyRenderNode;

    function subscribe(
        error: undefined | Error,
        val: undefined | any,
        addPostAction: (postAction: () => void) => void
    ): void {
        renderNode.disown(childRenderNode);
        renderNode.spliceChildren(0, 1, []);
        if (error) {
            calculationError = error;
            if (renderNode.isAttached()) {
                renderNode.emitError(error);
            } else {
                log.warn(
                    'Unhandled error on detached CalculationRenderNode',
                    val
                );
            }
        } else {
            addPostAction(() => {
                childRenderNode = renderJSXNode(val);
                renderNode.own(childRenderNode);
                renderNode.spliceChildren(0, 0, [childRenderNode]);
            });
        }
    }

    const renderNode = new RenderNode(
        {
            onAttach: (nodeEmitter, errorEmitter) => {
                if (calculationError) {
                    errorEmitter(calculationError);
                }
            },
            clone: () => {
                return CalculationRenderNode(
                    renderJSXNode,
                    calculation,
                    debugName
                );
            },
            onAlive: () => {
                try {
                    calculationSubscription =
                        calculation[CalculationSubscribeWithPostAction](
                            subscribe
                        );
                    subscribe(undefined, calculation.get(), (action) => {
                        action();
                    });
                } catch (e) {
                    subscribe(wrapError(e), undefined, (action) => {
                        action();
                    });
                }
            },
            onDestroy: () => {
                calculationError = undefined;
                calculationSubscription?.();
                calculationSubscription = undefined;
                renderNode.disown(childRenderNode);
                childRenderNode = emptyRenderNode;
            },
        },
        [childRenderNode],
        debugName ?? `rendercalc:${calculation.__debugName}`
    );
    return renderNode;
}
