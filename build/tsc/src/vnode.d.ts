import { JSXNode } from './jsx';
/**
 * A VNode represents a node in the JSX tree structure
 *
 * Since a JSXNode may render to 0, 1, or many DOM nodes, we need to keep track
 * of the virtual tree structure to understand which index to update within the
 * DOM tree.
 */
export declare type ChildVNode = {
    domNode: Node | null;
    children: VNode[];
    domParent: VNode;
    mountFragment: DocumentFragment | null;
    jsxNode: JSXNode | null;
    onMount: Function[];
    onUnmount: Function[];
};
export declare type RootVNode = {
    domNode: Node | null;
    children: VNode[];
    domParent: VNode;
    mountFragment: DocumentFragment | null;
    jsxNode: JSXNode | null;
    onMount: Function[];
    onUnmount: Function[];
};
export declare type VNode = ChildVNode | RootVNode;
export declare function makeRootVNode({ domNode }: {
    domNode: Node;
}): RootVNode;
export declare function makeChildVNode({ jsxNode, domNode, domParent, onMount, onUnmount, }: {
    domParent: VNode;
    jsxNode: JSXNode | null;
    domNode: Node | null;
    onMount: Function[];
    onUnmount: Function[];
}): ChildVNode;
export declare function callOnMount(node: VNode): void;
export declare function mountVNode(vNode: VNode): void;
export declare function spliceVNode(immediateParent: VNode, childIndex: number, removeCount: number, newNodes: VNode[], { runOnMount, runOnUnmount }?: {
    runOnMount?: boolean | undefined;
    runOnUnmount?: boolean | undefined;
}): VNode[];
//# sourceMappingURL=vnode.d.ts.map