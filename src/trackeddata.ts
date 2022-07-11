import {
    Retainable,
    notifyCreate,
    notifyRead,
    SymAlive,
    SymDead,
    SymRefcount,
} from './engine';
import { FieldMap } from './fieldmap';
import { field as makeField, Field } from './field';
import { SubscriptionEmitter } from './subscriptionemitter';
import { SubscriptionConsumer } from './subscriptionconsumer';

const SymTDHandle = Symbol('tdHandle');

interface TrackedDataHandle<TData, TMethods, TEmitEvent, TConsumeEvent> {
    fieldMap: FieldMap;
    keys: Set<string>;
    keysField: Field<number>;
    dataAccessor: DataAccessor;
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

    const keys = new Set<string>(Object.keys(target));
    const keysField = makeField(`${debugName}:@keys`, keys.size);
    const emitter = new SubscriptionEmitter<TEmitEvent>(debugName);

    let consumer: null | SubscriptionConsumer<
        TData,
        TConsumeEvent,
        TEmitEvent
    > = null;
    if (derivedEmitter && handleEvent) {
        consumer = new SubscriptionConsumer(
            target,
            derivedEmitter,
            emitter,
            handleEvent,
            debugName
        );
    }

    const fieldMap = new FieldMap(consumer, emitter, debugName);

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
            const field = fieldMap.getOrMake(prop, value);
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
            const field = fieldMap.getOrMake(prop, value);
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
            const field = fieldMap.getOrMake(prop, value);
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
                fieldMap.delete(prop);
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
        dataAccessor,
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
