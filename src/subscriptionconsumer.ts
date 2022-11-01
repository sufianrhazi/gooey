import {
    Processable,
    Retainable,
    addHardEdge,
    removeHardEdge,
    addSoftEdge,
    removeSoftEdge,
    markDirty,
    addVertex,
    retain,
    release,
    removeVertex,
} from './engine';
import {
    SymProcessable,
    SymDebugName,
    SymAlive,
    SymDead,
    SymRecalculate,
    SymRefcount,
} from './symbols';
import { Field } from './field';
import { SubscriptionEmitter } from './subscriptionemitter';

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
    declare [SymProcessable]: true;
    declare [SymDebugName]: string;

    [SymRecalculate]() {
        for (const emitEvent of this.handler(this.target, this.events)) {
            this.transformEmitter.addEvent(emitEvent);
        }
        this.events.splice(0, this.events.length);
        return false;
    }

    // Retainable
    declare [SymRefcount]: number;

    [SymAlive]() {
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

    [SymDead]() {
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
        this[SymRefcount] = 0;
        this[SymProcessable] = true;
        this[SymDebugName] = `consumer:${debugName}`;
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
