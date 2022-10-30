import {
    Processable,
    Retainable,
    markDirty,
    addVertex,
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

type SubscriptionEmitterHandler<TEmitEvent> = {
    bivarianceHack(events: TEmitEvent[], index: number): void;
}['bivarianceHack'];

export class SubscriptionEmitter<TEmitEvent>
    implements Processable, Retainable
{
    private declare subscribers: SubscriptionEmitterHandler<TEmitEvent>[];
    private declare subscriberOffset: number[];
    private declare events: TEmitEvent[];
    private declare isActive: boolean;

    // Processable
    declare [SymProcessable]: true;
    declare [SymDebugName]: string;

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
    declare [SymRefcount]: number;

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
