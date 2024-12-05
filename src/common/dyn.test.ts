import { assert, suite, test } from '@srhazi/gooey-test';

import { Calculation } from '../model/calc';
import { dynGet, dynMap, dynSet, dynSubscribe } from './dyn';
import type { Dynamic } from './dyn';

type TypeIs<T, V> = T extends V ? (V extends T ? true : false) : false;

suite('dyn', () => {
    test('dynGet returns .get() invocation if an object is passed in conforming to Dyn interface', () => {
        const x = { tag: 'x' };
        const y = {
            get: () => x,
            subscribe: (handler: (err: undefined, val: typeof x) => void) => {
                handler(undefined, x);
                return () => {};
            },
        };
        const result = dynGet(y);
        const isTrue: TypeIs<typeof x, typeof result> = true;
        assert.is(true, isTrue);
        assert.is(x, result);
    });

    test('dynGet returns identity invocation if object does not conform to Dyn interface', () => {
        const x = { tag: 'x' };
        const y = {
            get: () => x,
        };
        const z = {
            subscribe: (handler: (err: undefined, val: typeof x) => void) => {
                handler(undefined, x);
                return () => {};
            },
        };
        // Note: these expect-errors are technically not needed, but typescript
        // seems to eagerly anticipate that y and z "should" conform to
        // Dynamic<T> instead of falling back to just T
        //
        // @ts-expect-error
        const ry = dynGet(y);
        assert.is(y, ry);
        // @ts-expect-error
        const rz = dynGet(z);
        assert.is(z, rz);
    });

    test('dynGet can be given an arbitrary value', () => {
        assert.is(2, dynGet(2));
        assert.is('hi', dynGet('hi'));
        const x = { foo: 'bar' };
        assert.is(x, dynGet(x));
    });

    test('dynSubscribe returns .subscribe() if conforms to Dyn interface', () => {
        let value: any = null;
        const x = { tag: 'x' };
        const y = {
            get: () => x,
            subscribe: (handler: (err: undefined, val: typeof x) => void) => {
                handler(undefined, x);
                return () => {};
            },
        };
        const unsubscribe = dynSubscribe(y, (err, val) => {
            value = [err, val];
        });
        assert.is(undefined, value[0]);
        assert.is(x, value[1]);
        unsubscribe();
    });

    test('dynSubscribe returns identity handler if does not conforms to Dyn interface', () => {
        let value: any = null;
        const x = { tag: 'x' };
        const y = {
            get: () => x,
        };
        const z = {
            subscribe: (handler: (err: undefined, val: typeof x) => void) => {
                handler(undefined, x);
                return () => {};
            },
        };

        // Note: these expect-errors are technically not needed, but typescript
        // seems to eagerly anticipate that y and z "should" conform to
        // Dynamic<T> instead of falling back to just T
        //
        // @ts-expect-error
        const unsubscribe1 = dynSubscribe(y, (err, val) => {
            value = [err, val];
        });
        assert.is(undefined, value[0]);
        assert.is(y, value[1]);
        unsubscribe1();

        // @ts-expect-error
        const unsubscribe2 = dynSubscribe(z, (err, val) => {
            value = [err, val];
        });
        assert.is(undefined, value[0]);
        assert.is(z, value[1]);
        unsubscribe2();
    });

    test('dynSet calls set if DynamicMut', () => {
        let value = 'hi';
        const x = {
            get: () => value,
            set: (val: string) => {
                value = val;
            },
            subscribe: (handler: (err: undefined, value: string) => void) => {
                handler(undefined, value);
                return () => {};
            },
        };

        dynSet(x, 'hello');

        assert.is('hello', value);
    });

    test('dynSet does not call .set() if not DynamicMut', () => {
        let value = 'unchanged';
        const x = {
            set: (val: string) => {
                value = val;
            },
            subscribe: (handler: (err: undefined, value: string) => void) => {
                handler(undefined, value);
                return () => {};
            },
        };
        const y = {
            get: () => value,
            subscribe: (handler: (err: undefined, value: string) => void) => {
                handler(undefined, value);
                return () => {};
            },
        };
        const z = {
            get: () => value,
            set: (val: string) => {
                value = val;
            },
        };

        // Note: these expect-errors are technically not needed, but typescript
        // seems to eagerly anticipate that y and z "should" conform to
        // Dynamic<T> instead of falling back to just T
        //
        // @ts-expect-error
        dynSet(x, 'one');
        // This one oddly works, because y is Dynamic<string>
        dynSet(y, 'two');
        // @ts-expect-error
        dynSet(z, 'three');

        assert.is('unchanged', value);
    });

    test('dynSet works on Dynamic', () => {
        const value = 'hi';
        const x: Dynamic<string> = {
            get: () => value,
            subscribe: (handler: (err: undefined, value: string) => void) => {
                handler(undefined, value);
                return () => {};
            },
        };
        dynSet(x, 'cool');
    });

    test('dynMap works on constants', () => {
        const r = dynMap(3, (v) => ({ wrapped: v }));
        assert.isTruthy(r instanceof Calculation);
        assert.deepEqual({ wrapped: 3 }, r.get());
    });
});
