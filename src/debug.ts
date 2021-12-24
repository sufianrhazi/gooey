import {
    DAGNode,
    isCalculation,
    isCollection,
    isEffect,
    isModel,
    isSubscription,
} from './types';

let nameMap: WeakMap<any, string> = new WeakMap();

export function clearNames() {
    nameMap = new WeakMap();
}

export function debugNameFor(item: DAGNode): string {
    if (!DEBUG) {
        return '';
    }
    if (isCollection(item)) {
        return `collection:${nameMap.get(item) ?? '?'}`;
    }
    if (isCalculation(item)) {
        return `${isEffect(item) ? 'effect' : 'calc'}:${
            nameMap.get(item) ?? '?'
        }`;
    }
    if (isModel(item)) {
        return `model:${nameMap.get(item) ?? '?'}`;
    }
    if (isSubscription(item)) {
        return `sub:${nameMap.get(item) ?? '?'}`;
    }
    return `field:${nameMap.get(item.model) ?? '?'}:${String(item.key)}`;
}

export function name<T>(item: T, name: string): T {
    if (!DEBUG) return item;
    nameMap.set(item, name);
    return item;
}
