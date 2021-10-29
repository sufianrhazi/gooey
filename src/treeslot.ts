import { RenderChild } from './renderchild';
import * as log from './log';
import { release } from './index';

const TreeSlotSymbol = Symbol('TreeSlot');

/**
 * A TreeSlot represents the pre-rendered tree structure for a given node.
 *
 * Since a JsxChild may render to 0, 1, or many DOM nodes, which may be at any
 * index within the DOM tree.
 */
export type TreeSlot = {
    domNode: Node | null;
    children: TreeSlot[];
    renderChild: RenderChild | null;
    onUnmount: Function[];
    [TreeSlotSymbol]: true;
};

export type TreeSlotIndex = number[];

export function makeTreeSlot({
    renderChild,
    domNode,
    onUnmount,
}: {
    renderChild: RenderChild | null;
    domNode: Node | null;
    onUnmount: Function[];
}): TreeSlot {
    return {
        domNode,
        children: [],
        renderChild,
        onUnmount,
        [TreeSlotSymbol]: true,
    };
}

export function isTreeSlot(x: any): x is TreeSlot {
    return !!x[TreeSlotSymbol];
}

export function getTreeSlotParent(
    root: TreeSlot,
    treeSlotIndex: TreeSlotIndex
): { immediateParent: TreeSlot; childIndex: number; domParent: TreeSlot } {
    if (!root.domNode) throw new Error('TreeSlot roots must have a DOM node');

    let node = root;
    let realTreeSlot = root;

    for (let i = 0; i < treeSlotIndex.length - 1; ++i) {
        node = node.children[treeSlotIndex[i]];
        if (node.domNode) {
            realTreeSlot = node;
        }
    }
    return {
        immediateParent: node,
        childIndex: treeSlotIndex[treeSlotIndex.length - 1],
        domParent: realTreeSlot,
    };
}

function getShallowNodes(treeSlot: TreeSlot): Node[] {
    const nodes: Node[] = [];
    function visit(node: TreeSlot) {
        if (node.domNode) {
            nodes.push(node.domNode);
        } else {
            node.children.forEach((child) => visit(child));
        }
    }
    visit(treeSlot);
    return nodes;
}

function getDomParentChildIndex(
    domParent: TreeSlot,
    immediateParent: TreeSlot,
    childIndex: number
): number {
    let realIndex = 0;

    function visit(node: TreeSlot): boolean {
        if (node.domNode) {
            realIndex += 1;
            return false;
        } else {
            return visitChildren(node);
        }
    }
    function visitChildren(node: TreeSlot): boolean {
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

function callOnUnmount(node: TreeSlot) {
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
                    'TreeSlot node raised exception in onUnmount',
                    node
                );
            }
        });
    }
}

function reprNode(
    node: Node | null | undefined
): null | undefined | { cloned: Node; ref: Node } | string {
    if (node instanceof Text) return node.data;
    if (node instanceof Node)
        return { cloned: node.cloneNode(true), ref: node };
    return node;
}

function serializeTreeSlot(node: TreeSlot): any {
    return {
        domNode: reprNode(node.domNode),
        children: node.children.map((child) => serializeTreeSlot(child)),
        renderChild: node.renderChild,
    };
}

export function setTreeSlot(
    root: TreeSlot,
    treeSlotIndex: TreeSlotIndex,
    newNode: TreeSlot
): TreeSlot | undefined {
    return spliceTreeSlot(root, treeSlotIndex, 1, [newNode])[0];
}

export function spliceTreeSlot(
    root: TreeSlot,
    treeSlotIndex: TreeSlotIndex,
    removeCount: number,
    newNodes: TreeSlot[]
) {
    const { immediateParent, childIndex, domParent } = getTreeSlotParent(
        root,
        treeSlotIndex
    );
    const detachedTreeSlots = immediateParent.children.splice(
        childIndex,
        removeCount,
        ...newNodes
    );

    detachedTreeSlots.forEach((detachedTreeSlot) => {
        callOnUnmount(detachedTreeSlot);

        const nodesToRemove = getShallowNodes(detachedTreeSlot);
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
    return detachedTreeSlots;
}
