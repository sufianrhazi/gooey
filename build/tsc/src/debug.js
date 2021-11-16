import { isCalculation, isEffect, isCollection, isModel, } from './types';
let nameMap = new WeakMap();
export function clearNames() {
    nameMap = new WeakMap();
}
export function debugNameFor(item) {
    var _a, _b, _c, _d;
    if (isCollection(item)) {
        return `collection:${(_a = nameMap.get(item)) !== null && _a !== void 0 ? _a : '?'}`;
    }
    if (isCalculation(item)) {
        return `${isEffect(item) ? 'effect' : 'calc'}:${(_b = nameMap.get(item)) !== null && _b !== void 0 ? _b : '?'}`;
    }
    if (isModel(item)) {
        return `model:${(_c = nameMap.get(item)) !== null && _c !== void 0 ? _c : '?'}`;
    }
    return `field:${(_d = nameMap.get(item.model)) !== null && _d !== void 0 ? _d : '?'}:${String(item.key)}`;
}
export function name(item, name) {
    nameMap.set(item, name);
    return item;
}
//# sourceMappingURL=debug.js.map