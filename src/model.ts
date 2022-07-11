import * as log from './log';
import {
    getTrackedDataHandle,
    TrackedData,
    TrackedDataHandle,
    ProxyHandler,
} from './trackeddata';
import { SymDebugName, SymRefcount, SymAlive, SymDead } from './engine';
import { ViewHandler, ViewImpl, makeViewPrototype, View } from './collection';
import { noop } from './util';
import { ArrayEvent, ArrayEventType } from './arrayevent';

const ModelPrototype = {
    [SymDebugName]: '',
    [SymRefcount]: 0,
    [SymAlive]: noop,
    [SymDead]: noop,
};

export enum ModelEventType {
    ADD,
    SET,
    DEL,
}

type ModelEvent =
    | { type: ModelEventType.ADD; prop: string; value: any }
    | { type: ModelEventType.SET; prop: string; value: any }
    | { type: ModelEventType.DEL; prop: string };

export type Model<T extends {}> = TrackedData<
    T,
    typeof ModelPrototype,
    ModelEvent,
    ModelEvent
>;

export function model<T extends {}>(target: T, debugName?: string): Model<T> {
    const proxyHandler: ProxyHandler<ModelEvent> = {
        get: (dataAccessor, emitter, prop, receiver) =>
            dataAccessor.get(prop, receiver),
        has: (dataAccessor, emitter, prop) => dataAccessor.has(prop),
        set: (dataAccessor, emitter, prop, value, receiver) => {
            if (typeof prop === 'string') {
                if (dataAccessor.peekHas(prop)) {
                    emitter({ type: ModelEventType.SET, prop, value });
                } else {
                    emitter({ type: ModelEventType.ADD, prop, value });
                }
            }
            return dataAccessor.set(prop, value, receiver);
        },
        delete: (dataAccessor, emitter, prop) => {
            if (typeof prop === 'string' && dataAccessor.peekHas(prop)) {
                emitter({ type: ModelEventType.DEL, prop });
            }
            return dataAccessor.delete(prop);
        },
    };
    const modelInterface = new TrackedDataHandle<
        T,
        typeof ModelPrototype,
        ModelEvent,
        ModelEvent
    >(target, proxyHandler, ModelPrototype, null, null, debugName);
    return modelInterface.revocable.proxy;
}

model.keys = function modelKeys<T extends {}>(
    sourceModel: Model<T>,
    debugName?: string
): View<string, ModelEvent> {
    const sourceTDHandle = getTrackedDataHandle(sourceModel);
    log.assert(sourceTDHandle, 'missing tdHandle');

    const initialKeys = Object.keys(sourceModel);

    const derivedCollection = new TrackedDataHandle<
        string[],
        ViewImpl<string>,
        ArrayEvent<string>,
        ModelEvent
    >(
        initialKeys,
        ViewHandler,
        makeViewPrototype(),
        sourceTDHandle.emitter,
        keysHandler,
        debugName
    );

    return derivedCollection.revocable.proxy;
};

function* keysHandler(
    target: string[],
    event: ModelEvent
): IterableIterator<ArrayEvent<string>> {
    switch (event.type) {
        case ModelEventType.DEL: {
            const index = target.indexOf(event.prop);
            if (index !== -1) {
                target.splice(index, 1);
                yield {
                    type: ArrayEventType.SPLICE,
                    index,
                    count: 1,
                    items: [],
                };
            }
            break;
        }
        case ModelEventType.ADD: {
            const length = target.length;
            target.push(event.prop);
            yield {
                type: ArrayEventType.SPLICE,
                index: length,
                count: 0,
                items: [event.prop],
            };
            break;
        }
        case ModelEventType.SET:
            // Preexisting key
            break;
        default:
            log.assertExhausted(event);
    }
}
