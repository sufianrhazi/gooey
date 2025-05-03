import { assert, beforeEach, suite, test } from '@srhazi/gooey-test';

import { calc } from './calc';
import { collection } from './collection';
import { dict } from './dict';
import { flush, hotSwapModuleExport, reset, retain, subscribe } from './engine';
import { field } from './field';
import { model } from './model';

beforeEach(() => {
    reset();
    subscribe();
});

suite('flushing behavior', () => {
    test('flush forces a flush', () => {
        const log: string[] = [];
        const val = field('hi');
        const c = calc(() => {
            log.push(val.get());
        });
        retain(c);
        c.get();
        val.set('hello');
        flush();
        assert.deepEqual(['hi', 'hello'], log);
    });

    test('flush forces a flush', () => {
        const log: string[] = [];
        const val = field('hi');
        const c = calc(() => {
            log.push(val.get());
        });
        retain(c);
        c.get();
        val.set('hello');
        flush();
        assert.deepEqual(['hi', 'hello'], log);
    });

    test('flush does not trigger a flush if called while flushing', () => {
        const log: string[] = [];
        const val = field('ready');
        const val2 = field('other');
        const mainCalc = calc(() => {
            const v = val.get();
            if (v === 'go') {
                val2.set('other 2');
                flush();
                assert.deepEqual(['other'], log);
            }
            return v;
        });
        const sideCalc = calc(() => {
            const v = val2.get();
            log.push(v);
            return v;
        });
        retain(mainCalc);
        retain(sideCalc);
        const mainRecalcs: any[] = [];
        const sideRecalcs: any[] = [];
        mainCalc.subscribe((error, val) => {
            if (error) {
                mainRecalcs.push({
                    error,
                });
            } else {
                mainRecalcs.push({ val });
            }
        });
        sideCalc.subscribe((error, val) => {
            if (error) {
                sideRecalcs.push({
                    error,
                });
            } else {
                sideRecalcs.push({ val });
            }
        });

        mainCalc.get();
        sideCalc.get();
        val.set('go');
        flush();
        assert.deepEqual(['other', 'other 2'], log);
        assert.deepEqual([{ val: 'ready' }, { val: 'go' }], mainRecalcs);
        assert.deepEqual([{ val: 'other' }, { val: 'other 2' }], sideRecalcs);
    });

    test('hotSwapModuleExport dirties field dependencies', () => {
        const a = field('hello');
        const b = field('goodbye');

        let target = a;

        const c = calc(() => target.get());

        let log: string[] = [];

        c.subscribe((err, result) => {
            if (!err) {
                log.push(result);
            }
        });

        assert.deepEqual(['hello'], log);
        flush();

        assert.deepEqual(['hello'], log);

        log = [];
        hotSwapModuleExport(a, b);
        target = b;

        assert.deepEqual([], log);
        flush();
        assert.deepEqual(['goodbye'], log);

        log = [];
        hotSwapModuleExport(b, a);
        target = a;

        assert.deepEqual([], log);
        flush();
        assert.deepEqual(['hello'], log);
    });

    test('hotSwapModuleExport dirties model dependencies', () => {
        const a = model({ foo: 'hello' });
        const b = model({ foo: 'goodbye' });

        let target = a;

        const c = calc(() => target.foo);

        let log: string[] = [];

        c.subscribe((err, result) => {
            if (!err) {
                log.push(result);
            }
        });

        assert.deepEqual(['hello'], log);
        flush();

        assert.deepEqual(['hello'], log);

        log = [];
        hotSwapModuleExport(a, b);
        target = b;

        assert.deepEqual([], log);
        flush();
        assert.deepEqual(['goodbye'], log);

        log = [];
        hotSwapModuleExport(b, a);
        target = a;

        assert.deepEqual([], log);
        flush();
        assert.deepEqual(['hello'], log);
    });

    test('hotSwapModuleExport dirties collection dependencies', () => {
        const a = collection(['foo', 'hello', 'bar']);
        const b = collection(['baz', 'goodbye', 'bum']);

        let target = a;

        const c = calc(() => target[1]);

        let log: string[] = [];

        c.subscribe((err, result) => {
            if (!err) {
                log.push(result);
            }
        });

        assert.deepEqual(['hello'], log);
        flush();

        assert.deepEqual(['hello'], log);

        log = [];
        hotSwapModuleExport(a, b);
        target = b;

        assert.deepEqual([], log);
        flush();
        assert.deepEqual(['goodbye'], log);

        log = [];
        hotSwapModuleExport(b, a);
        target = a;

        assert.deepEqual([], log);
        flush();
        assert.deepEqual(['hello'], log);
    });

    test('hotSwapModuleExport swaps mapView correctly', () => {
        // Okay, our goal is to swap out the consuming collection/view for a
        // mapView or any other mapped view
        //
        // We want to be able to say hotSwapModule(collectionA, collectionB)
        // and have all of the prior collectionA.mapView() views get a SPLICE
        // out of the current items, a SPLICE in of the new items in
        // collectionB, and continue to receive events from collectionB.
        //
        // And because subscriptions are done via `unsub =
        // collectionA.subscribe(handler)`, this means we need to *pass* all of
        // the subscriptions from `collectionA` to `collectionB`
        //
        // So we should be able to add a (private?) method on collection/view to "take" or "transfer" handlers.
        //
        // Something like:
        //
        // const c = collection([1,2,3]);
        // const target = collection([4,5,6]);
        //
        // c.takeSubscriptions((subscription) => {
        //   for (const subscription of handlers) {
        //     subscription.handler([{ type: SPLICE, index: 0, count: c.length }]);
        //     subscription.onUnsubscribe(); // unsubscribe from c
        //     subscription.onUnsubscribe = target.subscribe((events) => {
        //       subscription.handler(events);
        //     });
        //   }
        // });
        //
        const a = collection(['foo', 'hello', 'bar']);
        const b = collection(['baz', 'goodbye', 'bum']);

        const aDerived = a.mapView((value) => value.toUpperCase());

        const c = calc(() => aDerived[1]);

        let log: string[] = [];

        c.subscribe((err, result) => {
            if (!err) {
                log.push(result);
            }
        });

        assert.deepEqual(['HELLO'], log);
        flush();

        assert.deepEqual(['HELLO'], log);

        log = [];
        hotSwapModuleExport(a, b);

        assert.deepEqual([], log);
        flush();
        assert.deepEqual(['GOODBYE'], log);

        log = [];
        hotSwapModuleExport(b, a);

        assert.deepEqual([], log);
        flush();
        assert.deepEqual(['HELLO'], log);
    });

    test('hotSwapModuleExport dirties dict dependencies', () => {
        const a = dict([['foo', 'hello']]);
        const b = dict([['foo', 'goodbye']]);

        let target = a;

        const c = calc(() => target.get('foo'));

        let log: (string | undefined)[] = [];

        c.subscribe((err, result) => {
            if (!err) {
                log.push(result);
            }
        });

        assert.deepEqual(['hello'], log);
        flush();

        assert.deepEqual(['hello'], log);

        log = [];
        hotSwapModuleExport(a, b);
        target = b;

        assert.deepEqual([], log);
        flush();
        assert.deepEqual(['goodbye'], log);

        log = [];
        hotSwapModuleExport(b, a);
        target = a;

        assert.deepEqual([], log);
        flush();
        assert.deepEqual(['hello'], log);
    });
});
