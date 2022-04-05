import {
    GraphNode,
    isCalculation,
    isCollection,
    isEffect,
    isModel,
    isSubscription,
    isNodeOrdering,
} from './types';

let nameMap: WeakMap<any, string> = new WeakMap();

export function clearNames() {
    nameMap = new WeakMap();
}

export function debugNameFor(item: GraphNode): string {
    if (!DEBUG) {
        return '';
    }
    const id = (item as any).$__id;
    if (isCollection(item)) {
        return `${id}:collection:${nameMap.get(item) ?? '?'}`;
    }
    if (isCalculation(item)) {
        return `${id}:${isEffect(item) ? 'effect' : 'calc'}:${
            nameMap.get(item) ?? '?'
        }`;
    }
    if (isModel(item)) {
        return `${id}:model:${nameMap.get(item) ?? '?'}`;
    }
    if (isSubscription(item)) {
        return `${id}:sub:${nameMap.get(item) ?? '?'}`;
    }
    if (isNodeOrdering(item)) {
        return `${id}:ord:${nameMap.get(item) ?? '?'}`;
    }
    return `${id}:field:${nameMap.get(item.model) ?? '?'}:${String(item.key)}`;
}

export function name<T>(item: T, name: string): T {
    if (!DEBUG) return item;
    nameMap.set(item, name);
    return item;
}
