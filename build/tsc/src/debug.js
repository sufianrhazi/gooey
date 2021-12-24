import { isCalculation, isCollection, isEffect, isModel, isSubscription, } from './types';
let nameMap = new WeakMap();
export function clearNames() {
    nameMap = new WeakMap();
}
export function debugNameFor(item) {
    var _a, _b, _c, _d, _e;
    if (!DEBUG) {
        return '';
    }
    if (isCollection(item)) {
        return `collection:${(_a = nameMap.get(item)) !== null && _a !== void 0 ? _a : '?'}`;
    }
    if (isCalculation(item)) {
        return `${isEffect(item) ? 'effect' : 'calc'}:${(_b = nameMap.get(item)) !== null && _b !== void 0 ? _b : '?'}`;
    }
    if (isModel(item)) {
        return `model:${(_c = nameMap.get(item)) !== null && _c !== void 0 ? _c : '?'}`;
    }
    if (isSubscription(item)) {
        return `sub:${(_d = nameMap.get(item)) !== null && _d !== void 0 ? _d : '?'}`;
    }
    return `field:${(_e = nameMap.get(item.model)) !== null && _e !== void 0 ? _e : '?'}:${String(item.key)}`;
}
export function name(item, name) {
    if (!DEBUG)
        return item;
    nameMap.set(item, name);
    return item;
}
//# sourceMappingURL=debug.js.map