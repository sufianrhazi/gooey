import Revise, {
    reset,
    mount,
    calc,
    model,
    collection,
    flush,
    Component,
    getLogLevel,
    setLogLevel,
    LogLevel,
    Collection,
    Model,
} from './index';
import { suite, test, beforeEach, afterEach, assert } from './test';

const testRoot = document.getElementById('test-root');
if (!testRoot) throw new Error('oops');

beforeEach(() => {
    reset();
});

suite('mount static', () => {
    test('mount renders jsx as html', () => {
        mount(testRoot, <div id="ok">Hello, world!</div>);
        assert.is(testRoot.querySelector('#ok')!.textContent, 'Hello, world!');
    });

    test('mount can unmount jsx as html', () => {
        const unmount = mount(testRoot, <div id="ok">Hello, world!</div>);
        unmount();
        assert.is(null, testRoot.querySelector('#ok'));
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

        assert.isTruthy(testRoot.querySelector('#parent'));
        assert.isFalsy(testRoot.querySelector('#child'));
        assert.deepEqual([], sequence);

        state.showingChild = true;
        flush();

        assert.isTruthy(testRoot.querySelector('#parent'));
        assert.isTruthy(testRoot.querySelector('#child'));
        assert.deepEqual(['render', 'onMount'], sequence);
        const child = testRoot.querySelector('#child');

        state.showingChild = false;
        flush();

        assert.deepEqual(['render', 'onMount', 'onUnmount'], sequence);
        assert.isTruthy(testRoot.querySelector('#parent'));
        assert.isFalsy(testRoot.querySelector('#child'));
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

    test('onUnmount called in correct order (children before parent) when entire tree is unmounted', () => {
        const sequence: string[] = [];
        let queried: null | Element = null;
        const Grandchild: Component<{ name: string }> = (
            { name },
            { onMount, onUnmount }
        ) => {
            sequence.push(`render ${name}`);
            onMount(() => {
                sequence.push(`onMount ${name}`);
            });
            onUnmount(() => {
                queried = testRoot.querySelector('#child');
                sequence.push(`onUnmount ${name}`);
            });
            return <p class="grandchild">{name}</p>;
        };
        const Child: Component<{ name: string }> = (
            { name },
            { onMount, onUnmount }
        ) => {
            sequence.push(`render ${name}`);
            onMount(() => {
                sequence.push(`onMount ${name}`);
            });
            onUnmount(() => {
                queried = testRoot.querySelector('#child');
                sequence.push(`onUnmount ${name}`);
            });
            return (
                <p class="child">
                    <Grandchild name={`${name} 1`} />
                    <Grandchild name={`${name} 2`} />
                </p>
            );
        };
        const Parent: Component<{}> = (props, { onMount }) => {
            return (
                <div id="parent">
                    <Child name="a" />
                    <Child name="b" />
                </div>
            );
        };

        const unmount = mount(testRoot, <Parent />);

        assert.deepEqual(
            [
                'render a',
                'render a 1',
                'onMount a 1',
                'render a 2',
                'onMount a 2',
                'onMount a',
                'render b',
                'render b 1',
                'onMount b 1',
                'render b 2',
                'onMount b 2',
                'onMount b',
            ],
            sequence
        );

        // clear sequence
        sequence.splice(0, sequence.length);

        unmount();

        assert.deepEqual(
            [
                'onUnmount a 1',
                'onUnmount a 2',
                'onUnmount a',
                'onUnmount b 1',
                'onUnmount b 2',
                'onUnmount b',
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

    test('mapping multiple arrays interspersed concats as expected', () => {
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
                BEFORE
                {calc(() => items.map((item) => item))}
                MIDDLE
                {calc(() => items.map((item) => item))}
                AFTER
            </div>
        );

        assert.deepEqual(
            (
                Array.from(testRoot.querySelector('div')!.childNodes) as Text[]
            ).map((item) => item.data),
            [
                'BEFORE',
                'A',
                'is',
                'the',
                'only',
                'thing',
                'unless',
                'letters',
                'continue',
                'MIDDLE',
                'A',
                'is',
                'the',
                'only',
                'thing',
                'unless',
                'letters',
                'continue',
                'AFTER',
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

suite('mount collection mapped view', () => {
    test('unmodified collection mapView nodes keep references', () => {
        const items = collection(['foo', 'bar', 'baz']);
        mount(
            testRoot,
            <div>
                {items.mapView((item) => (
                    <span data-item>{item}</span>
                ))}
            </div>
        );
        const origSet: Element[] = [].slice.call(
            testRoot.querySelectorAll('[data-item]')
        );
        origSet[0].setAttribute('tagged', 'yes 0');
        origSet[1].setAttribute('tagged', 'yes 1');
        origSet[2].setAttribute('tagged', 'yes 2');
        items.push('end');
        items.unshift('start');
        items.splice(2, 0, 'middle');
        // start foo middle bar baz end
        flush();
        const newSet: Element[] = [].slice.call(
            testRoot.querySelectorAll('[data-item]')
        );
        assert.is(null, newSet[0].getAttribute('tagged'));
        assert.is('yes 0', newSet[1].getAttribute('tagged'));
        assert.is(null, newSet[2].getAttribute('tagged'));
        assert.is('yes 1', newSet[3].getAttribute('tagged'));
        assert.is('yes 2', newSet[4].getAttribute('tagged'));
        assert.is(null, newSet[5].getAttribute('tagged'));
    });

    test('unmodified collection sortedView nodes keep references', () => {
        const items = collection(['foo', 'bar', 'baz']);
        mount(
            testRoot,
            <div>
                {items
                    .sortedView((item) => item)
                    .mapView((item) => (
                        <span data-item>{item}</span>
                    ))}
            </div>
        );
        const origSet: Element[] = [].slice.call(
            testRoot.querySelectorAll('[data-item]')
        );
        // bar baz foo
        origSet[0].setAttribute('tagged', 'yes 0');
        origSet[1].setAttribute('tagged', 'yes 1');
        origSet[2].setAttribute('tagged', 'yes 2');
        items.push('aaa');
        items.unshift('but');
        items.splice(2, 0, 'zzz');
        // aaa bar baz but foo zzz
        flush();
        const newSet: Element[] = [].slice.call(
            testRoot.querySelectorAll('[data-item]')
        );
        assert.is(null, newSet[0].getAttribute('tagged'));
        assert.is('yes 0', newSet[1].getAttribute('tagged'));
        assert.is('yes 1', newSet[2].getAttribute('tagged'));
        assert.is(null, newSet[3].getAttribute('tagged'));
        assert.is('yes 2', newSet[4].getAttribute('tagged'));
        assert.is(null, newSet[5].getAttribute('tagged'));
    });
});

suite('perf tests', () => {
    let logLevel: LogLevel | null = null;

    beforeEach(() => {
        logLevel = getLogLevel();
        setLogLevel('error');
    });

    afterEach(() => {
        if (logLevel) setLogLevel(logLevel);
    });

    test('render 1000 flat items in 25ms', () => {
        const COUNT = 1000;
        const Item = ({ id }: { id: number }) => <div>{calc(() => id)}</div>;
        const items = collection<Model<{ id: number }>>([]);
        for (let i = 0; i < COUNT; ++i) {
            items.push(model({ id: i }));
        }
        const Items = () => (
            <div>
                {calc(() => items.mapView((item) => <Item id={item.id} />))}
            </div>
        );

        assert.medianRuntimeLessThan(25, (measure) => {
            const unmount = measure(() => mount(testRoot, <Items />));
            unmount();
        });
    });

    test('add 1 item to end of 1000 flat items in 1ms', () => {
        const COUNT = 1000;
        const Item = ({ id }: { id: number }) => <div>{calc(() => id)}</div>;
        const items = collection<Model<{ id: number }>>([]);
        for (let i = 0; i < COUNT; ++i) {
            items.push(model({ id: i }));
        }
        const Items = () => (
            <div>
                {calc(() => items.mapView((item) => <Item id={item.id} />))}
            </div>
        );

        const unmount = mount(testRoot, <Items />);

        assert.medianRuntimeLessThan(1, (measure) => {
            measure(() => {
                items.push(model({ id: 1001 }));
                flush();
            });
            items.pop();
            flush();
        });
        unmount();
    });

    test('add 1 item to front of 1000 flat items in 2ms', () => {
        const COUNT = 1000;
        const Item = ({ id }: { id: number }) => <div>{calc(() => id)}</div>;
        const items = collection<Model<{ id: number }>>([]);
        for (let i = 0; i < COUNT; ++i) {
            items.push(model({ id: i }));
        }
        const Items = () => (
            <div>
                {calc(() => items.mapView((item) => <Item id={item.id} />))}
            </div>
        );

        const unmount = mount(testRoot, <Items />);
        assert.medianRuntimeLessThan(2, (measure) => {
            measure(() => {
                items.unshift(model({ id: 1001 }));
                flush();
            });
            items.shift();
            flush();
        });
        unmount();
    });

    test('add 1 item to middle of 1000 flat items in 1ms', () => {
        const COUNT = 1000;
        const Item = ({ id }: { id: number }) => <div>{calc(() => id)}</div>;
        const items = collection<Model<{ id: number }>>([]);
        for (let i = 0; i < COUNT; ++i) {
            items.push(model({ id: i }));
        }
        const Items = () => (
            <div>
                {calc(() => items.mapView((item) => <Item id={item.id} />))}
            </div>
        );

        const unmount = mount(testRoot, <Items />);
        assert.medianRuntimeLessThan(1, (measure) => {
            measure(() => {
                items.splice(500, 0, model({ id: 1001 }));
                flush();
            });
            items.splice(500, 1);
            flush();
        });
        unmount();
    });

    test('empty 1000 flat items in 10ms', () => {
        const COUNT = 1000;
        const Item = ({ id }: { id: number }) => <div>{calc(() => id)}</div>;
        const items = collection<Model<{ id: number }>>([]);
        for (let i = 0; i < COUNT; ++i) {
            items.push(model({ id: i }));
        }
        const Items = () => (
            <div>
                {calc(() => items.mapView((item) => <Item id={item.id} />))}
            </div>
        );

        const unmount = mount(testRoot, <Items />);
        assert.medianRuntimeLessThan(10, (measure) => {
            const toReadd = measure(() => {
                const toReadd = items.splice(0, items.length);
                flush();
                return toReadd;
            });
            items.push(...toReadd);
            flush();
        });
        unmount();
    });

    test('render 10 * 10 * 10 nested items in 25ms', () => {
        type Item = Model<{ id: number }>;
        type Level1 = Collection<Model<{ id: number }>>;
        type Level2 = Collection<Collection<Model<{ id: number }>>>;
        type Level3 = Collection<Collection<Collection<Model<{ id: number }>>>>;

        const COUNT = 10;
        const level3: Level3 = collection([]);
        for (let j = 0; j < COUNT; ++j) {
            const level2: Level2 = collection([]);
            for (let k = 0; k < COUNT; ++k) {
                const level1: Level1 = collection([]);
                for (let l = 0; l < COUNT; ++l) {
                    level1.push(model({ id: l }));
                }
                level2.push(level1);
            }
            level3.push(level2);
        }

        const Item = ({ id }: { id: number }) => <div>{calc(() => id)}</div>;
        const items = collection<Model<{ id: number }>>([]);
        for (let i = 0; i < COUNT; ++i) {
            items.push(model({ id: i }));
        }
        const Level1 = ({ items }: { items: Level1 }) => (
            <div>
                {calc(() => items.mapView((item) => <Item id={item.id} />))}
            </div>
        );
        const Level2 = ({ items }: { items: Level2 }) => (
            <div>
                {calc(() => items.mapView((item) => <Level1 items={item} />))}
            </div>
        );
        const Level3 = ({ items }: { items: Level3 }) => (
            <div>
                {calc(() => items.mapView((item) => <Level2 items={item} />))}
            </div>
        );

        assert.medianRuntimeLessThan(25, (measure) => {
            const unmount = measure(() =>
                mount(testRoot, <Level3 items={level3} />)
            );
            unmount();
        });
    });

    test('update 1000 text nodes amongst 1000 flat items in 35ms', () => {
        const COUNT = 1000;
        const Item = ({ id }: { id: number }) => <div>{calc(() => id)}</div>;
        const items = collection<Model<{ id: number }>>([]);
        for (let i = 0; i < COUNT; ++i) {
            items.push(model({ id: i }));
        }
        const Items = () => (
            <div>
                {calc(() => items.mapView((item) => <Item id={item.id} />))}
            </div>
        );

        const unmount = mount(testRoot, <Items />);
        assert.medianRuntimeLessThan(35, (measure) => {
            measure(() => {
                for (let j = 0; j < COUNT; ++j) {
                    items[j].id = items[j].id + 1;
                }
                flush();
            });
        });
        unmount();
    });

    test('update 1000 dom trees in 40ms', () => {
        const COUNT = 1000;
        const Item = ({ id }: { id: number }) => (
            <div>
                {calc(() => (
                    <div>{id}</div>
                ))}
            </div>
        );
        const items = collection<Model<{ id: number }>>([]);
        for (let i = 0; i < COUNT; ++i) {
            items.push(model({ id: i }));
        }
        const Items = () => (
            <div>
                {calc(() => items.mapView((item) => <Item id={item.id} />))}
            </div>
        );

        const unmount = mount(testRoot, <Items />);
        assert.medianRuntimeLessThan(40, (measure) => {
            measure(() => {
                for (let j = 0; j < COUNT; ++j) {
                    items[j].id = items[j].id + 1;
                }
                flush();
            });
        });
        unmount();
    });

    test('update 1000 dom attributes in 30ms', () => {
        const COUNT = 1000;
        const Item = ({ id }: { id: number }) => (
            <div data-whatever={calc(() => id)} />
        );
        const items = collection<Model<{ id: number }>>([]);
        for (let i = 0; i < COUNT; ++i) {
            items.push(model({ id: i }));
        }
        const Items = () => (
            <div>
                {calc(() => items.mapView((item) => <Item id={item.id} />))}
            </div>
        );

        const unmount = mount(testRoot, <Items />);
        assert.medianRuntimeLessThan(30, (measure) => {
            measure(() => {
                for (let j = 0; j < COUNT; ++j) {
                    items[j].id = items[j].id + 1;
                }
                flush();
            });
        });
        unmount();
    });
});
