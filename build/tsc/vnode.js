import * as log from './log';
const VNodeSymbol = Symbol('VNode');
export function makeRootVNode({ domNode }) {
    const rootVNode = {
        domNode,
        children: [],
        parentNode: null,
        domParent: null,
        jsxNode: null,
        onUnmount: [],
        [VNodeSymbol]: true,
    }; // We lie here since domParent needs to be self-referential
    rootVNode.domParent = rootVNode;
    return rootVNode;
}
export function makeChildVNode({ jsxNode, domNode, domParent, onUnmount, parentNode, }) {
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
export function makeEmptyVNode({ parentNode, domParent, }) {
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
export function isVNode(x) {
    return !!x[VNodeSymbol];
}
function getShallowNodes(vNode) {
    const nodes = [];
    function visit(node) {
        if (node.domNode) {
            nodes.push(node.domNode);
        }
        else {
            node.children.forEach((child) => visit(child));
        }
    }
    visit(vNode);
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
                log.exception(e, 'VNode node raised exception in onUnmount', node);
            }
        });
    }
}
export function replaceVNode(replaceNode, newNode) {
    return spliceVNode(replaceNode.parentNode, replaceNode, 1, [newNode])[0];
}
export function spliceVNode(immediateParent, replaceNode, removeCount, newNodes) {
    let domParent;
    let childIndex;
    if (replaceNode) {
        childIndex = immediateParent.children.indexOf(replaceNode);
        if (childIndex === -1) {
            childIndex = immediateParent.children.length;
        }
        domParent = replaceNode.domParent;
    }
    else {
        childIndex = immediateParent.children.length;
        domParent = immediateParent.domNode
            ? immediateParent
            : immediateParent.domParent;
    }
    log.assert(domParent, 'tried to replace a root tree slot with missing domParent');
    const detachedVNodes = immediateParent.children.splice(childIndex, removeCount, ...newNodes);
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
            const domIndex = getDomParentChildIndex(domParent, immediateParent, childIndex);
            const referenceNode = domParentNode.childNodes[domIndex];
            domParentNode.insertBefore(newNode.domNode, referenceNode || null);
        }
    });
    return detachedVNodes;
}
//# sourceMappingURL=vnode.js.map