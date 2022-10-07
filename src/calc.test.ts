import { suite, test, assert, beforeEach } from '@srhazi/gooey-test';
import { model } from './model';
import { collection } from './collection';
import { Calculation, calc } from './calc';
import { flush, retain, release, reset, subscribe } from './engine';

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
        const a = calculation();
        const b = calculation();
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

    test('emits event when subscribed', () => {
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
        assert.deepEqual([], events);
        dependency.value = 2;
        flush();
        assert.deepEqual(['call', 'call'], calls);
        assert.deepEqual([{ err: undefined, val: 2 }], events);
        dependency.value = 3;
        flush();
        assert.deepEqual(['call', 'call', 'call'], calls);
        assert.deepEqual(
            [
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
                { err: undefined, val: 2 },
                { err: undefined, val: 3 },
            ],
            events
        );
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
            return root() + 1;
        }, 'left');
        const right = calc(() => {
            calls.push('right');
            return root() + 2;
        }, 'right');
        const bottom = calc(() => {
            calls.push('bottom');
            return left() + right();
        }, 'bottom');
        retain(bottom);

        const result = bottom();
        assert.is(5, result);

        assert.deepEqual(['bottom', 'left', 'root', 'right'], calls);
        dependency.value = 2;

        calls = [];
        flush();

        const result2 = bottom();
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

    test('is not memoized when not retained multiple times', () => {
        const calls: string[] = [];
        const calculation = calc(() => {
            calls.push('call');
            return 1 + 1;
        });
        const a = calculation();
        const b = calculation();
        assert.is(2, a);
        assert.is(2, b);
        assert.deepEqual(['call', 'call'], calls);
    });

    test('retains collections appropriately', () => {
        const numbers = collection([1, 2, 3]);
        const sum = calc(() => numbers.reduce((acc, val) => acc + val, 0));
        const values: any[] = [];
        sum.subscribe((err, val) => values.push(val));
        assert.deepEqual([], values);
        numbers.push(4);
        flush();
        assert.deepEqual([1 + 2 + 3 + 4], values);
        numbers[0] = 5;
        flush();
        assert.deepEqual([1 + 2 + 3 + 4, 5 + 2 + 3 + 4], values);
    });

    test('retains derived collections appropriately', () => {
        const numbers = collection([1, 2, 3]);
        const doubled = numbers.mapView((num) => num * 2);
        const sum = calc(() => doubled.reduce((acc, val) => acc + val, 0));
        const values: any[] = [];
        sum.subscribe((err, val) => values.push(val));
        assert.deepEqual([], values);
        numbers.push(4);
        flush();
        assert.deepEqual([(1 + 2 + 3 + 4) * 2], values);
        numbers[0] = 5;
        flush();
        assert.deepEqual([(1 + 2 + 3 + 4) * 2, (5 + 2 + 3 + 4) * 2], values);
    });

    test('retains model keys appropriately', () => {
        const bag = model<Record<string, any>>({});
        const keys = model.keys(bag);
        const size = calc(() => keys.length);
        const values: any[] = [];
        size.subscribe((err, val) => values.push(val));
        assert.deepEqual([], values);
        bag.foo = 'bar';
        flush();
        assert.deepEqual([1], values);
        bag.baz = 'bum';
        flush();
        assert.deepEqual([1, 2], values);
        bag.foo = 'overwrite';
        bag.baz = 'overwrite';
        flush();
        assert.deepEqual([1, 2], values);
        delete bag.foo;
        delete bag.unused;
        flush();
        assert.deepEqual([1, 2, 1], values);
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
                return data.value + calculations.c();
            } else {
                return 'a';
            }
        }, 'a');
        calculations.b = calc(() => {
            calls.push('b');
            return 'b' + calculations.a();
        }, 'b');
        calculations.c = calc(() => {
            calls.push('c');
            return 'c' + calculations.b();
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

        assert.is('a', calculations.a());
        assert.is('ba', calculations.b());
        assert.is('cba', calculations.c());

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
                    return 'a' + calculations.c() + 'a';
                } else {
                    return 'x';
                }
            }, 'a').onError(() => {
                return 'A';
            });
            calculations.b = calc(() => {
                calls.push('b');
                return 'b' + calculations.a() + 'b';
            }, 'b').onError(() => {
                return 'B';
            });
            calculations.c = calc(() => {
                calls.push('c');
                return 'c' + calculations.b() + 'c';
            }, 'c').onError(() => {
                return 'C';
            });
            calculations.d = calc(() => {
                calls.push('d');
                const result = 'd' + calculations.c() + 'd';
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

            assert.is('A', calculations.a());
            assert.is('B', calculations.b());
            assert.is('C', calculations.c());
            assert.is('dCd', calculations.d()); // because c caught its cycle, d is unaware and runs as expected
        });

        test('cycles can be caught when triggered via recalculation', () => {
            const { calculations, data } = makeData();
            assert.is('dcbxbcd', calculations.d());

            data.hasCycle = 1;
            flush();

            assert.is('A', calculations.a());
            assert.is('B', calculations.b());
            assert.is('C', calculations.c());
            assert.is('dCd', calculations.d()); // because c caught its cycle, d is unaware and runs as expected

            data.hasCycle = 0;
            flush();

            assert.is('x', calculations.a());
            assert.is('bxb', calculations.b());
            assert.is('cbxbc', calculations.c());
            assert.is('dcbxbcd', calculations.d());
        });

        test('cycles do not get re-processed if unrelated fields are modified', () => {
            const { calculations, data, calls } = makeData();
            assert.is('dcbxbcd', calculations.d());

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
            retain(calculations.f);
            retain(calculations.g);
            return { calculations, data };
        };

        test('cycles can be caught when triggered via standard calling', () => {
            const { calculations, data } = makeData();
            data.hasCycle = true;

            assert.throwsMatching(/cycle/i, () => calculations.a());
            assert.throwsMatching(/cycle/i, () => calculations.b());
            assert.throwsMatching(/cycle/i, () => calculations.c());
            assert.throwsMatching(/error/i, () => calculations.d()); // D is not a part of the cycle
            assert.is('E', calculations.e());
            assert.is('F', calculations.f());
            assert.is('gFg', calculations.g());
        });

        test('cycles can be caught when triggered via recalculation', () => {
            const { calculations, data } = makeData();
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
            flush(); // Properly recalculates things

            assert.is('edcbxbcde', calculations.e());
            assert.is('gfcbxbcfg', calculations.g());
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

            retain(calculations.d);
            return { calculations, data, calls };
        };

        test('cycle nodes called in depth order when calculating actively', () => {
            const { calculations, data, calls } = makeData();
            data.hasCycle = 1;

            assert.throwsMatching(/Cycle reached.*/i, () => calculations.d());
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
            calculations.d();

            assert.deepEqual(['d', 'c', 'b', 'a'], calls);

            data.hasCycle = 1;
            calls.splice(0, calls.length);
            flush();

            // Prior the flush, the graph is known as a line: a -> b -> c -> d
            // Once a is recalculated with hasCycle=1, edge:  a <------ c is added
            //
            // This closes the cycle, so b and c are not needed to be recalculated.
            assert.arrayEqualsUnsorted(['a', 'd'], calls);

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
            return 'a cycle:' + calculations.b();
        }, 'a').onError(() => {
            return 'A CAUGHT';
        });
        calculations.b = calc(() => {
            if (!data.hasCycle) return 'b no cycle';
            return 'b cycle:' + calculations.a();
        }, 'b').onError(() => {
            return 'B CAUGHT';
        });

        const catcher = calc(() => {
            return [calculations.a(), calculations.b()];
        }, 'catcher').onError(() => {
            return ['catcher caught'];
        });

        retain(catcher);

        assert.deepEqual(['a no cycle', 'b no cycle'], catcher());

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

        assert.deepEqual(['A CAUGHT', 'B CAUGHT'], catcher());
    });

    test('cycle can catch and resolve itself (depend on one)', () => {
        const calculations: Record<string, Calculation<string>> = {};

        const data = model({ hasCycle: false });

        calculations.a = calc(() => {
            if (!data.hasCycle) return 'a no cycle';
            return 'a cycle' + calculations.b();
        }, 'a').onError(() => {
            return 'A CAUGHT';
        });
        calculations.b = calc(() => {
            if (!data.hasCycle) return 'b no cycle';
            return 'b cycle' + calculations.a();
        }, 'b').onError(() => {
            return 'B CAUGHT';
        });

        const catcher = calc(() => {
            return calculations.a();
        }, 'catcher').onError(() => {
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

        const data = model({ hasCycle: false }, 'model');

        calculations.a = calc(() => {
            if (!data.hasCycle) return 'a no cycle';
            return 'a cycle' + calculations.b();
        }, 'a');
        calculations.b = calc(() => {
            if (!data.hasCycle) return 'b no cycle';
            return 'b cycle' + calculations.a();
        }, 'b').onError(() => {
            return 'B CAUGHT';
        });

        const catcher = calc(() => {
            return calculations.a();
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

        assert.deepEqual('a no cycle', catcher());

        data.hasCycle = true;
        flush();

        assert.deepEqual('catcher caught', catcher());
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
            return calculations.b() + ' and A';
        }, 'a');
        calculations.b = calc(() => {
            return calculations.c() + ' and ' + calculations.a() + ' and B';
        }, 'b');
        calculations.c = calc(() => {
            if (data.e > 0) {
                return calculations.d() + ' and C';
            }
            return 'C';
        }, 'c');
        calculations.d = calc(() => {
            return calculations.a() + ' and D';
        }, 'd');
        retain(calculations.a);
        retain(calculations.b);
        retain(calculations.c);
        retain(calculations.d);

        assert.throwsMatching(/cycle/i, () => calculations.a());
        assert.throwsMatching(/cycle/i, () => calculations.b());
        assert.is('C', calculations.c());
        assert.throwsMatching(/error/, () => calculations.d());

        data.e = 1;
        flush();

        assert.throwsMatching(/cycle/i, () => calculations.a());
        assert.throwsMatching(/cycle/i, () => calculations.b());
        assert.throwsMatching(/cycle/i, () => calculations.c());
        assert.throwsMatching(/cycle/i, () => calculations.d());
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
            return calculations.b() + ' and A';
        }, 'a');
        calculations.b = calc(() => {
            return calculations.c() + ' and B';
        }, 'b');
        calculations.c = calc(() => {
            if (data.e > 0) {
                return calculations.d() + ' and C';
            }
            return 'C';
        }, 'c');
        calculations.d = calc(() => {
            return calculations.a() + ' and D';
        }, 'd');
        retain(calculations.a);
        retain(calculations.b);
        retain(calculations.c);
        retain(calculations.d);

        assert.is('C and B and A', calculations.a());
        assert.is('C and B', calculations.b());
        assert.is('C', calculations.c());
        assert.is('C and B and A and D', calculations.d());

        data.e = 1;
        flush();

        assert.throwsMatching(/cycle/i, () => calculations.a());
        assert.throwsMatching(/cycle/i, () => calculations.b());
        assert.throwsMatching(/cycle/i, () => calculations.c());
        assert.throwsMatching(/cycle/i, () => calculations.d());
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
                    return calculations.c() + ' and A';
                case 1:
                    return calculations.b() + ' and A';
                case 2:
                    return calculations.c() + ' and A';
                case 3:
                    return calculations.b() + ' and A';
            }
        }, 'a');
        calculations.b = calc(() => {
            switch (data.e) {
                case 0:
                    return calculations.a() + ' and B';
                case 1:
                    return 'B';
                case 2:
                    return 'B';
                case 3:
                    return calculations.d() + ' and B';
            }
        }, 'b');
        calculations.c = calc(() => {
            switch (data.e) {
                case 0:
                    return 'C';
                case 1:
                    return calculations.a() + ' and C';
                case 2:
                    return calculations.d() + ' and C';
                case 3:
                    return 'C';
            }
        }, 'c');
        calculations.d = calc(() => {
            switch (data.e) {
                case 0:
                    return calculations.b() + ' and D';
                case 1:
                    return calculations.c() + ' and D';
                case 2:
                    return calculations.b() + ' and D';
                case 3:
                    return calculations.c() + ' and D';
            }
        }, 'd');
        retain(calculations.a);
        retain(calculations.b);
        retain(calculations.c);
        retain(calculations.d);
        flush();
    });

    function assertCase0() {
        assert.is('C and A', calculations.a());
        assert.is('C and A and B', calculations.b());
        assert.is('C', calculations.c());
        assert.is('C and A and B and D', calculations.d());
    }

    function assertCase1() {
        assert.is('B and A', calculations.a());
        assert.is('B', calculations.b());
        assert.is('B and A and C', calculations.c());
        assert.is('B and A and C and D', calculations.d());
    }

    function assertCase2() {
        assert.is('B and D and C and A', calculations.a());
        assert.is('B', calculations.b());
        assert.is('B and D and C', calculations.c());
        assert.is('B and D', calculations.d());
    }

    function assertCase3() {
        assert.is('C and D and B and A', calculations.a());
        assert.is('C and D and B', calculations.b());
        assert.is('C', calculations.c());
        assert.is('C and D', calculations.d());
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
