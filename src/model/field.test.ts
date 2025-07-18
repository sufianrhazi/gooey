import { assert, beforeEach, suite, test } from '@srhazi/gooey-test';

import { calc } from './calc';
import { flush, reset, retain, subscribe } from './engine';
import { field } from './field';

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
        reader.get();
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
        simple.subscribe((err, val) => log.push(val));
        assert.deepEqual(['init'], log);
        simple.set('one');
        assert.deepEqual(['init'], log);
        flush();
        assert.deepEqual(['init', 'one'], log);
        simple.set('two');
        simple.set('three');
        flush();
        assert.deepEqual(['init', 'one', 'three'], log);
    });

    test('subscriptions stopped with unsubscribe (unsubscribe after write)', () => {
        const log: string[] = [];
        const simple = field('init');
        const unsubscribe = simple.subscribe((err, val) => log.push(val));
        assert.deepEqual(['init'], log);
        simple.set('one');
        flush();
        assert.deepEqual(['init', 'one'], log);
        simple.set('two');
        unsubscribe();
        flush();
        assert.deepEqual(['init', 'one'], log);
    });

    test('subscriptions stopped with unsubscribe (unsubscribe before write)', () => {
        const log: string[] = [];
        const simple = field('init');
        const unsubscribe = simple.subscribe((err, val) => log.push(val));
        assert.deepEqual(['init'], log);
        simple.set('one');
        flush();
        assert.deepEqual(['init', 'one'], log);
        unsubscribe();
        simple.set('two');
        flush();
        assert.deepEqual(['init', 'one'], log);
    });

    test('observed values only occur after observation', () => {
        const log: string[] = [];
        const simple = field('init');
        assert.deepEqual([], log);
        simple.set('one');
        simple.subscribe((err, val) => log.push(val));
        assert.deepEqual(['one'], log);
        flush();
        assert.deepEqual(['one'], log);
        simple.set('two');
        flush();
        assert.deepEqual(['one', 'two'], log);
    });

    test('mapCalc produces a calculation', () => {
        const name = field('alice');
        const caps = name.mapCalc((value) => value.toUpperCase());

        assert.is('alice', name.get());
        assert.is('ALICE', caps.get());

        name.set('bob');
        flush();

        assert.is('bob', name.get());
        assert.is('BOB', caps.get());
    });
});
