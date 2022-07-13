import { Processable, Retainable, SymProcessable, SymDebugName, SymAlive, SymDead, SymRecalculate, SymRefcount } from './engine';
import { Field } from './field';
import { SubscriptionEmitter } from './subscriptionemitter';
declare type SubscriptionConsumerHandler<TData, TConsumeEvent, TEmitEvent> = {
    bivarianceHack(target: TData, event: TConsumeEvent): IterableIterator<TEmitEvent>;
}['bivarianceHack'];
export declare class SubscriptionConsumer<TData, TConsumeEvent, TEmitEvent> implements Processable, Retainable {
    private target;
    private handler;
    private events;
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
    constructor(target: TData, sourceEmitter: SubscriptionEmitter<TConsumeEvent>, transformEmitter: SubscriptionEmitter<TEmitEvent>, handler: SubscriptionConsumerHandler<TData, TConsumeEvent, TEmitEvent>, debugName: string);
    addEvent(event: TConsumeEvent): void;
    addField(field: Field<any>): void;
    removeField(field: Field<any>): void;
}
export {};
//# sourceMappingURL=subscriptionconsumer.d.ts.map