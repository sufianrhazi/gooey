import { renderJSXChildren } from '../viewcontroller/renderjsx';
import { ArrayRenderNode } from '../viewcontroller/rendernode/arrayrendernode';
import type { Component } from '../viewcontroller/rendernode/componentrendernode';
import type {
    IntrinsicObserverElementCallback,
    IntrinsicObserverNodeCallback,
} from '../viewcontroller/rendernode/intrinsicobserverrendernode';
import { IntrinsicObserverRenderNode } from '../viewcontroller/rendernode/intrinsicobserverrendernode';

export const IntrinsicObserver: Component<{
    nodeCallback?: IntrinsicObserverNodeCallback;
    elementCallback?: IntrinsicObserverElementCallback;
    children?: JSX.Node | JSX.Node[];
}> = ({ nodeCallback, elementCallback, children }) => {
    return IntrinsicObserverRenderNode(
        nodeCallback,
        elementCallback,
        ArrayRenderNode(renderJSXChildren(children))
    );
};
