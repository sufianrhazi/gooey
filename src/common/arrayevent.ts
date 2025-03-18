import * as log from './log';

export enum ArrayEventType {
    SPLICE = 'splice',
    MOVE = 'move',
    SORT = 'sort',
}

export interface ArrayEventSplice<T> {
    type: ArrayEventType.SPLICE;
    index: number;
    count: number;
    items?: T[] | undefined;
}
export interface ArrayEventMove {
    type: ArrayEventType.MOVE;
    from: number;
    count: number;
    to: number;
}
export interface ArrayEventSort {
    type: ArrayEventType.SORT;
    from: number;
    indexes: number[];
}

export type ArrayEvent<T> =
    | ArrayEventSplice<T>
    | ArrayEventMove
    | ArrayEventSort;

const EMPTY_ARRAY: readonly [] = [];

export function applySort<T>(target: T[], from: number, indexes: number[]) {
    const duped = target.slice(from, from + indexes.length);
    for (let i = 0; i < indexes.length; ++i) {
        target[i + from] = duped[indexes[i] - from];
    }
}

export function applyMove<T>(
    target: T[],
    from: number,
    count: number,
    to: number
) {
    const slice = target.splice(from, count);
    target.splice(to, 0, ...slice);
}

export function applyArrayEvent<T>(
    target: T[],
    event: ArrayEvent<T>
): readonly T[] {
    switch (event.type) {
        case ArrayEventType.SPLICE: {
            if (event.items) {
                return target.splice(event.index, event.count, ...event.items);
            } else {
                return target.splice(event.index, event.count);
            }
        }
        case ArrayEventType.SORT: {
            applySort(target, event.from, event.indexes);
            break;
        }
        case ArrayEventType.MOVE: {
            applyMove(target, event.from, event.count, event.to);
            break;
        }
        default:
            log.assertExhausted(event);
    }
    return EMPTY_ARRAY;
}

export function addArrayEvent<T>(
    events: ArrayEvent<T>[],
    event: ArrayEvent<T>
) {
    const lastEvent = events.length > 0 ? events[events.length - 1] : null;
    if (
        lastEvent &&
        event.type === ArrayEventType.SPLICE &&
        lastEvent.type === ArrayEventType.SPLICE
    ) {
        // Case 1: The insertion point of the next event is at the splice end of the last event
        // - In this case, we add to the event's count and append items
        const lastEventSpliceEnd =
            lastEvent.index + (lastEvent.items?.length ?? 0);
        if (lastEventSpliceEnd === event.index) {
            const mergedEvent: ArrayEvent<T> = {
                type: ArrayEventType.SPLICE,
                index: lastEvent.index,
                count: lastEvent.count + event.count,
            };
            if (lastEvent.items || event.items) {
                mergedEvent.items = [
                    ...(lastEvent.items || []),
                    ...(event.items || []),
                ];
            }
            events[events.length - 1] = mergedEvent;
            return;
        }
        // TODO: add additional merge cases
    }
    events.push(event);
}
