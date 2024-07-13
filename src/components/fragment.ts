import { renderJSXChildren } from '../viewcontroller/renderjsx';
import { ArrayRenderNode } from '../viewcontroller/rendernode/arrayrendernode';
import type { Component } from '../viewcontroller/rendernode/componentrendernode';

export const Fragment: Component<{ children?: JSX.Node | JSX.Node[] }> = ({
    children,
}) => ArrayRenderNode(renderJSXChildren(children));
