import { Processable, Retainable } from './engine';
import { Field } from './field';
import { SubscriptionEmitter } from './subscriptionemitter';
declare type SubscriptionConsumerHandler<TData, TConsumeEvent, TEmitEvent> = {
    bivarianceHack(target: TData, events: TConsumeEvent[]): IterableIterator<TEmitEvent>;
}['bivarianceHack'];
export declare class SubscriptionConsumer<TData, TConsumeEvent, TEmitEvent> implements Processable, Retainable {
    private target;
    private handler;
    private events;
    private isActive;
    private sourceEmitter;
    private transformEmitter;
    private unsubscribe?;
    private appendEvent;
    __processable: true;
    __debugName: string;
    __recalculate(): boolean;
    __refcount: number;
    __alive(): void;
    __dead(): void;
    constructor(target: TData, sourceEmitter: SubscriptionEmitter<TConsumeEvent>, transformEmitter: SubscriptionEmitter<TEmitEvent>, handler: SubscriptionConsumerHandler<TData, TConsumeEvent, TEmitEvent>, appendEvent: (events: TConsumeEvent[], event: TConsumeEvent) => void, debugName: string);
    addEvent(event: TConsumeEvent): void;
    addField(field: Field<any>): void;
    removeField(field: Field<any>): void;
}
export {};
//# sourceMappingURL=subscriptionconsumer.d.ts.map