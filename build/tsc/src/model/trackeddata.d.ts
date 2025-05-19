import type { Processable, Retainable } from './engine';
export type TrackedDataSubscription<TEvent> = {
    onUnsubscribe: () => void;
    handler: (events: Iterable<TEvent>) => void;
    events: TEvent[];
};
export declare class TrackedData<TKey, TEvent> implements Processable, Retainable {
    private itemSubscriptions;
    private eventSubscriptions;
    private dirtyKeys;
    private clock;
    private onAlive?;
    private onDead?;
    private mergeEvents;
    private isDirty;
    __processable: true;
    __refcount: number;
    __debugName: string;
    constructor(mergeEvents: (events: TEvent[]) => Iterable<TEvent>, lifecycle?: {
        onAlive?: () => void;
        onDead?: () => void;
    }, debugName?: string);
    tickClock(): void;
    notifyRead(key: TKey): void;
    markDirty(key: TKey): void;
    addEvent(event: TEvent): void;
    subscribe(handler: (events: Iterable<TEvent>) => void): () => void;
    retain(): void;
    release(): void;
    __alive(): void;
    __dead(): void;
    __recalculate(): Processable[];
    takeSubscriptions(): TrackedDataSubscription<TEvent>[];
}
//# sourceMappingURL=trackeddata.d.ts.map