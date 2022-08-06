import { Processable, Retainable } from './engine';
import { SymProcessable, SymDebugName, SymAlive, SymDead, SymRecalculate, SymRefcount } from './symbols';
import { Field } from './field';
declare type SubscriptionEmitterHandler<TEmitEvent> = {
    bivarianceHack(events: TEmitEvent[], index: number): void;
}['bivarianceHack'];
export declare class SubscriptionEmitter<TEmitEvent> implements Processable, Retainable {
    private subscribers;
    private subscriberOffset;
    private events;
    private isActive;
    [SymProcessable]: true;
    [SymDebugName]: string;
    [SymRecalculate](): boolean;
    [SymRefcount]: number;
    [SymAlive](): void;
    [SymDead](): void;
    constructor(debugName: string);
    addEvent(event: TEmitEvent): void;
    addField(field: Field<any>): void;
    removeField(field: Field<any>): void;
    subscribe(handler: SubscriptionEmitterHandler<TEmitEvent>): () => void;
}
export {};
//# sourceMappingURL=subscriptionemitter.d.ts.map