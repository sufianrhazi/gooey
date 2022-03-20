import { suite, test, assert, beforeEach } from '@srhazi/test-jig';
import { model } from './model';
import { collection } from './collection';
import { flush, calc, effect, retain, release, reset, subscribe } from './calc';
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

        assert.is('root', calls[0]);
        assert.is('bottom', calls[3]);
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
        }, 'calculation');
        retain(calculation);
        calculation();
        flush();
        assert.deepEqual(['call a'], calls);

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

    suite('cycle dependencies (caught cycle)', () => {
        let calculations: Record<string, Calculation<string>> = {};
        let data = model({
            hasCycle: false,
        });

        beforeEach(() => {
            calculations = {};
            data = model({
                hasCycle: false,
            });

            calculations.a = calc(() => {
                if (data.hasCycle) {
                    return 'a' + calculations.c() + 'a';
                } else {
                    return 'x';
                }
            }, 'a').onError(() => {
                return 'A';
            });
            calculations.b = calc(() => {
                return 'b' + calculations.a() + 'b';
            }, 'b').onError(() => {
                return 'B';
            });
            calculations.c = calc(() => {
                return 'c' + calculations.b() + 'c';
            }, 'c').onError(() => {
                return 'C';
            });
            calculations.d = calc(() => {
                const result = 'd' + calculations.c() + 'd';
                return result;
            }, 'd').onError(() => {
                return 'D';
            });

            retain(calculations.a);
            retain(calculations.b);
            retain(calculations.c);
            retain(calculations.d);
        });

        test('cycles can be caught when triggered via standard calling', () => {
            data.hasCycle = true;

            assert.is('A', calculations.a());
            assert.is('B', calculations.b());
            assert.is('C', calculations.c());
            assert.is('dCd', calculations.d()); // because c caught its cycle, d is unaware and runs as expected
        });

        test('cycles can be caught when triggered via recalculation', () => {
            assert.is('dcbxbcd', calculations.d());

            data.hasCycle = true;
            flush();

            assert.is('A', calculations.a());
            assert.is('B', calculations.b());
            assert.is('C', calculations.c());
            assert.is('dCd', calculations.d()); // because c caught its cycle, d is unaware and runs as expected

            data.hasCycle = false;
            flush(); // Has no effect, as the cycle hasn't been manually flushed

            assert.is('A', calculations.a());
            assert.is('B', calculations.b());
            assert.is('C', calculations.c());
            assert.is('dCd', calculations.d());

            calculations.a.flush();
            flush(); // Properly recalculates things

            assert.is('dcbxbcd', calculations.d());
        });
    });

    suite('cycle dependencies (uncaught cycle)', () => {
        let calculations: Record<string, Calculation<string>> = {};
        let data = model({
            hasCycle: false,
        });

        beforeEach(() => {
            calculations = {};
            data = model({
                hasCycle: false,
            });

            calculations.a = calc(() => {
                if (data.hasCycle) {
                    return 'a' + calculations.c() + 'a';
                } else {
                    return 'x';
                }
            }, 'a');
            calculations.b = calc(() => {
                return 'b' + calculations.a() + 'b';
            }, 'b');
            calculations.c = calc(() => {
                return 'c' + calculations.b() + 'c';
            }, 'c');
            calculations.d = calc(() => {
                const result = 'd' + calculations.c() + 'd';
                return result;
            }, 'd');
            calculations.e = calc(() => {
                const result = 'e' + calculations.d() + 'e';
                return result;
            }, 'e').onError(() => 'E');
            calculations.f = calc(() => {
                const result = 'f' + calculations.c() + 'f';
                return result;
            }, 'f').onError(() => 'F');
            calculations.g = calc(() => {
                const result = 'g' + calculations.f() + 'g';
                return result;
            }, 'g').onError(() => 'G');

            retain(calculations.a);
            retain(calculations.b);
            retain(calculations.c);
            retain(calculations.d);
            retain(calculations.e);
            retain(calculations.g);
        });

        test('cycles can be caught when triggered via standard calling', () => {
            data.hasCycle = true;

            assert.throwsMatching(/cycle/i, () => calculations.a());
            assert.throwsMatching(/cycle/i, () => calculations.b());
            assert.throwsMatching(/cycle/i, () => calculations.c());
            assert.throwsMatching(/cycle/i, () => calculations.d());
            assert.is('E', calculations.e());
            assert.is('F', calculations.f());
            assert.is('gFg', calculations.g());
        });

        test('cycles can be caught when triggered via recalculation', () => {
            assert.is('edcbxbcde', calculations.e());
            assert.is('gfcbxbcfg', calculations.g());

            data.hasCycle = true;
            flush();

            assert.throwsMatching(/cycle/i, () => calculations.a());
            assert.throwsMatching(/cycle/i, () => calculations.b());
            assert.throwsMatching(/cycle/i, () => calculations.c());
            assert.throwsMatching(/error/i, () => calculations.d());
            assert.is('E', calculations.e());
            assert.is('F', calculations.f());
            assert.is('gFg', calculations.g());

            data.hasCycle = false;
            flush(); // Has no effect, as the cycle hasn't been manually flushed

            assert.throwsMatching(/cycle/i, () => calculations.a());
            assert.throwsMatching(/cycle/i, () => calculations.b());
            assert.throwsMatching(/cycle/i, () => calculations.c());
            assert.throwsMatching(/error/i, () => calculations.d());
            assert.is('E', calculations.e());
            assert.is('F', calculations.f());
            assert.is('gFg', calculations.g());

            calculations.a.flush();
            flush(); // Properly recalculates things

            assert.is('edcbxbcde', calculations.e());
            assert.is('gfcbxbcfg', calculations.g());
        });
    });

    suite('cycle call behavior', () => {
        let calculations: Record<string, Calculation<string>> = {};
        let data = model({
            hasCycle: 0,
        });
        let calls: string[] = [];

        beforeEach(() => {
            calculations = {};
            data = model({
                hasCycle: 0,
            });

            calculations.a = calc(() => {
                calls.push('a');
                if (data.hasCycle > 0) {
                    return 'a' + calculations.c() + 'a';
                } else {
                    return 'x';
                }
            }, 'a');
            calculations.b = calc(() => {
                calls.push('b');
                return 'b' + calculations.a() + 'b';
            }, 'b');
            calculations.c = calc(() => {
                calls.push('c');
                return 'c' + calculations.b() + 'c';
            }, 'c');
            calculations.d = calc(() => {
                calls.push('d');
                const result = 'd' + calculations.c() + 'd';
                return result;
            }, 'd');

            retain(calculations.a);
            retain(calculations.b);
            retain(calculations.c);
            retain(calculations.d);
        });

        test('cycle nodes called only once when calculating', () => {
            data.hasCycle = 1;

            assert.throwsMatching(/.*/i, () => calculations.d());
            assert.deepEqual(['d', 'c', 'b', 'a'], calls);

            calls = [];
            flush(); // should have no effect

            assert.deepEqual([], calls);
        });

        test('cycle nodes called only once when recalculating', () => {
            calculations.d();

            assert.deepEqual(['d', 'c', 'b', 'a'], calls);

            data.hasCycle = 1;
            calls = [];
            flush(); // recalculates _some_ nodes
            // a is called because hasCycle dependency changed
            // b is not called, as once a is called we know a -> b -> c -> a exists
            // c is not called, as once a is called we know a -> b -> c -> a exists
            // d is called because c is part of a newly created cycle
            assert.deepEqual(['a', 'd'], calls);

            calls = [];
            flush();

            assert.deepEqual([], calls);
        });
    });

    test('cycle can catch and resolve itself (depend on all)', () => {
        const calculations: Record<string, Calculation<string>> = {};

        const data = model({ hasCycle: false });

        calculations.a = calc(() => {
            if (!data.hasCycle) return 'a no cycle';
            return 'a cycle' + calculations.b();
        }).onError(() => {
            return 'A CAUGHT';
        });
        calculations.b = calc(() => {
            if (!data.hasCycle) return 'b no cycle';
            return 'b cycle' + calculations.a();
        }).onError(() => {
            return 'B CAUGHT';
        });

        const catcher = calc(() => {
            return [calculations.a(), calculations.b()];
        }).onError(() => {
            return ['catcher caught'];
        });

        retain(catcher);

        assert.deepEqual(['a no cycle', 'b no cycle'], catcher());

        data.hasCycle = true;
        flush();

        assert.deepEqual(['A CAUGHT', 'B CAUGHT'], catcher());
    });

    test('cycle can catch and resolve itself (depend on one)', () => {
        const calculations: Record<string, Calculation<string>> = {};

        const data = model({ hasCycle: false });

        calculations.a = calc(() => {
            if (!data.hasCycle) return 'a no cycle';
            return 'a cycle' + calculations.b();
        }).onError(() => {
            return 'A CAUGHT';
        });
        calculations.b = calc(() => {
            if (!data.hasCycle) return 'b no cycle';
            return 'b cycle' + calculations.a();
        }).onError(() => {
            return 'B CAUGHT';
        });

        const catcher = calc(() => {
            return calculations.a();
        }).onError(() => {
            return 'catcher caught';
        });

        retain(catcher);

        assert.deepEqual('a no cycle', catcher());

        data.hasCycle = true;
        flush();

        assert.deepEqual('A CAUGHT', catcher());
    });

    test('cycle does not catch and resolve itself if all cycles do not catch', () => {
        const calculations: Record<string, Calculation<string>> = {};

        const data = model({ hasCycle: false });

        calculations.a = calc(() => {
            if (!data.hasCycle) return 'a no cycle';
            return 'a cycle' + calculations.b();
        });
        calculations.b = calc(() => {
            if (!data.hasCycle) return 'b no cycle';
            return 'b cycle' + calculations.a();
        }).onError(() => {
            return 'B CAUGHT';
        });

        const catcher = calc(() => {
            return calculations.a();
        }).onError(() => {
            return 'catcher caught';
        });

        retain(catcher);

        assert.deepEqual('a no cycle', catcher());

        data.hasCycle = true;
        flush();

        assert.deepEqual('catcher caught', catcher());
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
        const root = effect(() => {
            items.push(divide());
        }, 'root');
        retain(root);
        root();
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
