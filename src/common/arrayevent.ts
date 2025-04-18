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

/**
 * Merge array events into a stream of more optimized events.
 *
 * i.e. join splice events that can be joined
 */
export function* mergeArrayEvents<T>(events: ArrayEvent<T>[]) {
    if (events.length === 0) {
        return;
    }
    let lastEvent: ArrayEvent<T> = events[0];
    let mergedItems: T[] | undefined;
    for (let i = 1; i < events.length; ++i) {
        const event = events[i];

        // Case 1: the insertion point of a splice is at the end of the change of the prior splice
        // These can be merged by using the 1st event's index, summing the count, and concatenating the items
        if (
            event.type === ArrayEventType.SPLICE &&
            lastEvent.type === ArrayEventType.SPLICE &&
            lastEvent.index + (lastEvent.items?.length ?? 0) === event.index
        ) {
            // Start:
            //     0123456789
            //
            // Splice index 1, count 3, items [a,b]
            //      v         <- insertion point
            //     0123456789
            //      ^^^       <- removal
            //     0ab456789  <- result
            //
            // Splice index 3, count 4, items [c,d]
            //        v       <- insertion point
            //     0ab456789
            //        ^^^^    <- removal
            //     0abcd89    <- result
            //
            // Equivalent to:
            // Splice index 1, count 3+4, items [a,b,c,d]
            //      v         <- insertion point
            //     0123456789
            //      ^^^^^^^   <- removal
            //     0abcd89    <- result

            if (!mergedItems) {
                mergedItems = lastEvent.items?.slice() ?? [];
            }
            if (event.items) {
                mergedItems.push(...event.items);
            }
            if (mergedItems.length) {
                lastEvent = {
                    type: ArrayEventType.SPLICE,
                    index: lastEvent.index,
                    count: lastEvent.count + event.count,
                    items: mergedItems,
                };
            } else {
                lastEvent = {
                    type: ArrayEventType.SPLICE,
                    index: lastEvent.index,
                    count: lastEvent.count + event.count,
                };
            }
        } else {
            yield lastEvent;
            lastEvent = event;
            mergedItems = undefined;
        }
    }
    yield lastEvent;
}
