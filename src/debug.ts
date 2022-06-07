import {
    Model,
    Collection,
    View,
    GraphNode,
    isCalculation,
    isEffect,
    isSubscriptionConsumer,
    isSubscriptionEmitter,
    isNodeOrdering,
    isModelField,
    isModel,
    isCollection,
    GetSubscriptionEmitterKey,
} from './types';

let nameMap: WeakMap<any, string> = new WeakMap();

export function clearNames() {
    nameMap = new WeakMap();
}

export function debugNameFor(
    item: GraphNode | Model<any> | Collection<any> | View<any>
): string {
    if (!DEBUG) {
        return '';
    }
    if (isModel(item) || isCollection(item)) {
        const subscriptionEmitter = item[GetSubscriptionEmitterKey]();
        const id = subscriptionEmitter.$__id;
        return `${id}:trackeddata:${nameMap.get(item) ?? '?'}`;
    }
    const id = item.$__id;
    if (isCalculation(item)) {
        return `${id}:${isEffect(item) ? 'effect' : 'calc'}:${
            nameMap.get(item) ?? '?'
        }`;
    }
    if (isSubscriptionEmitter(item)) {
        return `${id}:emitter:${nameMap.get(item) ?? '?'}`;
    }
    if (isSubscriptionConsumer(item)) {
        return `${id}:consumer:${nameMap.get(item) ?? '?'}`;
    }
    if (isNodeOrdering(item)) {
        return `${id}:ord:${nameMap.get(item) ?? '?'}`;
    }
    if (isModelField(item)) {
        return `${id}:field:${nameMap.get(item.model) ?? '?'}:${String(
            item.key
        )}`;
    }
    return `${id}:unknown`;
}

export function name<T>(item: T, name: string): T {
    if (!DEBUG) return item;
    nameMap.set(item, name);
    return item;
}
