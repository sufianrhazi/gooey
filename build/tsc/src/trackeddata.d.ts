import { Processable, Retainable, SymProcessable, SymDebugName, SymAlive, SymDead, SymRecalculate, SymRefcount } from './engine';
import { Field } from './field';
declare const SymTDHandle: unique symbol;
declare type FieldMap = Map<string, Field<any>>;
declare type SubscriptionEmitterHandler<TEmitEvent> = {
    bivarianceHack(events: TEmitEvent[], index: number): void;
}['bivarianceHack'];
export declare class SubscriptionEmitter<TEmitEvent> implements Processable, Retainable {
    private subscribers;
    private subscriberOffset;
    private events;
    private fieldMap;
    private isActive;
    [SymProcessable]: true;
    [SymDebugName]: string;
    [SymRecalculate](): boolean;
    [SymRefcount]: number;
    [SymAlive](): void;
    [SymDead](): void;
    constructor(fieldMap: FieldMap, debugName: string);
    addEvent(event: TEmitEvent): void;
    addField(field: Field<any>): void;
    subscribe(handler: SubscriptionEmitterHandler<TEmitEvent>): () => void;
}
declare type SubscriptionConsumerHandler<TData, TConsumeEvent, TEmitEvent> = {
    bivarianceHack(target: TData, event: TConsumeEvent): IterableIterator<TEmitEvent>;
}['bivarianceHack'];
export declare class SubscriptionConsumer<TData, TConsumeEvent, TEmitEvent> implements Processable, Retainable {
    private target;
    private handler;
    private events;
    private fieldMap;
    private isActive;
    private sourceEmitter;
    private transformEmitter;
    private unsubscribe?;
    [SymProcessable]: true;
    [SymDebugName]: string;
    [SymRecalculate](): boolean;
    [SymRefcount]: number;
    [SymAlive](): void;
    [SymDead](): void;
    constructor(target: TData, fieldMap: FieldMap, sourceEmitter: SubscriptionEmitter<TConsumeEvent>, transformEmitter: SubscriptionEmitter<TEmitEvent>, handler: SubscriptionConsumerHandler<TData, TConsumeEvent, TEmitEvent>, debugName: string);
    addEvent(event: TConsumeEvent): void;
    addField(field: Field<any>): void;
}
export declare enum EventEmitterType {
    ADD = 0,
    SET = 1,
    DEL = 2
}
export interface EventEmitter<TEmitEvent> {
    (type: EventEmitterType.ADD, prop: string, value: any): Iterable<TEmitEvent>;
    (type: EventEmitterType.SET, prop: string, value: any): Iterable<TEmitEvent>;
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
export declare type TrackedData<TData, TMethods, TEmitEvent, TConsumeEvent> = TData & TMethods & {
    [SymTDHandle]: TrackedDataHandle<TData, TMethods, TEmitEvent, TConsumeEvent>;
};
export declare function getTrackedDataHandle<TData, TMethods, TEmitEvent, TConsumeEvent>(trackedData: TrackedData<TData, TMethods, TEmitEvent, TConsumeEvent>): undefined | TrackedDataHandle<TData, TMethods, TEmitEvent, TConsumeEvent>;
export interface DataAccessor {
    get: (prop: string | symbol, receiver: any) => any;
    has: (prop: string | symbol) => any;
    peekHas: (prop: string | symbol) => any;
    set: (prop: string | symbol, value: any, receiver: any) => any;
    delete: (prop: string | symbol) => boolean;
}
export interface ProxyHandler<TEmitEvent> {
    get: (dataAccessor: DataAccessor, emitter: (event: TEmitEvent) => void, prop: string | symbol, receiver: any) => any;
    has: (dataAccessor: DataAccessor, emitter: (event: TEmitEvent) => void, prop: string | symbol) => any;
    set: (dataAccessor: DataAccessor, emitter: (event: TEmitEvent) => void, prop: string | symbol, value: any, receiver: any) => any;
    delete: (dataAccessor: DataAccessor, emitter: (event: TEmitEvent) => void, prop: string | symbol) => boolean;
}
export declare function makeTrackedData<TData extends {}, TMethods extends Retainable, TEmitEvent, TConsumeEvent>(target: TData, proxyHandler: ProxyHandler<TEmitEvent>, methods: TMethods, derivedEmitter: null | SubscriptionEmitter<TConsumeEvent>, handleEvent: null | ((target: TData, event: TConsumeEvent) => IterableIterator<TEmitEvent>), _debugName?: string): TrackedDataHandle<TData, TMethods, TEmitEvent, TConsumeEvent>;
export {};
//# sourceMappingURL=trackeddata.d.ts.map