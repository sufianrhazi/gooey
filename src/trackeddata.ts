import {
    Processable,
    Retainable,
    addDependencyToActiveCalculation,
    addHardEdge,
    removeHardEdge,
    addSoftEdge,
    removeSoftEdge,
    markDirty,
    unmarkRoot,
    addVertex,
    release,
    removeVertex,
    SymDebugName,
    SymDestroy,
    SymRecalculate,
    SymRefcount,
} from './engine';
import * as log from './log';
import { field as makeField, Field } from './field';

type FieldMap = Map<string, Field<any>>;

export interface SubscriptionEmitter<TEmitEvent> extends Processable {
    subscribers: SubscribeHandler<TEmitEvent>[];
    subscriberOffset: number[];
    events: TEmitEvent[];
}

export function subscriptionEmitterAddEvent<TEmitEvent>(
    subscriptionEmitter: SubscriptionEmitter<TEmitEvent>,
    event: TEmitEvent
) {
    const length = subscriptionEmitter.events.push(event);
    if (length === 1) {
        markDirty(subscriptionEmitter);
    }
}

export interface SubscriptionConsumer<TTrackedData, TConsumeEvent>
    extends Processable {
    unsubscribe?: () => void;
    events: TConsumeEvent[];
    handler: (trackedData: TTrackedData, event: TConsumeEvent) => void;
    trackedData: TTrackedData;
}

export function subscriptionConsumerAddEvent<TTrackedData, TConsumeEvent>(
    subscriptionConsumer: SubscriptionConsumer<TTrackedData, TConsumeEvent>,
    event: TConsumeEvent
) {
    subscriptionConsumer.events.push(event);
}

export enum SubscribeHandlerType {
    EVENTS, // TODO: remove this enum
}

interface SubscribeHandler<TEmitEvent> {
    (
        type: SubscribeHandlerType.EVENTS,
        events: TEmitEvent[],
        index: number
    ): void;
}
type TrackedDataUnsubscribe = () => void;

export enum EventEmitterType {
    ADD,
    SET,
    DEL,
}

export interface EventEmitter<TEmitEvent> {
    (
        type: EventEmitterType.ADD,
        prop: string,
        value: any
    ): Iterable<TEmitEvent>;
    (
        type: EventEmitterType.SET,
        prop: string,
        value: any
    ): Iterable<TEmitEvent>;
    (type: EventEmitterType.DEL, prop: string): Iterable<TEmitEvent>;
}

interface TrackedDataHandle<TData, TMethods, TEmitEvent, TConsumeEvent>
    extends Retainable {
    fieldMap: FieldMap;
    keys: Set<string>;
    subscribe: (
        handler: SubscribeHandler<TEmitEvent>,
        receiver: Processable
    ) => TrackedDataUnsubscribe;
    keysField: Field<number>;
    emitter?: SubscriptionEmitter<TEmitEvent>;
    consumer?: SubscriptionConsumer<
        TrackedData<TData, TMethods>,
        TConsumeEvent
    >;
    target: any;
    revocable: {
        proxy: TrackedData<TData, TMethods>;
        revoke: () => void;
    };
}

/** Unused, but avoids assigning TData to TrackedData<TData, {}> */
declare const SymTag: unique symbol;
export type TrackedData<TData, TMethods> = TData &
    TMethods & { [SymTag]: unknown };

const tdHandleMap = new Map<any, TrackedDataHandle<any, any, any, any>>();

export function getTrackedDataHandle(
    trackedData: TrackedData<any, any>
): undefined | TrackedDataHandle<any, any, any, any> {
    return tdHandleMap.get(trackedData);
}

export interface DataAccessor {
    get: (prop: string | symbol, receiver: any) => any;
    has: (prop: string | symbol) => any;
    peek: (prop: string | symbol, receiver: any) => any;
    peekHas: (prop: string | symbol) => any;
    set: (prop: string | symbol, value: any, receiver: any) => any;
    delete: (prop: string | symbol) => boolean;
}

export interface ProxyHandler<TEmitEvent> {
    get: (
        dataAccessor: DataAccessor,
        emitter: (event: TEmitEvent) => void,
        prop: string | symbol,
        receiver: any
    ) => any;
    has: (
        dataAccessor: DataAccessor,
        emitter: (event: TEmitEvent) => void,
        prop: string | symbol
    ) => any;
    set: (
        dataAccessor: DataAccessor,
        emitter: (event: TEmitEvent) => void,
        prop: string | symbol,
        value: any,
        receiver: any
    ) => any;
    delete: (
        dataAccessor: DataAccessor,
        emitter: (event: TEmitEvent) => void,
        prop: string | symbol
    ) => boolean;
}

export function makeTrackedData<
    TData extends {},
    TExtra,
    TEmitEvent,
    TConsumeEvent
>(
    target: TData,
    proxyHandler: ProxyHandler<TEmitEvent>,
    methods: TExtra,
    debugName?: string
): TrackedDataHandle<TData, TExtra, TEmitEvent, TConsumeEvent> {
    const fieldMap: FieldMap = new Map();
    const keys = new Set<string>(Object.keys(target));
    const keysField = makeField(`${debugName ?? 'm'}:@keys`, keys.size);
    const emitter = (event: TEmitEvent) => {
        const subscriptionEmitter = tdHandle.emitter;
        if (subscriptionEmitter) {
            subscriptionEmitterAddEvent(subscriptionEmitter, event);
        }
    };
    const dataAccessor: DataAccessor = {
        get: (prop, receiver) => {
            if (typeof prop === 'symbol') {
                return Reflect.get(target, prop, receiver);
            }
            if (prop in methods) {
                return (methods as any)[prop];
            }
            const value = Reflect.get(target, prop, receiver);
            const field = getOrMakeField(tdHandle, prop, value);
            addDependencyToActiveCalculation(field);
            return value;
        },
        peek: (prop, receiver) => {
            return Reflect.get(target, prop, receiver);
        },
        peekHas: (prop) => {
            return Reflect.has(target, prop);
        },
        has: (prop) => {
            if (typeof prop === 'symbol') {
                return Reflect.has(target, prop);
            }
            if (prop in methods) {
                return true;
            }
            const value = Reflect.has(target, prop);
            const field = getOrMakeField(tdHandle, prop, value);
            addDependencyToActiveCalculation(field);
            return value;
        },
        set: (prop, value, receiver) => {
            if (typeof prop === 'symbol') {
                return Reflect.set(target, prop, value, receiver);
            }
            if (prop in methods) {
                return false; // Prevent writes to owned methods
            }
            const hadProp = Reflect.has(target, prop);
            const prevValue = Reflect.get(target, prop, receiver);
            const field = getOrMakeField(tdHandle, prop, prevValue);
            field.set(value);
            if (!hadProp) {
                keys.add(prop);
                keysField.set(keys.size);
            }
            return Reflect.set(target, prop, value, revocable.proxy);
        },
        delete: (prop) => {
            if (typeof prop === 'symbol') {
                return Reflect.deleteProperty(target, prop);
            }
            if (prop in methods) {
                return false; // Prevent deletes of owned methods
            }
            const hadProp = Reflect.has(target, prop);
            const result = Reflect.deleteProperty(target, prop);
            if (hadProp) {
                keys.delete(prop);
                keysField.set(keys.size);
            }
            return result;
        },
    };

    const revocable = Proxy.revocable<TrackedData<TData, TExtra>>(
        target as TrackedData<TData, TExtra>,
        {
            get: (target, prop, receiver) =>
                proxyHandler.get(dataAccessor, emitter, prop, receiver),
            has: (target, prop) =>
                proxyHandler.has(dataAccessor, emitter, prop),
            set: (target, prop, value, receiver) =>
                proxyHandler.set(dataAccessor, emitter, prop, value, receiver),
            deleteProperty: (target, prop) =>
                proxyHandler.delete(dataAccessor, emitter, prop),
            ownKeys: () => {
                const keys = tdHandle.keys;
                tdHandle.keysField.get(); // force a read to add a dependency on keys
                return [...keys];
            },
        }
    );
    const tdHandle: TrackedDataHandle<
        TData,
        TExtra,
        TEmitEvent,
        TConsumeEvent
    > = {
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
    tdHandleMap.set(target, tdHandle);
    tdHandleMap.set(revocable.proxy, tdHandle);
    return tdHandle;
}

function getOrMakeField(
    tdHandle: TrackedDataHandle<any, any, any, any>,
    prop: string,
    value: any
) {
    const fieldMap = tdHandle.fieldMap;
    let field = fieldMap.get(prop);
    if (!field) {
        field = makeField(`${tdHandle[SymDebugName]}:${prop}`, value);
        const subscriptionConsumer = tdHandle.consumer;
        if (subscriptionConsumer) {
            addSoftEdge(subscriptionConsumer, field);
        }
        const subscriptionEmitter = tdHandle.emitter;
        if (subscriptionEmitter) {
            addSoftEdge(field, subscriptionEmitter);
        }
        fieldMap.set(prop, field);
    }
    return field;
}

function modelSubscribe<TEmitEvent, TConsumeEvent>(
    this: TrackedDataHandle<any, any, TEmitEvent, TConsumeEvent>,
    handler: SubscribeHandler<TEmitEvent>,
    receiver: Processable
): TrackedDataUnsubscribe {
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
            removeVertex(this.emitter);
            delete this.emitter;
        }
    };
}

function subscriptionEmitterFlush(this: SubscriptionEmitter<any>) {
    for (let i = 0; i < this.subscribers.length; ++i) {
        const subscriber = this.subscribers[i];
        subscriber(
            SubscribeHandlerType.EVENTS,
            this.events,
            this.subscriberOffset[i]
        );
        this.subscriberOffset[i] = 0;
    }
    this.events.splice(0, this.events.length);
    return true;
}

function modelDestroy(this: TrackedDataHandle<any, any, any, any>) {
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
        unmarkRoot(this.consumer);
        removeVertex(this.consumer);
        delete this.consumer;
    }
    if (this.emitter) {
        removeVertex(this.emitter);
        delete this.emitter;
    }
    tdHandleMap.delete(this.revocable.proxy);
    tdHandleMap.delete(this.target);
    this.revocable.revoke();
    this.target = null;
    this.revocable.proxy = null;
}
