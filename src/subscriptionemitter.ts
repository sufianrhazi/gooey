import {
    Processable,
    Retainable,
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
import * as log from './log';
import { Field } from './field';

type SubscriptionEmitterHandler<TEmitEvent> = {
    bivarianceHack(events: TEmitEvent[], index: number): void;
}['bivarianceHack'];

export class SubscriptionEmitter<TEmitEvent>
    implements Processable, Retainable
{
    private subscribers: SubscriptionEmitterHandler<TEmitEvent>[];
    private subscriberOffset: number[];
    private events: TEmitEvent[];
    private isActive: boolean;

    // Processable
    [SymProcessable]: true;
    [SymDebugName]: string;

    [SymRecalculate]() {
        for (let i = 0; i < this.subscribers.length; ++i) {
            const subscriber = this.subscribers[i];
            subscriber(this.events, this.subscriberOffset[i]);
            this.subscriberOffset[i] = 0;
        }
        this.events.splice(0, this.events.length);
        return true;
    }

    // Retainable
    [SymRefcount]: number;

    [SymAlive]() {
        this.isActive = true;
        addVertex(this);
    }

    [SymDead]() {
        log.assert(
            this.subscribers.length === 0,
            'released subscription emitter that had subscribers'
        );
        log.assert(
            this.subscriberOffset.length === 0,
            'released subscription emitter that had subscribers'
        );
        this.events.splice(0, this.events.length);
        removeVertex(this);
        this.isActive = false;
    }

    constructor(debugName: string) {
        this.subscribers = [];
        this.subscriberOffset = [];
        this.events = [];
        this.isActive = false;
        this[SymRefcount] = 0;
        this[SymProcessable] = true;
        this[SymDebugName] = `emitter:${debugName}`;
    }

    addEvent(event: TEmitEvent) {
        if (!this.isActive) return;
        const length = this.events.push(event);
        if (length === 1) {
            markDirty(this);
        }
    }

    addField(field: Field<any>) {
        if (this.isActive) {
            retain(field);
            addSoftEdge(field, this);
        }
    }

    removeField(field: Field<any>) {
        if (this.isActive) {
            removeSoftEdge(field, this);
            release(field);
        }
    }

    subscribe(handler: SubscriptionEmitterHandler<TEmitEvent>) {
        this.subscribers.push(handler);
        this.subscriberOffset.push(this.events.length);
        return () => {
            const index = this.subscribers.indexOf(handler);
            if (index === -1) return;
            this.subscribers.splice(index, 1);
            this.subscriberOffset.splice(index, 1);
        };
    }
}
