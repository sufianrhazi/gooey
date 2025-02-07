import type { JSXRenderable } from '../viewcontroller/jsx';
import type { Retainable } from './engine';
import { notifyRead } from './engine';
import { Field } from './field';
import { FieldMap } from './fieldmap';
import { SubscriptionConsumer } from './subscriptionconsumer';
import { SubscriptionEmitter } from './subscriptionemitter';

export class TrackedDataHandle<
    TData extends object,
    TMethods extends Retainable & JSXRenderable,
    TEmitEvent,
    TConsumeEvent,
> {
    declare target: TData;
    declare methods: TMethods;

    declare fieldMap: FieldMap;
    declare keys: Set<string>;
    declare keysField: Field<number>;
    declare dataAccessor: DataAccessor;
    declare emitter: SubscriptionEmitter<TEmitEvent>;
    declare consumer: null | SubscriptionConsumer<
        TData,
        TConsumeEvent,
        TEmitEvent
    >;
    declare revocable: {
        proxy: TrackedData<TData, TMethods, TEmitEvent, TConsumeEvent>;
        revoke: () => void;
    };

    constructor(
        target: TData,
        proxyHandler: ProxyHandler<TEmitEvent>,
        methods: TMethods,
        derivedEmitter: null | SubscriptionEmitter<TConsumeEvent>,
        handleEvents:
            | null
            | ((
                  target: TData,
                  events: TConsumeEvent[]
              ) => IterableIterator<TEmitEvent>),
        appendEmitEvent: (events: TEmitEvent[], event: TEmitEvent) => void,
        appendConsumeEvent: (
            events: TConsumeEvent[],
            event: TConsumeEvent
        ) => void,
        debugName = 'trackeddata'
    ) {
        this.target = target;
        this.methods = methods;

        this.emitter = new SubscriptionEmitter<TEmitEvent>(
            appendEmitEvent,
            debugName
        );

        if (derivedEmitter && handleEvents) {
            this.consumer = new SubscriptionConsumer(
                target,
                derivedEmitter,
                this.emitter,
                handleEvents,
                appendConsumeEvent,
                debugName
            );
        } else {
            this.consumer = null;
        }

        this.keys = new Set<string>(Object.keys(target));
        this.keysField = new Field(this.keys.size, `${debugName}:@keys`);
        this.fieldMap = new FieldMap(
            this.keysField,
            this.consumer,
            this.emitter,
            debugName
        );

        const emitEvent = (event: TEmitEvent) => {
            this.emitter.addEvent(event);
        };

        this.dataAccessor = {
            get: (prop, receiver) => {
                if (prop === '__tdHandle') {
                    return this;
                }
                if (prop === '__debugName') {
                    return debugName;
                }
                if (prop === '__processable') {
                    return false;
                }
                if (
                    prop === '__refcount' ||
                    prop === '__alive' ||
                    prop === '__dead' ||
                    prop === '__renderNode'
                ) {
                    return methods[prop];
                }
                if (typeof prop === 'symbol') {
                    return Reflect.get(this.target, prop, receiver);
                }
                if (prop in methods) {
                    return (methods as any)[prop];
                }
                const value = Reflect.get(this.target, prop, receiver);
                const field = this.fieldMap.getOrMake(prop, value);
                notifyRead(this.revocable.proxy);
                notifyRead(field);
                return value;
            },
            peekHas: (prop) => {
                return Reflect.has(target, prop);
            },
            has: (prop) => {
                if (
                    prop === '__refcount' ||
                    prop === '__alive' ||
                    prop === '__dead'
                ) {
                    return prop in methods;
                }
                if (prop === '__processable') {
                    return true;
                }
                if (prop in methods) {
                    return true;
                }
                if (typeof prop === 'symbol') {
                    return Reflect.has(this.target, prop);
                }
                const value = Reflect.has(target, prop);
                const field = this.fieldMap.getOrMake(prop, value);
                notifyRead(this.revocable.proxy);
                notifyRead(field);
                return value;
            },
            set: (prop, value, receiver) => {
                if (prop === '__refcount') {
                    methods[prop] = value;
                    return true;
                }
                if (prop in methods) {
                    return false; // Prevent writes to owned methods
                }
                if (typeof prop === 'symbol') {
                    return Reflect.set(this.target, prop, value, receiver);
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
                    prop === '__refcount' ||
                    prop === '__alive' ||
                    prop === '__dead' ||
                    prop === '__processable'
                ) {
                    return false; // Prevent deletes of internal symbols
                }
                if (prop in methods) {
                    return false; // Prevent deletes of owned methods
                }
                if (typeof prop === 'symbol') {
                    return Reflect.deleteProperty(this.target, prop);
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
    }
}

export type TrackedData<
    TData extends object,
    TMethods extends Retainable & JSXRenderable,
    TEmitEvent,
    TConsumeEvent,
> = TData &
    TMethods & {
        __tdHandle: TrackedDataHandle<
            TData,
            TMethods,
            TEmitEvent,
            TConsumeEvent
        >;
    };

export function getTrackedDataHandle<
    TData extends object,
    TMethods extends Retainable & JSXRenderable,
    TEmitEvent,
    TConsumeEvent,
>(
    trackedData: TrackedData<TData, TMethods, TEmitEvent, TConsumeEvent>
): undefined | TrackedDataHandle<TData, TMethods, TEmitEvent, TConsumeEvent> {
    return trackedData.__tdHandle;
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
