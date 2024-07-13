import * as log from '../common/log';
import { isCustomJSXNode } from './jsx';
import { ArrayRenderNode } from './rendernode/arrayrendernode';
import { DynamicRenderNode } from './rendernode/dynamicrendernode';
import { ForeignRenderNode } from './rendernode/foreignrendernode';
import type { RenderNode } from './rendernode/rendernode';
import { emptyRenderNode, isRenderNode } from './rendernode/rendernode';
import { TextRenderNode } from './rendernode/textrendernode';

export function renderJSXNode(jsxNode: JSX.Node): RenderNode {
    if (isRenderNode(jsxNode)) {
        return jsxNode;
    }
    if (isCustomJSXNode(jsxNode)) {
        return jsxNode.__renderNode(renderJSXNode);
    }
    if (jsxNode instanceof Node) {
        return ForeignRenderNode(jsxNode);
    }
    if (Array.isArray(jsxNode)) {
        return ArrayRenderNode(jsxNode.map((item) => renderJSXNode(item)));
    }
    if (
        jsxNode === null ||
        jsxNode === undefined ||
        typeof jsxNode === 'boolean'
    ) {
        return emptyRenderNode;
    }
    if (typeof jsxNode === 'function') {
        log.warn('Rendering a function as JSX renders to nothing');
        return emptyRenderNode;
    }
    if (typeof jsxNode === 'symbol') {
        log.warn('Rendering a symbol as JSX renders to nothing');
        return emptyRenderNode;
    }
    if (typeof jsxNode === 'string') {
        return TextRenderNode(jsxNode);
    }
    if (typeof jsxNode === 'number' || typeof jsxNode === 'bigint') {
        return TextRenderNode(jsxNode.toString());
    }
    if (
        typeof jsxNode === 'object' &&
        typeof jsxNode.get === 'function' &&
        typeof jsxNode.subscribe === 'function'
    ) {
        return DynamicRenderNode(renderJSXNode, jsxNode);
    }
    log.warn('Unexpected JSX node type, rendering nothing', jsxNode);
    return emptyRenderNode;
}

export function renderJSXChildren(
    children?: JSX.Node | JSX.Node[]
): RenderNode[] {
    const childRenderNodes: RenderNode[] = [];
    if (children) {
        if (Array.isArray(children) && !isCustomJSXNode(children)) {
            for (const child of children) {
                childRenderNodes.push(renderJSXNode(child));
            }
        } else {
            childRenderNodes.push(renderJSXNode(children));
        }
    }
    return childRenderNodes;
}
