import { suite, test, assert, beforeEach } from '@srhazi/gooey-test';
import { dict, DictEventType } from './dict';
import { calc } from './calc';
import { retain, release, reset, flush, subscribe } from './engine';

beforeEach(() => {
    reset();
    subscribe();
});

suite('dict', () => {
    test('get set delete', () => {
        const log: any[] = [];
        const bag = dict<string, any>();
        const c = calc(() => {
            log.push(bag.get('key'));
        });
        retain(c);
        c.get();
        flush();

        assert.deepEqual([undefined], log);
        bag.set('key', 'one');
        flush();
        assert.deepEqual([undefined, 'one'], log);
        bag.set('key', 'two');
        flush();
        assert.deepEqual([undefined, 'one', 'two'], log);
        bag.delete('key');
        flush();
        assert.deepEqual([undefined, 'one', 'two', undefined], log);
    });

    test('can start with values', () => {
        const log: any[] = [];
        const bag = dict<string, any>([['key', 'init']]);
        const c = calc(() => {
            log.push(bag.get('key'));
        });
        retain(c);
        c.get();
        flush();

        assert.deepEqual(['init'], log);
        bag.set('key', 'one');
        flush();
        assert.deepEqual(['init', 'one'], log);
    });

    test('can be cleared', () => {
        const log: any[] = [];
        const bag = dict<string, any>([['key', 'init']]);
        const c = calc(() => {
            log.push(bag.get('key'));
        });
        retain(c);
        c.get();
        flush();

        assert.deepEqual(['init'], log);
        bag.clear();
        flush();
        assert.deepEqual(['init', undefined], log);
    });

    test('can be iterated over', () => {
        const log: any[] = [];
        const numbers = dict<number, number>([[1, 1]]);
        const c = calc(() => {
            let keySum = 0;
            let valSum = 0;
            numbers.forEach((val, key) => {
                keySum += key;
                valSum += val;
            });
            log.push({ keySum, valSum });
        });
        retain(c);
        c.get();
        flush();

        assert.deepEqual({ keySum: 1, valSum: 1 }, log[log.length - 1]);
        numbers.set(2, 4);
        flush();
        assert.deepEqual({ keySum: 3, valSum: 5 }, log[log.length - 1]);
        numbers.set(1, 10);
        flush();
        assert.deepEqual({ keySum: 3, valSum: 14 }, log[log.length - 1]);
    });

    test('can subscribe to events', () => {
        const log: any[] = [];
        const bag = dict([
            ['foo', 'bar'],
            ['baz', 'bum'],
        ]);
        const unsubscribe = bag.subscribe((events) => {
            log.push(...events);
        });
        assert.deepEqual([], log);
        bag.set('foo', 'BAR');
        bag.set('bum', 'BUT');
        bag.delete('baz');
        flush();
        assert.deepEqual(
            [
                {
                    type: DictEventType.SET,
                    prop: 'foo',
                    value: 'BAR',
                },
                {
                    type: DictEventType.ADD,
                    prop: 'bum',
                    value: 'BUT',
                },
                {
                    type: DictEventType.DEL,
                    prop: 'baz',
                },
            ],
            log
        );

        unsubscribe();
        bag.set('foo', 'k');
        flush();
        assert.deepEqual(
            [
                {
                    type: DictEventType.SET,
                    prop: 'foo',
                    value: 'BAR',
                },
                {
                    type: DictEventType.ADD,
                    prop: 'bum',
                    value: 'BUT',
                },
                {
                    type: DictEventType.DEL,
                    prop: 'baz',
                },
            ],
            log
        );
    });

    test('.keys produces view of keys', () => {
        const simple = dict<string, any>([], 'model');
        const keys = simple.keys();
        retain(keys);
        assert.arrayEqualsUnsorted([], keys);
        simple.set('foo', 'a');
        flush();
        assert.arrayEqualsUnsorted(['foo'], keys);
        simple.set('bar', 'a');
        flush();
        assert.arrayEqualsUnsorted(['foo', 'bar'], keys);
        simple.set('foo', 'b');
        flush();
        assert.arrayEqualsUnsorted(['foo', 'bar'], keys);
        simple.delete('bar');
        flush();
        assert.arrayEqualsUnsorted(['foo'], keys);
        release(keys);
    });

    test('.keys mapped view handles delete', () => {
        const simple = dict<string, any>([], 'model');
        const keys = simple.keys();
        const caps = keys
            .filterView((key) => key.startsWith('b'))
            .mapView((key) => key.toUpperCase());
        retain(keys);
        retain(caps);
        assert.arrayEqualsUnsorted([], keys);
        assert.arrayEqualsUnsorted([], caps);
        simple.set('foo', 'a');
        flush();
        assert.arrayEqualsUnsorted(['foo'], keys);
        assert.arrayEqualsUnsorted([], caps);
        simple.set('bar', 'a');
        flush();
        assert.arrayEqualsUnsorted(['foo', 'bar'], keys);
        assert.arrayEqualsUnsorted(['BAR'], caps);
        simple.set('foo', 'b');
        flush();
        assert.arrayEqualsUnsorted(['foo', 'bar'], keys);
        assert.arrayEqualsUnsorted(['BAR'], caps);
        simple.delete('bar');
        flush();
        assert.arrayEqualsUnsorted(['foo'], keys);
        assert.arrayEqualsUnsorted([], caps);
        release(keys);
    });

    test('.keys waits for flush', () => {
        const simple = dict<string, any>();
        const keys = simple.keys();
        retain(keys);
        assert.arrayEqualsUnsorted([], keys);
        simple.set('foo', 'a');
        assert.arrayEqualsUnsorted([], keys);
        simple.set('bar', 'a');
        assert.arrayEqualsUnsorted([], keys);
        simple.set('foo', 'b');
        assert.arrayEqualsUnsorted([], keys);
        simple.delete('bar');
        assert.arrayEqualsUnsorted([], keys);
        flush();
        assert.arrayEqualsUnsorted(['foo'], keys);
        release(keys);
    });

    test('.keys does nothing after release', () => {
        const simple = dict<string, any>();
        const keys = simple.keys();
        retain(keys);
        assert.arrayEqualsUnsorted([], keys);
        simple.set('foo', 'a');
        flush();
        assert.arrayEqualsUnsorted(['foo'], keys);
        simple.set('bar', 'a');
        flush();
        assert.arrayEqualsUnsorted(['foo', 'bar'], keys);
        release(keys);

        simple.set('baz', 'new');
        simple.delete('foo');
        assert.arrayEqualsUnsorted(['foo', 'bar'], keys);
        flush();
        assert.arrayEqualsUnsorted(['foo', 'bar'], keys);
    });

    test('.keys obeys subscription logic/notification', () => {
        const simple = dict<string, any>();
        simple.set('before', 'before');
        const keys = simple.keys();
        retain(keys);
        simple.set('after', 'after');

        assert.arrayEqualsUnsorted(['before'], keys);

        flush();

        simple.set('afterFlush', 'afterFlush');
        assert.arrayEqualsUnsorted(['before', 'after'], keys);

        flush();

        assert.arrayEqualsUnsorted(['before', 'after', 'afterFlush'], keys);
        release(keys);
    });
});
