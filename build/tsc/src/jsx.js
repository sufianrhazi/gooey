export function isRenderElement(jsxNode) {
    return !!(jsxNode &&
        typeof jsxNode === 'object' &&
        'type' in jsxNode &&
        jsxNode.type === 'element');
}
export function isRenderComponent(jsxNode) {
    return !!(jsxNode &&
        typeof jsxNode === 'object' &&
        'type' in jsxNode &&
        jsxNode.type === 'component');
}
//# sourceMappingURL=jsx.js.map