import { assert, beforeEach, suite, test } from '@srhazi/gooey-test';

import Gooey, {
    calc,
    dict,
    field,
    flush,
    mount,
    reset,
    setLogLevel,
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

        const keys = bag.keys('bagKeys');

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

        const keys = bag.keys('bagKeys');

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

        const keys = bag.keys('bagKeys');

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
});
