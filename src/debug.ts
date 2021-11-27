import {
    Calculation,
    Collection,
    Model,
    ModelField,
    isCalculation,
    isEffect,
    isCollection,
    isModel,
    View,
} from './types';

let nameMap: WeakMap<any, string> = new WeakMap();

export function clearNames() {
    nameMap = new WeakMap();
}

export function debugNameFor(
    item:
        | Collection<any>
        | View<any>
        | Calculation<any>
        | Model<any>
        | ModelField<any>
): string {
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
    return `field:${nameMap.get(item.model) ?? '?'}:${String(item.key)}`;
}

export function name<T>(item: T, name: string): T {
    nameMap.set(item, name);
    return item;
}
