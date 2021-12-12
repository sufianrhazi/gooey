import { groupBy } from './util';
import * as log from './log';
export function makeRootVNode({ domNode }) {
    const rootVNode = {
        domNode,
        children: [],
        parentNode: null,
        domParent: null,
        mountFragment: document.createDocumentFragment(),
        jsxNode: null,
        onMount: [],
        onUnmount: [],
    }; // We lie here since domParent needs to be self-referential
    rootVNode.domParent = rootVNode;
    return rootVNode;
}
export function makeChildVNode({ jsxNode, domNode, domParent, onMount, onUnmount, parentNode, }) {
    return {
        domNode,
        children: [],
        parentNode,
        domParent,
        mountFragment: document.createDocumentFragment(),
        jsxNode,
        onMount,
        onUnmount,
    };
}
/**
 * Get shallow DOM nodes from the virtual tree.
 *
 * For example, with this virtual tree:
 *
 * <root>
 *   <A>...</A>
 *   <B>
 *     <B1>
 *      <div id="b_1_1">...</div>
 *      {false}
 *      {[
 *        <div id="b_1_arr_1">...</div>
 *        <div id="b_1_arr_2">...</div>
 *      ]}
 *      <SubComponent>
 *        <div id="b_1_sub_1">...</div>
 *        <div id="b_1_sub_2">...</div>
 *      </SubComponent>
 *      <div id="b_1_3">...</div>
 *     </B1>
 *   </B>
 *   <C>
 *     ...
 *   </C>
 * </root>
 *
 * If getShallowNodes is called with <B> as the target, this would retrieve:
 * [b_1_1, b_1_arr_1, b_1_arr_2, b_1_sub_1, b_1_sub_2, b_1_3]
 */
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
export function callOnMount(node) {
    // Note: we are doing a post-order traversal, so all children onMount are called before parents are called
    node.children.forEach((child) => callOnMount(child));
    // Call any onMount listeners
    if (node.onMount) {
        node.onMount.forEach((onMount) => {
            try {
                onMount();
            }
            catch (e) {
                log.exception(e, 'VNode node raised exception in onMount', node);
            }
        });
    }
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
export function mountVNode(vNode) {
    if (vNode.domNode && vNode.domParent.mountFragment) {
        vNode.domParent.mountFragment.appendChild(vNode.domNode);
    }
}
export function spliceVNode(immediateParent, childIndex, removeCount, newNodes) {
    let domParent;
    if (immediateParent.children[childIndex]) {
        domParent = immediateParent.children[childIndex].domParent;
    }
    else {
        childIndex = immediateParent.children.length;
        domParent = immediateParent.domNode
            ? immediateParent
            : immediateParent.domParent;
    }
    log.assert(domParent, 'tried to replace a root tree slot with missing domParent');
    const detachedVNodes = immediateParent.children.splice(childIndex, removeCount, ...newNodes);
    // Remove nodes, optimizing for array replacement, where all nodes are completely removed via .replaceChildren()
    const toRemove = [];
    detachedVNodes.forEach((detachedVNode) => {
        callOnUnmount(detachedVNode);
        const nodesToRemove = getShallowNodes(detachedVNode);
        nodesToRemove.forEach((node) => {
            if (node.parentNode) {
                toRemove.push([node.parentNode, node]);
            }
        });
    });
    const groupedToRemove = groupBy(toRemove, (item) => item);
    groupedToRemove.forEach((childNodes, parentNode) => {
        if (parentNode.childNodes.length === childNodes.length) {
            parentNode.replaceChildren();
        }
        else {
            childNodes.forEach((child) => parentNode.removeChild(child));
        }
    });
    if (!domParent.domNode) {
        throw new Error('Invariant: domParent missing domNode');
    }
    const domParentNode = domParent.domNode;
    // Insert nodes via fragment with a single DOM operation
    if (newNodes.length > 0) {
        const domIndex = getDomParentChildIndex(domParent, immediateParent, childIndex);
        const referenceNode = domParentNode.childNodes[domIndex];
        const fragment = document.createDocumentFragment();
        for (let i = 0; i < newNodes.length; ++i) {
            const newNode = newNodes[i];
            newNode.parentNode = immediateParent;
            newNode.domParent = domParent;
            const nodesToAdd = getShallowNodes(newNode);
            nodesToAdd.forEach((addNode) => {
                fragment.appendChild(addNode);
            });
        }
        domParentNode.insertBefore(fragment, referenceNode || null);
        newNodes.forEach((newNode) => {
            callOnMount(newNode);
        });
    }
    return detachedVNodes;
}
//# sourceMappingURL=vnode.js.map