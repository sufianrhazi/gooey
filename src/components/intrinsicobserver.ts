import type { Component } from '../rendernode/componentrendernode';
import type {
    IntrinsicObserverNodeCallback,
    IntrinsicObserverElementCallback} from '../rendernode/intrinsicobserverrendernode';
import {
    IntrinsicObserverRenderNode
} from '../rendernode/intrinsicobserverrendernode';
import { ArrayRenderNode } from '../rendernode/arrayrendernode';
import { renderJSXChildren } from '../renderjsx';

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
