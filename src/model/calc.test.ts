import { assert, beforeEach, suite, test } from '@srhazi/gooey-test';

import type { AsyncCalculationResult, Calculation } from './calc';
import { calc } from './calc';
import { collection } from './collection';
import { dict } from './dict';
import { flush, release, reset, retain, subscribe } from './engine';
import { field } from './field';
import { model } from './model';

beforeEach(() => {
    reset();
    subscribe();
});

suite('calc', () => {
    test('memoizes when called multiple times', () => {
        const calls: string[] = [];
        const calculation = calc(() => {
            calls.push('call');
            return 1 + 1;
        });
        retain(calculation);
        const a = calculation.get();
        const b = calculation.get();
        assert.is(2, a);
        assert.is(2, b);
        assert.deepEqual(['call'], calls);
    });

    test('reruns when model dependency changes', () => {
        const calls: string[] = [];
        const dependency = model(
            {
                value: 1,
            },
            'model'
        );
        const calculation = calc(() => {
            calls.push('call');
            return dependency.value;
        }, 'calculation');
        retain(calculation);
        const a = calculation.get();
        dependency.value = 2;
        const b = calculation.get();
        assert.deepEqual(['call'], calls);
        flush();
        assert.deepEqual(['call', 'call'], calls);
        const c = calculation.get();
        assert.deepEqual(['call', 'call'], calls);
        assert.is(1, a);
        assert.is(1, b);
        assert.is(2, c);
        release(calculation);
    });

    test('emits event when subscribed via subscribe', () => {
        const calls: string[] = [];
        const dependency = model(
            {
                value: 1,
            },
            'model'
        );
        const calculation = calc(() => {
            calls.push('call');
            return dependency.value;
        }, 'calculation');
        const events: any[] = [];
        const unsubscribe = calculation.subscribe((err, val) => {
            events.push({ err, val });
        });

        assert.deepEqual(['call'], calls);
        assert.deepEqual([{ err: undefined, val: 1 }], events);
        dependency.value = 2;
        flush();
        assert.deepEqual(['call', 'call'], calls);
        assert.deepEqual(
            [
                { err: undefined, val: 1 },
                { err: undefined, val: 2 },
            ],
            events
        );
        dependency.value = 3;
        flush();
        assert.deepEqual(['call', 'call', 'call'], calls);
        assert.deepEqual(
            [
                { err: undefined, val: 1 },
                { err: undefined, val: 2 },
                { err: undefined, val: 3 },
            ],
            events
        );
        unsubscribe();
        dependency.value = 4;
        flush();
        assert.deepEqual(['call', 'call', 'call'], calls);
        assert.deepEqual(
            [
                { err: undefined, val: 1 },
                { err: undefined, val: 2 },
                { err: undefined, val: 3 },
            ],
            events
        );
    });

    test('emits error event when subscribe and no error handler', () => {
        const calls: string[] = [];
        const state = model({
            crash: false,
        });
        const calculation = calc(() => {
            calls.push('call');
            if (state.crash) throw new Error('ruh roh');
            return 'result';
        });
        const events: any[] = [];
        calculation.subscribe((err, val) => {
            events.push({ err, val });
        });

        assert.deepEqual(['call'], calls);
        state.crash = true;
        flush();
        assert.deepEqual(['call', 'call'], calls);
        assert.is(events.length, 2);
        assert.is(events[0].err, undefined);
        assert.is(events[0].val, 'result');
        assert.is(events[1].err.message, 'ruh roh');
        assert.is(events[1].val, undefined);
    });

    test('ignores exception on subscription and no handler', () => {
        const calls: string[] = [];
        const state = model({
            crash: true,
        });
        const calculation = calc(() => {
            calls.push('call');
            if (state.crash) throw new Error('ruh roh');
        });
        const events: any[] = [];
        calculation.subscribe((err, val) => {
            events.push({ err, val });
        });

        assert.deepEqual(['call'], calls);
        assert.deepEqual(1, events.length);
        assert.is('ruh roh', events[0].err.message);
        assert.is(undefined, events[0].val);
    });

    test('reruns when collection dependency changes', () => {
        const calls: string[] = [];
        const dependency = collection(['item 1']);
        const calculation = calc(() => {
            calls.push('call');
            return dependency.length;
        });
        retain(calculation);
        const a = calculation.get();
        dependency.push('item 2');
        const b = calculation.get();
        assert.deepEqual(['call'], calls);
        flush();
        assert.deepEqual(['call', 'call'], calls);
        const c = calculation.get();
        assert.deepEqual(['call', 'call'], calls);
        assert.is(1, a);
        assert.is(1, b);
        assert.is(2, c);
        release(calculation);
    });

    test('reruns when dependent calculation changes', () => {
        const dependency = model({
            value: 1,
        });
        let calls: string[] = [];
        //
        //    value
        //      |
        //    root
        //   /    \
        // left  right
        //   \    /
        //   bottom
        //
        const root = calc(() => {
            calls.push('root');
            return dependency.value;
        }, 'root');
        const left = calc(() => {
            calls.push('left');
            return root.get() + 1;
        }, 'left');
        const right = calc(() => {
            calls.push('right');
            return root.get() + 2;
        }, 'right');
        const bottom = calc(() => {
            calls.push('bottom');
            return left.get() + right.get();
        }, 'bottom');
        retain(bottom);

        const result = bottom.get();
        assert.is(5, result);

        assert.deepEqual(['bottom', 'left', 'root', 'right'], calls);
        dependency.value = 2;

        calls = [];
        flush();

        const result2 = bottom.get();
        assert.is(7, result2);

        assert.is(0, calls.indexOf('root'));

        // order of left / right is implementation-dependent
        assert.lessThan(calls.indexOf('root'), calls.indexOf('right'));
        assert.lessThan(calls.indexOf('right'), calls.indexOf('bottom'));

        assert.lessThan(calls.indexOf('root'), calls.indexOf('left'));
        assert.lessThan(calls.indexOf('left'), calls.indexOf('bottom'));

        assert.is('root', calls[0]);
        assert.is('bottom', calls[3]);
        release(bottom);
    });

    test('dependencies are path-dependent', () => {
        const dependency = model(
            {
                a: 1,
                b: 2,
                which: 'a' as 'a' | 'b',
            },
            'model'
        );
        let calls: string[] = [];
        const calculation = calc(() => {
            if (dependency.which === 'a') {
                calls.push('call a');
                return dependency.a;
            } else {
                calls.push('call b');
                return dependency.b;
            }
        }, 'calculation');
        retain(calculation);
        calculation.get();
        flush();
        assert.deepEqual(['call a'], calls);

        // No dependency on b yet, no effect
        calls = [];
        dependency.b = 3;
        flush();
        assert.deepEqual([], calls);

        // Dependency on a, recalc
        calls = [];
        dependency.a = 4;
        flush();
        assert.deepEqual(['call a'], calls);

        // Dependency on which, recalc
        calls = [];
        dependency.which = 'b';
        flush();
        assert.deepEqual(['call b'], calls);

        // No longer dependency on a
        calls = [];
        dependency.a = 5;
        flush();
        assert.deepEqual([], calls);

        // Dependency on b, recalc
        calls = [];
        dependency.b = 6;
        flush();
        assert.deepEqual(['call b'], calls);

        release(calculation);
    });

    test('is not memoized when not retained multiple times', () => {
        const calls: string[] = [];
        const calculation = calc(() => {
            calls.push('call');
            return 1 + 1;
        });
        const a = calculation.get();
        const b = calculation.get();
        assert.is(2, a);
        assert.is(2, b);
        assert.deepEqual(['call', 'call'], calls);
    });

    test('retains collections appropriately', () => {
        const numbers = collection([1, 2, 3]);
        const sum = calc(() => numbers.reduce((acc, val) => acc + val, 0));
        const values: any[] = [];
        sum.subscribe((err, val) => values.push(val));
        assert.deepEqual([1 + 2 + 3], values);
        numbers.push(4);
        flush();
        assert.deepEqual([1 + 2 + 3, 1 + 2 + 3 + 4], values);
        numbers[0] = 5;
        flush();
        assert.deepEqual([1 + 2 + 3, 1 + 2 + 3 + 4, 5 + 2 + 3 + 4], values);
    });

    test('retains derived collections appropriately', () => {
        const numbers = collection([1, 2, 3]);
        const doubled = numbers.mapView((num) => num * 2);
        const sum = calc(() => doubled.reduce((acc, val) => acc + val, 0));
        const values: any[] = [];
        sum.subscribe((err, val) => values.push(val));
        assert.deepEqual([(1 + 2 + 3) * 2], values);
        numbers.push(4);
        flush();
        assert.deepEqual([(1 + 2 + 3) * 2, (1 + 2 + 3 + 4) * 2], values);
        numbers[0] = 5;
        flush();
        assert.deepEqual(
            [(1 + 2 + 3) * 2, (1 + 2 + 3 + 4) * 2, (5 + 2 + 3 + 4) * 2],
            values
        );
    });

    test('retains dict keys appropriately', () => {
        const bag = dict();
        const keys = bag.keysView();
        const size = calc(() => keys.length, 'calc length');
        let values: any[] = [];
        size.subscribe((err, val) => values.push(val));
        assert.deepEqual([0], values);

        values = [];
        bag.set('foo', 'bar');
        flush();
        assert.deepEqual([1], values);

        values = [];
        bag.set('baz', 'bum');
        flush();
        assert.deepEqual([2], values);

        values = [];
        bag.set('foo', 'overwrite');
        bag.set('baz', 'overwrite');
        flush();
        assert.deepEqual([], values);

        values = [];
        bag.delete('foo');
        bag.delete('unused');
        flush();
        assert.deepEqual([1], values);
    });

    test('.map() produces a mapped calculation', () => {
        const name = field('world');
        const excited = name.map((str) => `${str}!`);
        const greeted = excited.map((str) => `Hello, ${str}`);
        const results: string[] = [];
        const unsubscribe = greeted.subscribe((err, value) => {
            if (!err) {
                results.push(value);
            }
        });
        assert.is('Hello, world!', greeted.get());
        assert.deepEqual(['Hello, world!'], results);
        name.set('there');
        flush();
        assert.is('Hello, there!', greeted.get());
        assert.deepEqual(['Hello, world!', 'Hello, there!'], results);
        unsubscribe();
        name.set('not-flushed');
        assert.deepEqual(['Hello, world!', 'Hello, there!'], results);
        assert.is('Hello, not-flushed!', greeted.get());
    });

    test('bug: retain/release crash', () => {
        const v = field(10);
        const c = calc(() => {
            return v.get();
        });
        c.get();
        c.retain();
        c.get();
        c.release();
        c.get();
        flush();
        c.get();
        c.retain();
        c.get();
        c.release();
        c.get();
    });

    test('bug: non-retained adjustment to dependencies', () => {
        const a = field(10);
        const b = field(20);
        const which = field(true);
        const c = calc(() => {
            return which.get() ? a.get() : b.get();
        });
        assert.is(10, c.get());
        which.set(false);
        assert.is(20, c.get());
        which.set(true);
        assert.is(10, c.get());

        c.retain();
        assert.is(10, c.get());
        which.set(false);
        flush();
        assert.is(20, c.get());
        which.set(true);
        flush();
        assert.is(10, c.get());
        c.release();

        assert.is(10, c.get());
        which.set(false);
        assert.is(20, c.get());
        which.set(true);
        assert.is(10, c.get());
    });

    test('onAlive/onDead called when calc becomes alive/dead via get', () => {
        let log: string[] = [];
        const f = field('one');
        const inner = calc(() => {
            const v = f.get();
            log.push(`get:${v}`);
            return f.get();
        });
        inner.onAlive(() => log.push('alive'));
        inner.onDead(() => log.push('dead'));

        const outer = calc(() => {
            return inner.get();
        });

        assert.deepEqual([], log);
        inner.get();
        assert.deepEqual(['get:one'], log);

        log = [];
        outer.get();
        assert.deepEqual(['get:one'], log);

        log = [];
        outer.retain();
        assert.deepEqual([], log);
        outer.get();
        assert.deepEqual(['alive', 'get:one'], log);

        log = [];
        f.set('two');
        flush();
        assert.deepEqual(['get:two'], log);

        log = [];
        outer.release();
        assert.deepEqual(['dead'], log);
    });
    test('onAlive/onDead called when calc becomes alive/dead via subscribe', () => {});
});

suite('calc.async', () => {
    test('it turns an async function into a loading/data result', async () => {
        const value = field('yes');
        const values: AsyncCalculationResult<string>[] = [];
        const log: string[] = [];
        const c = calc.async<string>(async () => {
            const before = value.get();
            log.push(`before:${before}`);
            await new Promise((resolve) => setTimeout(resolve, 100));
            log.push(`after:${before}`);
            return before;
        });
        const unsubscribe = c.subscribe((err, val) => {
            if (!err) {
                values.push(val);
            }
        });
        assert.deepEqual(
            [
                {
                    isLoading: true,
                    error: undefined,
                    data: undefined,
                },
            ],
            values
        );
        await new Promise((resolve) => setTimeout(resolve, 200));
        flush();
        assert.deepEqual(
            [
                {
                    isLoading: true,
                    error: undefined,
                    data: undefined,
                },
                {
                    isLoading: false,
                    error: undefined,
                    data: 'yes',
                },
            ],
            values
        );
        assert.deepEqual(['before:yes', 'after:yes'], log);
        unsubscribe();
    });

    test('thrown errors before await produce error result', async () => {
        const value = field('yes');
        const values: AsyncCalculationResult<string>[] = [];
        const c = calc.async<string>(async () => {
            const before = value.get();
            throw new Error('ruh roh');
            await new Promise((resolve) => setTimeout(resolve, 100));
            return before;
        });
        const unsubscribe = c.subscribe((err, val) => {
            if (!err) {
                values.push(val);
            }
        });
        await Promise.resolve();
        flush();
        assert.is(2, values.length);
        assert.is(true, values[0].isLoading);
        assert.is(undefined, values[0].error);
        assert.is(undefined, values[0].data);
        assert.is(false, values[1].isLoading);
        assert.is('ruh roh', values[1].error?.message);
        assert.is(undefined, values[1].data);
        unsubscribe();
    });

    test('thrown errors after await produce error result', async () => {
        const value = field('yes');
        const values: AsyncCalculationResult<string>[] = [];
        const c = calc.async<string>(async () => {
            const before = value.get();
            await new Promise((resolve) => setTimeout(resolve, 100));
            throw new Error('ruh roh');
            return before;
        });
        const unsubscribe = c.subscribe((err, val) => {
            if (!err) {
                values.push(val);
            }
        });
        await new Promise((resolve) => setTimeout(resolve, 120));
        flush();
        assert.is(2, values.length);
        assert.is(true, values[0].isLoading);
        assert.is(undefined, values[0].error);
        assert.is(undefined, values[0].data);
        assert.is(false, values[1].isLoading);
        assert.is('ruh roh', values[1].error?.message);
        assert.is(undefined, values[1].data);
        unsubscribe();
    });

    test('error cleared on resolution', async () => {
        const value = field('throw');
        const values: AsyncCalculationResult<string>[] = [];
        const c = calc.async<string>(async () => {
            const before = value.get();
            if (before === 'throw') {
                throw new Error('ruh roh');
            }
            await new Promise((resolve) => setTimeout(resolve, 100));
            return before;
        });
        const unsubscribe = c.subscribe((err, val) => {
            if (!err) {
                values.push(val);
            }
        });
        await new Promise((resolve) => setTimeout(resolve, 120));
        flush();
        assert.is(2, values.length);
        assert.is(true, values[0].isLoading);
        assert.is(undefined, values[0].error);
        assert.is(undefined, values[0].data);
        assert.is(false, values[1].isLoading);
        assert.is('ruh roh', values[1].error?.message);
        assert.is(undefined, values[1].data);
        value.set('ok');
        flush();
        await new Promise((resolve) => setTimeout(resolve, 120));
        flush();
        assert.is(4, values.length);
        assert.is(true, values[2].isLoading);
        assert.is('ruh roh', values[2].error?.message);
        assert.is(undefined, values[2].data);
        assert.is(false, values[3].isLoading);
        assert.is(undefined, values[3].error?.message);
        assert.is('ok', values[3].data);
        unsubscribe();
    });

    test('it does not kick off async function when not retained', async () => {
        const value = field('yes');
        const log: string[] = [];
        const c = calc.async<string>(async () => {
            const before = value.get();
            log.push(`before:${before}`);
            await new Promise((resolve) => setTimeout(resolve, 100));
            log.push(`after:${before}`);
            return before;
        });
        assert.deepEqual(
            {
                isLoading: false,
                error: undefined,
                data: undefined,
            },
            c.get()
        );
        flush();
        assert.deepEqual([], log);
        assert.deepEqual(
            {
                isLoading: false,
                error: undefined,
                data: undefined,
            },
            c.get()
        );
    });

    test('changes read before first await trigger reload', async () => {
        const value = field('one');
        let log: string[] = [];
        const values: AsyncCalculationResult<string>[] = [];
        const c = calc.async<string>(async () => {
            const before = value.get();
            log.push(`before:${before}`);
            await new Promise((resolve) => setTimeout(resolve, 100));
            log.push(`after:${before}`);
            return before;
        });
        const unsubscribe = c.subscribe((err, val) => !err && values.push(val));
        assert.deepEqual(
            [
                {
                    isLoading: true,
                    error: undefined,
                    data: undefined,
                },
            ],
            values
        );
        assert.deepEqual(['before:one'], log);
        log = [];
        await new Promise((resolve) => setTimeout(resolve, 200));
        flush();
        assert.deepEqual(
            [
                {
                    isLoading: true,
                    error: undefined,
                    data: undefined,
                },
                {
                    isLoading: false,
                    error: undefined,
                    data: 'one',
                },
            ],
            values
        );
        assert.deepEqual(['after:one'], log);
        log = [];

        value.set('two');
        flush();
        assert.deepEqual(
            [
                {
                    isLoading: true,
                    error: undefined,
                    data: undefined,
                },
                {
                    isLoading: false,
                    error: undefined,
                    data: 'one',
                },
                {
                    isLoading: true,
                    error: undefined,
                    data: 'one',
                },
            ],
            values
        );
        assert.deepEqual(['before:two'], log);
        log = [];
        await new Promise((resolve) => setTimeout(resolve, 200));
        flush();
        assert.deepEqual(
            [
                {
                    isLoading: true,
                    error: undefined,
                    data: undefined,
                },
                {
                    isLoading: false,
                    error: undefined,
                    data: 'one',
                },
                {
                    isLoading: true,
                    error: undefined,
                    data: 'one',
                },
                {
                    isLoading: false,
                    error: undefined,
                    data: 'two',
                },
            ],
            values
        );
        assert.deepEqual(['after:two'], log);

        unsubscribe();
    });

    test('changes read after first await do not trigger reload', async () => {
        const value = field('one');
        const unrelated = field('unrelated');
        const values: AsyncCalculationResult<string>[] = [];
        const c = calc.async<string>(async () => {
            const before = value.get();
            await new Promise((resolve) => setTimeout(resolve, 100));
            return `${before}, ${unrelated.get()}`; // bad pattern!
        });
        const unsubscribe = c.subscribe((err, val) => !err && values.push(val));
        assert.deepEqual(
            [
                {
                    isLoading: true,
                    error: undefined,
                    data: undefined,
                },
            ],
            values
        );
        await new Promise((resolve) => setTimeout(resolve, 200));
        flush();
        assert.deepEqual(
            [
                {
                    isLoading: true,
                    error: undefined,
                    data: undefined,
                },
                {
                    isLoading: false,
                    error: undefined,
                    data: 'one, unrelated',
                },
            ],
            values
        );

        unrelated.set('new unrelated value');
        flush();
        assert.deepEqual(
            [
                {
                    isLoading: true,
                    error: undefined,
                    data: undefined,
                },
                {
                    isLoading: false,
                    error: undefined,
                    data: 'one, unrelated',
                },
            ],
            values
        );
        unsubscribe();
    });

    test('change before await resolves reloads and defers resolution', async () => {
        const value = field('one');
        const values: AsyncCalculationResult<string>[] = [];
        const c = calc.async<string>(async () => {
            const before = value.get();
            await new Promise((resolve) => setTimeout(resolve, 100));
            return before;
        });
        const unsubscribe = c.subscribe((err, val) => !err && values.push(val));
        assert.deepEqual(
            [
                {
                    isLoading: true,
                    error: undefined,
                    data: undefined,
                },
            ],
            values
        );
        await new Promise((resolve) => setTimeout(resolve, 75));
        flush();
        assert.deepEqual(
            [
                {
                    isLoading: true,
                    error: undefined,
                    data: undefined,
                },
            ],
            values
        );

        value.set('two');
        flush();

        await new Promise((resolve) => setTimeout(resolve, 75));
        flush();
        assert.deepEqual(
            [
                {
                    isLoading: true,
                    error: undefined,
                    data: undefined,
                },
            ],
            values
        );

        await new Promise((resolve) => setTimeout(resolve, 75));
        flush();

        assert.deepEqual(
            [
                {
                    isLoading: true,
                    error: undefined,
                    data: undefined,
                },
                {
                    isLoading: false,
                    error: undefined,
                    data: 'two',
                },
            ],
            values
        );

        unsubscribe();
    });
});

suite('cycles', () => {
    test('calculations that are cycles throw an error', () => {
        const calculations: Record<string, Calculation<string>> = {};
        calculations.a = calc(() => {
            return calculations.c.get() + 'a';
        }, 'a');
        calculations.b = calc(() => {
            return calculations.a.get() + 'b';
        }, 'b');
        calculations.c = calc(() => {
            return calculations.b.get() + 'c';
        }, 'c');
        retain(calculations.a);
        retain(calculations.b);
        retain(calculations.c);

        assert.throwsMatching(/cycle reached/i, () => calculations.a.get());
    });

    test('calculations that become cycles throw errors when called', () => {
        const calculations: Record<string, Calculation<string>> = {};
        const data = model({
            isCycle: false,
        });
        calculations.a = calc(() => {
            if (data.isCycle) {
                return calculations.c.get() + 'x';
            } else {
                return 'a';
            }
        }, 'a');
        calculations.b = calc(() => {
            return calculations.a.get() + 'b';
        }, 'b');
        calculations.c = calc(() => {
            return calculations.b.get() + 'c';
        }, 'c');
        retain(calculations.a);
        retain(calculations.b);
        retain(calculations.c);

        assert.is('a', calculations.a.get());
        assert.is('ab', calculations.b.get());
        assert.is('abc', calculations.c.get());

        data.isCycle = true;
        flush();

        assert.throwsMatching(/cycle reached/i, () => calculations.a.get());
        assert.throwsMatching(/cycle reached/i, () => calculations.b.get());
        assert.throwsMatching(/cycle reached/i, () => calculations.c.get());
    });

    test('calculations can become cycles and break cycles', () => {
        const calculations: Record<string, Calculation<string>> = {};
        const data = model({
            isCycle: false,
        });
        calculations.a = calc(() => {
            if (data.isCycle) {
                return calculations.b.get() + 'x';
            } else {
                return 'a';
            }
        }, 'a').onError(() => '<err:a>');
        calculations.b = calc(() => {
            return calculations.a.get() + 'b';
        }, 'b').onError(() => '<err:b>');

        calculations.d = calc(() => {
            return `final:${calculations.b.get()}`;
        }, 'd').onError(() => '<final:error>');

        // When isCycle is true:
        //
        // isCycle
        //   |
        //   v
        //   a <-> b
        //         |
        //         v
        //         d
        //
        // When isCycle is false:
        //
        // isCycle
        //   |
        //   v
        //   a --> b
        //         |
        //         v
        //         d

        retain(calculations.a);
        retain(calculations.b);
        retain(calculations.d);

        data.isCycle = true;
        flush();

        assert.is('final:<err:b>', calculations.d.get());

        data.isCycle = false;
        flush();

        assert.is('final:ab', calculations.d.get());

        data.isCycle = true;
        flush();

        assert.is('final:<err:b>', calculations.d.get());

        data.isCycle = false;
        flush();

        assert.is('final:ab', calculations.d.get());

        data.isCycle = true;
        flush();
    });

    test('calculations may switch from cycle A to B', () => {
        const calculations: Record<string, Calculation<string>> = {};
        const which = field('one');
        calculations.a = calc(() => {
            switch (which.get()) {
                case 'one':
                    return calculations.b.get() + 'a';
                case 'two':
                    return calculations.c.get() + 'a';
                case 'three':
                default:
                    return 'a';
            }
        }, 'a').onError(() => '<err:a>');
        calculations.b = calc(() => {
            return calculations.a.get() + 'b';
        }, 'b').onError(() => '<err:b>');
        calculations.c = calc(() => {
            return calculations.a.get() + 'c';
        }, 'c').onError(() => '<err:c>');

        calculations.d = calc(() => {
            return `(${calculations.b.get()}):(${calculations.c.get()})`;
        }, 'd').onError(() => '<err:d>');

        retain(calculations.a);
        retain(calculations.b);
        retain(calculations.c);
        retain(calculations.d);

        // Initial graph:
        //
        // which
        //   |
        //   v
        //   a <-> b
        //   |     |
        //   v     |
        //   c     |
        //   |     |
        //   +-----+
        //   |
        //   v
        //   d

        assert.is('<err:a>', calculations.a.get());
        assert.is('<err:b>', calculations.b.get());
        assert.is('<err:a>c', calculations.c.get());
        assert.is('(<err:b>):(<err:a>c)', calculations.d.get());

        flush();
        assert.is('(<err:b>):(<err:a>c)', calculations.d.get());

        which.set('two');
        flush();

        // Now graph is:
        //
        // which
        //   |
        //   v
        //   a <-- b
        //   ^     |
        //   |     |
        //   v     |
        //   c     |
        //   |     |
        //   +-----+
        //   |
        //   v
        //   d
        //
        assert.is('<err:a>', calculations.a.get());
        assert.is('<err:a>b', calculations.b.get());
        assert.is('<err:c>', calculations.c.get());
        assert.is('(<err:a>b):(<err:c>)', calculations.d.get());

        which.set('three');
        flush();

        // Nothing is in error state
        assert.is('(ab):(ac)', calculations.d.get());

        which.set('two');
        flush();

        // Revisit: B and C are in error state due to the cycle, A is not
        assert.is('(<err:a>b):(<err:c>)', calculations.d.get());

        which.set('one');
        flush();

        // Revisit: A and B are in error state due to the cycle, C is not
        assert.is('(<err:b>):(<err:a>c)', calculations.d.get());

        which.set('three');
        flush();

        // Nothing is in error state
        assert.is('(ab):(ac)', calculations.d.get());
    });

    test('dirtying cycle-unaware calculations that are part of cycles does not throw an error if flushed', () => {
        const calculations: Record<string, Calculation<string>> = {};
        const data = model(
            {
                isCycle: false,
                value: 'x',
            },
            'data'
        );
        let calls: string[] = [];
        calculations.a = calc(() => {
            calls.push('a');
            if (data.isCycle) {
                return data.value + calculations.c.get();
            } else {
                return 'a';
            }
        }, 'a');
        calculations.b = calc(() => {
            calls.push('b');
            return 'b' + calculations.a.get();
        }, 'b');
        calculations.c = calc(() => {
            calls.push('c');
            return 'c' + calculations.b.get();
        }, 'c');
        retain(calculations.a);
        retain(calculations.b);
        retain(calculations.c);

        //
        // When isCycle = true:
        //
        // +->b
        // |  |
        // |  c   value
        // |   \ /
        // +--- a
        //
        // When isCycle = false
        //
        //    a
        //    |
        //    b
        //    |
        //    c  value

        assert.is('a', calculations.a.get());
        assert.is('ba', calculations.b.get());
        assert.is('cba', calculations.c.get());

        data.isCycle = true;
        flush();

        calls = [];
        data.value = 'y';
        flush();

        // We expect a to be called because it has a dependency on value, which has changed
        // We expect b and c to be called because they were dirtied as if they had a dependency on value

        assert.arrayEqualsUnsorted(['a', 'b', 'c'], calls);
    });

    suite('cycle dependencies (caught cycle)', () => {
        const makeData = () => {
            const calculations: Record<string, Calculation<string>> = {};
            const data = model({
                hasCycle: 0,
                unrelated: 0,
            });
            const calls: string[] = [];

            //
            // hasCycle=0
            // |
            // v
            // A
            // |
            // v
            // B --> C --> D
            //
            // hasCycle=1
            // |
            // v
            // A <---+
            // |     |
            // v     |
            // B --> C --> D
            //
            calculations.a = calc(() => {
                calls.push('a');
                if (data.hasCycle > 0) {
                    return 'a' + calculations.c.get() + 'a';
                } else {
                    return 'x';
                }
            }, 'a').onError(() => {
                return 'A';
            });
            calculations.b = calc(() => {
                calls.push('b');
                return 'b' + calculations.a.get() + 'b';
            }, 'b').onError(() => {
                return 'B';
            });
            calculations.c = calc(() => {
                calls.push('c');
                return 'c' + calculations.b.get() + 'c';
            }, 'c').onError(() => {
                return 'C';
            });
            calculations.d = calc(() => {
                calls.push('d');
                const result = 'd' + calculations.c.get() + 'd';
                return result;
            }, 'd').onError(() => {
                return 'D';
            });

            retain(calculations.a);
            retain(calculations.b);
            retain(calculations.c);
            retain(calculations.d);
            return { calculations, data, calls };
        };

        test('cycles can be caught when triggered via standard calling', () => {
            const { calculations, data } = makeData();
            data.hasCycle = 1;

            assert.is('A', calculations.a.get());
            assert.is('B', calculations.b.get());
            assert.is('C', calculations.c.get());
            assert.is('dCd', calculations.d.get()); // because c caught its cycle, d is unaware and runs as expected
        });

        test('cycles can be caught when triggered via recalculation', () => {
            const { calculations, data } = makeData();
            assert.is('dcbxbcd', calculations.d.get());

            data.hasCycle = 1;
            flush();

            assert.is('A', calculations.a.get());
            assert.is('B', calculations.b.get());
            assert.is('C', calculations.c.get());
            assert.is('dCd', calculations.d.get()); // because c caught its cycle, d is unaware and runs as expected

            data.hasCycle = 0;
            flush();

            assert.is('x', calculations.a.get());
            assert.is('bxb', calculations.b.get());
            assert.is('cbxbc', calculations.c.get());
            assert.is('dcbxbcd', calculations.d.get());
        });

        test('cycles do not get re-processed if unrelated fields are modified', () => {
            const { calculations, data, calls } = makeData();
            assert.is('dcbxbcd', calculations.d.get());

            assert.deepEqual(['d', 'c', 'b', 'a'], calls);

            data.hasCycle = 1;
            flush();

            calls.splice(0, calls.length);

            data.unrelated = 1;
            flush();

            // No additional calls performed
            assert.deepEqual([], calls);
        });
    });

    suite('cycle dependencies (uncaught cycle)', () => {
        const makeData = () => {
            const calculations: Record<string, Calculation<string>> = {};
            const data = model({
                hasCycle: false,
            });

            calculations.a = calc(() => {
                if (data.hasCycle) {
                    return 'a' + calculations.c.get() + 'a';
                } else {
                    return 'x';
                }
            }, 'a');
            calculations.b = calc(() => {
                return 'b' + calculations.a.get() + 'b';
            }, 'b');
            calculations.c = calc(() => {
                return 'c' + calculations.b.get() + 'c';
            }, 'c');
            calculations.d = calc(() => {
                const result = 'd' + calculations.c.get() + 'd';
                return result;
            }, 'd');
            calculations.e = calc(() => {
                const result = 'e' + calculations.d.get() + 'e';
                return result;
            }, 'e').onError(() => 'E');
            calculations.f = calc(() => {
                const result = 'f' + calculations.c.get() + 'f';
                return result;
            }, 'f').onError(() => 'F');
            calculations.g = calc(() => {
                const result = 'g' + calculations.f.get() + 'g';
                return result;
            }, 'g').onError(() => 'G');

            retain(calculations.a);
            retain(calculations.b);
            retain(calculations.c);
            retain(calculations.d);
            retain(calculations.e);
            retain(calculations.f);
            retain(calculations.g);
            return { calculations, data };
        };

        test('cycles can be caught when triggered via standard calling', () => {
            const { calculations, data } = makeData();
            data.hasCycle = true;

            assert.throwsMatching(/cycle/i, () => calculations.a.get());
            assert.throwsMatching(/cycle/i, () => calculations.b.get());
            assert.throwsMatching(/cycle/i, () => calculations.c.get());
            assert.throwsMatching(/error/i, () => calculations.d.get()); // D is not a part of the cycle
            assert.is('E', calculations.e.get());
            assert.is('F', calculations.f.get());
            assert.is('gFg', calculations.g.get());
        });

        test('cycles can be caught when triggered via recalculation', () => {
            const { calculations, data } = makeData();
            assert.is('edcbxbcde', calculations.e.get());
            assert.is('gfcbxbcfg', calculations.g.get());

            data.hasCycle = true;
            flush();

            assert.throwsMatching(/cycle/i, () => calculations.a.get());
            assert.throwsMatching(/cycle/i, () => calculations.b.get());
            assert.throwsMatching(/cycle/i, () => calculations.c.get());
            assert.throwsMatching(/error/i, () => calculations.d.get());
            assert.is('E', calculations.e.get());
            assert.is('F', calculations.f.get());
            assert.is('gFg', calculations.g.get());

            data.hasCycle = false;
            flush(); // Properly recalculates things

            assert.is('edcbxbcde', calculations.e.get());
            assert.is('gfcbxbcfg', calculations.g.get());
        });
    });

    suite('cycle call behavior', () => {
        const makeData = () => {
            const calculations: Record<string, Calculation<string>> = {};
            const data = model({
                hasCycle: 0,
            });
            const calls: string[] = [];
            //
            // hasCycle=0
            // |
            // v
            // A
            // |
            // v
            // B --> C --> D
            //
            // hasCycle=1
            // |
            // v
            // A <---+
            // |     |
            // v     |
            // B --> C --> D
            //
            calculations.a = calc(() => {
                calls.push('a');
                if (data.hasCycle > 0) {
                    return 'a' + calculations.c.get() + 'a';
                } else {
                    return 'x';
                }
            }, 'a');
            calculations.b = calc(() => {
                calls.push('b');
                return 'b' + calculations.a.get() + 'b';
            }, 'b');
            calculations.c = calc(() => {
                calls.push('c');
                return 'c' + calculations.b.get() + 'c';
            }, 'c');
            calculations.d = calc(() => {
                calls.push('d');
                const result = 'd' + calculations.c.get() + 'd';
                return result;
            }, 'd');

            retain(calculations.d);
            return { calculations, data, calls };
        };

        test('cycle nodes called in depth order when calculating actively', () => {
            const { calculations, data, calls } = makeData();
            data.hasCycle = 1;

            assert.throwsMatching(/Cycle reached.*/i, () =>
                calculations.d.get()
            );
            assert.deepEqual(['d', 'c', 'b', 'a'], calls);

            calls.splice(0, calls.length);
            flush();

            // Note: even though we set hasCycle to 1, since it's not yet added to the graph (no active calculation
            // depends on it), the dirty state is not known. So flushing is a noop
            assert.arrayEqualsUnsorted([], calls);
            release(calculations.d);
        });

        test('cycle nodes called only once when recalculating', () => {
            const { calculations, data, calls } = makeData();
            calculations.d.get();

            assert.deepEqual(['d', 'c', 'b', 'a'], calls);

            data.hasCycle = 1;
            calls.splice(0, calls.length);
            flush();

            // Prior the flush, the graph is known as a line: a -> b -> c -> d
            // Once a is recalculated with hasCycle=1, edge:  a <------ c is added
            //
            // This closes the cycle, so b and c are not needed to be recalculated.
            assert.deepEqual(['a', 'd'], calls);

            calls.splice(0, calls.length);
            flush();

            assert.deepEqual([], calls);
        });
    });

    test('cycle can catch and resolve itself (depend on all)', () => {
        const calculations: Record<string, Calculation<string>> = {};

        const data = model({ hasCycle: false }, 'data');

        calculations.a = calc(() => {
            if (!data.hasCycle) return 'a no cycle';
            return 'a cycle:' + calculations.b.get();
        }, 'a').onError(() => {
            return 'A CAUGHT';
        });
        calculations.b = calc(() => {
            if (!data.hasCycle) return 'b no cycle';
            return 'b cycle:' + calculations.a.get();
        }, 'b').onError(() => {
            return 'B CAUGHT';
        });

        const catcher = calc(() => {
            return [calculations.a.get(), calculations.b.get()];
        }, 'catcher').onError(() => {
            return ['catcher caught'];
        });

        retain(catcher);

        assert.deepEqual(['a no cycle', 'b no cycle'], catcher.get());

        data.hasCycle = true;
        flush();

        // There are three plausible values for catcher():
        // 1. ['A CAUGHT', 'B CAUGHT']
        // 2. ['A CAUGHT', 'b cycle:A CAUGHT']
        // 3. ['a cycle:B CAUGHT']
        //
        // Case 1 is the correctly expected value.
        //
        // Case 2 or 3 could happen if we don't correctly call the error
        // handler _after_ confirming that yes, the cycle remains after
        // recalculating the node.

        assert.deepEqual(['A CAUGHT', 'B CAUGHT'], catcher.get());
    });

    test('cycle can catch and resolve itself (depend on one)', () => {
        const calculations: Record<string, Calculation<string>> = {};

        const data = model({ hasCycle: false });

        calculations.a = calc(() => {
            if (!data.hasCycle) return 'a no cycle';
            return 'a cycle' + calculations.b.get();
        }, 'a').onError(() => {
            return 'A CAUGHT';
        });
        calculations.b = calc(() => {
            if (!data.hasCycle) return 'b no cycle';
            return 'b cycle' + calculations.a.get();
        }, 'b').onError(() => {
            return 'B CAUGHT';
        });

        const catcher = calc(() => {
            return calculations.a.get();
        }, 'catcher').onError(() => {
            return 'catcher caught';
        });

        retain(catcher);

        assert.deepEqual('a no cycle', catcher.get());

        data.hasCycle = true;
        flush();

        assert.deepEqual('A CAUGHT', catcher.get());
    });

    test('cycle does not catch and resolve itself if all cycles do not catch', () => {
        const calculations: Record<string, Calculation<string>> = {};

        const data = model({ hasCycle: false }, 'model');

        calculations.a = calc(() => {
            if (!data.hasCycle) return 'a no cycle';
            return 'a cycle' + calculations.b.get();
        }, 'a');
        calculations.b = calc(() => {
            if (!data.hasCycle) return 'b no cycle';
            return 'b cycle' + calculations.a.get();
        }, 'b').onError(() => {
            return 'B CAUGHT';
        });

        const catcher = calc(() => {
            return calculations.a.get();
        }, 'catcher').onError(() => {
            return 'catcher caught';
        });

        // With hasCycle=false:
        //     hasCycle ----+
        //            |     |
        //            v     v
        //            b     a
        //                  |
        //                  v
        //           [catcher]
        //
        // With hasCycle=true:
        //     hasCycle ----+
        //            |     |
        //            v     v
        //            b <-> a
        //                  |
        //                  v
        //           [catcher]

        retain(catcher);

        assert.deepEqual('a no cycle', catcher.get());

        data.hasCycle = true;
        flush();

        assert.deepEqual('catcher caught', catcher.get());
    });

    test('cycle expanded by recalculation is detected correctly on all nodes', () => {
        // Before:
        //     A <-> B
        //     |     ^
        //     v     |
        //     D     C
        //           ^
        //           |
        //           E
        //
        // After:
        //     A <-> B
        //     |     ^
        //     v     |
        //     D --> C
        //           ^
        //           |
        //           E
        const calculations: Record<string, Calculation<any>> = {};
        const data = model({ e: 0 }, 'data');
        calculations.a = calc(() => {
            return calculations.b.get() + ' and A';
        }, 'a');
        calculations.b = calc(() => {
            return (
                calculations.c.get() + ' and ' + calculations.a.get() + ' and B'
            );
        }, 'b');
        calculations.c = calc(() => {
            if (data.e > 0) {
                return calculations.d.get() + ' and C';
            }
            return 'C';
        }, 'c');
        calculations.d = calc(() => {
            return calculations.a.get() + ' and D';
        }, 'd');
        retain(calculations.a);
        retain(calculations.b);
        retain(calculations.c);
        retain(calculations.d);

        assert.throwsMatching(/cycle/i, () => calculations.a.get());
        assert.throwsMatching(/cycle/i, () => calculations.b.get());
        assert.is('C', calculations.c.get());
        assert.throwsMatching(/error/, () => calculations.d.get());

        data.e = 1;
        flush();

        assert.throwsMatching(/cycle/i, () => calculations.a.get());
        assert.throwsMatching(/cycle/i, () => calculations.b.get());
        assert.throwsMatching(/cycle/i, () => calculations.c.get());
        assert.throwsMatching(/cycle/i, () => calculations.d.get());
    });

    test('cycle created by recalculation is detected correctly on all nodes', () => {
        // Before:
        //     A <-- B
        //     |     ^
        //     v     |
        //     D     C
        //           ^
        //           |
        //           E
        //
        // After:
        //     A <-- B
        //     |     ^
        //     v     |
        //     D --> C
        //           ^
        //           |
        //           E
        const calculations: Record<string, Calculation<any>> = {};
        const data = model({ e: 0 }, 'data');
        calculations.a = calc(() => {
            return calculations.b.get() + ' and A';
        }, 'a');
        calculations.b = calc(() => {
            return calculations.c.get() + ' and B';
        }, 'b');
        calculations.c = calc(() => {
            if (data.e > 0) {
                return calculations.d.get() + ' and C';
            }
            return 'C';
        }, 'c');
        calculations.d = calc(() => {
            return calculations.a.get() + ' and D';
        }, 'd');
        retain(calculations.a);
        retain(calculations.b);
        retain(calculations.c);
        retain(calculations.d);

        assert.is('C and B and A', calculations.a.get());
        assert.is('C and B', calculations.b.get());
        assert.is('C', calculations.c.get());
        assert.is('C and B and A and D', calculations.d.get());

        data.e = 1;
        flush();

        assert.throwsMatching(/cycle/i, () => calculations.a.get());
        assert.throwsMatching(/cycle/i, () => calculations.b.get());
        assert.throwsMatching(/cycle/i, () => calculations.c.get());
        assert.throwsMatching(/cycle/i, () => calculations.d.get());
    });
});

suite('cycles with partial recovery', () => {
    // Note: I'm not certain that the behavior encoded in this test is intuitive.
    // Cycles with **partial** error handling is weird.
    //
    // If there is a cycle a <-> b, and only "b" has an error handler, what happens when "a" is called?
    //
    // It depends on how the cycle is accessed.
    //
    // If some calculation X calls "b", then b's error handler response is returned, so there is no error
    // If some calculation X calls "a", then a throws an error when called, and X needs to handle the error
    //
    const setup = () => {
        const calculations: Record<string, Calculation<string>> = {};

        const data = model({ hasCycle: false }, 'model');

        calculations.a = calc(() => {
            if (!data.hasCycle) return 'a no cycle';
            return 'a cycle' + calculations.b.get();
        }, 'a');
        calculations.b = calc(() => {
            if (!data.hasCycle) return 'b no cycle';
            return 'b cycle' + calculations.a.get();
        }, 'b').onError(() => {
            return 'B CAUGHT';
        });

        const catcher = calc(() => {
            return calculations.a.get();
        }, 'catcher').onError(() => {
            return 'catcher caught';
        });

        // With hasCycle=false:
        //     hasCycle ----+
        //            |     |
        //            v     v
        //            b     a
        //                  |
        //                  v
        //           [catcher]
        //
        // With hasCycle=true:
        //     hasCycle ----+
        //            |     |
        //            v     v
        //            b <-> a
        //                  |
        //                  v
        //           [catcher]

        return { catcher, calculations, data };
    };

    test('non-retained behavior, with cycle', () => {
        const { catcher, calculations, data } = setup();

        data.hasCycle = true;
        assert.is('catcher caught', catcher.get());
        assert.is('a cycleB CAUGHT', calculations.a.get());
        assert.is('B CAUGHT', calculations.b.get());
    });

    test('non-retained behavior, with no cycle', () => {
        const { catcher, calculations, data } = setup();

        data.hasCycle = false;
        assert.is('a no cycle', catcher.get());
        assert.is('a no cycle', calculations.a.get());
        assert.is('b no cycle', calculations.b.get());
    });

    test('retained behavior, cycle -> no cycle', () => {
        const { catcher, calculations, data } = setup();

        catcher.retain();

        data.hasCycle = true;
        assert.is('catcher caught', catcher.get());
        assert.throwsMatching(
            /Cycle error: calculation cycle reached itself/,
            () => calculations.a.get()
        );
        assert.is('B CAUGHT', calculations.b.get());

        data.hasCycle = false;
        flush();
        assert.deepEqual('a no cycle', catcher.get());
        assert.is('a no cycle', calculations.a.get());
        assert.is('b no cycle', calculations.b.get());
    });

    test('retained behavior, no cycle -> cycle', () => {
        const { catcher, calculations, data } = setup();

        catcher.retain();

        data.hasCycle = false;
        assert.is('a no cycle', catcher.get());
        assert.is('a no cycle', calculations.a.get());
        assert.is('b no cycle', calculations.b.get());

        data.hasCycle = true;
        flush();
        assert.is('catcher caught', catcher.get());
        assert.throwsMatching(
            /Cycle error: calculation cycle reached itself/,
            () => calculations.a.get()
        );
        assert.is('B CAUGHT', calculations.b.get());
    });
});

suite('near cycles', () => {
    let calculations: Record<string, Calculation<any>> = {};
    let data = model({ e: 0 }, 'data');

    // When E = 0:
    //     A --> B
    //     ^     |
    //     |     v
    //     C     D
    //
    // When E = 1:
    //     A <-- B
    //     |
    //     v
    //     C --> D
    //
    // When E = 2:
    //     A     B
    //     ^     |
    //     |     v
    //     C <-- D
    //
    // When E = 3:
    //     A <-- B
    //           ^
    //           |
    //     C --> D
    //

    beforeEach(() => {
        calculations = {};
        data = model({ e: 0 }, 'data');
        calculations.a = calc(() => {
            switch (data.e) {
                case 0:
                    return calculations.c.get() + ' and A';
                case 1:
                    return calculations.b.get() + ' and A';
                case 2:
                    return calculations.c.get() + ' and A';
                case 3:
                    return calculations.b.get() + ' and A';
            }
        }, 'a');
        calculations.b = calc(() => {
            switch (data.e) {
                case 0:
                    return calculations.a.get() + ' and B';
                case 1:
                    return 'B';
                case 2:
                    return 'B';
                case 3:
                    return calculations.d.get() + ' and B';
            }
        }, 'b');
        calculations.c = calc(() => {
            switch (data.e) {
                case 0:
                    return 'C';
                case 1:
                    return calculations.a.get() + ' and C';
                case 2:
                    return calculations.d.get() + ' and C';
                case 3:
                    return 'C';
            }
        }, 'c');
        calculations.d = calc(() => {
            switch (data.e) {
                case 0:
                    return calculations.b.get() + ' and D';
                case 1:
                    return calculations.c.get() + ' and D';
                case 2:
                    return calculations.b.get() + ' and D';
                case 3:
                    return calculations.c.get() + ' and D';
            }
        }, 'd');
        retain(calculations.a);
        retain(calculations.b);
        retain(calculations.c);
        retain(calculations.d);
        flush();
    });

    function assertCase0() {
        assert.is('C and A', calculations.a.get());
        assert.is('C and A and B', calculations.b.get());
        assert.is('C', calculations.c.get());
        assert.is('C and A and B and D', calculations.d.get());
    }

    function assertCase1() {
        assert.is('B and A', calculations.a.get());
        assert.is('B', calculations.b.get());
        assert.is('B and A and C', calculations.c.get());
        assert.is('B and A and C and D', calculations.d.get());
    }

    function assertCase2() {
        assert.is('B and D and C and A', calculations.a.get());
        assert.is('B', calculations.b.get());
        assert.is('B and D and C', calculations.c.get());
        assert.is('B and D', calculations.d.get());
    }

    function assertCase3() {
        assert.is('C and D and B and A', calculations.a.get());
        assert.is('C and D and B', calculations.b.get());
        assert.is('C', calculations.c.get());
        assert.is('C and D', calculations.d.get());
    }

    test('initialization works for case E=0', () => {
        data.e = 0;
        assertCase0();
    });

    test('initialization works for case E=1', () => {
        data.e = 1;
        assertCase1();
    });

    test('initialization works for case E=2', () => {
        data.e = 2;
        assertCase2();
    });

    test('initialization works for case E=3', () => {
        data.e = 3;
        assertCase3();
    });

    test('E=0 -> E=1 does not produce cycle', () => {
        data.e = 0;
        assertCase0();

        data.e = 1;
        flush();

        assertCase1();
    });

    test('E=1 -> E=2 does not produce cycle', () => {
        data.e = 1;
        assertCase1();

        data.e = 2;
        flush();

        assertCase2();
    });

    test('E=2 -> E=3 does not produce cycle', () => {
        data.e = 2;
        assertCase2();

        data.e = 3;
        flush();

        assertCase3();
    });

    test('E=3 -> E=0 does not produce cycle', () => {
        data.e = 3;
        assertCase3();

        data.e = 0;
        flush();

        assertCase0();
    });
});

suite('errors', () => {
    function setup() {
        const data = model({
            num: 4,
            denom: 2,
        });
        const divide = calc<string | number>(() => {
            if (data.denom === 0) throw new Error('divide by zero');
            return data.num / data.denom;
        }, 'divide').onError(() => {
            return 'caught error';
        });
        const items: (number | string)[] = [];
        const root = calc(() => {
            items.push(divide.get());
        }, 'root');
        retain(root);
        root.get();
        return { items, data };
    }
    test('errors thrown as a result of recalculation can be caught', () => {
        const { items, data } = setup();

        assert.deepEqual([2], items);
        data.num = 6;
        flush();
        assert.deepEqual([2, 3], items);

        data.num = 5;
        data.denom = 1;
        flush();
        assert.deepEqual([2, 3, 5], items);

        data.denom = 0;
        flush();
        assert.deepEqual([2, 3, 5, 'caught error'], items);
    });

    test('caught errors can be recalculated if their dependencies are updated', () => {
        const { items, data } = setup();

        data.denom = 0;
        flush();
        assert.deepEqual([2, 'caught error'], items);

        data.denom = 1;
        flush();
        assert.deepEqual([2, 'caught error', 4], items);
    });
});

suite('type tests', () => {
    test('return type of calculations is correctly inferred', () => {
        const x = calc(() => {
            return 'hello';
        });
        const v = x.get();
        type VIsString = typeof v extends string
            ? string extends typeof v
                ? 'Yes'
                : 'No'
            : 'No';
        const isXType = (val: VIsString) => null;

        isXType('Yes');
        // @ts-expect-error
        isXType('No');
    });
});
