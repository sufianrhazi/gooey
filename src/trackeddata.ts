import {
    Processable,
    Retainable,
    addDependencyToActiveCalculation,
    addHardEdge,
    removeHardEdge,
    addSoftEdge,
    removeSoftEdge,
    markDirty,
    addVertex,
    markRoot,
    unmarkRoot,
    retain,
    release,
    removeVertex,
    SymDebugName,
    SymAlive,
    SymDead,
    SymRecalculate,
    SymRefcount,
} from './engine';
import * as log from './log';
import { field as makeField, Field } from './field';

type FieldMap = Map<string, Field<any>>;

export class SubscriptionEmitter<TEmitEvent>
    implements Processable, Retainable
{
    private subscribers: SubscribeHandler<TEmitEvent>[];
    private subscriberOffset: number[];
    private events: TEmitEvent[];
    private fieldMap: FieldMap;
    private isActive: boolean;

    // Processable
    [SymDebugName]: string;

    [SymRecalculate]() {
        for (let i = 0; i < this.subscribers.length; ++i) {
            const subscriber = this.subscribers[i];
            subscriber(this.events, this.subscriberOffset[i]);
            this.subscriberOffset[i] = 0;
        }
        this.events.splice(0, this.events.length);
        return true;
    }

    // Retainable
    [SymRefcount]: number;

    [SymAlive]() {
        this.isActive = true;
        addVertex(this);
        for (const field of this.fieldMap.values()) {
            retain(field);
            addSoftEdge(field, this);
        }
    }

    [SymDead]() {
        log.assert(
            this.subscribers.length === 0,
            'released subscription emitter that had subscribers'
        );
        log.assert(
            this.subscriberOffset.length === 0,
            'released subscription emitter that had subscribers'
        );
        this.events.splice(0, this.events.length);
        for (const field of this.fieldMap.values()) {
            release(field);
            removeSoftEdge(field, this);
        }
        removeVertex(this);
        this.isActive = false;
    }

    constructor(fieldMap: FieldMap, debugName: string) {
        this.subscribers = [];
        this.subscriberOffset = [];
        this.events = [];
        this.fieldMap = fieldMap;
        this.isActive = false;
        this[SymRefcount] = 0;
        this[SymDebugName] = `emitter:${debugName}`;
    }

    addEvent(event: TEmitEvent) {
        if (!this.isActive) return;
        const length = this.events.push(event);
        if (length === 1) {
            markDirty(this);
        }
    }

    addField(field: Field<any>) {
        if (this.isActive) {
            retain(field);
            addSoftEdge(field, this);
        }
    }

    subscribe(receiver: Processable, handler: SubscribeHandler<TEmitEvent>) {
        addHardEdge(this, receiver);
        this.subscribers.push(handler);
        this.subscriberOffset.push(this.events.length);
        return () => {
            const index = this.subscribers.indexOf(handler);
            if (index === -1) return;
            this.subscribers.slice(index, 1);
            this.subscriberOffset.slice(index, 1);
            removeHardEdge(this, receiver);
        };
    }
}

export class SubscriptionConsumer<TData, TConsumeEvent, TEmitEvent>
    implements Processable, Retainable
{
    private target: TData;
    private handler: (
        target: TData,
        event: TConsumeEvent
    ) => IterableIterator<TEmitEvent>;
    private events: TConsumeEvent[];
    private fieldMap: FieldMap;
    private isActive: boolean;
    private sourceEmitter: SubscriptionEmitter<TConsumeEvent>;
    private transformEmitter: SubscriptionEmitter<TEmitEvent>;
    private unsubscribe?: () => void;

    // Processable
    [SymDebugName]: string;

    [SymRecalculate]() {
        for (const event of this.events) {
            for (const emitEvent of this.handler(this.target, event)) {
                this.transformEmitter.addEvent(emitEvent);
            }
        }
        this.events.splice(0, this.events.length);
        return false;
    }

    // Retainable
    [SymRefcount]: number;

    [SymAlive]() {
        this.isActive = true;
        addVertex(this);
        markRoot(this);
        for (const field of this.fieldMap.values()) {
            retain(field);
            addSoftEdge(this, field);
        }
        this.unsubscribe = this.sourceEmitter.subscribe(
            this,
            (events, offset) => {
                for (let i = offset; i < events.length; ++i) {
                    this.addEvent(events[i]);
                }
            }
        );
    }

    [SymDead]() {
        this.unsubscribe?.();
        this.events.splice(0, this.events.length);
        for (const field of this.fieldMap.values()) {
            removeSoftEdge(this, field);
            release(field);
        }
        unmarkRoot(this);
        removeVertex(this);
        this.isActive = false;
    }

    constructor(
        target: TData,
        fieldMap: FieldMap,
        sourceEmitter: SubscriptionEmitter<TConsumeEvent>,
        transformEmitter: SubscriptionEmitter<TEmitEvent>,
        handler: (
            target: TData,
            event: TConsumeEvent
        ) => IterableIterator<TEmitEvent>,
        debugName: string
    ) {
        this.target = target;
        this.handler = handler;
        this.events = [];
        this.fieldMap = fieldMap;
        this.isActive = false;
        this.sourceEmitter = sourceEmitter;
        this.transformEmitter = transformEmitter;
        this[SymRefcount] = 0;
        this[SymDebugName] = `consumer:${debugName}`;
        retain(sourceEmitter);
    }

    addEvent(event: TConsumeEvent) {
        if (!this.isActive) return;
        const length = this.events.push(event);
        if (length === 1) {
            markDirty(this);
        }
    }

    addField(field: Field<any>) {
        if (this.isActive) {
            retain(field);
            addSoftEdge(this, field);
        }
    }
}

interface SubscribeHandler<TEmitEvent> {
    (events: TEmitEvent[], index: number): void;
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

interface TrackedDataHandle<TData, TMethods, TEmitEvent, TConsumeEvent> {
    fieldMap: FieldMap;
    keys: Set<string>;
    subscribe: (
        handler: SubscribeHandler<TEmitEvent>,
        receiver: Processable
    ) => TrackedDataUnsubscribe;
    keysField: Field<number>;
    emitter: SubscriptionEmitter<TEmitEvent>;
    consumer: null | SubscriptionConsumer<TData, TConsumeEvent, TEmitEvent>;
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
    TMethods,
    TEmitEvent,
    TConsumeEvent
>(
    target: TData,
    proxyHandler: ProxyHandler<TEmitEvent>,
    methods: TMethods,
    derivedEmitter: null | SubscriptionEmitter<TConsumeEvent>,
    handleEvent:
        | null
        | ((
              target: TData,
              event: TConsumeEvent
          ) => IterableIterator<TEmitEvent>),
    _debugName?: string
): TrackedDataHandle<TData, TMethods, TEmitEvent, TConsumeEvent> {
    const debugName = _debugName ?? 'trackeddata';
    const fieldMap: FieldMap = new Map();
    const keys = new Set<string>(Object.keys(target));
    const keysField = makeField(`${debugName}:@keys`, keys.size);

    const emitter = new SubscriptionEmitter<TEmitEvent>(fieldMap, debugName);

    let consumer: null | SubscriptionConsumer<
        TData,
        TConsumeEvent,
        TEmitEvent
    > = null;
    if (derivedEmitter && handleEvent) {
        consumer = new SubscriptionConsumer(
            target,
            fieldMap,
            derivedEmitter,
            emitter,
            handleEvent,
            debugName
        );
        retain(consumer);
    }

    const emitEvent = (event: TEmitEvent) => {
        emitter.addEvent(event);
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
            const field = getOrMakeField(
                debugName,
                fieldMap,
                consumer,
                emitter,
                prop,
                value
            );
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
            const field = getOrMakeField(
                debugName,
                fieldMap,
                consumer,
                emitter,
                prop,
                value
            );
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
            const field = getOrMakeField(
                debugName,
                fieldMap,
                consumer,
                emitter,
                prop,
                value
            );
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

    const revocable = Proxy.revocable<TrackedData<TData, TMethods>>(
        target as TrackedData<TData, TMethods>,
        {
            get: (target, prop, receiver) =>
                proxyHandler.get(dataAccessor, emitEvent, prop, receiver),
            has: (target, prop) =>
                proxyHandler.has(dataAccessor, emitEvent, prop),
            set: (target, prop, value, receiver) =>
                proxyHandler.set(
                    dataAccessor,
                    emitEvent,
                    prop,
                    value,
                    receiver
                ),
            deleteProperty: (target, prop) =>
                proxyHandler.delete(dataAccessor, emitEvent, prop),
            ownKeys: () => {
                const keys = tdHandle.keys;
                tdHandle.keysField.get(); // force a read to add a dependency on keys
                return [...keys];
            },
        }
    );
    const tdHandle: TrackedDataHandle<
        TData,
        TMethods,
        TEmitEvent,
        TConsumeEvent
    > = {
        fieldMap: fieldMap,
        keysField: keysField,
        keys: keys,
        subscribe: modelSubscribe,
        target,
        revocable,
        emitter,
        consumer,
    };
    tdHandleMap.set(target, tdHandle);
    tdHandleMap.set(revocable.proxy, tdHandle);
    return tdHandle;
}

function getOrMakeField(
    debugPrefix: string,
    fieldMap: FieldMap,
    consumer: null | SubscriptionConsumer<any, any, any>,
    emitter: SubscriptionEmitter<any>,
    prop: string,
    value: any
) {
    let field = fieldMap.get(prop);
    if (!field) {
        field = makeField(`${debugPrefix}:${prop}`, value);
        fieldMap.set(prop, field);
        consumer?.addField(field);
        emitter.addField(field);
    }
    return field;
}

function modelSubscribe<TEmitEvent, TConsumeEvent>(
    this: TrackedDataHandle<any, any, TEmitEvent, TConsumeEvent>,
    handler: SubscribeHandler<TEmitEvent>,
    receiver: Processable
): TrackedDataUnsubscribe {
    retain(this.emitter);
    const unsubscribe = this.emitter.subscribe(receiver, handler);

    return () => {
        unsubscribe();
        release(this.emitter);
    };
}
