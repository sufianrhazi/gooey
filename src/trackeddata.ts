import { Retainable, notifyCreate, notifyRead } from './engine';
import { SymAlive, SymDead, SymRefcount, SymDebugName } from './symbols';
import { FieldMap } from './fieldmap';
import { Field } from './field';
import { SubscriptionEmitter } from './subscriptionemitter';
import { SubscriptionConsumer } from './subscriptionconsumer';

const SymTDHandle = Symbol('tdHandle');

export class TrackedDataHandle<
    TData extends object,
    TMethods extends Retainable,
    TEmitEvent,
    TConsumeEvent
> {
    target: TData;
    methods: TMethods;

    fieldMap: FieldMap;
    keys: Set<string>;
    keysField: Field<number>;
    dataAccessor: DataAccessor;
    emitter: SubscriptionEmitter<TEmitEvent>;
    consumer: null | SubscriptionConsumer<TData, TConsumeEvent, TEmitEvent>;
    revocable: {
        proxy: TrackedData<TData, TMethods, TEmitEvent, TConsumeEvent>;
        revoke: () => void;
    };

    constructor(
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
        debugName = 'trackeddata'
    ) {
        this.target = target;
        this.methods = methods;

        this.keys = new Set<string>(Object.keys(target));
        this.keysField = new Field(this.keys.size, `${debugName}:@keys`);

        this.emitter = new SubscriptionEmitter<TEmitEvent>(debugName);

        if (derivedEmitter && handleEvent) {
            this.consumer = new SubscriptionConsumer(
                target,
                derivedEmitter,
                this.emitter,
                handleEvent,
                debugName
            );
        } else {
            this.consumer = null;
        }

        this.fieldMap = new FieldMap(this.consumer, this.emitter, debugName);

        const emitEvent = (event: TEmitEvent) => {
            this.emitter.addEvent(event);
        };

        this.dataAccessor = {
            get: (prop, receiver) => {
                if (prop === SymTDHandle) {
                    return this;
                }
                if (prop === SymDebugName) {
                    return debugName;
                }
                if (
                    prop === SymRefcount ||
                    prop === SymAlive ||
                    prop === SymDead
                ) {
                    return methods[
                        prop as
                            | typeof SymRefcount
                            | typeof SymAlive
                            | typeof SymDead
                    ];
                }
                if (typeof prop === 'symbol') {
                    return Reflect.get(this.target, prop, receiver);
                }
                if (prop in methods) {
                    return (methods as any)[prop];
                }
                const value = Reflect.get(this.target, prop, receiver);
                const field = this.fieldMap.getOrMake(prop, value);
                notifyRead(field);
                return value;
            },
            peekHas: (prop) => {
                return Reflect.has(target, prop);
            },
            has: (prop) => {
                if (
                    prop === SymRefcount ||
                    prop === SymAlive ||
                    prop === SymDead
                ) {
                    return prop in methods;
                }
                if (typeof prop === 'symbol') {
                    return Reflect.has(target, prop);
                }
                if (prop in methods) {
                    return true;
                }
                const value = Reflect.has(target, prop);
                const field = this.fieldMap.getOrMake(prop, value);
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
                const field = this.fieldMap.getOrMake(prop, value);
                field.set(value);
                if (!hadProp) {
                    this.keys.add(prop);
                    this.keysField.set(this.keys.size);
                }
                return Reflect.set(target, prop, value, this.revocable.proxy);
            },
            delete: (prop) => {
                if (
                    prop === SymRefcount ||
                    prop === SymAlive ||
                    prop === SymDead
                ) {
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
                    this.keys.delete(prop);
                    this.keysField.set(this.keys.size);
                    this.fieldMap.delete(prop);
                }
                return result;
            },
        };

        this.revocable = Proxy.revocable<
            TrackedData<TData, TMethods, TEmitEvent, TConsumeEvent>
        >(target as TrackedData<TData, TMethods, TEmitEvent, TConsumeEvent>, {
            get: (target, prop, receiver) =>
                proxyHandler.get(this.dataAccessor, emitEvent, prop, receiver),
            has: (target, prop) =>
                proxyHandler.has(this.dataAccessor, emitEvent, prop),
            set: (target, prop, value, receiver) =>
                proxyHandler.set(
                    this.dataAccessor,
                    emitEvent,
                    prop,
                    value,
                    receiver
                ),
            deleteProperty: (target, prop) =>
                proxyHandler.delete(this.dataAccessor, emitEvent, prop),
            ownKeys: () => {
                const keys = this.keys;
                this.keysField.get(); // force a read to add a dependency on keys
                return [...keys];
            },
        });

        notifyCreate(this.revocable.proxy);
    }
}

export type TrackedData<
    TData extends object,
    TMethods extends Retainable,
    TEmitEvent,
    TConsumeEvent
> = TData &
    TMethods & {
        [SymTDHandle]: TrackedDataHandle<
            TData,
            TMethods,
            TEmitEvent,
            TConsumeEvent
        >;
    };

export function getTrackedDataHandle<
    TData extends object,
    TMethods extends Retainable,
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
