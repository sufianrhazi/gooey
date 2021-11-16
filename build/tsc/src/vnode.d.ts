import { JSXNode } from './jsx';
declare const VNodeSymbol: unique symbol;
/**
 * A VNode represents a node in the virtual tree structure
 *
 * Since a JSXNode may render to 0, 1, or many DOM nodes, which may be at any
 * index within the DOM tree.
 */
export declare type ChildVNode = {
    domNode: Node | null;
    children: VNode[];
    parentNode: VNode;
    domParent: VNode;
    jsxNode: JSXNode | null;
    onUnmount: Function[];
    [VNodeSymbol]: true;
};
export declare type RootVNode = {
    domNode: Node | null;
    children: VNode[];
    parentNode: null;
    domParent: VNode;
    jsxNode: JSXNode | null;
    onUnmount: Function[];
    [VNodeSymbol]: true;
};
export declare type VNode = ChildVNode | RootVNode;
export declare function makeRootVNode({ domNode }: {
    domNode: Node;
}): RootVNode;
export declare function makeChildVNode({ jsxNode, domNode, domParent, onUnmount, parentNode, }: {
    parentNode: VNode;
    domParent: VNode;
    jsxNode: JSXNode | null;
    domNode: Node | null;
    onUnmount: Function[];
}): ChildVNode;
export declare function makeEmptyVNode({ parentNode, domParent, }: {
    parentNode: VNode;
    domParent: VNode;
}): ChildVNode;
export declare function isVNode(x: any): x is VNode;
export declare function replaceVNode(replaceNode: ChildVNode, newNode: VNode): VNode | undefined;
export declare function spliceVNode(immediateParent: VNode, replaceNode: VNode | null, removeCount: number, newNodes: VNode[]): VNode[];
export {};
//# sourceMappingURL=vnode.d.ts.map