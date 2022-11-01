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
    bivarianceHack(events: TEmitEvent[]): void;
}['bivarianceHack'];

export class SubscriptionEmitter<TEmitEvent>
    implements Processable, Retainable
{
    /** Per-emitter function to add an event to the sequence of events for a subscriber */
    // Note: for reasons I don't understand; this cannot be typed as:
    //     private declare appendEvent: (events: TEmitEvent[], event: TEmitEvent) => void;
    // without causing bizarre type errors across the application
    private declare appendEvent: (events: any[], event: any) => void;
    private declare subscribers: {
        handler: SubscriptionEmitterHandler<TEmitEvent>;
        events: TEmitEvent[];
    }[];
    private declare isActive: boolean;

    // Processable
    declare [SymProcessable]: true;
    declare [SymDebugName]: string;

    [SymRecalculate]() {
        for (const subscriber of this.subscribers) {
            subscriber.handler(subscriber.events);
            subscriber.events = [];
        }
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
        removeVertex(this);
        this.isActive = false;
    }

    constructor(
        appendEvent: (events: TEmitEvent[], event: TEmitEvent) => void,
        debugName: string
    ) {
        this.appendEvent = appendEvent;
        this.subscribers = [];
        this.isActive = false;
        this[SymRefcount] = 0;
        this[SymProcessable] = true;
        this[SymDebugName] = `emitter:${debugName}`;
    }

    addEvent(event: TEmitEvent) {
        if (!this.isActive) return;
        let firstAdded = false;
        for (const subscriber of this.subscribers) {
            if (subscriber.events.length === 0) firstAdded = true;
            this.appendEvent(subscriber.events, event);
        }
        if (firstAdded) {
            markDirty(this);
        }
    }

    subscribe(handler: SubscriptionEmitterHandler<TEmitEvent>) {
        this.subscribers.push({ handler, events: [] });
        return () => {
            const index = this.subscribers.findIndex(
                (subscriber) => subscriber.handler === handler
            );
            if (index === -1) return;
            this.subscribers.splice(index, 1);
        };
    }
}
