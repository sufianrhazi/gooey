import { assert, beforeEach, suite, test } from '@srhazi/gooey-test';

import { calc } from './calc';
import { flush, reset, retain, subscribe } from './engine';
import { field } from './field';

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
        mainCalc.subscribeWithError((error, val) => {
            if (error) {
                mainRecalcs.push({
                    error,
                });
            } else {
                mainRecalcs.push({ val });
            }
        });
        sideCalc.subscribeWithError((error, val) => {
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
        assert.deepEqual([{ val: 'go' }], mainRecalcs);
        assert.deepEqual([{ val: 'other 2' }], sideRecalcs);
    });
});
