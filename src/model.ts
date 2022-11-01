import * as log from './log';
import {
    getTrackedDataHandle,
    TrackedData,
    TrackedDataHandle,
    ProxyHandler,
} from './trackeddata';
import { retain, release } from './engine';
import { ViewHandler, ViewImpl, makeViewPrototype, View } from './collection';
import { noop } from './util';
import { ArrayEvent, ArrayEventType, addArrayEvent } from './arrayevent';

const ModelPrototype = {
    __debugName: '',
    __refcount: 0,
    __alive: noop,
    __dead: noop,
};

export enum ModelEventType {
    ADD = 'add',
    SET = 'set',
    DEL = 'del',
}

export type ModelEvent =
    | { type: ModelEventType.ADD; prop: string; value: any }
    | { type: ModelEventType.SET; prop: string; value: any }
    | { type: ModelEventType.DEL; prop: string; value?: undefined };

export type Model<T extends {}> = T;

// Note: because model also has "private" fields (Retainable interface, __tdHandle), we lie
type InternalModel<T extends {}> = TrackedData<
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
    >(
        target,
        proxyHandler,
        ModelPrototype,
        null,
        null,
        addModelEvent,
        addModelEvent,
        debugName
    );
    return modelInterface.revocable.proxy;
}

model.subscribe = function modelSubscribe<T extends {}>(
    sourceModel: Model<T>,
    handler: (event: ModelEvent[]) => void,
    debugName?: string
): () => void {
    const sourceTDHandle = getTrackedDataHandle(
        sourceModel as InternalModel<T>
    );
    log.assert(sourceTDHandle, 'missing tdHandle');
    retain(sourceTDHandle.emitter);
    const unsubscribe = sourceTDHandle.emitter.subscribe((events) => {
        handler(events);
    });
    return () => {
        unsubscribe();
        release(sourceTDHandle.emitter);
    };
};

model.keys = function modelKeys<T extends {}>(
    sourceModel: Model<T>,
    debugName?: string
): View<string, ModelEvent> {
    const sourceTDHandle = getTrackedDataHandle(
        sourceModel as InternalModel<T>
    );
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
        makeViewPrototype(sourceModel),
        sourceTDHandle.emitter,
        function* keysHandler(
            target: string[],
            events: ModelEvent[]
        ): IterableIterator<ArrayEvent<string>> {
            for (const event of events) {
                switch (event.type) {
                    case ModelEventType.DEL: {
                        const index = target.indexOf(event.prop);
                        if (index !== -1) {
                            const prevLength = target.length;
                            target.splice(index, 1);
                            const newLength = target.length;

                            // Invalidate ranges
                            for (let i = index; i < target.length; ++i) {
                                derivedCollection.fieldMap.set(
                                    i.toString(),
                                    target[i]
                                );
                            }
                            for (let i = newLength; i < prevLength; ++i) {
                                derivedCollection.fieldMap.delete(i.toString());
                            }
                            derivedCollection.fieldMap.set(
                                'length',
                                target.length
                            );

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

                        // Invalidate ranges
                        derivedCollection.fieldMap.set(
                            length.toString(),
                            event.prop
                        );
                        derivedCollection.fieldMap.set('length', target.length);

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
        },
        addArrayEvent,
        addModelEvent,
        debugName
    );

    return derivedCollection.revocable.proxy;
};

function addModelEvent(events: ModelEvent[], event: ModelEvent) {
    // TODO: make smarter
    events.push(event);
}
