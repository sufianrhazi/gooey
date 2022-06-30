import * as log from './log';
import {
    getTrackedDataHandle,
    TrackedData,
    makeTrackedData,
    ProxyHandler,
    SubscribeHandlerType,
    SubscriptionConsumer,
    subscriptionConsumerAddEvent,
} from './trackeddata';
import {
    Collection,
    CollectionEvent,
    CollectionHandler,
    CollectionPrototype,
} from './collection';
import { addVertex, markRoot, SymDebugName, SymRecalculate } from './engine';

// Note: this is unused in models, since models do not have methods
const ModelPrototype = {};

export enum ModelEventType {
    ADD,
    SET,
    DEL,
}

type ModelEvent =
    | { type: ModelEventType.ADD; prop: string; value: any }
    | { type: ModelEventType.SET; prop: string; value: any }
    | { type: ModelEventType.DEL; prop: string };

export type Model<T extends {}> = TrackedData<T, typeof ModelPrototype>;

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
    const modelInterface = makeTrackedData(
        target,
        proxyHandler,
        ModelPrototype,
        debugName
    );
    return modelInterface.revocable.proxy;
}

model.keys = function modelKeys<T extends {}>(
    sourceModel: Model<T>
): Collection<string> {
    const sourceTDHandle = getTrackedDataHandle(sourceModel);
    log.assert(sourceTDHandle, 'missing tdHandle');

    const initialKeys = Object.keys(sourceModel);

    const derivedCollection = makeTrackedData<
        string[],
        typeof CollectionPrototype,
        CollectionEvent<string>,
        ModelEvent
    >(
        initialKeys,
        CollectionHandler,
        CollectionPrototype,
        `:${sourceTDHandle[SymDebugName]}:keys`
    );

    const subscriptionConsumer: SubscriptionConsumer<
        Collection<string>,
        ModelEvent
    > = {
        [SymDebugName]: `subcons:${sourceTDHandle[SymDebugName]}:keys`,
        [SymRecalculate]: keysConsumerFlush,
        events: [],
        handler: keysHandler,
        trackedData: derivedCollection.revocable.proxy,
    };

    derivedCollection.consumer = subscriptionConsumer;
    addVertex(subscriptionConsumer);
    markRoot(subscriptionConsumer);

    subscriptionConsumer.unsubscribe = sourceTDHandle.subscribe(
        subscribeHandler,
        subscriptionConsumer
    );
    return derivedCollection.revocable.proxy;

    function subscribeHandler(
        type: SubscribeHandlerType.EVENTS,
        events: ModelEvent[],
        index: number
    ): void {
        switch (type) {
            case SubscribeHandlerType.EVENTS:
                // index must be defined
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                for (let i = index!; i < events.length; ++i) {
                    subscriptionConsumerAddEvent(
                        subscriptionConsumer,
                        events[i]
                    );
                }
                break;
            default:
                log.assertExhausted(type);
        }
    }
};

function keysHandler(trackedData: Collection<string>, event: ModelEvent) {
    switch (event.type) {
        case ModelEventType.DEL:
            trackedData.reject((key) => key === event.prop);
            break;
        case ModelEventType.ADD:
            trackedData.push(event.prop);
            break;
        case ModelEventType.SET:
            // Preexisting key
            break;
        default:
            log.assertExhausted(event);
    }
}

function keysConsumerFlush(
    this: SubscriptionConsumer<Collection<string>, CollectionEvent<string>>
) {
    for (const event of this.events) {
        this.handler(this.trackedData, event);
    }
    this.events.splice(0, this.events.length);
    return false;
}
