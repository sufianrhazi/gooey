import type { Processable, Retainable } from './engine';
import {
    addHardEdge,
    addSoftEdge,
    addVertex,
    markDirty,
    release,
    removeHardEdge,
    removeSoftEdge,
    removeVertex,
    retain,
} from './engine';
import type { Field } from './field';
import type { SubscriptionEmitter } from './subscriptionemitter';

type SubscriptionConsumerHandler<TData, TConsumeEvent, TEmitEvent> = {
    bivarianceHack(
        target: TData,
        events: TConsumeEvent[]
    ): IterableIterator<TEmitEvent>;
}['bivarianceHack'];

export class SubscriptionConsumer<TData, TConsumeEvent, TEmitEvent>
    implements Processable, Retainable
{
    private declare target: TData;
    private declare handler: SubscriptionConsumerHandler<
        TData,
        TConsumeEvent,
        TEmitEvent
    >;
    private declare events: TConsumeEvent[];
    private declare isActive: boolean;
    private declare sourceEmitter: SubscriptionEmitter<TConsumeEvent>;
    private declare transformEmitter: SubscriptionEmitter<TEmitEvent>;
    private declare unsubscribe?: () => void;

    // Note: for reasons I don't understand; this cannot be typed as:
    //     private declare appendEvent: (events: TConsumeEvent[], event: TConsumeEvent) => void;
    // without causing bizarre type errors across the application
    private declare appendEvent: (events: any[], event: any) => void;

    // Processable
    declare __processable: true;
    declare __debugName: string;

    __recalculate() {
        for (const emitEvent of this.handler(this.target, this.events)) {
            this.transformEmitter.addEvent(emitEvent);
        }
        this.events.splice(0, this.events.length);
        return false;
    }

    // Retainable
    declare __refcount: number;

    __alive() {
        this.isActive = true;
        addVertex(this);
        retain(this.sourceEmitter);
        addHardEdge(this.sourceEmitter, this);
        this.unsubscribe = this.sourceEmitter.subscribe((events) => {
            for (const event of events) {
                this.addEvent(event);
            }
        });
    }

    __dead() {
        if (this.unsubscribe) {
            this.unsubscribe();
            removeHardEdge(this.sourceEmitter, this);
            release(this.sourceEmitter);
        }
        this.events.splice(0, this.events.length);
        removeVertex(this);
        this.isActive = false;
    }

    constructor(
        target: TData,
        sourceEmitter: SubscriptionEmitter<TConsumeEvent>,
        transformEmitter: SubscriptionEmitter<TEmitEvent>,
        handler: SubscriptionConsumerHandler<TData, TConsumeEvent, TEmitEvent>,
        appendEvent: (events: TConsumeEvent[], event: TConsumeEvent) => void,
        debugName: string
    ) {
        this.target = target;
        this.handler = handler;
        this.events = [];
        this.isActive = false;
        this.sourceEmitter = sourceEmitter;
        this.transformEmitter = transformEmitter;
        this.appendEvent = appendEvent;
        this.__refcount = 0;
        this.__processable = true;
        this.__debugName = `consumer:${debugName}`;
    }

    addEvent(event: TConsumeEvent) {
        if (!this.isActive) return;
        const firstEvent = this.events.length === 0;
        this.appendEvent(this.events, event);
        if (firstEvent) {
            markDirty(this);
        }
    }

    addField(field: Field<any>) {
        if (this.isActive) {
            retain(field);
            addSoftEdge(this, field);
        }
    }

    removeField(field: Field<any>) {
        if (this.isActive) {
            removeSoftEdge(this, field);
            release(field);
        }
    }
}
