import { suite, test, assert, beforeEach } from '@srhazi/gooey-test';
import { field } from './field';
import { retain, release, reset, flush, subscribe } from './engine';
import { calc } from './calc';

beforeEach(() => {
    reset();
    subscribe();
});

suite('field', () => {
    test('reads retrieve value', () => {
        const simple = field('hi');
        assert.is(simple.get(), 'hi');
    });

    test('writes update value', () => {
        const simple = field('hi');
        assert.is(simple.get(), 'hi');
        simple.set('hello');
        assert.is(simple.get(), 'hello');
    });

    test('reads in calculations act as dependencies', () => {
        const log: string[] = [];
        const simple = field('hi');
        const reader = calc(() => {
            log.push(simple.get());
        });
        retain(reader);
        reader();
        assert.deepEqual(['hi'], log);
        simple.set('hello');
        simple.set('hola');
        assert.deepEqual(['hi'], log);
        flush();
        assert.deepEqual(['hi', 'hola'], log);
    });

    test('subscriptions called on flush', () => {
        const log: string[] = [];
        const simple = field('init');
        simple.observe((val) => log.push(val));
        retain(simple);
        assert.deepEqual([], log);
        simple.set('one');
        assert.deepEqual([], log);
        flush();
        assert.deepEqual(['one'], log);
        simple.set('two');
        simple.set('three');
        flush();
        assert.deepEqual(['one', 'three'], log);
    });

    test('subscriptions stopped with unobserve (unobserve after write)', () => {
        const log: string[] = [];
        const simple = field('init');
        const unobserve = simple.observe((val) => log.push(val));
        retain(simple);
        assert.deepEqual([], log);
        simple.set('one');
        flush();
        assert.deepEqual(['one'], log);
        simple.set('two');
        unobserve();
        flush();
        assert.deepEqual(['one'], log);
    });

    test('subscriptions stopped with unobserve (unobserve before write)', () => {
        const log: string[] = [];
        const simple = field('init');
        const unobserve = simple.observe((val) => log.push(val));
        retain(simple);
        assert.deepEqual([], log);
        simple.set('one');
        flush();
        assert.deepEqual(['one'], log);
        unobserve();
        simple.set('two');
        flush();
        assert.deepEqual(['one'], log);
    });

    test('observed values only occur after observation', () => {
        const log: string[] = [];
        const simple = field('init');
        retain(simple);
        assert.deepEqual([], log);
        simple.set('one');
        simple.observe((val) => log.push(val));
        flush();
        assert.deepEqual([], log);
        simple.set('two');
        flush();
        assert.deepEqual(['two'], log);
    });
});
