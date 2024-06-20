import type {
    Processable,
    Retainable} from './engine';
import {
    addVertex,
    markDirty,
    removeVertex
} from './engine';
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
    declare __processable: true;
    declare __debugName: string;

    __recalculate() {
        for (const subscriber of this.subscribers) {
            subscriber.handler(subscriber.events);
            subscriber.events = [];
        }
        return true;
    }

    // Retainable
    declare __refcount: number;

    __alive() {
        this.isActive = true;
        addVertex(this);
    }

    __dead() {
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
        this.__refcount = 0;
        this.__processable = true;
        this.__debugName = `emitter:${debugName}`;
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
