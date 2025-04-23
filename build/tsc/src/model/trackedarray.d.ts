import type { Processable, Retainable } from './engine';
export declare class TrackedArray<TEvent> implements Processable, Retainable {
    private itemSubscriptions;
    private eventSubscriptions;
    private dirtyArray;
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
    notifyRead(key: 'length' | number): void;
    markDirty(key: 'length' | {
        start: number;
        end: number;
    }): void;
    addEvent(event: TEvent): void;
    subscribe(handler: (events: Iterable<TEvent>) => void): () => void;
    retain(): void;
    release(): void;
    __alive(): void;
    __dead(): void;
    __recalculate(): Processable[];
}
//# sourceMappingURL=trackedarray.d.ts.map