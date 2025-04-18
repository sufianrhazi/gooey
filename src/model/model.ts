import type { DynamicMut } from '../common/dyn';
import * as log from '../common/log';
import { dict, DictEventType } from './dict';
import type { Dict } from './dict';

export enum ModelEventType {
    SET = 'set',
}

export type ModelEvent<T extends {}, K extends keyof T> = {
    type: ModelEventType;
    prop: K;
    value: T[K];
};

const modelDictSymbol = Symbol('modelDict');

export type Model<T extends {}> = T;

function getModelDict<T extends {}>(model: Model<T>): Dict<keyof T, any> {
    const dict = (model as any)[modelDictSymbol];
    log.assert(dict, 'Unable to retrieve internal model dict');
    return dict;
}

export function model<T extends {}>(target: T, debugName?: string): Model<T> {
    const modelDict = dict(Object.entries(target), debugName);
    const modelObj: Model<T> = { ...target };
    Object.keys(target).forEach((key) => {
        Object.defineProperty(modelObj, key, {
            get: () => {
                return modelDict.get(key);
            },
            set: (newValue) => {
                modelDict.set(key, newValue);
            },
        });
    });
    Object.defineProperty(modelObj, modelDictSymbol, { get: () => modelDict });
    return modelObj;
}

model.subscribe = function modelSubscribe<T extends {}, K extends keyof T>(
    sourceModel: Model<T>,
    handler: (event: ModelEvent<T, K>[]) => void,
    debugName?: string
): () => void {
    const modelDict = getModelDict(sourceModel);
    return modelDict.subscribe((events) => {
        const transformed: ModelEvent<T, K>[] = [];
        for (const event of events) {
            if (
                event.type === DictEventType.SET ||
                event.type === DictEventType.ADD
            ) {
                transformed.push({
                    type: ModelEventType.SET,
                    prop: event.prop as K,
                    value: event.value,
                });
            }
        }
        if (transformed.length) {
            handler(transformed);
        }
    });
};

model.field = function modelField<T extends {}, K extends keyof T>(
    sourceModel: Model<T>,
    field: K
): DynamicMut<T[K]> {
    return {
        get: () => sourceModel[field],
        set: (newValue: T[K]) => {
            sourceModel[field] = newValue;
        },
        subscribe: (handler) => {
            return model.subscribe(sourceModel, (events) => {
                for (const event of events) {
                    if (event.prop === field) {
                        handler(undefined, event.value as T[K]);
                    }
                }
            });
        },
    };
};
