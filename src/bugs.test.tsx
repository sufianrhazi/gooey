import { assert, beforeEach, suite, test } from '@srhazi/gooey-test';

import type { Component } from './index';
import Gooey, {
    calc,
    collection,
    dict,
    field,
    flush,
    mount,
    ref,
    reset,
    subscribe,
} from './index';

let testRoot: HTMLElement = document.getElementById('test-root')!;

beforeEach(() => {
    testRoot = document.getElementById('test-root')!;
    reset();
    subscribe();
});

suite('dict / view bugs', () => {
    test('dict + keys + mapView', () => {
        const bag = dict<string, string>(
            [
                ['some', 'starter'],
                ['text', 'here'],
            ],
            'bag'
        );

        const keys = bag.keysView('bagKeys');

        const App = () => {
            return (
                <ul>
                    {keys.mapView(
                        (key) => (
                            <li>
                                {key}
                                {' = '}
                                {calc(() => bag.get(key))}
                            </li>
                        ),
                        'key item mapView'
                    )}
                </ul>
            );
        };

        const unmount = mount(testRoot, <App />);
        assert.deepEqual(
            ['some = starter', 'text = here'],
            Array.from(testRoot.querySelectorAll('li')).map(
                (el) => el.textContent
            )
        );
        bag.set('foo', 'bar');
        flush();
        assert.deepEqual(
            ['some = starter', 'text = here', 'foo = bar'],
            Array.from(testRoot.querySelectorAll('li')).map(
                (el) => el.textContent
            )
        );
        bag.delete('some');
        flush();
        assert.deepEqual(
            ['text = here', 'foo = bar'],
            Array.from(testRoot.querySelectorAll('li')).map(
                (el) => el.textContent
            )
        );
        unmount();
    });

    test('dict + keys + filterView + mapView', () => {
        const bag = dict<string, string>(
            [
                ['some', 'starter'],
                ['text', 'here'],
            ],
            'bag'
        );

        const keys = bag.keysView('bagKeys');

        const App = () => {
            return (
                <ul>
                    {keys
                        .filterView((key) => key.length % 2 === 0)
                        .mapView((key) => (
                            <li>
                                {key} = {calc(() => bag.get(key))}
                            </li>
                        ))}
                </ul>
            );
        };

        const unmount = mount(testRoot, <App />);
        assert.deepEqual(
            ['some = starter', 'text = here'],
            Array.from(testRoot.querySelectorAll('li')).map(
                (el) => el.textContent
            )
        );
        bag.set('foo', 'bar');
        flush();
        assert.deepEqual(
            ['some = starter', 'text = here'],
            Array.from(testRoot.querySelectorAll('li')).map(
                (el) => el.textContent
            )
        );
        bag.set('foot', 'ball');
        flush();
        assert.deepEqual(
            ['some = starter', 'text = here', 'foot = ball'],
            Array.from(testRoot.querySelectorAll('li')).map(
                (el) => el.textContent
            )
        );
        bag.delete('some');
        flush();
        assert.deepEqual(
            ['text = here', 'foot = ball'],
            Array.from(testRoot.querySelectorAll('li')).map(
                (el) => el.textContent
            )
        );
        bag.delete('foo');
        flush();
        assert.deepEqual(
            ['text = here', 'foot = ball'],
            Array.from(testRoot.querySelectorAll('li')).map(
                (el) => el.textContent
            )
        );
        unmount();
    });

    test('dict + keys + flatMapView + mapView', () => {
        const bag = dict<string, string>(
            [
                ['some', 'starter'],
                ['text', 'here'],
            ],
            'bag'
        );

        const keys = bag.keysView('bagKeys');

        const App = () => {
            return (
                <ul data-doubled-items>
                    {keys
                        .flatMapView((key) => [key, key])
                        .mapView((key) => (
                            <li>
                                {key} = {calc(() => bag.get(key))}
                            </li>
                        ))}
                </ul>
            );
        };

        const unmount = mount(testRoot, <App />);
        assert.deepEqual(
            ['some = starter', 'some = starter', 'text = here', 'text = here'],
            Array.from(testRoot.querySelectorAll('li')).map(
                (el) => el.textContent
            )
        );
        bag.set('foo', 'bar');
        flush();
        assert.deepEqual(
            [
                'some = starter',
                'some = starter',
                'text = here',
                'text = here',
                'foo = bar',
                'foo = bar',
            ],
            Array.from(testRoot.querySelectorAll('li')).map(
                (el) => el.textContent
            )
        );
        bag.delete('some');
        flush();
        assert.deepEqual(
            ['text = here', 'text = here', 'foo = bar', 'foo = bar'],
            Array.from(testRoot.querySelectorAll('li')).map(
                (el) => el.textContent
            )
        );
        unmount();
    });
});

suite('component bugs', () => {
    test('re-mounting dead component triggers calculations in the right amount', () => {
        const log: string[] = [];
        let instance = 0;
        const App = () => {
            instance++;
            const clicks = field(0);
            return (
                <button on:click={() => clicks.set(clicks.get() + 1)}>
                    {calc(() => {
                        const count = clicks.get();
                        log.push(
                            `instance ${instance} rendered clicks: ${count}`
                        );
                        return count;
                    })}
                </button>
            );
        };
        const jsx = <App />;
        assert.deepEqual([], log);
        const unmount1 = mount(testRoot, jsx);
        unmount1();
        assert.deepEqual(['instance 1 rendered clicks: 0'], log);
        const unmount2 = mount(testRoot, jsx);
        unmount2();
        // For future reference: the prior bug was that we did not clear the
        // owned references correctly, so when the JSX was revived on second
        // mount, it would own the calc() created in its first mount.
        assert.deepEqual(
            ['instance 1 rendered clicks: 0', 'instance 2 rendered clicks: 0'],
            log
        );
    });

    test('component onMount gets called when children have been rendered and mounted', () => {
        const log: any[] = [];
        const Inner: Component = (props, { onMount }) => {
            const state = field('inner');
            const divRef = ref<HTMLDivElement>();
            onMount(() => {
                log.push({ inner: divRef.current?.textContent });
                state.set('inner_updated');
            });
            return (
                <div ref={divRef}>
                    <div>
                        Inner field: {state}
                        {'\n'}
                    </div>
                    <div>
                        Inner calc: {calc(() => state.get())}
                        {'\n'}
                    </div>
                </div>
            );
        };

        const Outer: Component = (props, { onMount }) => {
            const state = field('outer');
            const divRef = ref<HTMLDivElement>();
            onMount(() => {
                log.push({ outer: divRef.current?.textContent });
                state.set('outer_updated');
            });
            return (
                <div ref={divRef}>
                    <div>
                        Outer field: {state}
                        {'\n'}
                    </div>
                    <Inner />
                    <div>
                        Outer calc: {calc(() => state.get())}
                        {'\n'}
                    </div>
                </div>
            );
        };

        mount(testRoot, <Outer />);
        assert.deepEqual(
            [
                {
                    inner: 'Inner field: inner\nInner calc: inner\n',
                },
                {
                    outer: 'Outer field: outer\nInner field: inner\nInner calc: inner\nOuter calc: outer\n',
                },
            ],
            log
        );
    });

    test('mapView with collection on component render', () => {
        const App = () => {
            const vertices = collection([<div />]);

            return (
                <div class="dge">
                    <math>
                        <div>{vertices}</div>
                    </math>
                </div>
            );
        };
        mount(testRoot, <App />);
    });

    test('calculations in components are only recalculated when actively used', () => {
        const left = field('');
        const right = field('');
        const log = collection<string>([]);

        const App = () => {
            const isLeftCorrect = calc(() => {
                log.push('recalc:isLeftCorrect');
                return left.get() === 'open';
            });

            const isRightCorrect = calc(() => {
                log.push('recalc:isRightCorrect');
                return right.get() === 'sesame';
            });

            const isBothCorrect = calc(() => {
                log.push('recalc:isBothCorrect:a');
                if (!isLeftCorrect.get()) {
                    return false;
                }
                log.push('recalc:isBothCorrect:b');
                if (!isRightCorrect.get()) {
                    return false;
                }
                log.push('recalc:isBothCorrect:c');
                return true;
            });
            return (
                <>
                    result:
                    {calc(() => (isBothCorrect.get() ? 'true' : 'false'))}
                </>
            );
        };

        const unmount = mount(testRoot, <App />);

        // Initial state
        assert.is('result:false', testRoot.innerText);
        assert.deepEqual(
            ['recalc:isBothCorrect:a', 'recalc:isLeftCorrect'],
            log.splice(0, log.length)
        );

        // Nothing happens on flush
        flush();
        assert.is('result:false', testRoot.innerText);
        assert.deepEqual([], log.splice(0, log.length));

        // When left field changes, we only recalc isLeftCorrect because the result remains false
        left.set('incorrect');
        flush();
        assert.is('result:false', testRoot.innerText);
        assert.deepEqual(['recalc:isLeftCorrect'], log.splice(0, log.length));

        // When right field changes, nothing happens, as it hasn't been used yet
        right.set('incorrect');
        flush();
        assert.is('result:false', testRoot.innerText);
        assert.deepEqual([], log.splice(0, log.length));

        // When left field becomes correct, both isLeftCorrect and isBothCorrect:a/isBothCorrect:b and isRightCorrect are hit
        left.set('open');
        flush();
        assert.is('result:false', testRoot.innerText);
        assert.deepEqual(
            [
                'recalc:isLeftCorrect',
                'recalc:isBothCorrect:a',
                'recalc:isBothCorrect:b',
                'recalc:isRightCorrect',
            ],
            log.splice(0, log.length)
        );

        // Now, changing the right field to an incorrect value causes isRightCorrect to be recalculated
        right.set('nope');
        flush();
        assert.is('result:false', testRoot.innerText);
        assert.deepEqual(['recalc:isRightCorrect'], log.splice(0, log.length));

        // Changing the right field to a correct value causes isRightCorrect and isBothCorrect to be recalculated, resulting in a correct value
        right.set('sesame');
        flush();
        assert.is('result:true', testRoot.innerText);
        assert.deepEqual(
            [
                'recalc:isRightCorrect',
                'recalc:isBothCorrect:a',
                'recalc:isBothCorrect:b',
                'recalc:isBothCorrect:c',
            ],
            log.splice(0, log.length)
        );

        // Changing the left field back to an incorrect value causes isLeftCorrect to be recalculated and isRightCorrect to be freed
        left.set('nope');
        flush();
        assert.is('result:false', testRoot.innerText);
        assert.deepEqual(
            ['recalc:isLeftCorrect', 'recalc:isBothCorrect:a'],
            log.splice(0, log.length)
        );

        // And now, isRightCorrect will not be recalculated even if things change, as it is not used by anything
        right.set('missing');
        flush();
        assert.is('result:false', testRoot.innerText);
        assert.deepEqual([], log.splice(0, log.length));

        unmount();
    });
});
