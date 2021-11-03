import {
    Calculation,
    Collection,
    ModelField,
    isCalculation,
    isEffect,
    isCollection,
} from './types';

let nameMap: WeakMap<any, string> = new WeakMap();

export function clearNames() {
    nameMap = new WeakMap();
}

export function debugNameFor(
    item: Collection<unknown> | Calculation<unknown> | ModelField<unknown>
): string {
    if (isCollection(item)) {
        return `coll:${nameMap.get(item) ?? '?'}`;
    }
    if (isCalculation(item)) {
        return `${isEffect(item) ? 'eff' : 'comp'}:${nameMap.get(item) ?? '?'}`;
    }
    return `model:${nameMap.get(item.model) ?? '?'}:${String(item.key)}`;
}

export function name<T>(item: T, name: string): T {
    nameMap.set(item, name);
    return item;
}
