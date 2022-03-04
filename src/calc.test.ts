import { suite, test, assert, beforeEach } from '@srhazi/test-jig';
import { model } from './model';
import { collection } from './collection';
import {
    flush,
    calc,
    effect,
    retain,
    release,
    reset,
    debug,
    debugSubscribe,
    subscribe,
} from './calc';
import { setLogLevel } from './log';
import { Calculation } from './types';

beforeEach(() => {
    subscribe();
    reset();
});

suite('calc', () => {
    test('memoizes when called multiple times', () => {
        const calls: string[] = [];
        const calculation = calc(() => {
            calls.push('call');
            return 1 + 1;
        });
        const a = calculation();
        const b = calculation();
        assert.is(2, a);
        assert.is(2, b);
        assert.deepEqual(['call'], calls);
    });

    test('reruns when model dependency changes', () => {
        const calls: string[] = [];
        const dependency = model({
            value: 1,
        });
        const calculation = calc(() => {
            calls.push('call');
            return dependency.value;
        });
        retain(calculation);
        const a = calculation();
        dependency.value = 2;
        const b = calculation();
        assert.deepEqual(['call'], calls);
        flush();
        assert.deepEqual(['call', 'call'], calls);
        const c = calculation();
        assert.deepEqual(['call', 'call'], calls);
        assert.is(1, a);
        assert.is(1, b);
        assert.is(2, c);
        release(calculation);
    });

    test('reruns when collection dependency changes', () => {
        const calls: string[] = [];
        const dependency = collection(['item 1']);
        const calculation = calc(() => {
            calls.push('call');
            return dependency.length;
        });
        retain(calculation);
        const a = calculation();
        dependency.push('item 2');
        const b = calculation();
        assert.deepEqual(['call'], calls);
        flush();
        assert.deepEqual(['call', 'call'], calls);
        const c = calculation();
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
        //    root
        //   /    \
        // left  right
        //   \    /
        //   bottom
        //
        const root = calc(() => {
            calls.push('root');
            return dependency.value;
        });
        const left = calc(() => {
            calls.push('left');
            return root() + 1;
        });
        const right = calc(() => {
            calls.push('right');
            return root() + 2;
        });
        const bottom = calc(() => {
            calls.push('bottom');
            return left() + right();
        });
        retain(bottom);

        const result = bottom();

        assert.deepEqual(['bottom', 'left', 'root', 'right'], calls);
        dependency.value = 2;

        calls = [];
        flush();

        const result2 = bottom();
        assert.is(0, calls.indexOf('root'));

        // order of left / right is implementation-dependent
        assert.lessThan(calls.indexOf('root'), calls.indexOf('right'));
        assert.lessThan(calls.indexOf('right'), calls.indexOf('bottom'));

        assert.lessThan(calls.indexOf('root'), calls.indexOf('left'));
        assert.lessThan(calls.indexOf('left'), calls.indexOf('bottom'));

        assert.is(3, calls.indexOf('bottom'));
        assert.deepEqual(['root', 'right', 'left', 'bottom'], calls);
        assert.is(5, result);
        assert.is(7, result2);
        release(bottom);
    });

    test('dependencies are path-dependent', () => {
        const dependency = model({
            a: 1,
            b: 2,
            which: 'a' as 'a' | 'b',
        });
        const calls: string[] = [];
        const calculation = calc(() => {
            if (dependency.which === 'a') {
                calls.push('call a');
                return dependency.a;
            } else {
                calls.push('call b');
                return dependency.b;
            }
        });
        retain(calculation);
        calculation();
        flush();

        // No dependency on b yet, no effect
        dependency.b = 3;
        flush();
        assert.deepEqual(['call a'], calls);

        // Dependency on a, recalc
        dependency.a = 4;
        flush();
        assert.deepEqual(['call a', 'call a'], calls);

        // Dependency on which, recalc
        dependency.which = 'b';
        flush();
        assert.deepEqual(['call a', 'call a', 'call b'], calls);

        // No longer dependency on a
        dependency.a = 5;
        flush();
        assert.deepEqual(['call a', 'call a', 'call b'], calls);

        // Dependency on b, recalc
        dependency.b = 6;
        flush();
        assert.deepEqual(['call a', 'call a', 'call b', 'call b'], calls);

        release(calculation);
    });
});

suite('effect', () => {
    test('reruns when model dependency changes', () => {
        const calls: string[] = [];
        const dependency = model({
            value: 1,
        });
        const eff = effect(() => {
            calls.push(`call ${dependency.value}`);
            return dependency.value;
        });
        retain(eff);
        eff();
        assert.deepEqual(['call 1'], calls);
        dependency.value = 2;
        flush();
        assert.deepEqual(['call 1', 'call 2'], calls);
        release(eff);
    });

    test('reruns when collection dependency changes', () => {
        const calls: string[] = [];
        const dependency = collection<string>([]);
        const eff = effect(() => {
            calls.push(`call ${dependency.length}`);
        });
        retain(eff);
        eff();
        assert.deepEqual(['call 0'], calls);
        dependency.push('hi');
        flush();
        assert.deepEqual(['call 0', 'call 1'], calls);
        release(eff);
    });

    test('does not trigger dependency when initiated from within a calculation', () => {
        const calls: string[] = [];
        const dependency = model({
            effdep: 0,
            calcdep: 0,
        });
        const eff = effect(() => {
            calls.push(`eff ${dependency.effdep}`);
        });
        const cal = calc(() => {
            calls.push(`cal ${dependency.calcdep}`);
            eff();
            return dependency.calcdep;
        });
        retain(eff);
        retain(cal);
        cal();
        assert.deepEqual(['cal 0', 'eff 0'], calls);
        dependency.effdep = 1;
        flush();
        assert.deepEqual(['cal 0', 'eff 0', 'eff 1'], calls);
        dependency.calcdep = 2;
        flush();
        assert.deepEqual(['cal 0', 'eff 0', 'eff 1', 'cal 2'], calls);
        dependency.calcdep = 3;
        flush();
        assert.deepEqual(['cal 0', 'eff 0', 'eff 1', 'cal 2', 'cal 3'], calls);
        dependency.effdep = 4;
        flush();
        assert.deepEqual(
            ['cal 0', 'eff 0', 'eff 1', 'cal 2', 'cal 3', 'eff 4'],
            calls
        );
        release(cal);
        release(eff);
    });

    test('calculations can provide custom equality check to prevent recalculation', () => {
        const calls: string[] = [];
        const dependency = model({
            val: { left: 'l', right: 'r' },
        });
        //     a
        //    / \
        //   b   c
        //    \ /
        //     d
        //
        const isEqual = (
            a: { left: string; right: string },
            b: { left: string; right: string }
        ) => a.left === b.left && a.right === b.right;

        const d = calc(
            () => {
                calls.push('d');
                return dependency.val;
            },
            isEqual,
            'd'
        );
        const b = calc(() => {
            calls.push('b');
            return d().left;
        }, 'b');
        const c = calc(() => {
            calls.push('c');
            return d().right;
        }, 'c');
        const a = calc(() => {
            calls.push('a');
            return b() + c();
        }, 'a');
        retain(a);
        a();

        assert.deepEqual(['a', 'b', 'd', 'c'], calls);

        dependency.val = {
            left: 'l',
            right: 'r',
        };
        flush();

        assert.deepEqual(['a', 'b', 'd', 'c', 'd'], calls);
        release(a);
    });

    test('calculations can provide custom equality check, which causes prior value to be returned', () => {
        setLogLevel('debug');
        const dependency = model({
            val: { left: 'l', right: 'r' },
        });

        const isEqual = (
            a: { left: string; right: string },
            b: { left: string; right: string }
        ) => a.left === b.left && a.right === b.right;

        const d = calc(
            () => {
                return dependency.val;
            },
            isEqual,
            'd'
        );
        retain(d);
        const before = d();

        dependency.val = {
            left: 'l',
            right: 'r',
        };
        flush();

        const after = d();
        assert.is(after, before);
        release(d);
    });
});

suite('cycles', () => {
    test('calculations that are cycles throw an error', () => {
        const calculations: Record<string, Calculation<string>> = {};
        calculations.a = calc(() => {
            return calculations.c() + 'a';
        }, 'a');
        calculations.b = calc(() => {
            return calculations.a() + 'b';
        }, 'b');
        calculations.c = calc(() => {
            return calculations.b() + 'c';
        }, 'c');
        retain(calculations.a);
        retain(calculations.b);
        retain(calculations.c);

        assert.throwsMatching(/cycle reached/i, () => calculations.a());
    });

    test('calculations that become cycles throw errors when called', () => {
        const calculations: Record<string, Calculation<string>> = {};
        const data = model({
            isCycle: false,
        });
        calculations.a = calc(() => {
            if (data.isCycle) {
                return calculations.c() + 'x';
            } else {
                return 'a';
            }
        }, 'a');
        calculations.b = calc(() => {
            return calculations.a() + 'b';
        }, 'b');
        calculations.c = calc(() => {
            return calculations.b() + 'c';
        }, 'c');
        retain(calculations.a);
        retain(calculations.b);
        retain(calculations.c);

        assert.is('a', calculations.a());
        assert.is('ab', calculations.b());
        assert.is('abc', calculations.c());

        data.isCycle = true;
        flush();

        assert.throwsMatching(/cycle reached/i, () => calculations.a());
        assert.throwsMatching(/cycle reached/i, () => calculations.b());
        assert.throwsMatching(/cycle reached/i, () => calculations.c());
    });

    test('dirtying cycle-unaware calculations that are part of cycles does not throw an error if flushed', () => {
        const calculations: Record<string, Calculation<string>> = {};
        const data = model({
            isCycle: false,
            value: 'x',
        });
        let calls: string[] = [];
        calculations.a = calc(() => {
            calls.push('a');
            if (data.isCycle) {
                return calculations.c() + data.value;
            } else {
                return 'a';
            }
        }, 'a');
        calculations.b = calc(() => {
            calls.push('b');
            return calculations.a() + 'b';
        }, 'b');
        calculations.c = calc(() => {
            calls.push('c');
            return calculations.b() + 'c';
        }, 'c');
        retain(calculations.a);
        retain(calculations.b);
        retain(calculations.c);

        assert.is('a', calculations.a());
        assert.is('ab', calculations.b());
        assert.is('abc', calculations.c());

        data.isCycle = true;
        flush();

        calls = [];
        data.value = 'y';
        flush();

        assert.deepEqual([], calls);
    });

    test('cycles can be caught', () => {
        setLogLevel('debug');
        const calculations: Record<string, Calculation<string>> = {};
        const calls: string[] = [];
        calculations.a = calc(() => {
            calls.push('a');
            return calculations.c() + 'a';
        }, 'a').onCycle(() => {
            calls.push('cycle:a');
            return 'A';
        });
        calculations.b = calc(() => {
            calls.push('b');
            return calculations.a() + 'b';
        }, 'b').onCycle(() => {
            calls.push('cycle:b');
            return 'B';
        });
        calculations.c = calc(() => {
            calls.push('c');
            return calculations.b() + 'c';
        }, 'c').onCycle(() => {
            calls.push('cycle:c');
            return 'C';
        });
        calculations.d = calc(() => {
            calls.push('d:before');
            const result = calculations.c() + 'd';
            calls.push('d:after');
            return result;
        }, 'd').onCycle(() => {
            calls.push('cycle:d');
            return 'D';
        });
        retain(calculations.a);
        retain(calculations.b);
        retain(calculations.c);
        retain(calculations.d);

        assert.is('D', calculations.d());
        assert.deepEqual(
            [
                'd:before',
                'c',
                'b',
                'a',
                'cycle:c',
                'cycle:a',
                'cycle:b',
                'cycle:d',
            ],
            calls
        );

        assert.is('C', calculations.c());
        assert.is('B', calculations.b());
        assert.is('A', calculations.a());
        assert.deepEqual(
            [
                'd:before',
                'c',
                'b',
                'a',
                'cycle:c',
                'cycle:a',
                'cycle:b',
                'cycle:d',
            ],
            calls
        );
    });
});
