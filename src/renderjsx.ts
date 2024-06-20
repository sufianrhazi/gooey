import { Calculation } from './calc';
import type { Collection, View } from './collection';
import { isCollection, isView } from './collection';
import { Field } from './field';
import type { JSXNode } from './jsx';
import * as log from './log';
import { ArrayRenderNode } from './rendernode/arrayrendernode';
import { CalculationRenderNode } from './rendernode/calculationrendernode';
import { CollectionRenderNode } from './rendernode/collectionrendernode';
import { FieldRenderNode } from './rendernode/fieldrendernode';
import { ForeignRenderNode } from './rendernode/foreignrendernode';
import { emptyRenderNode, RenderNode } from './rendernode/rendernode';
import { TextRenderNode } from './rendernode/textrendernode';

function isCollectionOrViewRenderNode(
    val: any
): val is Collection<JSXNode> | View<JSXNode> {
    return isCollection(val) || isView(val);
}

export function renderJSXNode(jsxNode: JSX.Node): RenderNode {
    if (jsxNode instanceof RenderNode) {
        return jsxNode;
    }
    if (jsxNode instanceof Calculation) {
        return CalculationRenderNode(renderJSXNode, jsxNode);
    }
    if (isCollectionOrViewRenderNode(jsxNode)) {
        return CollectionRenderNode(renderJSXNode, jsxNode);
    }
    if (jsxNode instanceof Node) {
        return ForeignRenderNode(jsxNode);
    }
    if (Array.isArray(jsxNode)) {
        return ArrayRenderNode(jsxNode.map((item) => renderJSXNode(item)));
    }
    if (jsxNode instanceof Field) {
        return FieldRenderNode(renderJSXNode, jsxNode);
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
    log.warn('Unexpected JSX node type, rendering nothing', jsxNode);
    return emptyRenderNode;
}

export function renderJSXChildren(
    children?: JSX.Node | JSX.Node[]
): RenderNode[] {
    const childRenderNodes: RenderNode[] = [];
    if (children) {
        if (
            Array.isArray(children) &&
            !isCollection(children) &&
            !isView(children)
        ) {
            for (const child of children) {
                childRenderNodes.push(renderJSXNode(child));
            }
        } else {
            childRenderNodes.push(renderJSXNode(children));
        }
    }
    return childRenderNodes;
}
