import { assert, beforeEach, suite, test } from '@srhazi/gooey-test';

import type { ArrayEvent } from '../common/arrayevent';
import { ArrayEventType } from '../common/arrayevent';
import { ArraySub, flatMapView, mapView } from './arraysub';
import { calc } from './calc';
import { flush, reset, subscribe } from './engine';

beforeEach(() => {
    reset();
    subscribe();
});

suite('ArraySub', () => {
    test('assignment propagates', () => {
        const arraySub = new ArraySub(['foo', 'bar', 'baz']);
        let log: string[] = [];

        const c1 = calc(() => {
            const val = arraySub.get(1);
            log.push(`1:${val}`);
            return val;
        });

        c1.retain();

        assert.is('bar', c1.get());
        assert.deepEqual(['1:bar'], log);

        arraySub.set(1, 'newvalue');

        log = [];
        flush();

        assert.is('newvalue', c1.get());
        assert.deepEqual(['1:newvalue'], log);
    });

    test('assignment propagates to correct item', () => {
        const arraySub = new ArraySub(['foo', 'bar', 'baz']);
        let log: string[] = [];

        const c0 = calc(() => {
            const val = arraySub.get(0);
            log.push(`0:${val}`);
            return val;
        });
        const c1 = calc(() => {
            const val = arraySub.get(1);
            log.push(`1:${val}`);
            return val;
        });

        c0.retain();
        c1.retain();

        assert.is('foo', c0.get());
        assert.is('bar', c1.get());
        assert.deepEqual(['0:foo', '1:bar'], log);

        arraySub.set(1, 'newvalue');

        log = [];
        flush();

        assert.is('foo', c0.get());
        assert.is('newvalue', c1.get());
        assert.deepEqual(['1:newvalue'], log);

        arraySub.set(0, 'first');
        log = [];
        flush();

        assert.is('first', c0.get());
        assert.is('newvalue', c1.get());
        assert.deepEqual(['0:first'], log);

        arraySub.set(2, 'not noticed');
        log = [];
        flush();

        assert.is('first', c0.get());
        assert.is('newvalue', c1.get());
        assert.deepEqual([], log);
    });

    test('assignment before subscription does not propagate', () => {
        const arraySub = new ArraySub(['foo', 'bar', 'baz']);
        let log: string[] = [];

        const c1 = calc(() => {
            const val = arraySub.get(1);
            log.push(`1:${val}`);
            return val;
        });

        c1.retain();
        arraySub.retain();

        arraySub.set(1, 'newvalue');

        assert.is('newvalue', c1.get());
        assert.deepEqual(['1:newvalue'], log);

        log = [];
        flush();

        assert.is('newvalue', c1.get());
        assert.deepEqual([], log);
    });

    test('array event emitted for assignment', () => {
        const arraySub = new ArraySub(['foo', 'bar', 'baz']);

        let beforeEvents: ArrayEvent<string>[] = [];

        let events: ArrayEvent<string>[] = [];

        arraySub.subscribe((arrayEvents) => {
            beforeEvents = [...arrayEvents];
        });

        arraySub.set(0, 'before0');
        arraySub.set(1, 'before1');

        arraySub.subscribe((arrayEvents) => {
            events = [...arrayEvents];
        });

        arraySub.set(1, 'after1');
        arraySub.set(2, 'after2');

        flush();

        // Note: events are merged via mergeArrayEvent
        assert.deepEqual(
            [
                {
                    type: ArrayEventType.SPLICE,
                    index: 1,
                    count: 2,
                    items: ['after1', 'after2'],
                },
            ],
            events
        );
        assert.deepEqual(
            [
                {
                    type: ArrayEventType.SPLICE,
                    index: 0,
                    count: 2,
                    items: ['before0', 'before1'],
                },
                {
                    type: ArrayEventType.SPLICE,
                    index: 1,
                    count: 2,
                    items: ['after1', 'after2'],
                },
            ],
            beforeEvents
        );
    });

    test('splice events with same length', () => {
        const arraySub = new ArraySub(['foo', 'bar', 'baz']);

        let log: string[] = [];
        let events: ArrayEvent<string>[] = [];

        const c0 = calc(() => log.push(`0:${arraySub.get(0)}`));
        const c1 = calc(() => log.push(`1:${arraySub.get(1)}`));
        const c2 = calc(() => log.push(`2:${arraySub.get(2)}`));
        const clen = calc(() => log.push(`len:${arraySub.getLength()}`));

        c0.retain();
        c1.retain();
        c2.retain();
        clen.retain();

        c0.get();
        c1.get();
        c2.get();
        clen.get();

        arraySub.subscribe((arrayEvents) => {
            events = [...arrayEvents];
        });

        flush();

        log = [];

        arraySub.splice(1, 1, ['replaced']);

        flush();

        assert.deepEqual(['1:replaced'], log);
        assert.deepEqual(
            [
                {
                    type: ArrayEventType.SPLICE,
                    index: 1,
                    count: 1,
                    items: ['replaced'],
                },
            ],
            events
        );
    });

    test('splice events removing item', () => {
        const arraySub = new ArraySub(['foo', 'bar', 'baz']);

        let log: string[] = [];
        let events: ArrayEvent<string>[] = [];

        const c0 = calc(() => log.push(`0:${arraySub.get(0)}`));
        const c1 = calc(() => log.push(`1:${arraySub.get(1)}`));
        const c2 = calc(() => log.push(`2:${arraySub.get(2)}`));
        const clen = calc(() => log.push(`len:${arraySub.getLength()}`));

        c0.retain();
        c1.retain();
        c2.retain();
        clen.retain();

        c0.get();
        c1.get();
        c2.get();
        clen.get();

        arraySub.subscribe((arrayEvents) => {
            events = [...arrayEvents];
        });

        flush();

        log = [];

        arraySub.splice(1, 1, []);

        flush();

        assert.deepEqual(['1:baz', '2:undefined', 'len:2'], log);
        assert.deepEqual(
            [
                {
                    type: ArrayEventType.SPLICE,
                    index: 1,
                    count: 1,
                    items: [],
                },
            ],
            events
        );
    });

    test('splice events adding item', () => {
        const arraySub = new ArraySub(['foo', 'bar', 'baz']);

        let log: string[] = [];
        let events: ArrayEvent<string>[] = [];

        const c0 = calc(() => log.push(`0:${arraySub.get(0)}`));
        const c1 = calc(() => log.push(`1:${arraySub.get(1)}`));
        const c2 = calc(() => log.push(`2:${arraySub.get(2)}`));
        const clen = calc(() => log.push(`len:${arraySub.getLength()}`));

        c0.retain();
        c1.retain();
        c2.retain();
        clen.retain();

        c0.get();
        c1.get();
        c2.get();
        clen.get();

        arraySub.subscribe((arrayEvents) => {
            events = [...arrayEvents];
        });

        flush();

        log = [];

        arraySub.splice(1, 0, ['insert']);

        flush();

        assert.deepEqual(['1:insert', '2:bar', 'len:4'], log);
        assert.deepEqual(
            [
                {
                    type: ArrayEventType.SPLICE,
                    index: 1,
                    count: 0,
                    items: ['insert'],
                },
            ],
            events
        );
    });

    test('sort events', () => {
        const arraySub = new ArraySub(['foo', 'bar', 'baz']);

        let log: string[] = [];
        let events: ArrayEvent<string>[] = [];

        const c0 = calc(() => log.push(`0:${arraySub.get(0)}`));
        const c1 = calc(() => log.push(`1:${arraySub.get(1)}`));
        const c2 = calc(() => log.push(`2:${arraySub.get(2)}`));
        const clen = calc(() => log.push(`len:${arraySub.getLength()}`));

        c0.retain();
        c1.retain();
        c2.retain();
        clen.retain();

        c0.get();
        c1.get();
        c2.get();
        clen.get();

        arraySub.subscribe((arrayEvents) => {
            events = [...arrayEvents];
        });

        flush();

        log = [];

        arraySub.sort((a, b) => (a < b ? -1 : 1));

        flush();

        assert.deepEqual(['0:bar', '1:baz', '2:foo'], log);
        assert.deepEqual(
            [
                {
                    type: ArrayEventType.SORT,
                    from: 0,
                    indexes: [1, 2, 0],
                },
            ],
            events
        );

        log = [];
        events = [];

        arraySub.sort((a, b) => (a < b ? 1 : -1));

        flush();

        assert.deepEqual(['0:foo', '1:baz', '2:bar'], log);
        assert.deepEqual(
            [
                {
                    type: ArrayEventType.SORT,
                    from: 0,
                    indexes: [2, 1, 0],
                },
            ],
            events
        );
    });

    test('moveSlice events', () => {
        const arraySub = new ArraySub(['a', 'b', 'c', 'd', 'e', 'f', 'g']);

        let log: string[] = [];
        let events: ArrayEvent<string>[] = [];

        const c0 = calc(() => log.push(`0:${arraySub.get(0)}`));
        const c1 = calc(() => log.push(`1:${arraySub.get(1)}`));
        const c2 = calc(() => log.push(`2:${arraySub.get(2)}`));
        const c3 = calc(() => log.push(`3:${arraySub.get(3)}`));
        const c4 = calc(() => log.push(`4:${arraySub.get(4)}`));
        const c5 = calc(() => log.push(`5:${arraySub.get(5)}`));
        const c6 = calc(() => log.push(`6:${arraySub.get(6)}`));
        const clen = calc(() => log.push(`len:${arraySub.getLength()}`));

        c0.retain();
        c1.retain();
        c2.retain();
        c3.retain();
        c4.retain();
        c5.retain();
        c6.retain();
        clen.retain();

        c0.get();
        c1.get();
        c2.get();
        c3.get();
        c4.get();
        c5.get();
        c6.get();
        clen.get();

        arraySub.subscribe((arrayEvents) => {
            events = [...arrayEvents];
        });

        flush();

        log = [];

        arraySub.moveSlice(4, 2, 1); // abcdEFg -> aEFbcdg

        flush();

        assert.deepEqual(['1:e', '2:f', '3:b', '4:c', '5:d'], log);
        assert.deepEqual(
            [
                {
                    type: ArrayEventType.MOVE,
                    from: 4,
                    count: 2,
                    to: 1,
                },
            ],
            events
        );
    });

    test('mapView produces a read-only arraySub', () => {
        const arraySub = new ArraySub([1, 2, 3]);
        const viewSub = mapView(arraySub, (num) => `value=${num}`);

        assert.is(0, viewSub.getLength());

        viewSub.retain();

        assert.is(3, viewSub.getLength());
        assert.is('value=1', viewSub.get(0));
        assert.is('value=2', viewSub.get(1));
        assert.is('value=3', viewSub.get(2));
    });

    test('mapView reflects updates (append) after flush', () => {
        const arraySub = new ArraySub(['foo', 'bar', 'baz']);
        const viewSub = mapView(arraySub, (num) => `${num}!`);

        assert.is(0, viewSub.getLength());

        viewSub.retain();

        arraySub.splice(3, 0, ['added', 'to']);
        arraySub.splice(5, 0, ['end']);

        flush();

        assert.is(6, viewSub.getLength());
        assert.is('foo!', viewSub.get(0));
        assert.is('bar!', viewSub.get(1));
        assert.is('baz!', viewSub.get(2));
        assert.is('added!', viewSub.get(3));
        assert.is('to!', viewSub.get(4));
        assert.is('end!', viewSub.get(5));
    });

    test('mapView reflects updates (remove) after flush', () => {
        const arraySub = new ArraySub(['foo', 'bar', 'baz']);
        const viewSub = mapView(arraySub, (num) => `${num}!`);

        assert.is(0, viewSub.getLength());

        viewSub.retain();

        arraySub.splice(0, 1, []);
        arraySub.splice(1, 1, ['newend']);

        flush();

        assert.is(2, viewSub.getLength());
        assert.is('bar!', viewSub.get(0));
        assert.is('newend!', viewSub.get(1));
    });

    test('mapView reflects updates (sort) after flush', () => {
        const arraySub = new ArraySub(['one', 'two', 'three', 'four']);
        const viewSub = mapView(arraySub, (num) => `${num}!`);

        assert.is(0, viewSub.getLength());

        viewSub.retain();

        arraySub.sort();

        flush();

        assert.is(4, viewSub.getLength());
        assert.is('four!', viewSub.get(0));
        assert.is('one!', viewSub.get(1));
        assert.is('three!', viewSub.get(2));
        assert.is('two!', viewSub.get(3));

        arraySub.sort((a, b) => a.length - b.length);

        flush();

        assert.is(4, viewSub.getLength());
        assert.is('one!', viewSub.get(0));
        assert.is('two!', viewSub.get(1));
        assert.is('four!', viewSub.get(2));
        assert.is('three!', viewSub.get(3));
    });

    test('mapView reflects updates (assign) after flush', () => {
        const arraySub = new ArraySub(['one', 'two', 'three', 'four']);
        const viewSub = mapView(arraySub, (num) => `${num}!`);

        assert.is(0, viewSub.getLength());

        viewSub.retain();

        arraySub.set(1, 'hi');

        flush();

        assert.is(4, viewSub.getLength());
        assert.is('one!', viewSub.get(0));
        assert.is('hi!', viewSub.get(1));
        assert.is('three!', viewSub.get(2));
        assert.is('four!', viewSub.get(3));

        arraySub.set(2, 'hey');
        arraySub.set(2, 'hello');
        arraySub.set(3, 'cool');

        flush();

        assert.is(4, viewSub.getLength());
        assert.is('one!', viewSub.get(0));
        assert.is('hi!', viewSub.get(1));
        assert.is('hello!', viewSub.get(2));
        assert.is('cool!', viewSub.get(3));
    });

    test('mapView can be mapViewed', () => {
        const names = new ArraySub(['one', 'two', 'three', 'four']);
        const exclaimed = mapView(names, (str) => `${str}!`);
        const upperCase = mapView(exclaimed, (str) => str.toUpperCase());

        upperCase.retain();

        assert.is(4, upperCase.getLength());
        assert.is('ONE!', upperCase.get(0));
        assert.is('TWO!', upperCase.get(1));
        assert.is('THREE!', upperCase.get(2));
        assert.is('FOUR!', upperCase.get(3));

        names.set(2, 'hello');
        flush();

        assert.is(4, upperCase.getLength());
        assert.is('ONE!', upperCase.get(0));
        assert.is('TWO!', upperCase.get(1));
        assert.is('HELLO!', upperCase.get(2));
        assert.is('FOUR!', upperCase.get(3));
    });

    test('flatMapView set()', () => {
        const names = new ArraySub(['one', 'two', 'three', 'four']);
        const flatMapped = flatMapView(names, (str) =>
            str.length === 3 ? [] : [`${str}!`, str.toUpperCase()]
        );

        flatMapped.retain();

        assert.is(4, flatMapped.getLength());
        assert.is('three!', flatMapped.get(0));
        assert.is('THREE', flatMapped.get(1));
        assert.is('four!', flatMapped.get(2));
        assert.is('FOUR', flatMapped.get(3));

        names.set(1, 'oneone');
        flush();

        assert.is(6, flatMapped.getLength());
        assert.is('oneone!', flatMapped.get(0));
        assert.is('ONEONE', flatMapped.get(1));
        assert.is('three!', flatMapped.get(2));
        assert.is('THREE', flatMapped.get(3));
        assert.is('four!', flatMapped.get(4));
        assert.is('FOUR', flatMapped.get(5));
    });

    test('flatMapView moveSlice()', () => {
        const names = new ArraySub(['one', 'two', 'three', 'four']);
        const flatMapped = flatMapView(names, (str) =>
            str.length === 3
                ? [[...str].reverse().join('')]
                : [`${str}!`, str.toUpperCase()]
        );

        flatMapped.retain();

        assert.is(6, flatMapped.getLength());
        assert.is('eno', flatMapped.get(0));
        assert.is('owt', flatMapped.get(1));
        assert.is('three!', flatMapped.get(2));
        assert.is('THREE', flatMapped.get(3));
        assert.is('four!', flatMapped.get(4));
        assert.is('FOUR', flatMapped.get(5));

        names.moveSlice(2, 2, 1);
        flush();

        assert.is(6, flatMapped.getLength());
        assert.is('eno', flatMapped.get(0));
        assert.is('three!', flatMapped.get(1));
        assert.is('THREE', flatMapped.get(2));
        assert.is('four!', flatMapped.get(3));
        assert.is('FOUR', flatMapped.get(4));
        assert.is('owt', flatMapped.get(5));
    });

    test('flatMapView sort()', () => {
        const names = new ArraySub(['one', 'two', 'three', 'four']);
        const flatMapped = flatMapView(names, (str) =>
            str.length === 3
                ? [[...str].reverse().join('')]
                : [`${str}!`, str.toUpperCase()]
        );

        flatMapped.retain();

        assert.is(6, flatMapped.getLength());
        assert.is('eno', flatMapped.get(0));
        assert.is('owt', flatMapped.get(1));
        assert.is('three!', flatMapped.get(2));
        assert.is('THREE', flatMapped.get(3));
        assert.is('four!', flatMapped.get(4));
        assert.is('FOUR', flatMapped.get(5));

        names.sort();
        flush();

        assert.is(6, flatMapped.getLength());
        assert.is('four!', flatMapped.get(0));
        assert.is('FOUR', flatMapped.get(1));
        assert.is('eno', flatMapped.get(2));
        assert.is('three!', flatMapped.get(3));
        assert.is('THREE', flatMapped.get(4));
        assert.is('owt', flatMapped.get(5));
    });
});
