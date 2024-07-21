import type { JSXRenderable } from '../viewcontroller/jsx';
import type { Retainable } from './engine';
import { Field } from './field';
import { FieldMap } from './fieldmap';
import { SubscriptionConsumer } from './subscriptionconsumer';
import { SubscriptionEmitter } from './subscriptionemitter';
export declare class TrackedDataHandle<TData extends object, TMethods extends Retainable & JSXRenderable, TEmitEvent, TConsumeEvent> {
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
    constructor(target: TData, proxyHandler: ProxyHandler<TEmitEvent>, methods: TMethods, derivedEmitter: null | SubscriptionEmitter<TConsumeEvent>, handleEvents: null | ((target: TData, events: TConsumeEvent[]) => IterableIterator<TEmitEvent>), appendEmitEvent: (events: TEmitEvent[], event: TEmitEvent) => void, appendConsumeEvent: (events: TConsumeEvent[], event: TConsumeEvent) => void, debugName?: string);
}
export type TrackedData<TData extends object, TMethods extends Retainable & JSXRenderable, TEmitEvent, TConsumeEvent> = TData & TMethods & {
    __tdHandle: TrackedDataHandle<TData, TMethods, TEmitEvent, TConsumeEvent>;
};
export declare function getTrackedDataHandle<TData extends object, TMethods extends Retainable & JSXRenderable, TEmitEvent, TConsumeEvent>(trackedData: TrackedData<TData, TMethods, TEmitEvent, TConsumeEvent>): undefined | TrackedDataHandle<TData, TMethods, TEmitEvent, TConsumeEvent>;
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
//# sourceMappingURL=trackeddata.d.ts.map