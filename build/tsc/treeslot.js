import * as log from './log';
const TreeSlotSymbol = Symbol('TreeSlot');
export function makeTreeSlot({ renderChild, domNode, onUnmount, }) {
    return {
        domNode,
        children: [],
        renderChild,
        onUnmount,
        [TreeSlotSymbol]: true,
    };
}
export function isTreeSlot(x) {
    return !!x[TreeSlotSymbol];
}
export function getTreeSlotParent(root, treeSlotIndex) {
    if (!root.domNode)
        throw new Error('TreeSlot roots must have a DOM node');
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
function getShallowNodes(treeSlot) {
    const nodes = [];
    function visit(node) {
        if (node.domNode) {
            nodes.push(node.domNode);
        }
        else {
            node.children.forEach((child) => visit(child));
        }
    }
    visit(treeSlot);
    return nodes;
}
function getDomParentChildIndex(domParent, immediateParent, childIndex) {
    let realIndex = 0;
    function visit(node) {
        if (node.domNode) {
            realIndex += 1;
            return false;
        }
        else {
            return visitChildren(node);
        }
    }
    function visitChildren(node) {
        const visitIndex = node === immediateParent ? childIndex : node.children.length;
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
function callOnUnmount(node) {
    // Note: we are doing a post-order traversal, so all children are released/unmounted before parents are released/unmounted
    node.children.forEach((child) => callOnUnmount(child));
    // Call any onUnmount listeners
    if (node.onUnmount) {
        node.onUnmount.forEach((onUnmount) => {
            try {
                onUnmount();
            }
            catch (e) {
                log.exception(e, 'TreeSlot node raised exception in onUnmount', node);
            }
        });
    }
}
function reprNode(node) {
    if (node instanceof Text)
        return node.data;
    if (node instanceof Node)
        return { cloned: node.cloneNode(true), ref: node };
    return node;
}
function serializeTreeSlot(node) {
    return {
        domNode: reprNode(node.domNode),
        children: node.children.map((child) => serializeTreeSlot(child)),
        renderChild: node.renderChild,
    };
}
export function setTreeSlot(root, treeSlotIndex, newNode) {
    return spliceTreeSlot(root, treeSlotIndex, 1, [newNode])[0];
}
export function spliceTreeSlot(root, treeSlotIndex, removeCount, newNodes) {
    const { immediateParent, childIndex, domParent } = getTreeSlotParent(root, treeSlotIndex);
    const detachedTreeSlots = immediateParent.children.splice(childIndex, removeCount, ...newNodes);
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
            const domIndex = getDomParentChildIndex(domParent, immediateParent, childIndex);
            const referenceNode = domParentNode.childNodes[domIndex];
            domParentNode.insertBefore(newNode.domNode, referenceNode || null);
        }
    });
    return detachedTreeSlots;
}
//# sourceMappingURL=treeslot.js.map