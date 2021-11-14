import Revise, {
    reset,
    mount,
    calc,
    model,
    collection,
    flush,
    Component,
} from './index';
import * as log from './log';
import { suite, test, beforeEach, assert } from './test';

const testRoot = document.getElementById('test-root');
if (!testRoot) throw new Error('oops');

log.setLogLevel('debug');

beforeEach(() => {
    reset();
});

suite('mount static', () => {
    test('mount renders jsx as html', () => {
        mount(testRoot, <div id="ok">Hello, world!</div>);
        assert.is(testRoot.querySelector('#ok')!.textContent, 'Hello, world!');
    });

    [undefined, null, false, true].forEach((value) => {
        test(`mount renders jsx ${value} as nonexistent nodes`, () => {
            mount(testRoot, <div id="ok">{value}</div>);
            assert.deepEqual(
                Array.from(testRoot.querySelector('#ok')!.childNodes),
                []
            );
        });
    });

    test('mount renders jsx functions as nonexistent nodes', () => {
        mount(testRoot, <div id="ok">{() => 'hello'}</div>);
        assert.deepEqual(
            Array.from(testRoot.querySelector('#ok')!.childNodes),
            []
        );
    });

    test('mount renders jsx numbers as strings', () => {
        mount(testRoot, <div id="ok">{0}</div>);
        assert.deepEqual(
            (testRoot.querySelector('#ok')!.childNodes[0] as Text).data,
            '0'
        );
    });

    test('mount renders jsx strings as strings', () => {
        mount(testRoot, <div id="ok">{'hello'}</div>);
        assert.deepEqual(
            (testRoot.querySelector('#ok')!.childNodes[0] as Text).data,
            'hello'
        );
    });

    test('mount renders jsx arrays as contents', () => {
        mount(
            testRoot,
            <div id="ok">
                {[
                    'zero',
                    undefined,
                    1,
                    null,
                    'two',
                    false,
                    3,
                    true,
                    'four',
                    () => 3,
                    5,
                ]}
            </div>
        );
        assert.deepEqual(
            (
                Array.from(testRoot.querySelector('#ok')!.childNodes) as Text[]
            ).map((text: Text) => text.data),
            ['zero', '1', 'two', '3', 'four', '5']
        );
    });
});

suite('mount calculations', () => {
    test('renders child calculations as their raw value', () => {
        mount(testRoot, <div id="ok">{calc(() => 'hello')}</div>);
        assert.deepEqual(
            (testRoot.querySelector('#ok')!.childNodes[0] as Text).data,
            'hello'
        );
    });

    test('renders attribute calculations as their raw value', () => {
        mount(testRoot, <div id="ok" data-whatever={calc(() => 'hello')} />);
        assert.deepEqual(
            testRoot.querySelector('#ok')!.getAttribute('data-whatever'),
            'hello'
        );
    });

    test('rerenders child calculations on flush', () => {
        const state = model({ value: 'hello' });
        mount(testRoot, <div id="ok">{calc(() => state.value)}</div>);
        state.value = 'goodbye';

        assert.deepEqual(
            (testRoot.querySelector('#ok')!.childNodes[0] as Text).data,
            'hello'
        );

        flush();

        assert.deepEqual(
            (testRoot.querySelector('#ok')!.childNodes[0] as Text).data,
            'goodbye'
        );
    });

    test('rerenders attribute calculations on flush', () => {
        const state = model({ value: 'hello' });
        mount(testRoot, <div id="ok" data-value={calc(() => state.value)} />);
        state.value = 'goodbye';

        assert.deepEqual(
            testRoot.querySelector('#ok')!.getAttribute('data-value'),
            'hello'
        );

        flush();

        assert.deepEqual(
            testRoot.querySelector('#ok')!.getAttribute('data-value'),
            'goodbye'
        );
    });

    test('child rerenders do not change DOM node reference', () => {
        const state = model({ value: 'hello' });
        mount(testRoot, <div id="ok">{calc(() => state.value)}</div>);
        state.value = 'goodbye';

        const okBefore = testRoot.querySelector('#ok');
        flush();
        const okAfter = testRoot.querySelector('#ok');

        assert.is(okBefore, okAfter);
    });

    test('attribute rerenders do not change DOM node reference', () => {
        const state = model({ value: 'hello' });
        mount(testRoot, <div id="ok" data-value={calc(() => state.value)} />);
        state.value = 'goodbye';

        const okBefore = testRoot.querySelector('#ok');
        flush();
        const okAfter = testRoot.querySelector('#ok');

        assert.is(okBefore, okAfter);
    });
});

suite('mount components', () => {
    test('components are rendered', () => {
        const Greet: Component<{ name: string }> = ({ name }) => (
            <p>Hello {name}</p>
        );
        mount(testRoot, <Greet name="world!" />);
        assert.is(testRoot.innerHTML, '<p>Hello world!</p>');
    });

    test('components can have calculations', () => {
        const state = model({
            name: 'world',
        });
        const Greet: Component<{}> = () => (
            <p>Hello {calc(() => state.name)}</p>
        );
        mount(testRoot, <Greet />);

        assert.is(testRoot.innerHTML, '<p>Hello world</p>');

        state.name = 'there';
        flush();

        assert.is(testRoot.innerHTML, '<p>Hello there</p>');
    });

    test('components are themselves calculations and rerender upon dependency change', () => {
        const state = model({
            name: 'world',
        });
        const Greet: Component<{}> = () => {
            const exclaimed = state.name + '!';
            return <p>Hello {exclaimed}</p>;
        };
        mount(testRoot, <Greet />);

        assert.is(testRoot.innerHTML, '<p>Hello world!</p>');

        state.name = 'there';
        flush();

        assert.is(testRoot.innerHTML, '<p>Hello there!</p>');
    });

    test('components with calculations do not change roots', () => {
        const state = model({
            name: 'world',
        });
        const Greet: Component<{}> = () => {
            return <p id="p">Hello {calc(() => state.name)}</p>;
        };
        mount(testRoot, <Greet />);

        const pBefore = testRoot.querySelector('#p');

        state.name = 'there';
        flush();

        const pAfter = testRoot.querySelector('#p');

        assert.is(pBefore, pAfter);
    });

    test('components without calculations that rerender *do* change roots', () => {
        const state = model({
            name: 'world',
        });
        const Greet: Component<{}> = () => {
            const exclaimed = state.name + '!';
            return <p id="p">Hello {exclaimed}</p>;
        };
        mount(testRoot, <Greet />);

        const pBefore = testRoot.querySelector('#p');

        state.name = 'there';
        flush();

        const pAfter = testRoot.querySelector('#p');

        assert.isNot(pBefore, pAfter);
    });

    test('components are provided an onMount callback which is called immediately after mounted', () => {
        const sequence: string[] = [];
        let queried: null | Element = null;
        const Greet: Component<{}> = (props, { onMount }) => {
            sequence.push('render');
            onMount(() => {
                sequence.push('onMount');
                queried = testRoot.querySelector('#p');
            });
            return <p id="p">Hello!</p>;
        };

        mount(testRoot, <Greet />);

        assert.deepEqual(['render', 'onMount'], sequence);
        assert.isTruthy(queried);
        assert.is(testRoot.querySelector('#p'), queried);
    });

    test('components are provided an onMount callback which is called immediately before unmount', () => {
        const state = model({
            showingChild: false,
        });
        const sequence: string[] = [];
        let queried: null | Element = null;
        const Child: Component<{}> = (props, { onMount, onUnmount }) => {
            sequence.push('render');
            onMount(() => {
                sequence.push('onMount');
            });
            onUnmount(() => {
                queried = testRoot.querySelector('#child');
                sequence.push('onUnmount');
            });
            return <p id="child">child</p>;
        };
        const Parent: Component<{}> = (props, { onMount }) => {
            return (
                <div id="parent">
                    {calc(() => state.showingChild && <Child />)}
                </div>
            );
        };

        mount(testRoot, <Parent />);

        assert.deepEqual([], sequence);

        state.showingChild = true;
        flush();

        assert.deepEqual(['render', 'onMount'], sequence);
        const child = testRoot.querySelector('#child');

        state.showingChild = false;
        flush();

        assert.deepEqual(['render', 'onMount', 'onUnmount'], sequence);
        assert.isTruthy(queried);
        assert.is(child, queried);
    });

    test('components are provided an onEffect callback which is called only while component is mounted', () => {
        const state = model({
            showingChild: false,
            counter: 0,
        });
        const sequence: string[] = [];
        const Child: Component<{}> = (
            props,
            { onMount, onUnmount, onEffect }
        ) => {
            sequence.push('render');
            onMount(() => {
                sequence.push('onMount');
            });
            onUnmount(() => {
                sequence.push('onUnmount');
            });
            onEffect(() => {
                sequence.push(`effect ${state.counter}`);
            });
            return <p id="child">child</p>;
        };
        const Parent: Component<{}> = (props, { onMount }) => {
            return (
                <div id="parent">
                    {calc(() => state.showingChild && <Child />)}
                </div>
            );
        };

        mount(testRoot, <Parent />);

        assert.deepEqual([], sequence);

        state.showingChild = true;
        flush();

        assert.deepEqual(['render', 'onMount', 'effect 0'], sequence);

        state.counter += 1;
        flush();

        assert.deepEqual(
            ['render', 'onMount', 'effect 0', 'effect 1'],
            sequence
        );
        state.counter += 1;
        flush();

        assert.deepEqual(
            ['render', 'onMount', 'effect 0', 'effect 1', 'effect 2'],
            sequence
        );
        flush();
        assert.deepEqual(
            ['render', 'onMount', 'effect 0', 'effect 1', 'effect 2'],
            sequence
        );

        state.showingChild = false;
        flush();

        assert.deepEqual(
            [
                'render',
                'onMount',
                'effect 0',
                'effect 1',
                'effect 2',
                'onUnmount',
            ],
            sequence
        );

        state.counter += 1;
        flush();

        assert.deepEqual(
            [
                'render',
                'onMount',
                'effect 0',
                'effect 1',
                'effect 2',
                'onUnmount',
            ],
            sequence
        );
    });
});

suite('mount arrays', () => {
    test('mapping multiple arrays in a row concats as expected', () => {
        const items = collection([
            'A',
            'is',
            'the',
            'only',
            'thing',
            'unless',
            'letters',
            'continue',
        ]);
        mount(
            testRoot,
            <div>
                {calc(() => items.map((item) => item))}
                {calc(() => items.map((item) => item))}
            </div>
        );

        assert.deepEqual(
            (
                Array.from(testRoot.querySelector('div')!.childNodes) as Text[]
            ).map((item) => item.data),
            [
                'A',
                'is',
                'the',
                'only',
                'thing',
                'unless',
                'letters',
                'continue',
                'A',
                'is',
                'the',
                'only',
                'thing',
                'unless',
                'letters',
                'continue',
            ]
        );
    });

    test('rerendering multiple arrays in a row concats as expected', () => {
        const items = collection([
            'A',
            'is',
            'the',
            'only',
            'thing',
            'unless',
            'letters',
            'continue',
        ]);
        mount(
            testRoot,
            <div>
                foo
                {calc(() => items.map((item, idx) => `A:${item}:${idx} `))}
                bar
                {calc(() => items.map((item, idx) => `B:${item}:${idx} `))}
                baz
            </div>
        );

        items[3] = 'best';
        items[6] = 'not';
        items.shift();
        items.pop();

        flush();

        assert.deepEqual(
            (
                Array.from(testRoot.querySelector('div')!.childNodes) as Text[]
            ).map((item) => item.data),
            [
                'foo',
                'A:is:0 ',
                'A:the:1 ',
                'A:best:2 ',
                'A:thing:3 ',
                'A:unless:4 ',
                'A:not:5 ',
                'bar',
                'B:is:0 ',
                'B:the:1 ',
                'B:best:2 ',
                'B:thing:3 ',
                'B:unless:4 ',
                'B:not:5 ',
                'baz',
            ]
        );
    });

    test('arrays can be nested and concatted as as expected', () => {
        const items = collection([1, 2, 3]);
        mount(
            testRoot,
            <div>
                foo
                {calc(() =>
                    items.map((count) => {
                        const array: string[] = [];
                        for (let i = 0; i < count; ++i) {
                            array.push(`A:${i + 1}/${count}`);
                        }
                        return array;
                    })
                )}
                bar
                {calc(() =>
                    items.map((count) => {
                        const array: string[] = [];
                        for (let i = 0; i < count; ++i) {
                            array.push(`B:${i + 1}/${count}`);
                        }
                        return array;
                    })
                )}
                baz
            </div>
        );

        assert.deepEqual(
            (
                Array.from(testRoot.querySelector('div')!.childNodes) as Text[]
            ).map((item) => item.data),
            [
                'foo',
                'A:1/1',
                'A:1/2',
                'A:2/2',
                'A:1/3',
                'A:2/3',
                'A:3/3',
                'bar',
                'B:1/1',
                'B:1/2',
                'B:2/2',
                'B:1/3',
                'B:2/3',
                'B:3/3',
                'baz',
            ]
        );

        items[0] = 3;
        items.push(4);

        flush();

        assert.deepEqual(
            (
                Array.from(testRoot.querySelector('div')!.childNodes) as Text[]
            ).map((item) => item.data),
            [
                'foo',
                'A:1/3',
                'A:2/3',
                'A:3/3',
                'A:1/2',
                'A:2/2',
                'A:1/3',
                'A:2/3',
                'A:3/3',
                'A:1/4',
                'A:2/4',
                'A:3/4',
                'A:4/4',
                'bar',
                'B:1/3',
                'B:2/3',
                'B:3/3',
                'B:1/2',
                'B:2/2',
                'B:1/3',
                'B:2/3',
                'B:3/3',
                'B:1/4',
                'B:2/4',
                'B:3/4',
                'B:4/4',
                'baz',
            ]
        );
    });
});
