import { InvariantError, Item } from './types';

let id = 0;
const idMap = new WeakMap<any, number>();
const symbolIdMap = new Map<symbol, number>();

export const registerItem = (proxy: any): void => {
    const newId = ++id;
    idMap.set(proxy, newId);
};

export const getItemId = (item: Item) => {
    if (item.type === 'model') {
        let modelId = idMap.get(item.model);
        if (modelId === undefined) {
            throw new InvariantError('Consistency error: unknown modelId');
        }
        if (typeof item.key === 'symbol') {
            let symbolId = symbolIdMap.get(item.key);
            if (symbolId === undefined) {
                symbolId = id++;
                symbolIdMap.set(item.key, symbolId);
            }
            return `model:${modelId}:symbol:${symbolId}`;
        }
        return `model:${modelId}:field:${item.key}`;
    }

    const computationId = idMap.get(item.computation);
    if (computationId === undefined) {
        throw new InvariantError('Consistency error: unknown computationId');
    }
    return `computation:${computationId}`;
};
