import {
    Processable,
    Retainable,
    notifyCreate,
    notifyRead,
    addHardEdge,
    removeHardEdge,
    addSoftEdge,
    removeSoftEdge,
    markDirty,
    addVertex,
    retain,
    release,
    removeVertex,
    SymProcessable,
    SymDebugName,
    SymAlive,
    SymDead,
    SymRecalculate,
    SymRefcount,
} from './engine';
import * as log from './log';
import { field as makeField, Field } from './field';

const SymTDHandle = Symbol('tdHandle');

type FieldMap = Map<string, Field<any>>;

type SubscriptionEmitterHandler<TEmitEvent> = {
    bivarianceHack(events: TEmitEvent[], index: number): void;
}['bivarianceHack'];

export class SubscriptionEmitter<TEmitEvent>
    implements Processable, Retainable
{
    private subscribers: SubscriptionEmitterHandler<TEmitEvent>[];
    private subscriberOffset: number[];
    private events: TEmitEvent[];
    private fieldMap: FieldMap;
    private isActive: boolean;

    // Processable
    [SymProcessable]: true;
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
            removeSoftEdge(field, this);
            release(field);
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
        this[SymProcessable] = true;
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

    subscribe(handler: SubscriptionEmitterHandler<TEmitEvent>) {
        this.subscribers.push(handler);
        this.subscriberOffset.push(this.events.length);
        return () => {
            const index = this.subscribers.indexOf(handler);
            if (index === -1) return;
            this.subscribers.splice(index, 1);
            this.subscriberOffset.splice(index, 1);
        };
    }
}

type SubscriptionConsumerHandler<TData, TConsumeEvent, TEmitEvent> = {
    bivarianceHack(
        target: TData,
        event: TConsumeEvent
    ): IterableIterator<TEmitEvent>;
}['bivarianceHack'];

export class SubscriptionConsumer<TData, TConsumeEvent, TEmitEvent>
    implements Processable, Retainable
{
    private target: TData;
    private handler: SubscriptionConsumerHandler<
        TData,
        TConsumeEvent,
        TEmitEvent
    >;
    private events: TConsumeEvent[];
    private fieldMap: FieldMap;
    private isActive: boolean;
    private sourceEmitter: SubscriptionEmitter<TConsumeEvent>;
    private transformEmitter: SubscriptionEmitter<TEmitEvent>;
    private unsubscribe?: () => void;

    // Processable
    [SymProcessable]: true;
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
        for (const field of this.fieldMap.values()) {
            retain(field);
            addSoftEdge(this, field);
        }
        retain(this.sourceEmitter);
        addHardEdge(this.sourceEmitter, this);
        this.unsubscribe = this.sourceEmitter.subscribe((events, offset) => {
            for (let i = offset; i < events.length; ++i) {
                this.addEvent(events[i]);
            }
        });
    }

    [SymDead]() {
        if (this.unsubscribe) {
            this.unsubscribe();
            removeHardEdge(this.sourceEmitter, this);
            release(this.sourceEmitter);
        }
        this.events.splice(0, this.events.length);
        for (const field of this.fieldMap.values()) {
            removeSoftEdge(this, field);
            release(field);
        }
        removeVertex(this);
        this.isActive = false;
    }

    constructor(
        target: TData,
        fieldMap: FieldMap,
        sourceEmitter: SubscriptionEmitter<TConsumeEvent>,
        transformEmitter: SubscriptionEmitter<TEmitEvent>,
        handler: SubscriptionConsumerHandler<TData, TConsumeEvent, TEmitEvent>,
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
        this[SymProcessable] = true;
        this[SymDebugName] = `consumer:${debugName}`;
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
    keysField: Field<number>;
    emitter: SubscriptionEmitter<TEmitEvent>;
    consumer: null | SubscriptionConsumer<TData, TConsumeEvent, TEmitEvent>;
    target: any;
    revocable: {
        proxy: TrackedData<TData, TMethods, TEmitEvent, TConsumeEvent>;
        revoke: () => void;
    };
}

export type TrackedData<TData, TMethods, TEmitEvent, TConsumeEvent> = TData &
    TMethods & {
        [SymTDHandle]: TrackedDataHandle<
            TData,
            TMethods,
            TEmitEvent,
            TConsumeEvent
        >;
    };

export function getTrackedDataHandle<
    TData,
    TMethods,
    TEmitEvent,
    TConsumeEvent
>(
    trackedData: TrackedData<TData, TMethods, TEmitEvent, TConsumeEvent>
): undefined | TrackedDataHandle<TData, TMethods, TEmitEvent, TConsumeEvent> {
    return trackedData[SymTDHandle];
}

export interface DataAccessor {
    get: (prop: string | symbol, receiver: any) => any;
    has: (prop: string | symbol) => any;
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
    TMethods extends Retainable,
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
    }

    const emitEvent = (event: TEmitEvent) => {
        emitter.addEvent(event);
    };

    const dataAccessor: DataAccessor = {
        get: (prop, receiver) => {
            if (prop === SymTDHandle) {
                return tdHandle;
            }
            if (prop === SymRefcount || prop === SymAlive || prop === SymDead) {
                return methods[
                    prop as
                        | typeof SymRefcount
                        | typeof SymAlive
                        | typeof SymDead
                ];
            }
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
            notifyRead(field);
            return value;
        },
        peekHas: (prop) => {
            return Reflect.has(target, prop);
        },
        has: (prop) => {
            if (prop === SymRefcount || prop === SymAlive || prop === SymDead) {
                return prop in methods;
            }
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
            notifyRead(field);
            return value;
        },
        set: (prop, value, receiver) => {
            if (prop === SymRefcount) {
                methods[prop as typeof SymRefcount] = value;
                return true;
            }
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
            if (prop === SymRefcount || prop === SymAlive || prop === SymDead) {
                return false; // nope
            }
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

    const revocable = Proxy.revocable<
        TrackedData<TData, TMethods, TEmitEvent, TConsumeEvent>
    >(target as TrackedData<TData, TMethods, TEmitEvent, TConsumeEvent>, {
        get: (target, prop, receiver) =>
            proxyHandler.get(dataAccessor, emitEvent, prop, receiver),
        has: (target, prop) => proxyHandler.has(dataAccessor, emitEvent, prop),
        set: (target, prop, value, receiver) =>
            proxyHandler.set(dataAccessor, emitEvent, prop, value, receiver),
        deleteProperty: (target, prop) =>
            proxyHandler.delete(dataAccessor, emitEvent, prop),
        ownKeys: () => {
            const keys = tdHandle.keys;
            tdHandle.keysField.get(); // force a read to add a dependency on keys
            return [...keys];
        },
    });
    const tdHandle: TrackedDataHandle<
        TData,
        TMethods,
        TEmitEvent,
        TConsumeEvent
    > = {
        fieldMap: fieldMap,
        keysField: keysField,
        keys: keys,
        target,
        revocable,
        emitter,
        consumer,
    };
    notifyCreate(revocable.proxy);
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
