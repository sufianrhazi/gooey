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
        event: TConsumeEvent
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

    // Processable
    declare [SymProcessable]: true;
    declare [SymDebugName]: string;

    [SymRecalculate]() {
        for (const event of this.events) {
            for (const emitEvent of this.handler(this.target, event)) {
                this.transformEmitter.addEvent(emitEvent);
            }
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
        this.unsubscribe = this.sourceEmitter.subscribe((events, offset) => {
            for (let i = offset; i < events.length; ++i) {
                this.addEvent(events[i]);
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
        debugName: string
    ) {
        this.target = target;
        this.handler = handler;
        this.events = [];
        this.isActive = false;
        this.sourceEmitter = sourceEmitter;
        this.transformEmitter = transformEmitter;
        this[SymRefcount] = 0;
        this[SymProcessable] = true;
        this[SymDebugName] = `consumer:${debugName}`;
    }

    addEvent(event: TConsumeEvent) {
        if (!this.isActive) return;
        const length = this.events.push(event);
        if (length === 1) {
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
