import * as log from './log';

/**
 * A VNode represents a node in the JSX tree structure
 *
 * Since a JSXNode may render to 0, 1, or many DOM nodes, we need to keep track
 * of the virtual tree structure to understand which index to update within the
 * DOM tree.
 */
export type VNode = {
    domNode?: Node;
    children?: VNode[];
    domParent?: VNode;
    onMount?: Function[];
    onUnmount?: Function[];
};

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
            node.children?.forEach((child) => visit(child));
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
        if (node.children) {
            const visitIndex =
                node === immediateParent ? childIndex : node.children.length;
            for (let i = 0; i < visitIndex; ++i) {
                if (visit(node.children[i])) {
                    return true;
                }
            }
        }
        return node === immediateParent;
    }
    visitChildren(domParent);
    return realIndex;
}

export function callOnMount(node: VNode) {
    // Note: we are doing a post-order traversal, so all children onMount are called before parents are called
    node.children?.forEach((child) => callOnMount(child));

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

/**
 * Collect shallow DOM nodes and conditionally call onUnmount if specified
 */
function performUnmount(
    node: VNode,
    shallowDomNodes: Node[] | undefined,
    runOnUnmount: boolean
) {
    if (shallowDomNodes && node.domNode) {
        shallowDomNodes.push(node.domNode);
    }
    // Note: we are doing a post-order traversal, so all children are released/unmounted before parents are released/unmounted
    node.children?.forEach((child) => {
        performUnmount(
            child,
            node.domNode ? undefined : shallowDomNodes,
            runOnUnmount
        );
    });

    // Call any onUnmount listeners
    if (runOnUnmount && node.onUnmount) {
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

export function spliceVNode(
    immediateParent: VNode,
    childIndex: number,
    removeCount: number,
    newNodes: VNode[],
    { runOnMount = true, runOnUnmount = true } = {}
) {
    log.assert(
        immediateParent.children,
        'attempted to splice a parent node with no children'
    );
    const domParent = immediateParent.domNode
        ? immediateParent
        : immediateParent.domParent;
    if (childIndex > immediateParent.children.length) {
        childIndex = immediateParent.children.length;
    }
    log.assert(
        domParent && domParent.domNode,
        'tried to replace a root tree slot with missing domParent'
    );

    const domParentNode = domParent.domNode;

    const detachedVNodes = immediateParent.children.splice(
        childIndex,
        removeCount,
        ...newNodes
    );

    // Remove nodes, optimizing for array replacement, where all nodes are completely removed via .replaceChildren()
    const toRemove: Node[] = [];
    detachedVNodes.forEach((detachedVNode) => {
        performUnmount(detachedVNode, toRemove, runOnUnmount);
    });

    if (domParentNode.childNodes.length === toRemove.length) {
        // By virtue of having children, this Node must be an Element
        (domParentNode as Element).replaceChildren();
    } else {
        toRemove.forEach((child) => domParentNode.removeChild(child));
    }

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
                if (newNode) {
                    callOnMount(newNode);
                }
            });
        }
    }
    return detachedVNodes;
}
