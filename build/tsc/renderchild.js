export function isRenderElement(renderChild) {
    return !!(renderChild &&
        typeof renderChild === 'object' &&
        'type' in renderChild &&
        renderChild.type === 'element');
}
export function isRenderComponent(renderChild) {
    return !!(renderChild &&
        typeof renderChild === 'object' &&
        'type' in renderChild &&
        renderChild.type === 'component');
}
//# sourceMappingURL=renderchild.js.map