import {
    Processable,
    Retainable,
    addDependencyToActiveCalculation,
    addHardEdge,
    removeHardEdge,
    addSoftEdge,
    removeSoftEdge,
    addVertex,
    release,
    removeVertex,
    retain,
    SymDebugName,
    SymDestroy,
    SymRecalculate,
    SymRefcount,
} from './engine';
import * as log from './log';
import { field as makeField, Field } from './field';

type FieldMap = Map<string, Field<any>>;

interface ModelSubscriptionEmitter extends Processable {
    subscribers: ModelSubscribeHandler[];
    subscriberOffset: number[];
    events: [key: string, value: any][];
}

interface ModelSubscriptionConsumer extends Processable {
    unsubscribe?: () => void;
    events: [key: string, value: any][];
    handler: (derivedModel: Model<any>, key: string, value: any) => void;
}

type ModelSubscribeHandler = (
    events: [key: string, value: any][],
    index: number
) => void;
type ModelUnsubscribe = () => void;

interface ModelInterface<T> extends Retainable {
    fieldMap: FieldMap;
    keys: Set<string>;
    subscribe: (
        handler: ModelSubscribeHandler,
        receiver: Processable
    ) => ModelUnsubscribe;
    keysField: Field<number>;
    emitter?: ModelSubscriptionEmitter;
    consumer?: ModelSubscriptionConsumer;
    target: any;
    revocable: {
        proxy: Model<T>;
        revoke: () => void;
    };
}

/** Unused, but avoids assigning T to Model<T> */
declare const SymModelTag: unique symbol;
export type Model<T extends {}> = T & { [SymModelTag]: unknown };

const modelInterfaceMap = new Map<any, ModelInterface<any>>();

function makeModel<T extends {}>(
    target: T,
    debugName?: string
): ModelInterface<T> {
    const fieldMap: FieldMap = new Map();
    const keys = new Set<string>(Object.keys(target));
    const keysField = makeField(`${debugName ?? 'm'}:@keys`, keys.size);
    const revocable = Proxy.revocable(target as Model<T>, {
        get: modelGet,
        has: modelHas,
        set: modelSet,
        deleteProperty: modelDelete,
        ownKeys: modelOwnKeys,
    });
    const modelInterface: ModelInterface<T> = {
        fieldMap: fieldMap,
        keysField: keysField,
        keys: keys,
        subscribe: modelSubscribe,
        target,
        revocable,
        [SymDebugName]: debugName ?? 'm',
        [SymRefcount]: 1,
        [SymDestroy]: modelDestroy,
    };
    modelInterfaceMap.set(target, modelInterface);
    return modelInterface;
}

export function model<T extends {}>(target: T, debugName?: string): Model<T> {
    const modelInterface = makeModel(target, debugName);
    return modelInterface.revocable.proxy;
}

model.keys = function modelKeys<T extends {}>(sourceModel: Model<T>) {
    // TODO: implement
    return [];
};

model.derived = function modelDerived<T extends {}, U extends {}>(
    sourceModel: Model<T>,
    init: (m: Model<T>) => U,
    handler: (derivedModel: Model<U>, key: string, value: any) => void,
    debugName?: string
) {
    const derivedModelInterface = makeModel(
        init(sourceModel),
        debugName ?? 'derived'
    );
    log.assert(derivedModelInterface, 'missing model interface');
    const subscriptionConsumer: ModelSubscriptionConsumer = {
        [SymDebugName]: `subcons:${derivedModelInterface[SymDebugName]}`,
        [SymRecalculate]: modelSubscriptionConsumerFlush,
        events: [],
        handler,
    };
    subscriptionConsumer.unsubscribe = derivedModelInterface.subscribe(
        (events, index) => {
            for (let i = index; i < events.length; ++i) {
                subscriptionConsumer.events.push(events[i]);
            }
        },
        subscriptionConsumer
    );
    derivedModelInterface.consumer = subscriptionConsumer;

    addVertex(subscriptionConsumer);
    retain(derivedModelInterface);

    for (const field of derivedModelInterface.fieldMap.values()) {
        addSoftEdge(subscriptionConsumer, field);
    }
};

function modelSubscriptionConsumerFlush(this: ModelSubscriptionConsumer) {
    for (const [key, value] of this.events) {
        this.handler(this, key, value);
    }
    this.events.splice(0, this.events.length);
    return false;
}

function getField(
    modelInterface: ModelInterface<any>,
    prop: string,
    value: any
) {
    const fieldMap = modelInterface.fieldMap;
    let field = fieldMap.get(prop);
    if (!field) {
        field = makeField(`${modelInterface[SymDebugName]}:${prop}`, value);
        const subscriptionConsumer = modelInterface.consumer;
        if (subscriptionConsumer) {
            addSoftEdge(subscriptionConsumer, field);
        }
        const subscriptionEmitter = modelInterface.emitter;
        if (subscriptionEmitter) {
            addSoftEdge(field, subscriptionEmitter);
        }
        fieldMap.set(prop, field);
    }
    return field;
}

function modelGet<T extends {}>(
    target: T,
    prop: string | symbol,
    receiver: Model<T>
) {
    if (typeof prop === 'symbol') return Reflect.get(target, prop, receiver);
    const value = Reflect.get(target, prop, receiver);
    const modelInterface = modelInterfaceMap.get(target);
    log.assert(modelInterface, 'missing model interface');
    const field = getField(modelInterface, prop, value);
    addDependencyToActiveCalculation(field);
    return value;
}

function modelHas<T extends {}>(target: T, prop: string | symbol) {
    if (typeof prop === 'symbol') return Reflect.has(target, prop);
    const value = Reflect.has(target, prop);
    const modelInterface = modelInterfaceMap.get(target);
    log.assert(modelInterface, 'missing model interface');
    const field = getField(modelInterface, prop, value);
    addDependencyToActiveCalculation(field);
    return value;
}

function modelSet<T extends {}>(
    target: T,
    prop: string | symbol,
    value: any,
    receiver: Model<T>
) {
    if (typeof prop === 'symbol')
        return Reflect.set(target, prop, value, receiver);
    const hadProp = Reflect.has(target, prop);
    const prevValue = Reflect.get(target, prop, receiver);
    const modelInterface = modelInterfaceMap.get(target);
    log.assert(modelInterface, 'missing model interface');
    const field = getField(modelInterface, prop, prevValue);
    field.set(value);
    if (!hadProp) {
        const keys = modelInterface.keys;
        keys.add(prop);
        modelInterface.keysField.set(keys.size);
    }
    return Reflect.set(target, prop, value, receiver);
}

function modelDelete<T extends {}>(target: T, prop: string | symbol) {
    if (typeof prop === 'symbol') return Reflect.deleteProperty(target, prop);
    const hadProp = Reflect.has(target, prop);
    const result = Reflect.deleteProperty(target, prop);
    if (hadProp) {
        const modelInterface = modelInterfaceMap.get(target);
        log.assert(modelInterface, 'missing model interface');
        const keys = modelInterface.keys;
        keys.delete(prop);
        modelInterface.keysField.set(keys.size);
    }
    return result;
}

function modelOwnKeys<T extends {}>(target: T) {
    const modelInterface = modelInterfaceMap.get(target);
    log.assert(modelInterface, 'missing model interface');
    const keys = modelInterface.keys;
    modelInterface.keysField.get(); // force a read to add a dependency on keys
    return [...keys];
}

function modelSubscribe(
    this: ModelInterface<any>,
    handler: ModelSubscribeHandler,
    receiver: Processable
): ModelUnsubscribe {
    if (!this.emitter) {
        this.emitter = {
            subscribers: [],
            subscriberOffset: [],
            events: [],
            [SymDebugName]: `subemit:${this[SymDebugName]}`,
            [SymRecalculate]: subscriptionEmitterFlush,
        };

        addVertex(this.emitter);
        for (const field of this.fieldMap.values()) {
            addSoftEdge(field, this.emitter);
        }
    }
    addHardEdge(this.emitter, receiver);
    this.emitter.subscribers.push(handler);
    this.emitter.subscriberOffset.push(this.emitter.events.length);

    return () => {
        if (!this.emitter) return;
        const index = this.emitter.subscribers.indexOf(handler);
        if (index === -1) return;
        removeHardEdge(this.emitter, receiver);
        this.emitter.subscribers.slice(index, 1);
        this.emitter.subscriberOffset.slice(index, 1);
        if (this.emitter.subscribers.length === 0) {
            for (const field of this.fieldMap.values()) {
                removeSoftEdge(field, this.emitter);
            }
            delete this.emitter;
        }
    };
}

function subscriptionEmitterFlush(this: ModelSubscriptionEmitter) {
    for (let i = 0; i < this.subscribers.length; ++i) {
        const subscriber = this.subscribers[i];
        subscriber(this.events, this.subscriberOffset[i]);
    }
    return true;
}

function modelDestroy(this: ModelInterface<any>) {
    for (const field of this.fieldMap.values()) {
        if (this.consumer) {
            removeSoftEdge(this.consumer, field);
        }
        if (this.emitter) {
            removeSoftEdge(field, this.emitter);
        }
        release(field);
    }
    this.fieldMap.clear();
    this.keys.clear();
    release(this.keysField);
    if (this.consumer) {
        this.consumer.unsubscribe?.();
        removeVertex(this.consumer);
        delete this.consumer;
    }
    if (this.emitter) {
        removeVertex(this.emitter);
        delete this.emitter;
    }
    this.revocable.revoke();
    this.target = null;
    this.revocable.proxy = null;
}
