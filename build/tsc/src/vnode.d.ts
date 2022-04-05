/**
 * A VNode represents a node in the JSX tree structure
 *
 * Since a JSXNode may render to 0, 1, or many DOM nodes, we need to keep track
 * of the virtual tree structure to understand which index to update within the
 * DOM tree.
 */
export declare type VNode = {
    domNode?: Node;
    children?: VNode[];
    domParent?: VNode;
    onMount?: Function[];
    onUnmount?: Function[];
};
export declare function callOnMount(node: VNode): void;
export declare function spliceVNode(immediateParent: VNode, childIndex: number, removeCount: number, newNodes: VNode[], { runOnMount, runOnUnmount }?: {
    runOnMount?: boolean | undefined;
    runOnUnmount?: boolean | undefined;
}): VNode[];
//# sourceMappingURL=vnode.d.ts.map