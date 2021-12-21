import { JSXNode } from './jsx';
import { groupBy } from './util';
import * as log from './log';

/**
 * A VNode represents a node in the JSX tree structure
 *
 * Since a JSXNode may render to 0, 1, or many DOM nodes, we need to keep track
 * of the virtual tree structure to understand which index to update within the
 * DOM tree.
 */
export type ChildVNode = {
    domNode: Node | null;
    children: VNode[];
    domParent: VNode;
    mountFragment: DocumentFragment | null;
    jsxNode: JSXNode | null;
    onMount: Function[];
    onUnmount: Function[];
};
export type RootVNode = {
    domNode: Node | null;
    children: VNode[];
    domParent: VNode;
    mountFragment: DocumentFragment | null;
    jsxNode: JSXNode | null;
    onMount: Function[];
    onUnmount: Function[];
};
export type VNode = ChildVNode | RootVNode;

export function makeRootVNode({ domNode }: { domNode: Node }): RootVNode {
    const rootVNode: RootVNode = {
        domNode,
        children: [],
        domParent: null,
        mountFragment: document.createDocumentFragment(),
        jsxNode: null,
        onMount: [],
        onUnmount: [],
    } as unknown as RootVNode; // We lie here since domParent needs to be self-referential
    rootVNode.domParent = rootVNode;
    return rootVNode;
}

export function makeChildVNode({
    jsxNode,
    domNode,
    domParent,
    onMount,
    onUnmount,
}: {
    domParent: VNode;
    jsxNode: JSXNode | null;
    domNode: Node | null;
    onMount: Function[];
    onUnmount: Function[];
}): ChildVNode {
    return {
        domNode,
        children: [],
        domParent,
        mountFragment: domNode ? document.createDocumentFragment() : null,
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

export function callOnMount(node: VNode) {
    // Note: we are doing a post-order traversal, so all children onMount are called before parents are called
    node.children.forEach((child) => callOnMount(child));

    // Call any onMount listeners
    if (node.onMount) {
        node.onMount.forEach((onMount) => {
            try {
                onMount();
            } catch (e) {
                log.exception(
                    e,
                    'VNode node raised exception in onMount',
                    node
                );
            }
        });
    }
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

export function mountVNode(vNode: VNode) {
    if (vNode.domNode && vNode.domParent.mountFragment) {
        vNode.domParent.mountFragment.appendChild(vNode.domNode);
    }
}

export function spliceVNode(
    immediateParent: VNode,
    childIndex: number,
    removeCount: number,
    newNodes: VNode[],
    { runOnMount = true, runOnUnmount = true } = {}
) {
    let domParent: VNode;
    if (immediateParent.children[childIndex]) {
        domParent = immediateParent.children[childIndex].domParent;
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

    // Remove nodes, optimizing for array replacement, where all nodes are completely removed via .replaceChildren()
    const toRemove: [ParentNode, Node][] = [];
    detachedVNodes.forEach((detachedVNode) => {
        if (runOnUnmount) {
            callOnUnmount(detachedVNode);
        }

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
        } else {
            childNodes.forEach((child) => parentNode.removeChild(child));
        }
    });

    if (!domParent.domNode) {
        throw new Error('Invariant: domParent missing domNode');
    }
    const domParentNode = domParent.domNode;

    // Insert nodes via fragment with a single DOM operation
    if (newNodes.length > 0) {
        const domIndex = getDomParentChildIndex(
            domParent,
            immediateParent,
            childIndex
        );
        const referenceNode: Node | undefined =
            domParentNode.childNodes[domIndex];

        const fragment = document.createDocumentFragment();

        for (let i = 0; i < newNodes.length; ++i) {
            const newNode = newNodes[i];
            newNode.domParent = domParent;
            const nodesToAdd = getShallowNodes(newNode);
            nodesToAdd.forEach((addNode) => {
                fragment.appendChild(addNode);
            });
        }

        domParentNode.insertBefore(fragment, referenceNode || null);
        if (runOnMount) {
            newNodes.forEach((newNode) => {
                callOnMount(newNode);
            });
        }
    }
    return detachedVNodes;
}
