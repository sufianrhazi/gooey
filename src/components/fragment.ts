import type { Component } from '../rendernode/componentrendernode';
import { ArrayRenderNode } from '../rendernode/arrayrendernode';
import { renderJSXChildren } from '../renderjsx';

export const Fragment: Component<{ children?: JSX.Node | JSX.Node[] }> = ({
    children,
}) => ArrayRenderNode(renderJSXChildren(children));
