import * as log from './log';
import { retain, release } from './engine';
import { FieldMap } from './fieldmap';
import { SubscriptionEmitter } from './subscriptionemitter';
import { Field } from './field';

export enum ModelEventType {
    ADD = 'add',
    SET = 'set',
    DEL = 'del',
}

interface ModelHandle<T> {
    target: T;
    keysField: Field<number>;
    emitter: SubscriptionEmitter<ModelEvent>;
    fieldMap: FieldMap;
}

export type ModelEvent =
    | { type: ModelEventType.ADD; prop: string; value: any }
    | { type: ModelEventType.SET; prop: string; value: any }
    | { type: ModelEventType.DEL; prop: string; value?: undefined };

export type Model<T extends {}> = T;

export function addModelEvent(events: ModelEvent[], event: ModelEvent) {
    // TODO: make smarter
    events.push(event);
}

function getModelHandle<T extends {}>(model: Model<T>) {
    return (model as any).__handle as ModelHandle<T> | undefined;
}

export function model<T extends {}>(target: T, debugName?: string): Model<T> {
    const keysField = new Field<number>(Object.keys(target).length);
    const emitter = new SubscriptionEmitter<ModelEvent>(
        addModelEvent,
        debugName ?? 'model'
    );
    const fieldMap = new FieldMap(keysField, null, emitter, debugName);
    const modelHandle: ModelHandle<T> = {
        target,
        keysField,
        emitter,
        fieldMap,
    };
    const modelObj: Model<T> = { ...target };
    Object.defineProperty(modelObj, '__handle', { value: modelHandle });
    Object.defineProperties(
        modelObj,
        Object.fromEntries(
            Object.keys(target).map((key) => [
                key,
                {
                    get: () => {
                        return fieldMap
                            .getOrMake(key, target[key as keyof T])
                            .get();
                    },
                    set: (newValue) => {
                        fieldMap.getOrMake(key, newValue).set(newValue);
                    },
                },
            ])
        )
    );
    return modelObj;
}

model.subscribe = function modelSubscribe<T extends {}>(
    sourceModel: Model<T>,
    handler: (event: ModelEvent[]) => void,
    debugName?: string
): () => void {
    const modelHandle = getModelHandle(sourceModel);
    log.assert(modelHandle, 'missing model __handle');
    retain(modelHandle.emitter);
    const unsubscribe = modelHandle.emitter.subscribe((events) => {
        handler(events);
    });
    return () => {
        unsubscribe();
        release(modelHandle.emitter);
    };
};

model.field = function modelField<T extends {}, K extends keyof T>(
    sourceModel: Model<T>,
    field: K
): Field<T[K]> | undefined {
    const modelHandle = getModelHandle(sourceModel);
    log.assert(modelHandle, 'missing model __handle');
    return modelHandle.fieldMap.getOrMake(
        field as string,
        modelHandle.target[field]
    );
};
