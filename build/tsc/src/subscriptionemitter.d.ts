import { Processable, Retainable } from './engine';
type SubscriptionEmitterHandler<TEmitEvent> = {
    bivarianceHack(events: TEmitEvent[]): void;
}['bivarianceHack'];
export declare class SubscriptionEmitter<TEmitEvent> implements Processable, Retainable {
    /** Per-emitter function to add an event to the sequence of events for a subscriber */
    private appendEvent;
    private subscribers;
    private isActive;
    __processable: true;
    __debugName: string;
    __recalculate(): boolean;
    __refcount: number;
    __alive(): void;
    __dead(): void;
    constructor(appendEvent: (events: TEmitEvent[], event: TEmitEvent) => void, debugName: string);
    addEvent(event: TEmitEvent): void;
    subscribe(handler: SubscriptionEmitterHandler<TEmitEvent>): () => void;
}
export {};
//# sourceMappingURL=subscriptionemitter.d.ts.map