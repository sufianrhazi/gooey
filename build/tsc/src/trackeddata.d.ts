import { Retainable } from './engine';
import { FieldMap } from './fieldmap';
import { Field } from './field';
import { SubscriptionEmitter } from './subscriptionemitter';
import { SubscriptionConsumer } from './subscriptionconsumer';
declare const SymTDHandle: unique symbol;
export declare class TrackedDataHandle<TData extends object, TMethods extends Retainable, TEmitEvent, TConsumeEvent> {
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
    constructor(target: TData, proxyHandler: ProxyHandler<TEmitEvent>, methods: TMethods, derivedEmitter: null | SubscriptionEmitter<TConsumeEvent>, handleEvent: null | ((target: TData, event: TConsumeEvent) => IterableIterator<TEmitEvent>), debugName?: string);
}
export declare type TrackedData<TData extends object, TMethods extends Retainable, TEmitEvent, TConsumeEvent> = TData & TMethods & {
    [SymTDHandle]: TrackedDataHandle<TData, TMethods, TEmitEvent, TConsumeEvent>;
};
export declare function getTrackedDataHandle<TData extends object, TMethods extends Retainable, TEmitEvent, TConsumeEvent>(trackedData: TrackedData<TData, TMethods, TEmitEvent, TConsumeEvent>): undefined | TrackedDataHandle<TData, TMethods, TEmitEvent, TConsumeEvent>;
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
export {};
//# sourceMappingURL=trackeddata.d.ts.map