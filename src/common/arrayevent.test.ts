import { assert, suite, test } from '@srhazi/gooey-test';

import type { ArrayEvent } from './arrayevent';
import { ArrayEventType, mergeArrayEvents } from './arrayevent';

suite('mergeArrayEvents', () => {
    test('merge single event SPLICE', () => {
        const event: ArrayEvent<string> = {
            type: ArrayEventType.SPLICE,
            index: 0,
            count: 0,
            items: ['a'],
        };
        const events = Array.from(mergeArrayEvents([event]));
        assert.deepEqual([event], events);
    });
    test('merge single event MOVE', () => {
        const event: ArrayEvent<string> = {
            type: ArrayEventType.MOVE,
            from: 0,
            count: 1,
            to: 1,
        };
        const events = Array.from(mergeArrayEvents([event]));
        assert.deepEqual([event], events);
    });
    test('merge single event SORT', () => {
        const event: ArrayEvent<string> = {
            type: ArrayEventType.SORT,
            from: 0,
            indexes: [2, 1, 0],
        };
        const events = Array.from(mergeArrayEvents([event]));
        assert.deepEqual([event], events);
    });

    test('merge two joining splice events merges (concat)', () => {
        const event1: ArrayEvent<string> = {
            type: ArrayEventType.SPLICE,
            index: 0,
            count: 0,
            items: ['a'],
        };
        const event2: ArrayEvent<string> = {
            type: ArrayEventType.SPLICE,
            index: 1,
            count: 0,
            items: ['b'],
        };
        const events = Array.from(mergeArrayEvents([event1, event2]));
        assert.deepEqual(
            [
                {
                    type: ArrayEventType.SPLICE,
                    index: 0,
                    count: 0,
                    items: ['a', 'b'],
                },
            ],
            events
        );
    });

    test('merge two joining splice events merges (delete)', () => {
        const event1: ArrayEvent<string> = {
            type: ArrayEventType.SPLICE,
            index: 0,
            count: 1,
        };
        const event2: ArrayEvent<string> = {
            type: ArrayEventType.SPLICE,
            index: 0,
            count: 2,
        };
        const events = Array.from(mergeArrayEvents([event1, event2]));
        assert.deepEqual(
            [
                {
                    type: ArrayEventType.SPLICE,
                    index: 0,
                    count: 3,
                },
            ],
            events
        );
    });

    test('merge two joining splice events merges (concat and delete, partial)', () => {
        const event1: ArrayEvent<string> = {
            type: ArrayEventType.SPLICE,
            index: 0,
            count: 1,
            items: ['a', 'b', 'c'],
        };
        const event2: ArrayEvent<string> = {
            type: ArrayEventType.SPLICE,
            index: 3,
            count: 1,
            items: ['d', 'e'],
        };
        const events = Array.from(mergeArrayEvents([event1, event2]));
        assert.deepEqual(
            [
                {
                    type: ArrayEventType.SPLICE,
                    index: 0,
                    count: 2,
                    items: ['a', 'b', 'c', 'd', 'e'],
                },
            ],
            events
        );
    });

    test('replace items with multiple operations (pop, shift, push, unshift, splice)', () => {
        const event1: ArrayEvent<string> = {
            type: ArrayEventType.SPLICE,
            index: 2,
            count: 1,
        };
        const event2: ArrayEvent<string> = {
            type: ArrayEventType.SPLICE,
            index: 0,
            count: 1,
        };
        const event3: ArrayEvent<string> = {
            type: ArrayEventType.SPLICE,
            index: 1,
            count: 0,
            items: ['new end'],
        };
        const event4: ArrayEvent<string> = {
            type: ArrayEventType.SPLICE,
            index: 0,
            count: 0,
            items: ['new beginning'],
        };
        const event5: ArrayEvent<string> = {
            type: ArrayEventType.SPLICE,
            index: 1,
            count: 1,
            items: ['new middle'],
        };
        const events = Array.from(
            mergeArrayEvents([event1, event2, event3, event4, event5])
        );
        assert.deepEqual(
            [
                {
                    type: 'splice',
                    index: 2,
                    count: 1,
                },
                {
                    type: 'splice',
                    index: 0,
                    count: 1,
                },
                {
                    type: 'splice',
                    index: 1,
                    count: 0,
                    items: ['new end'],
                },
                {
                    type: 'splice',
                    index: 0,
                    count: 1,
                    items: ['new beginning', 'new middle'],
                },
            ],
            events
        );
    });
});
