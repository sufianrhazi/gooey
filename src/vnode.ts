import { JSXNode } from './jsx';
import * as log from './log';

const VNodeSymbol = Symbol('VNode');

/**
 * A VNode represents a node in the virtual tree structure
 *
 * Since a JSXNode may render to 0, 1, or many DOM nodes, which may be at any
 * index within the DOM tree.
 */
export type ChildVNode = {
    domNode: Node | null;
    children: VNode[];
    parentNode: VNode;
    domParent: VNode;
    jsxNode: JSXNode | null;
    onUnmount: Function[];
    [VNodeSymbol]: true;
};
export type RootVNode = {
    domNode: Node | null;
    children: VNode[];
    parentNode: null;
    domParent: VNode;
    jsxNode: JSXNode | null;
    onUnmount: Function[];
    [VNodeSymbol]: true;
};
export type VNode = ChildVNode | RootVNode;

export function makeRootVNode({ domNode }: { domNode: Node }): RootVNode {
    const rootVNode: RootVNode = {
        domNode,
        children: [],
        parentNode: null,
        domParent: null,
        jsxNode: null,
        onUnmount: [],
        [VNodeSymbol]: true,
    } as unknown as RootVNode; // We lie here since domParent needs to be self-referential
    rootVNode.domParent = rootVNode;
    return rootVNode;
}

export function makeChildVNode({
    jsxNode,
    domNode,
    domParent,
    onUnmount,
    parentNode,
}: {
    parentNode: VNode;
    domParent: VNode;
    jsxNode: JSXNode | null;
    domNode: Node | null;
    onUnmount: Function[];
}): ChildVNode {
    return {
        domNode,
        children: [],
        parentNode,
        domParent,
        jsxNode,
        onUnmount,
        [VNodeSymbol]: true,
    };
}

export function makeEmptyVNode({
    parentNode,
    domParent,
}: {
    parentNode: VNode;
    domParent: VNode;
}): ChildVNode {
    return {
        domNode: null,
        children: [],
        parentNode,
        domParent,
        jsxNode: null,
        onUnmount: [],
        [VNodeSymbol]: true,
    };
}

export function isVNode(x: any): x is VNode {
    return !!x[VNodeSymbol];
}

function getShallowNodes(vNode: VNode): Node[] {
    const nodes: Node[] = [];
    function visit(node: VNode) {
        if (node.domNode) {
            nodes.push(node.domNode);
        } else {
            node.children.forEach((child) => visit(child));
        }
    }
    visit(vNode);
    return nodes;
}

function getDomParentChildIndex(
    domParent: VNode,
    immediateParent: VNode,
    childIndex: number
): number {
    let realIndex = 0;

    function visit(node: VNode): boolean {
        if (node.domNode) {
            realIndex += 1;
            return false;
        } else {
            return visitChildren(node);
        }
    }
    function visitChildren(node: VNode): boolean {
        const visitIndex =
            node === immediateParent ? childIndex : node.children.length;
        for (let i = 0; i < visitIndex; ++i) {
            if (visit(node.children[i])) {
                return true;
            }
        }
        return node === immediateParent;
    }
    visitChildren(domParent);
    return realIndex;
}

function callOnUnmount(node: VNode) {
    // Note: we are doing a post-order traversal, so all children are released/unmounted before parents are released/unmounted
    node.children.forEach((child) => callOnUnmount(child));

    // Call any onUnmount listeners
    if (node.onUnmount) {
        node.onUnmount.forEach((onUnmount) => {
            try {
                onUnmount();
            } catch (e) {
                log.exception(
                    e,
                    'VNode node raised exception in onUnmount',
                    node
                );
            }
        });
    }
}

export function replaceVNode(
    replaceNode: ChildVNode,
    newNode: VNode
): VNode | undefined {
    return spliceVNode(replaceNode.parentNode, replaceNode, 1, [newNode])[0];
}

export function spliceVNode(
    immediateParent: VNode,
    replaceNode: VNode | null,
    removeCount: number,
    newNodes: VNode[]
) {
    let domParent: VNode;
    let childIndex: number;
    if (replaceNode) {
        childIndex = immediateParent.children.indexOf(replaceNode);
        if (childIndex === -1) {
            childIndex = immediateParent.children.length;
        }
        domParent = replaceNode.domParent;
    } else {
        childIndex = immediateParent.children.length;
        domParent = immediateParent.domNode
            ? immediateParent
            : immediateParent.domParent;
    }
    log.assert(
        domParent,
        'tried to replace a root tree slot with missing domParent'
    );

    const detachedVNodes = immediateParent.children.splice(
        childIndex,
        removeCount,
        ...newNodes
    );

    detachedVNodes.forEach((detachedVNode) => {
        callOnUnmount(detachedVNode);

        const nodesToRemove = getShallowNodes(detachedVNode);
        nodesToRemove.forEach((node) => {
            if (node.parentNode) {
                node.parentNode.removeChild(node);
            }
        });
    });

    if (!domParent.domNode) {
        throw new Error('Invariant: domParent missing domNode');
    }
    const domParentNode = domParent.domNode;

    newNodes.forEach((newNode) => {
        newNode.parentNode = immediateParent;
        newNode.domParent = domParent;
        if (newNode.domNode) {
            const domIndex = getDomParentChildIndex(
                domParent,
                immediateParent,
                childIndex
            );
            const referenceNode: Node | undefined =
                domParentNode.childNodes[domIndex];
            domParentNode.insertBefore(newNode.domNode, referenceNode || null);
        }
    });
    return detachedVNodes;
}
