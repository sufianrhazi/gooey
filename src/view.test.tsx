import { assert, beforeEach, suite, test } from '@srhazi/gooey-test';

import { debugGetGraph } from './engine';
import Gooey, {
    calc,
    ClassComponent,
    collection,
    defineCustomElement,
    dynGet,
    field,
    flush,
    IntrinsicObserver,
    model,
    mount,
    ref,
    reset,
    subscribe,
} from './index';
import type { Component, Dyn, Model, Ref } from './index';
import * as log from './log';

let testRoot: HTMLElement = document.getElementById('test-root')!;

beforeEach(() => {
    testRoot = document.getElementById('test-root')!;
    reset();
    subscribe();
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

    test('mount renders tree of intrinsic elements', () => {
        mount(
            testRoot,
            <div data-item="0" id="outer">
                a
                <p data-item="1" id="inner-1">
                    b
                </p>
                c
                <p data-item="2" id="inner-2">
                    d
                </p>
                e
                <p data-item="3" id="inner-3">
                    f
                </p>
                g
            </div>
        );

        assert.is(
            '<div data-item="0" id="outer">a<p data-item="1" id="inner-1">b</p>c<p data-item="2" id="inner-2">d</p>e<p data-item="3" id="inner-3">f</p>g</div>',
            testRoot.innerHTML
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

    test('mount renders nested and concatenated jsx arrays as contents', () => {
        mount(
            testRoot,
            <div id="ok">
                {[
                    'a1:start',
                    'zero',
                    undefined,
                    1,
                    null,
                    'two',
                    false,
                    [
                        'a2:start',
                        'three',
                        undefined,
                        4,
                        null,
                        'five',
                        false,
                        6,
                        true,
                        'seven',
                        () => 3,
                        8,
                        'a2:end',
                    ],
                    9,
                    true,
                    'ten',
                    () => 3,
                    11,
                    'a1:end',
                ]}
                {[
                    'a3:start',
                    'twelve',
                    undefined,
                    13,
                    null,
                    'fourteen',
                    false,
                    [
                        'a4:start',
                        'fifteen',
                        undefined,
                        16,
                        null,
                        'seventeen',
                        false,
                        18,
                        true,
                        'nineteen',
                        () => 3,
                        20,
                        'a4:end',
                    ],
                    21,
                    true,
                    'twentytwo',
                    () => 3,
                    23,
                    'a3:end',
                ]}
            </div>
        );
        assert.deepEqual(
            (
                Array.from(testRoot.querySelector('#ok')!.childNodes) as Text[]
            ).map((text: Text) => text.data),
            [
                'a1:start',
                'zero',
                '1',
                'two',
                'a2:start',
                'three',
                '4',
                'five',
                '6',
                'seven',
                '8',
                'a2:end',
                '9',
                'ten',
                '11',
                'a1:end',
                'a3:start',
                'twelve',
                '13',
                'fourteen',
                'a4:start',
                'fifteen',
                '16',
                'seventeen',
                '18',
                'nineteen',
                '20',
                'a4:end',
                '21',
                'twentytwo',
                '23',
                'a3:end',
            ]
        );
    });

    test('react lies about JSX not supporting class, for, and other keywords', () => {
        mount(
            testRoot,
            <>
                <label class="my-class" for="my-thing">
                    Hello
                </label>
                <div tabindex={0}>focusable</div>
                <input id="my-thing" type="text" readonly />
            </>
        );
        assert.is(
            'my-class',
            (testRoot.childNodes[0] as HTMLLabelElement).getAttribute('class')
        );
        assert.is(
            'my-class',
            (testRoot.childNodes[0] as HTMLLabelElement).className
        );

        assert.is(
            'my-thing',
            (testRoot.childNodes[0] as HTMLLabelElement).getAttribute('for')
        );
        assert.is(
            'my-thing',
            (testRoot.childNodes[0] as HTMLLabelElement).htmlFor
        );

        assert.is(
            '0',
            (testRoot.childNodes[1] as HTMLElement).getAttribute('tabindex')
        );
        assert.is(0, (testRoot.childNodes[1] as HTMLElement).tabIndex);

        assert.is(
            '',
            (testRoot.childNodes[2] as HTMLInputElement).getAttribute(
                'readonly'
            )
        );
        assert.is(true, (testRoot.childNodes[2] as HTMLInputElement).readOnly);
    });

    test('prop:myprop sets element property manually', () => {
        const state = model<{ val: any }>({
            val: 42,
        });
        mount(
            testRoot,
            <div
                prop:mypropstr="my-value"
                prop:mypropnum={3}
                prop:mypropcalc={calc(() => state.val)}
            >
                Hello
            </div>
        );
        assert.is('my-value', (testRoot.childNodes[0] as any).mypropstr);
        assert.is(3, (testRoot.childNodes[0] as any).mypropnum);
        assert.is(42, (testRoot.childNodes[0] as any).mypropcalc);
        state.val = 'hello';
        flush();
        assert.is('hello', (testRoot.childNodes[0] as any).mypropcalc);
    });

    test('attr:myprop sets element attribute manually', () => {
        // the indeterminate attribute does not exist, but it does exist as a property on HTMLInputElement instances
        mount(testRoot, <input type="checkbox" attr:indeterminate="" />);
        assert.is(false, (testRoot.childNodes[0] as any).indeterminate);
        assert.is(
            '',
            (testRoot.childNodes[0] as any).getAttribute('indeterminate')
        );
    });

    test('attributes can be bound to fields', () => {
        const f = field('hi');
        // the indeterminate attribute does not exist, but it does exist as a property on HTMLInputElement instances
        mount(testRoot, <input type="checkbox" value={f} />);
        assert.is('hi', (testRoot.childNodes[0] as any).value);
        f.set('hello');
        flush();
        assert.is('hello', (testRoot.childNodes[0] as any).value);
    });

    test('fields can be bound to the dom', () => {
        const f = field('hi');
        // the indeterminate attribute does not exist, but it does exist as a property on HTMLInputElement instances
        mount(testRoot, <div id="main">{f}</div>);
        assert.is('hi', testRoot.querySelector('#main')?.textContent);
        f.set('hello');
        flush();
        assert.is('hello', testRoot.querySelector('#main')?.textContent);
    });

    test('on:event handlers work for normal events', () => {
        const events: Element[] = [];
        const onClick = (event: Event, target: Element) => {
            events.push(target);
        };
        mount(
            testRoot,
            <div id="outer" on:click={onClick}>
                <div id="mid" on:click={onClick}>
                    <div id="inner" on:click={onClick}></div>
                </div>
            </div>
        );
        testRoot
            .querySelector('#inner')
            ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        assert.deepEqual(events, [
            testRoot.querySelector('#inner'),
            testRoot.querySelector('#mid'),
            testRoot.querySelector('#outer'),
        ]);
    });

    test('on:event handlers can be passed undefined', () => {
        mount(
            testRoot,
            <div id="outer" on:click={undefined}>
                <div id="mid" on:click={undefined}>
                    <div id="inner" on:click={undefined}></div>
                </div>
            </div>
        );
        flush();
        testRoot
            .querySelector('#inner')
            ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    test('on:event handlers flush after triggering', () => {
        const state = model({
            count: 0,
        });
        mount(
            testRoot,
            <div>
                <div class="count">{calc(() => state.count)}</div>
                <button on:click={() => state.count++}>click me</button>
            </div>
        );
        testRoot
            .querySelector('button')
            ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        assert.is('1', testRoot.querySelector('.count')?.textContent);
        testRoot
            .querySelector('button')
            ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        assert.is('2', testRoot.querySelector('.count')?.textContent);
        testRoot
            .querySelector('button')
            ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        assert.is('3', testRoot.querySelector('.count')?.textContent);
    });

    test('on:event handlers can stop propagation for normal events', () => {
        const events: Element[] = [];
        const onClick = (event: Event, target: Element) => {
            events.push(target);
        };
        const onClickMid = (event: Event, target: Element) => {
            event.stopPropagation();
            events.push(target);
        };
        mount(
            testRoot,
            <div id="outer" on:click={onClick}>
                <div id="mid" on:click={onClickMid}>
                    <div id="inner" on:click={onClick}></div>
                </div>
            </div>
        );
        testRoot
            .querySelector('#inner')
            ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        assert.deepEqual(events, [
            testRoot.querySelector('#inner'),
            testRoot.querySelector('#mid'),
        ]);
    });

    test('on:event handlers can run on capture phase', () => {
        const events: Element[] = [];
        const onClick = (event: Event, target: Element) => {
            events.push(target);
        };
        const onClickMid = (event: Event, target: Element) => {
            event.stopPropagation();
            events.push(target);
        };
        mount(
            testRoot,
            <div id="outer" oncapture:click={onClick}>
                <div id="mid" oncapture:click={onClickMid}>
                    <div id="inner" oncapture:click={onClick}></div>
                </div>
            </div>
        );
        testRoot
            .querySelector('#inner')
            ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        assert.deepEqual(events, [
            testRoot.querySelector('#outer'),
            testRoot.querySelector('#mid'),
        ]);
    });

    test('on:event handlers can be passive events', () => {
        const events: Element[] = [];
        const onClick = (event: Event, target: Element) => {
            events.push(target);
        };
        mount(
            testRoot,
            <div id="outer" onpassive:scroll={onClick}>
                <div id="mid" onpassive:scroll={onClick}>
                    <div id="inner" onpassive:scroll={onClick}></div>
                </div>
            </div>
        );
        testRoot
            .querySelector('#inner')
            ?.dispatchEvent(new Event('scroll', { bubbles: true }));
        assert.deepEqual(events, [
            testRoot.querySelector('#inner'),
            testRoot.querySelector('#mid'), // propagation does not stop!
            testRoot.querySelector('#outer'),
        ]);
    });

    test('on:event handlers work for custom events', () => {
        const events: Element[] = [];
        const onCustom = (event: Event, target: Element) => {
            events.push(target);
        };
        mount(
            testRoot,
            <div id="outer" on:custom={onCustom}>
                <div id="mid" on:custom={onCustom}>
                    <div id="inner" on:custom={onCustom}></div>
                </div>
            </div>
        );
        testRoot
            .querySelector('#inner')
            ?.dispatchEvent(new Event('custom', { bubbles: true }));
        assert.deepEqual(events, [
            testRoot.querySelector('#inner'),
            testRoot.querySelector('#mid'),
            testRoot.querySelector('#outer'),
        ]);
    });

    test('clone static', () => {
        const source = (
            <div class="source" data-name="yes">
                hello
            </div>
        );
        const dest = source.clone({ class: 'dest', 'data-cloned': 'true' }, [
            <>howdy</>,
        ]);
        mount(
            testRoot,
            <>
                <div id="a">{source}</div>
                <div id="b">{dest}</div>
            </>
        );
        assert.is(
            'source',
            testRoot.querySelector('#a')?.children[0].className
        );
        assert.is(
            'yes',
            testRoot.querySelector('#a')?.children[0].getAttribute('data-name')
        );
        assert.is(
            null,
            testRoot
                .querySelector('#a')
                ?.children[0].getAttribute('data-cloned')
        );
        assert.is(
            'hello',
            testRoot.querySelector('#a')?.children[0].textContent
        );
        assert.is('dest', testRoot.querySelector('#b')?.children[0].className);
        assert.is(
            'yes',
            testRoot.querySelector('#b')?.children[0].getAttribute('data-name')
        );
        assert.is(
            'true',
            testRoot
                .querySelector('#b')
                ?.children[0].getAttribute('data-cloned')
        );
        assert.is(
            'howdy',
            testRoot.querySelector('#b')?.children[0].textContent
        );
    });

    test('clone with children clones children, including refs and event handlers', () => {
        const els: any[] = [];
        const targets: any[] = [];
        const ref = (el: any) => els.push(el);
        const source = (
            <div data-name="yes">
                <span
                    ref={ref}
                    on:click={(e) => targets.push(e.target)}
                    data-child="yes"
                >
                    cloned
                </span>
            </div>
        );
        const dest = source.clone();
        mount(
            testRoot,
            <>
                <div id="a">{source}</div>
                <div id="b">{dest}</div>
            </>
        );
        assert.is(
            '<div id="a"><div data-name="yes"><span data-child="yes">cloned</span></div></div><div id="b"><div data-name="yes"><span data-child="yes">cloned</span></div></div>',
            testRoot.innerHTML
        );
        assert.is(2, els.length);
        assert.isNot(els[0], els[1]);
        assert.is(els[0].textContent, els[1].textContent);
        els[0].dispatchEvent(new MouseEvent('click'));
        els[1].dispatchEvent(new MouseEvent('click'));
        assert.is(2, targets.length);
        assert.is(els[0], targets[0]);
        assert.is(els[1], targets[1]);
    });

    test('style can bound calculations to specific styles', () => {
        const vals = model({
            color: 'red',
            align: 'center',
        });
        const divRef = ref<HTMLDivElement>();
        mount(
            testRoot,
            <div
                ref={divRef}
                style:color={calc(() => vals.color)}
                style:text-align={calc(() => vals.align)}
            >
                hello
            </div>
        );
        assert.is('red', divRef.current?.style.color);
        assert.is('center', divRef.current?.style.textAlign);
        vals.color = 'blue';
        flush();
        assert.is('blue', divRef.current?.style.color);
        assert.is('center', divRef.current?.style.textAlign);
    });

    test('cssprop can bound calculations to specific css properties', () => {
        const vals = model({
            'woah-nellie': 'red',
            coolio: 'center',
        });
        const divRef = ref<HTMLDivElement>();
        mount(
            testRoot,
            <div
                ref={divRef}
                cssprop:woah-nellie={calc(() => vals['woah-nellie'])}
                cssprop:coolio={calc(() => vals['coolio'])}
            >
                hello
            </div>
        );
        assert.is(
            'red',
            divRef.current?.style.getPropertyValue('--woah-nellie')
        );
        assert.is('center', divRef.current?.style.getPropertyValue('--coolio'));
        vals['woah-nellie'] = 'blue';
        flush();
        assert.is(
            'blue',
            divRef.current?.style.getPropertyValue('--woah-nellie')
        );
        assert.is('center', divRef.current?.style.getPropertyValue('--coolio'));
    });

    test('mount can be performed on a shadow root', () => {
        const div = document.createElement('div');
        div.textContent = 'neato';
        testRoot.appendChild(div);
        const shadowRoot = div.attachShadow({
            mode: 'open',
        });
        mount(
            shadowRoot,
            <p id="neat">
                Hello from the <slot /> shadow world
            </p>
        );
        // afaict there isn't a clean way to get the "composed" text content inclusive of the shadow root & host element
        // So just ensure the expected elements were rendered in the shadow root
        assert.is(
            'Hello from the  shadow world',
            shadowRoot.getElementById('neat')?.textContent
        );
        assert.is('neato', div.textContent);
    });
});

suite('mount calculations', () => {
    test('renders child calculations as their raw value', () => {
        mount(testRoot, <div id="ok">{calc(() => 'hello', 'calctest')}</div>);
        assert.deepEqual(
            (testRoot.querySelector('#ok')!.childNodes[0] as Text).data,
            'hello'
        );
    });

    test('child calculations can unmount', () => {
        const unmount = mount(
            testRoot,
            <div id="ok">{calc(() => 'hello', 'calctest')}</div>
        );
        unmount();
        assert.is('', testRoot.innerHTML);
    });

    test('renders attribute calculations as their raw value', () => {
        mount(testRoot, <div id="ok" data-whatever={calc(() => 'hello')} />);
        assert.deepEqual(
            testRoot.querySelector('#ok')!.getAttribute('data-whatever'),
            'hello'
        );
    });

    test('attribute calculations can unmount', () => {
        const unmount = mount(
            testRoot,
            <div id="ok" data-whatever={calc(() => 'hello')} />
        );
        unmount();
        assert.is('', testRoot.innerHTML);
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

    test('calculations run while detached', () => {
        const state = model({ attr: 'hello', content: 'one' });
        const log: string[] = [];
        const jsx = (
            <div
                id="ok"
                data-attr={calc(() => {
                    log.push(`recalc:${state.attr}`);
                    return state.attr;
                })}
            >
                {calc(() => state.content)}
            </div>
        );
        jsx.retain();
        const unmount = mount(testRoot, jsx);
        const divEl = testRoot.querySelector('#ok');
        unmount();
        assert.deepEqual(['recalc:hello'], log);
        assert.deepEqual('hello', divEl?.getAttribute('data-attr'));
        assert.deepEqual('one', divEl?.textContent);
        state.attr = 'goodbye';
        flush();
        assert.deepEqual(['recalc:hello', 'recalc:goodbye'], log);
        assert.deepEqual('goodbye', divEl?.getAttribute('data-attr'));
        state.content = 'two';
        flush();
        assert.deepEqual('two', divEl?.textContent);
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

    test('components can unmount', () => {
        const Greet: Component<{ name: string }> = ({ name }) => (
            <p>Hello {name}</p>
        );
        const unmount = mount(testRoot, <Greet name="world!" />);
        unmount();
        assert.is(testRoot.innerHTML, '');
    });

    test('components with calculations can unmount', () => {
        const Greet: Component<{ name: string }> = ({ name }) => {
            const state = model({ name });
            return <p>Hello {calc(() => state.name)}</p>;
        };
        const unmount = mount(testRoot, <Greet name="world!" />);
        unmount();
        assert.is(testRoot.innerHTML, '');
    });

    test('components can have calculations', () => {
        const state = model(
            {
                name: 'world',
            },
            'state'
        );
        const Greet: Component<{}> = () => (
            <p>Hello {calc(() => state.name, 'rendername')}</p>
        );
        mount(testRoot, <Greet />);

        assert.is(testRoot.innerHTML, '<p>Hello world</p>');

        state.name = 'there';
        flush();

        assert.is(testRoot.innerHTML, '<p>Hello there</p>');
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

    test('components without calculations that read model data *do not* rerender', () => {
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

        assert.is(pBefore, pAfter);
        assert.is('Hello world!', pAfter?.textContent);
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

    test('components onMount can return an onUnmount callback which gets called after mount', () => {
        const sequence: string[] = [];
        let count = 0;
        const Greet: Component<{}> = (props, { onMount }) => {
            sequence.push('render');
            onMount(() => {
                count++;
                sequence.push(`onMount:${count}`);
                return () => {
                    sequence.push(`onUnmount:${count}`);
                };
            });
            return <p id="p">Hello!</p>;
        };

        const jsx = <Greet />;
        jsx.retain();

        let unmount = mount(testRoot, jsx);
        assert.deepEqual(['render', 'onMount:1'], sequence);
        unmount();
        assert.deepEqual(['render', 'onMount:1', 'onUnmount:1'], sequence);
        unmount = mount(testRoot, jsx);
        assert.deepEqual(
            ['render', 'onMount:1', 'onUnmount:1', 'onMount:2'],
            sequence
        );
        unmount();
        assert.deepEqual(
            ['render', 'onMount:1', 'onUnmount:1', 'onMount:2', 'onUnmount:2'],
            sequence
        );
    });

    test('components are provided an onUnmount callback which is called immediately before unmount', () => {
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

    test('the children prop is a non-array single value when components receive a single child', () => {
        const Parent: Component<{ children: (val: string) => string }> = ({
            children,
        }) => <div id="parent">{children('hello')}</div>;
        mount(testRoot, <Parent>{(str: string) => str.toUpperCase()}</Parent>);
        assert.is('HELLO', testRoot.querySelector('#parent')?.textContent);
    });

    test('the children prop is an array of values when components receive multiple children', () => {
        const Parent: Component<{ children: ((val: string) => string)[] }> = ({
            children,
        }) => <div id="parent">{children.map((child) => child('hello'))}</div>;
        mount(
            testRoot,
            <Parent>
                {(str: string) => str.toUpperCase()}
                {(str: string) => `(${str}!)`}
            </Parent>
        );
        assert.is(
            'HELLO(hello!)',
            testRoot.querySelector('#parent')?.textContent
        );
    });

    test('the children prop is undefined when components receive no children', () => {
        const Parent: Component<{ children?: ((val: string) => string)[] }> = ({
            children,
        }) => (
            <div id="parent">
                {children === undefined ? 'empty' : 'non-empty'}
            </div>
        );
        mount(testRoot, <Parent />);
        assert.is('empty', testRoot.querySelector('#parent')?.textContent);
    });

    test('onUnmount called in correct order (children before parent) when entire tree is unmounted', () => {
        const sequence: string[] = [];
        const Grandchild: Component<{ name: string }> = (
            { name },
            { onMount, onUnmount }
        ) => {
            sequence.push(`render ${name}`);
            onMount(() => {
                sequence.push(`onMount ${name}`);
            });
            onUnmount(() => {
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

        assert.arrayEqualsUnsorted(
            [
                // Ordering is not guaranteed, only relative ordering (parents before children when rendering; children before parents when mounting)
                'render a',
                'render a 1',
                'render a 2',
                'render b',
                'render b 1',
                'render b 2',
                'onMount a 1',
                'onMount a 2',
                'onMount a',
                'onMount b 1',
                'onMount b 2',
                'onMount b',
            ],
            sequence
        );
        assert.lessThan(
            sequence.indexOf('render a'),
            sequence.indexOf('render a 1')
        );
        assert.lessThan(
            sequence.indexOf('render a'),
            sequence.indexOf('render a 2')
        );
        assert.lessThan(
            sequence.indexOf('render b'),
            sequence.indexOf('render b 1')
        );
        assert.lessThan(
            sequence.indexOf('render b'),
            sequence.indexOf('render b 2')
        );
        assert.lessThan(
            sequence.indexOf('render a'),
            sequence.indexOf('onMount a')
        );
        assert.lessThan(
            sequence.indexOf('render b'),
            sequence.indexOf('onMount b')
        );
        assert.lessThan(
            sequence.indexOf('onMount a 1'),
            sequence.indexOf('onMount a')
        );
        assert.lessThan(
            sequence.indexOf('onMount a 2'),
            sequence.indexOf('onMount a')
        );
        assert.lessThan(
            sequence.indexOf('onMount b 1'),
            sequence.indexOf('onMount b')
        );
        assert.lessThan(
            sequence.indexOf('onMount b 2'),
            sequence.indexOf('onMount b')
        );

        // clear sequence
        sequence.splice(0, sequence.length);

        unmount();

        assert.arrayEqualsUnsorted(
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
        assert.lessThan(
            sequence.indexOf('onUnmount a 1'),
            sequence.indexOf('onUnmount a')
        );
        assert.lessThan(
            sequence.indexOf('onUnmount a 2'),
            sequence.indexOf('onUnmount a')
        );
        assert.lessThan(
            sequence.indexOf('onUnmount b 1'),
            sequence.indexOf('onUnmount b')
        );
        assert.lessThan(
            sequence.indexOf('onUnmount b 2'),
            sequence.indexOf('onUnmount b')
        );
    });

    test('children can only be rendered exactly once', () => {
        const BadComponent: Component<{ children: JSX.Element }> = ({
            children,
        }) => (
            <div>
                <div id="left">{children}</div>
                <div id="right">{children}</div>
            </div>
        );
        assert.throwsMatching(/double attached/, () =>
            mount(
                testRoot,
                <BadComponent>
                    <p class="child">only once</p>
                </BadComponent>
            )
        );
    });

    test('ref called immediately after mount and immediately before unmount', () => {
        let mountedEl: Element | null = null;
        const unmount = mount(
            testRoot,
            <div>
                <p
                    ref={(el) => {
                        if (el) {
                            assert.isTruthy(testRoot.contains(el));
                            mountedEl = el;
                        } else {
                            assert.isTruthy(testRoot.contains(mountedEl));
                        }
                    }}
                >
                    contents
                </p>
            </div>
        );
        unmount();
        assert.isFalsy(testRoot.contains(mountedEl));
        assert.assertionCount(3);
    });
});

suite('mount class components', () => {
    test('components are rendered', () => {
        class Greet extends ClassComponent<{ name: string }> {
            render() {
                return <p>Hello {this.props.name}</p>;
            }
        }
        mount(testRoot, <Greet name="world!" />);
        assert.is(testRoot.innerHTML, '<p>Hello world!</p>');
    });

    test('components can unmount', () => {
        class Greet extends ClassComponent<{ name: string }> {
            render() {
                return <p>Hello {this.props.name}</p>;
            }
        }
        const unmount = mount(testRoot, <Greet name="world!" />);
        unmount();
        assert.is(testRoot.innerHTML, '');
    });

    test('components with calculations can unmount', () => {
        class Greet extends ClassComponent<{ name: string }> {
            render() {
                const state = model({ name: this.props.name });
                return <p>Hello {calc(() => state.name)}</p>;
            }
        }
        const unmount = mount(testRoot, <Greet name="world!" />);
        unmount();
        assert.is(testRoot.innerHTML, '');
    });

    test('components can have calculations', () => {
        const state = model(
            {
                name: 'world',
            },
            'state'
        );
        class Greet extends ClassComponent {
            render() {
                return <p>Hello {calc(() => state.name, 'rendername')}</p>;
            }
        }
        mount(testRoot, <Greet />);

        assert.is(testRoot.innerHTML, '<p>Hello world</p>');

        state.name = 'there';
        flush();

        assert.is(testRoot.innerHTML, '<p>Hello there</p>');
    });

    test('components with calculations do not change roots', () => {
        const state = model({
            name: 'world',
        });
        class Greet extends ClassComponent {
            render() {
                return <p id="p">Hello {calc(() => state.name)}</p>;
            }
        }
        mount(testRoot, <Greet />);

        const pBefore = testRoot.querySelector('#p');

        state.name = 'there';
        flush();

        const pAfter = testRoot.querySelector('#p');

        assert.is(pBefore, pAfter);
    });

    test('components without calculations that read model data *do not* rerender', () => {
        const state = model({
            name: 'world',
        });
        class Greet extends ClassComponent {
            render() {
                const exclaimed = state.name + '!';
                return <p id="p">Hello {exclaimed}</p>;
            }
        }
        mount(testRoot, <Greet />);

        const pBefore = testRoot.querySelector('#p');

        state.name = 'there';
        flush();

        const pAfter = testRoot.querySelector('#p');

        assert.is(pBefore, pAfter);
        assert.is('Hello world!', pAfter?.textContent);
    });

    test('components can specify an onMount method which is called immediately after mounted', () => {
        const sequence: string[] = [];
        let queried: null | Element = null;
        class Greet extends ClassComponent<{}> {
            constructor(props: {}) {
                super(props);
                sequence.push('construct');
            }

            onMount() {
                sequence.push('onMount');
                queried = testRoot.querySelector('#p');
            }

            render() {
                sequence.push('render');
                return <p id="p">Hello!</p>;
            }
        }

        mount(testRoot, <Greet />);

        assert.deepEqual(['construct', 'render', 'onMount'], sequence);
        assert.isTruthy(queried);
        assert.is(testRoot.querySelector('#p'), queried);
    });

    test('component onMount can return an onUnmount method which gets called after unmount', () => {
        const sequence: string[] = [];
        let count = 0;
        class Greet extends ClassComponent<{}> {
            constructor(props: {}) {
                sequence.push('construct');
                super(props);
            }

            onMount() {
                count++;
                sequence.push(`onMount:${count}`);
                return () => {
                    sequence.push(`onUnmount:${count}`);
                };
            }

            render() {
                sequence.push('render');
                return <p id="p">Hello!</p>;
            }
        }

        const jsx = <Greet />;
        jsx.retain();

        let unmount = mount(testRoot, jsx);
        assert.deepEqual(['construct', 'render', 'onMount:1'], sequence);
        unmount();
        assert.deepEqual(
            ['construct', 'render', 'onMount:1', 'onUnmount:1'],
            sequence
        );
        unmount = mount(testRoot, jsx);
        assert.deepEqual(
            ['construct', 'render', 'onMount:1', 'onUnmount:1', 'onMount:2'],
            sequence
        );
        unmount();
        assert.deepEqual(
            [
                'construct',
                'render',
                'onMount:1',
                'onUnmount:1',
                'onMount:2',
                'onUnmount:2',
            ],
            sequence
        );
    });

    test('components are provided an onUnmount callback which is called immediately before unmount', () => {
        const state = model({
            showingChild: false,
        });
        const sequence: string[] = [];
        let queried: null | Element = null;

        class Child extends ClassComponent<{}> {
            constructor(props: {}) {
                sequence.push('construct');
                super(props);
            }

            onMount() {
                sequence.push('onMount');
            }

            onUnmount() {
                queried = testRoot.querySelector('#child');
                sequence.push('onUnmount');
            }

            render() {
                sequence.push('render');
                return <p id="child">child</p>;
            }
        }

        class Parent extends ClassComponent<{}> {
            render() {
                return (
                    <div id="parent">
                        {calc(() => state.showingChild && <Child />)}
                    </div>
                );
            }
        }

        mount(testRoot, <Parent />);

        assert.isTruthy(testRoot.querySelector('#parent'));
        assert.isFalsy(testRoot.querySelector('#child'));
        assert.deepEqual([], sequence);

        state.showingChild = true;
        flush();

        assert.isTruthy(testRoot.querySelector('#parent'));
        assert.isTruthy(testRoot.querySelector('#child'));
        assert.deepEqual(['construct', 'render', 'onMount'], sequence);
        const child = testRoot.querySelector('#child');

        state.showingChild = false;
        flush();

        assert.deepEqual(
            ['construct', 'render', 'onMount', 'onUnmount'],
            sequence
        );
        assert.isTruthy(testRoot.querySelector('#parent'));
        assert.isFalsy(testRoot.querySelector('#child'));
        assert.isTruthy(queried);
        assert.is(child, queried);
    });

    test('the children prop is a non-array single value when components receive a single child', () => {
        class Parent extends ClassComponent<{
            children: (val: string) => string;
        }> {
            render() {
                return <div id="parent">{this.props.children('hello')}</div>;
            }
        }
        mount(testRoot, <Parent>{(str: string) => str.toUpperCase()}</Parent>);
        assert.is('HELLO', testRoot.querySelector('#parent')?.textContent);
    });

    test('the children prop is an array of values when components receive multiple children', () => {
        class Parent extends ClassComponent<{
            children: ((val: string) => string)[];
        }> {
            render() {
                return (
                    <div id="parent">
                        {this.props.children.map((child) => child('hello'))}
                    </div>
                );
            }
        }

        mount(
            testRoot,
            <Parent>
                {(str: string) => str.toUpperCase()}
                {(str: string) => `(${str}!)`}
            </Parent>
        );
        assert.is(
            'HELLO(hello!)',
            testRoot.querySelector('#parent')?.textContent
        );
    });

    test('the children prop is undefined when components receive no children', () => {
        class Parent extends ClassComponent<{
            children?: ((val: string) => string)[];
        }> {
            render() {
                return (
                    <div id="parent">
                        {this.props.children === undefined
                            ? 'empty'
                            : 'non-empty'}
                    </div>
                );
            }
        }
        mount(testRoot, <Parent />);
        assert.is('empty', testRoot.querySelector('#parent')?.textContent);
    });

    test('onUnmount called in correct order (children before parent) when entire tree is unmounted', () => {
        const sequence: string[] = [];
        class Grandchild extends ClassComponent<{ name: string }> {
            onMount() {
                sequence.push(`onMount ${this.props.name}`);
            }

            onUnmount() {
                sequence.push(`onUnmount ${this.props.name}`);
            }

            render() {
                sequence.push(`render ${this.props.name}`);
                return <p class="grandchild">{this.props.name}</p>;
            }
        }

        class Child extends ClassComponent<{ name: string }> {
            onMount() {
                sequence.push(`onMount ${this.props.name}`);
            }

            onUnmount() {
                sequence.push(`onUnmount ${this.props.name}`);
            }

            render() {
                sequence.push(`render ${this.props.name}`);
                return (
                    <p class="child">
                        <Grandchild name={`${this.props.name} 1`} />
                        <Grandchild name={`${this.props.name} 2`} />
                    </p>
                );
            }
        }

        class Parent extends ClassComponent<{}> {
            render() {
                return (
                    <div id="parent">
                        <Child name="a" />
                        <Child name="b" />
                    </div>
                );
            }
        }

        const unmount = mount(testRoot, <Parent />);

        assert.arrayEqualsUnsorted(
            [
                // Ordering is not guaranteed, only relative ordering (parents before children when rendering; children before parents when mounting)
                'render a',
                'render a 1',
                'render a 2',
                'render b',
                'render b 1',
                'render b 2',
                'onMount a 1',
                'onMount a 2',
                'onMount a',
                'onMount b 1',
                'onMount b 2',
                'onMount b',
            ],
            sequence
        );
        assert.lessThan(
            sequence.indexOf('render a'),
            sequence.indexOf('render a 1')
        );
        assert.lessThan(
            sequence.indexOf('render a'),
            sequence.indexOf('render a 2')
        );
        assert.lessThan(
            sequence.indexOf('render b'),
            sequence.indexOf('render b 1')
        );
        assert.lessThan(
            sequence.indexOf('render b'),
            sequence.indexOf('render b 2')
        );
        assert.lessThan(
            sequence.indexOf('render a'),
            sequence.indexOf('onMount a')
        );
        assert.lessThan(
            sequence.indexOf('render b'),
            sequence.indexOf('onMount b')
        );
        assert.lessThan(
            sequence.indexOf('onMount a 1'),
            sequence.indexOf('onMount a')
        );
        assert.lessThan(
            sequence.indexOf('onMount a 2'),
            sequence.indexOf('onMount a')
        );
        assert.lessThan(
            sequence.indexOf('onMount b 1'),
            sequence.indexOf('onMount b')
        );
        assert.lessThan(
            sequence.indexOf('onMount b 2'),
            sequence.indexOf('onMount b')
        );

        // clear sequence
        sequence.splice(0, sequence.length);

        unmount();

        assert.arrayEqualsUnsorted(
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
        assert.lessThan(
            sequence.indexOf('onUnmount a 1'),
            sequence.indexOf('onUnmount a')
        );
        assert.lessThan(
            sequence.indexOf('onUnmount a 2'),
            sequence.indexOf('onUnmount a')
        );
        assert.lessThan(
            sequence.indexOf('onUnmount b 1'),
            sequence.indexOf('onUnmount b')
        );
        assert.lessThan(
            sequence.indexOf('onUnmount b 2'),
            sequence.indexOf('onUnmount b')
        );
    });

    test('children can only be rendered exactly once', () => {
        class BadComponent extends ClassComponent<{ children: JSX.Element }> {
            render() {
                return (
                    <div>
                        <div id="left">{this.props.children}</div>
                        <div id="right">{this.props.children}</div>
                    </div>
                );
            }
        }
        assert.throwsMatching(/double attached/, () =>
            mount(
                testRoot,
                <BadComponent>
                    <p class="child">only once</p>
                </BadComponent>
            )
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
        flush();
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

    test('collection can add items', () => {
        const items = collection<string>([], 'source');
        mount(
            testRoot,
            <div>
                {items.mapView(
                    (item) => (
                        <span data-item>{item}</span>
                    ),
                    'first'
                )}
                {items.mapView(
                    (item) => (
                        <span data-item>{item}</span>
                    ),
                    'second'
                )}
            </div>
        );
        assert.is('', testRoot.textContent);
        items.push('foo');
        flush();
        assert.is('foofoo', testRoot.textContent);
        items.push('bar');
        flush();
        assert.is('foobarfoobar', testRoot.textContent);
        items.push('baz');
        flush();
        assert.is('foobarbazfoobarbaz', testRoot.textContent);
    });

    test('collection can unmount', () => {
        const items = collection<string>(['hi']);
        const unmount = mount(
            testRoot,
            <div>{calc(() => items.mapView((item) => <b>{item}</b>))}</div>
        );
        unmount();
    });

    test('add 1 item to end of 10 flat items', async () => {
        const Item = ({ id }: { id: number }) => (
            <a>
                {calc(() => (
                    <b>{id}</b>
                ))}
            </a>
        );
        const items = collection<Model<{ id: number }>>([], 'coll');
        const Items = () => (
            <div>
                {calc(() => items.mapView((item) => <Item id={item.id} />))}
            </div>
        );

        const unmount = mount(testRoot, <Items />);
        flush();

        items.push(model({ id: 1 }, 'new'));
        flush();
        items.pop();
        flush();

        unmount();
    });

    test('collection can remove items from start', () => {
        const items = collection(['foo', 'bar', 'baz']);
        mount(
            testRoot,
            <div>
                {items.mapView((item) => (
                    <span data-item>{item}</span>
                ))}
                {items.mapView((item) => (
                    <span data-item>{item}</span>
                ))}
            </div>
        );
        assert.is('foobarbazfoobarbaz', testRoot.textContent);
        items.pop();
        flush();
        assert.is('foobarfoobar', testRoot.textContent);
        items.pop();
        flush();
        assert.is('foofoo', testRoot.textContent);
        items.pop();
        flush();
        assert.is('', testRoot.textContent);
    });

    test('collection can remove items from middle', () => {
        const items = collection(['foo', 'bar', 'baz', 'bum']);
        mount(
            testRoot,
            <div>
                {items.mapView((item) => (
                    <span data-item>{item}</span>
                ))}
                {items.mapView((item) => (
                    <span data-item>{item}</span>
                ))}
            </div>
        );
        assert.is('foobarbazbumfoobarbazbum', testRoot.textContent);
        items.splice(1, 1);
        flush();
        assert.is('foobazbumfoobazbum', testRoot.textContent);
        items.splice(1, 1);
        flush();
        assert.is('foobumfoobum', testRoot.textContent);
    });

    test('collection can remove items at end', () => {
        const items = collection(['foo', 'bar', 'baz']);
        mount(
            testRoot,
            <div>
                {items.mapView((item) => (
                    <span data-item>{item}</span>
                ))}
                {items.mapView((item) => (
                    <span data-item>{item}</span>
                ))}
            </div>
        );
        assert.is('foobarbazfoobarbaz', testRoot.textContent);
        items.shift();
        flush();
        assert.is('barbazbarbaz', testRoot.textContent);
        items.shift();
        flush();
        assert.is('bazbaz', testRoot.textContent);
        items.shift();
        flush();
        assert.is('', testRoot.textContent);
    });

    test('unmodified collection mapView nodes keep references when swapped', () => {
        const items = collection([
            'zero',
            'one',
            'two',
            'three',
            'four',
            'five',
        ]);
        const events: string[] = [];

        const Item: Component<{ item: string }> = (
            { item },
            { onMount, onUnmount }
        ) => {
            onMount(() => events.push(`mount:${item}`));
            onUnmount(() => events.push(`unmount:${item}`));
            return <span data-item>{item}</span>;
        };
        mount(
            testRoot,
            <div>
                {items.mapView((item) => (
                    <Item item={item} />
                ))}
            </div>
        );
        assert.arrayEqualsUnsorted(
            [
                'mount:zero',
                'mount:one',
                'mount:two',
                'mount:three',
                'mount:four',
                'mount:five',
            ],
            events
        );
        const origSet: Element[] = [].slice.call(
            testRoot.querySelectorAll('[data-item]')
        );
        // zero one two three four five
        origSet[0].setAttribute('tagged', 'yes 0');
        origSet[1].setAttribute('tagged', 'yes 1');
        origSet[2].setAttribute('tagged', 'yes 2');
        origSet[3].setAttribute('tagged', 'yes 3');
        origSet[4].setAttribute('tagged', 'yes 4');
        origSet[5].setAttribute('tagged', 'yes 5');
        items.moveSlice(1, 2, 3);
        // one four two three five
        flush();
        const newSet: Element[] = [].slice.call(
            testRoot.querySelectorAll('[data-item]')
        );
        assert.is('yes 0', newSet[0].getAttribute('tagged'));
        assert.is('yes 3', newSet[1].getAttribute('tagged'));
        assert.is('yes 4', newSet[2].getAttribute('tagged'));
        assert.is('yes 1', newSet[3].getAttribute('tagged'));
        assert.is('yes 2', newSet[4].getAttribute('tagged'));
        assert.is('yes 5', newSet[5].getAttribute('tagged'));
        assert.arrayEqualsUnsorted(
            [
                'mount:zero',
                'mount:one',
                'mount:two',
                'mount:three',
                'mount:four',
                'mount:five',
            ],
            events
        );
    });

    test('unmodified collection mapView nodes keep references when sorted', () => {
        const items = collection([
            'zero',
            'one',
            'two',
            'three',
            'four',
            'five',
        ]);
        const events: string[] = [];

        const Item: Component<{ item: string }> = (
            { item },
            { onMount, onUnmount }
        ) => {
            onMount(() => events.push(`mount:${item}`));
            onUnmount(() => events.push(`unmount:${item}`));
            return <span data-item>{item}</span>;
        };
        mount(
            testRoot,
            <div>
                {items.mapView((item) => (
                    <Item item={item} />
                ))}
            </div>
        );
        assert.arrayEqualsUnsorted(
            [
                'mount:zero',
                'mount:one',
                'mount:two',
                'mount:three',
                'mount:four',
                'mount:five',
            ],
            events
        );
        const origSet: Element[] = [].slice.call(
            testRoot.querySelectorAll('[data-item]')
        );
        // zero one two three four five
        origSet[0].setAttribute('tagged', 'yes 0');
        origSet[1].setAttribute('tagged', 'yes 1');
        origSet[2].setAttribute('tagged', 'yes 2');
        origSet[3].setAttribute('tagged', 'yes 3');
        origSet[4].setAttribute('tagged', 'yes 4');
        origSet[5].setAttribute('tagged', 'yes 5');
        items.sort();
        // five four one three two zero
        flush();
        const newSet: Element[] = [].slice.call(
            testRoot.querySelectorAll('[data-item]')
        );
        assert.is('yes 5', newSet[0].getAttribute('tagged'));
        assert.is('yes 4', newSet[1].getAttribute('tagged'));
        assert.is('yes 1', newSet[2].getAttribute('tagged'));
        assert.is('yes 3', newSet[3].getAttribute('tagged'));
        assert.is('yes 2', newSet[4].getAttribute('tagged'));
        assert.is('yes 0', newSet[5].getAttribute('tagged'));
        assert.arrayEqualsUnsorted(
            [
                'mount:zero',
                'mount:one',
                'mount:two',
                'mount:three',
                'mount:four',
                'mount:five',
            ],
            events
        );
    });

    test('unmodified collection mapView nodes keep references when reversed', () => {
        const items = collection([
            'zero',
            'one',
            'two',
            'three',
            'four',
            'five',
        ]);
        const events: string[] = [];

        const Item: Component<{ item: string }> = (
            { item },
            { onMount, onUnmount }
        ) => {
            onMount(() => events.push(`mount:${item}`));
            onUnmount(() => events.push(`unmount:${item}`));
            return <span data-item>{item}</span>;
        };
        mount(
            testRoot,
            <div>
                {items.mapView((item) => (
                    <Item item={item} />
                ))}
            </div>
        );
        assert.arrayEqualsUnsorted(
            [
                'mount:zero',
                'mount:one',
                'mount:two',
                'mount:three',
                'mount:four',
                'mount:five',
            ],
            events
        );
        const origSet: Element[] = [].slice.call(
            testRoot.querySelectorAll('[data-item]')
        );
        // zero one two three four five
        origSet[0].setAttribute('tagged', 'yes 0');
        origSet[1].setAttribute('tagged', 'yes 1');
        origSet[2].setAttribute('tagged', 'yes 2');
        origSet[3].setAttribute('tagged', 'yes 3');
        origSet[4].setAttribute('tagged', 'yes 4');
        origSet[5].setAttribute('tagged', 'yes 5');
        items.reverse();
        // five four three two one zero
        flush();
        const newSet: Element[] = [].slice.call(
            testRoot.querySelectorAll('[data-item]')
        );
        assert.is('yes 5', newSet[0].getAttribute('tagged'));
        assert.is('yes 4', newSet[1].getAttribute('tagged'));
        assert.is('yes 3', newSet[2].getAttribute('tagged'));
        assert.is('yes 2', newSet[3].getAttribute('tagged'));
        assert.is('yes 1', newSet[4].getAttribute('tagged'));
        assert.is('yes 0', newSet[5].getAttribute('tagged'));
        assert.arrayEqualsUnsorted(
            [
                'mount:zero',
                'mount:one',
                'mount:two',
                'mount:three',
                'mount:four',
                'mount:five',
            ],
            events
        );
    });

    test('collection of calculations can be spliced properly', () => {
        const items = collection(['foo', 'bar', 'baz', 'bum']);

        mount(
            testRoot,
            <>{items.mapView((item) => calc(() => <>{item}</>))}</>
        );

        assert.is('foobarbazbum', testRoot.textContent);
        items.splice(1, 2);
        flush();
        assert.is('foobum', testRoot.textContent);
    });

    test('collection of calculations can be detached and reattached (pre-flush)', () => {
        const items = collection(['foo', 'bar', 'baz', 'bum']);

        const jsx = <>{items.mapView((item) => calc(() => <>{item}</>))}</>;
        const unmount = mount(testRoot, jsx);
        assert.is('foobarbazbum', testRoot.textContent);
        jsx.retain();
        unmount();
        items.shift();
        items.pop();
        items.unshift('>>>');
        items.push('<<<');
        flush();
        mount(testRoot, jsx);
        assert.is('>>>barbaz<<<', testRoot.textContent);
    });

    test('collection of calculations can be detached and reattached (post-flush)', () => {
        const items = collection(['foo', 'bar', 'baz', 'bum']);

        const jsx = <>{items.mapView((item) => calc(() => <>{item}</>))}</>;
        const unmount = mount(testRoot, jsx);
        assert.is('foobarbazbum', testRoot.textContent);
        jsx.retain();
        unmount();
        items.shift();
        items.pop();
        items.unshift('>>>');
        items.push('<<<');
        mount(testRoot, jsx);
        flush();
        assert.is('>>>barbaz<<<', testRoot.textContent);
    });
});

suite('xml namespaces', () => {
    test('svg elements are supported within an svg context', () => {
        mount(
            testRoot,
            <div>
                <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="50" cy="40" r="30" />
                </svg>
            </div>
        );

        assert.isTruthy(
            testRoot.children[0].children[0] instanceof SVGSVGElement
        );
        assert.is(
            testRoot.children[0].children[0].getAttribute('viewBox'),
            '0 0 100 100'
        );
        assert.isTruthy(
            testRoot.children[0].children[0].children[0] instanceof
                SVGCircleElement
        );
        assert.is(
            testRoot.children[0].children[0].children[0].getAttribute('cx'),
            '50'
        );
        assert.is(
            testRoot.children[0].children[0].children[0].getAttribute('cy'),
            '40'
        );
        assert.is(
            testRoot.children[0].children[0].children[0].getAttribute('r'),
            '30'
        );
    });
    test('svg elements are not rendered as svg outside of an svg context', () => {
        mount(
            testRoot,
            // @ts-expect-error viewBox does not exist on div
            <div viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                <circle cx="50" cy="40" r="30" />
            </div>
        );

        assert.isTruthy(testRoot.children[0] instanceof HTMLDivElement);
        assert.isTruthy(
            testRoot.children[0].children[0] instanceof HTMLUnknownElement
        );
    });
    test('html elements are not rendered as html inside an svg context', () => {
        mount(
            testRoot,
            <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                <input type="text" />
            </svg>
        );

        assert.isTruthy(testRoot.children[0] instanceof SVGSVGElement);
        assert.isTruthy(testRoot.children[0].children[0] instanceof SVGElement);
        assert.isFalsy(testRoot.children[0].children[0] instanceof HTMLElement);
    });
    test('svg elements can break out of svg context using foreignObject', () => {
        mount(
            testRoot,
            <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                <foreignObject>
                    <input type="text" />
                </foreignObject>
            </svg>
        );

        assert.isTruthy(testRoot.children[0] instanceof SVGSVGElement);
        assert.isTruthy(
            testRoot.children[0].children[0] instanceof SVGForeignObjectElement
        );
        assert.isTruthy(
            testRoot.children[0].children[0].children[0] instanceof
                HTMLInputElement
        );
    });

    if (typeof MathMLElement !== 'undefined') {
        test('mathml elements work inside math element', () => {
            mount(
                testRoot,
                <div>
                    <math>
                        <mi>a</mi>
                        <mn>2</mn>
                    </math>
                </div>
            );
            assert.isTruthy(testRoot.children[0] instanceof HTMLDivElement);
            assert.isTruthy(
                testRoot.children[0].children[0] instanceof MathMLElement
            );
            assert.isTruthy(
                testRoot.children[0].children[0].children[0] instanceof
                    MathMLElement
            );
            assert.isTruthy(
                testRoot.children[0].children[0].children[1] instanceof
                    MathMLElement
            );
        });

        test('mathml elements do not work outside math element', () => {
            mount(
                testRoot,
                <div>
                    <div>
                        <mi>a</mi>
                        <mn>2</mn>
                    </div>
                </div>
            );
            assert.isTruthy(testRoot.children[0] instanceof HTMLDivElement);
            assert.isTruthy(
                testRoot.children[0].children[0] instanceof HTMLDivElement
            );
            assert.isFalsy(
                testRoot.children[0].children[0].children[0] instanceof
                    MathMLElement
            );
            assert.isFalsy(
                testRoot.children[0].children[0].children[1] instanceof
                    MathMLElement
            );
        });
    }
});

suite('foreign elements', () => {
    test('normal element can be used within jsx', () => {
        const hostElement = document.createElement('div');
        hostElement.textContent = 'host element';
        hostElement.id = 'host';
        hostElement.setAttribute('data-host', 'yes');
        mount(testRoot, <div id="outer">{hostElement}</div>);
        assert.is('host element', testRoot.textContent);
        assert.is(
            'yes',
            testRoot.querySelector('#host')?.getAttribute('data-host')
        );
    });
});

suite('IntrinsicObserver component', () => {
    test('with no children does nothing', () => {
        const nodes: {
            node: Node;
            event: 'mount' | 'unmount';
        }[] = [];
        const elements: {
            element: Element;
            event: 'mount' | 'unmount';
        }[] = [];
        const unmount = mount(
            testRoot,
            <div>
                <IntrinsicObserver
                    nodeCallback={(node: Node, event: 'mount' | 'unmount') =>
                        nodes.push({ node, event })
                    }
                    elementCallback={(
                        element: Element,
                        event: 'mount' | 'unmount'
                    ) => elements.push({ element, event })}
                />
            </div>
        );
        unmount();
        assert.deepEqual([], nodes);
        assert.deepEqual([], elements);
    });

    test('with single string child', () => {
        const nodes: {
            node: Node;
            event: 'mount' | 'unmount';
        }[] = [];
        const elements: {
            element: Element;
            event: 'mount' | 'unmount';
        }[] = [];
        const unmount = mount(
            testRoot,
            <div class="container">
                <IntrinsicObserver
                    nodeCallback={(node: Node, event: 'mount' | 'unmount') =>
                        nodes.push({ node, event })
                    }
                    elementCallback={(
                        element: Element,
                        event: 'mount' | 'unmount'
                    ) => elements.push({ element, event })}
                >
                    Hello, world!
                </IntrinsicObserver>
            </div>
        );

        const container = testRoot.querySelector('.container')!;
        assert.deepEqual([], elements);
        assert.deepEqual(
            [
                {
                    node: container.childNodes[0],
                    event: 'mount',
                },
            ],
            nodes
        );

        unmount();

        assert.deepEqual([], elements);
        assert.deepEqual(
            [
                {
                    node: container.childNodes[0],
                    event: 'mount',
                },
                {
                    node: container.childNodes[0],
                    event: 'unmount',
                },
            ],
            nodes
        );
    });

    test('with dynamic single string child', () => {
        const nodes: {
            node: Node;
            event: 'mount' | 'unmount';
        }[] = [];
        const elements: {
            element: Element;
            event: 'mount' | 'unmount';
        }[] = [];
        const state = model({ visible: false });
        mount(
            testRoot,
            <div class="container">
                <IntrinsicObserver
                    nodeCallback={(node: Node, event: 'mount' | 'unmount') =>
                        nodes.push({ node, event })
                    }
                    elementCallback={(
                        element: Element,
                        event: 'mount' | 'unmount'
                    ) => elements.push({ element, event })}
                >
                    {calc(() => (state.visible ? <>Hello, world!</> : null))}
                </IntrinsicObserver>
            </div>
        );

        const container = testRoot.querySelector('.container')!;
        assert.deepEqual([], elements);
        assert.deepEqual([], nodes);

        state.visible = true;
        flush();

        const textNode = container.childNodes[0];
        assert.deepEqual(
            [
                {
                    node: textNode,
                    event: 'mount',
                },
            ],
            nodes
        );

        state.visible = false;
        flush();

        assert.deepEqual([], elements);
        assert.deepEqual(
            [
                {
                    node: textNode,
                    event: 'mount',
                },
                {
                    node: textNode,
                    event: 'unmount',
                },
            ],
            nodes
        );
    });

    test('with multiple string children', () => {
        const nodes: {
            node: Node;
            event: 'mount' | 'unmount';
        }[] = [];
        const elements: {
            element: Element;
            event: 'mount' | 'unmount';
        }[] = [];
        const unmount = mount(
            testRoot,
            <div>
                <IntrinsicObserver
                    nodeCallback={(node: Node, event: 'mount' | 'unmount') =>
                        nodes.push({ node, event })
                    }
                    elementCallback={(
                        element: Element,
                        event: 'mount' | 'unmount'
                    ) => elements.push({ element, event })}
                >
                    {'Hello,'} {'world!'}
                </IntrinsicObserver>
            </div>
        );

        const strings = ['Hello,', ' ', 'world!'];

        assert.is(3, nodes.length);
        nodes.forEach((item, idx) => {
            assert.isTruthy(item.node instanceof Text);
            assert.is(strings[idx], (item.node as Text).data);
            assert.is('mount', item.event);
        });

        assert.deepEqual([], elements);

        unmount();

        assert.is(6, nodes.length);
        nodes.slice(3).forEach((item, idx) => {
            assert.isTruthy(item.node instanceof Text);
            assert.is(strings[idx], (item.node as Text).data);
            assert.is('unmount', item.event);
        });

        assert.deepEqual([], elements);
    });

    test('with single element child', () => {
        const nodes: {
            node: Node;
            event: 'mount' | 'unmount';
        }[] = [];
        const elements: {
            element: Element;
            event: 'mount' | 'unmount';
        }[] = [];
        const unmount = mount(
            testRoot,
            <div>
                <IntrinsicObserver
                    nodeCallback={(node: Node, event: 'mount' | 'unmount') =>
                        nodes.push({ node, event })
                    }
                    elementCallback={(
                        element: Element,
                        event: 'mount' | 'unmount'
                    ) => elements.push({ element, event })}
                >
                    <div id="outer">
                        <div id="inner-1" />
                        <div id="inner-2" />
                    </div>
                </IntrinsicObserver>
            </div>
        );

        assert.is(1, elements.length);
        assert.isTruthy(elements[0].element instanceof HTMLDivElement);
        assert.is('outer', elements[0].element.id);
        assert.is('mount', elements[0].event);
        assert.is(1, nodes.length);
        assert.is(elements[0].element, nodes[0].node);
        assert.is(elements[0].event, nodes[0].event);

        unmount();

        assert.is(2, elements.length);
        assert.is(elements[0].element, elements[1].element);
        assert.is('unmount', elements[1].event);
        assert.is(2, nodes.length);
        assert.is(elements[1].element, nodes[1].node);
        assert.is(elements[1].event, nodes[1].event);
    });

    test('with multiple element children', () => {
        const nodes: {
            node: Node;
            event: 'mount' | 'unmount';
        }[] = [];
        const elements: {
            element: Element;
            event: 'mount' | 'unmount';
        }[] = [];
        const unmount = mount(
            testRoot,
            <div>
                <IntrinsicObserver
                    nodeCallback={(node: Node, event: 'mount' | 'unmount') =>
                        nodes.push({ node, event })
                    }
                    elementCallback={(
                        element: Element,
                        event: 'mount' | 'unmount'
                    ) => elements.push({ element, event })}
                >
                    <div id="outer-1">
                        <div id="inner-1" />
                        <div id="inner-2" />
                    </div>
                    <div id="outer-2">
                        <div id="inner-2" />
                        <div id="inner-3" />
                    </div>
                    <div id="outer-3">
                        <div id="inner-4" />
                        <div id="inner-5" />
                    </div>
                </IntrinsicObserver>
            </div>
        );

        const ids = ['outer-1', 'outer-2', 'outer-3'];

        assert.is(3, elements.length);
        assert.is(3, nodes.length);
        elements.forEach((item, idx) => {
            assert.isTruthy(item.element instanceof HTMLDivElement);
            assert.is(ids[idx], item.element.id);
            assert.is('mount', item.event);

            assert.is(nodes[idx].node, item.element);
            assert.is(nodes[idx].event, item.event);
        });

        unmount();

        assert.is(6, elements.length);
        assert.is(6, nodes.length);
        elements.slice(3).forEach((item, idx) => {
            assert.isTruthy(item.element instanceof HTMLDivElement);
            assert.is(ids[idx], item.element.id);
            assert.is('unmount', item.event);

            assert.is(nodes[idx + 3].node, item.element);
            assert.is(nodes[idx + 3].event, item.event);
        });
    });

    test('with multiple mixed children', () => {
        const nodes: {
            node: Node;
            event: 'mount' | 'unmount';
        }[] = [];
        const elements: {
            element: Element;
            event: 'mount' | 'unmount';
        }[] = [];
        const unmount = mount(
            testRoot,
            <div>
                <IntrinsicObserver
                    nodeCallback={(node: Node, event: 'mount' | 'unmount') =>
                        nodes.push({ node, event })
                    }
                    elementCallback={(
                        element: Element,
                        event: 'mount' | 'unmount'
                    ) => elements.push({ element, event })}
                >
                    <div id="outer-1">
                        <div id="inner-1" />
                        <div id="inner-2" />
                    </div>
                    Middle text
                    <div id="outer-2">
                        <div id="inner-3" />
                        <div id="inner-4" />
                    </div>
                </IntrinsicObserver>
            </div>
        );

        assert.is(2, elements.length);
        assert.isTruthy(elements[0].element instanceof HTMLDivElement);
        assert.is('outer-1', elements[0].element.id);
        assert.is('mount', elements[0].event);
        assert.isTruthy(elements[1].element instanceof HTMLDivElement);
        assert.is('outer-2', elements[1].element.id);
        assert.is('mount', elements[1].event);

        assert.is(3, nodes.length);
        assert.isTruthy(nodes[0].node instanceof HTMLDivElement);
        assert.is('outer-1', (nodes[0].node as Element).id);
        assert.is('mount', nodes[0].event);
        assert.isTruthy(nodes[1].node instanceof Text);
        assert.is('Middle text', (nodes[1].node as Text).data);
        assert.is('mount', nodes[1].event);
        assert.isTruthy(nodes[2].node instanceof HTMLDivElement);
        assert.is('outer-2', (nodes[2].node as Element).id);
        assert.is('mount', nodes[2].event);

        unmount();

        assert.is(4, elements.length);
        assert.isTruthy(elements[2].element instanceof HTMLDivElement);
        assert.is('outer-1', elements[2].element.id);
        assert.is('unmount', elements[2].event);
        assert.isTruthy(elements[3].element instanceof HTMLDivElement);
        assert.is('outer-2', elements[3].element.id);
        assert.is('unmount', elements[3].event);

        assert.is(6, nodes.length);
        assert.isTruthy(nodes[3].node instanceof HTMLDivElement);
        assert.is('outer-1', (nodes[3].node as Element).id);
        assert.is('unmount', nodes[3].event);
        assert.isTruthy(nodes[4].node instanceof Text);
        assert.is('Middle text', (nodes[4].node as Text).data);
        assert.is('unmount', nodes[4].event);
        assert.isTruthy(nodes[5].node instanceof HTMLDivElement);
        assert.is('outer-2', (nodes[5].node as Element).id);
        assert.is('unmount', nodes[5].event);
    });

    test('with dynamic children', () => {
        const state = model({
            type: 'text',
        });
        const nodes: {
            node: Node;
            event: 'mount' | 'unmount';
        }[] = [];
        const elements: {
            element: Element;
            event: 'mount' | 'unmount';
        }[] = [];
        const unmount = mount(
            testRoot,
            <div class="container">
                <IntrinsicObserver
                    nodeCallback={(node: Node, event: 'mount' | 'unmount') =>
                        nodes.push({ node, event })
                    }
                    elementCallback={(
                        element: Element,
                        event: 'mount' | 'unmount'
                    ) => elements.push({ element, event })}
                >
                    {calc(() => {
                        switch (state.type) {
                            case 'text':
                                return 'dynamic text';
                            case 'element':
                                return <div id="dynamic-el" />;
                            default:
                                return null;
                        }
                    })}
                </IntrinsicObserver>
            </div>
        );

        assert.is(0, elements.length);
        assert.is(1, nodes.length);
        assert.isTruthy(nodes[0].node instanceof Text);
        assert.is('dynamic text', (nodes[0].node as Text).data);
        assert.is('mount', nodes[0].event);

        state.type = 'element';
        flush();

        assert.is(1, elements.length);
        assert.isTruthy(elements[0].element instanceof HTMLDivElement);
        assert.is('dynamic-el', elements[0].element.id);
        assert.is('mount', elements[0].event);

        assert.is(3, nodes.length);
        assert.isTruthy(nodes[1].node instanceof Text);
        assert.is('dynamic text', (nodes[1].node as Text).data);
        assert.is('unmount', nodes[1].event);
        assert.isTruthy(nodes[2].node instanceof HTMLDivElement);
        assert.is('dynamic-el', (nodes[2].node as Element).id);
        assert.is('mount', nodes[2].event);

        state.type = 'nothing';
        flush();

        assert.is(2, elements.length);
        assert.isTruthy(elements[1].element instanceof HTMLDivElement);
        assert.is('dynamic-el', elements[1].element.id);
        assert.is('unmount', elements[1].event);

        assert.is(4, nodes.length);
        assert.isTruthy(nodes[3].node instanceof HTMLDivElement);
        assert.is('dynamic-el', (nodes[3].node as Element).id);
        assert.is('unmount', nodes[3].event);

        state.type = 'element';
        flush();

        assert.is(3, elements.length);
        assert.isTruthy(elements[2].element instanceof HTMLDivElement);
        assert.is('dynamic-el', elements[2].element.id);
        assert.is('mount', elements[2].event);

        assert.is(5, nodes.length);
        assert.isTruthy(nodes[4].node instanceof HTMLDivElement);
        assert.is('dynamic-el', (nodes[4].node as Element).id);
        assert.is('mount', nodes[4].event);

        unmount();

        // mount, unmount, mount
        assert.is(4, elements.length);
        assert.isTruthy(elements[3].element instanceof HTMLDivElement);
        assert.is('dynamic-el', elements[3].element.id);
        assert.is('unmount', elements[3].event);

        assert.is(6, nodes.length);
        assert.isTruthy(nodes[5].node instanceof HTMLDivElement);
        assert.is('dynamic-el', (nodes[5].node as Element).id);
        assert.is('unmount', nodes[5].event);
    });

    test('with collection children', () => {
        log.setLogLevel('debug');
        const items = collection(['one', 'two', 'three']);
        const elements: {
            text: string | null;
            event: 'mount' | 'unmount';
        }[] = [];
        const unmount = mount(
            testRoot,
            <div>
                <IntrinsicObserver
                    elementCallback={(
                        element: Element,
                        event: 'mount' | 'unmount'
                    ) => {
                        elements.push({ text: element.textContent, event });
                    }}
                >
                    {items.mapView((item) => {
                        return <div id={item}>{item}</div>;
                    })}
                </IntrinsicObserver>
            </div>
        );

        assert.deepEqual(
            ['one:mount', 'two:mount', 'three:mount'],
            elements.map((item) => `${item.text}:${item.event}`)
        );

        items.push('four');
        flush();

        assert.deepEqual(
            ['one:mount', 'two:mount', 'three:mount', 'four:mount'],
            elements.map((item) => `${item.text}:${item.event}`)
        );

        items.shift();
        flush();

        assert.deepEqual(
            [
                'one:mount',
                'two:mount',
                'three:mount',
                'four:mount',
                'one:unmount',
            ],
            elements.map((item) => `${item.text}:${item.event}`)
        );

        items.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
        flush();

        // Note: no changes triggered, despite sort order changing
        assert.deepEqual(
            [
                'one:mount',
                'two:mount',
                'three:mount',
                'four:mount',
                'one:unmount',
            ],
            elements.map((item) => `${item.text}:${item.event}`)
        );

        unmount();

        assert.deepEqual(
            [
                'one:mount',
                'two:mount',
                'three:mount',
                'four:mount',
                'one:unmount',
                // Note: unmount in newly sorted (alphabetical) document order
                'four:unmount',
                'three:unmount',
                'two:unmount',
            ],
            elements.map((item) => `${item.text}:${item.event}`)
        );
    });
});

suite('rendered node reuse', () => {
    test('element cannot be rendered multiple times', () => {
        const jsx = <p>hello there</p>;
        assert.throwsMatching(/double attached/, () =>
            mount(
                testRoot,
                <div>
                    {jsx}
                    {jsx}
                </div>
            )
        );
    });

    test('a shallow element that is unmounted and then remounted holds the same element reference if retained', () => {
        const references: Element[] = [];
        const refFunc = (val: Element | undefined) => {
            if (val) references.push(val);
        };
        const state = model({ isMounted: false });
        const jsx = <p ref={refFunc}>hello, world!</p>;
        jsx.retain();
        mount(testRoot, <div>{calc(() => state.isMounted && jsx)}</div>);

        assert.deepEqual([], references);

        state.isMounted = true;
        flush();

        assert.is(1, references.length);
        references[0].setAttribute('data-magic', 'it works!');

        state.isMounted = false;
        flush();

        assert.is(1, references.length);
        assert.isFalsy(testRoot.contains(references[0]));

        state.isMounted = true;
        flush();

        assert.is(2, references.length);
        assert.is(references[0], references[1]);
        assert.isTruthy(testRoot.contains(references[0]));
        assert.is('it works!', references[1].getAttribute('data-magic'));
    });

    test('a shallow element that is unmounted and then remounted renders different element references if not retained', () => {
        const references: Element[] = [];
        const refFunc = (val: Element | undefined) => {
            if (val) references.push(val);
        };
        const state = model({ isMounted: false });
        const jsx = <p ref={refFunc}>hello, world!</p>;
        mount(testRoot, <div>{calc(() => state.isMounted && jsx)}</div>);

        assert.deepEqual([], references);

        state.isMounted = true;
        flush();

        assert.is(1, references.length);
        references[0].setAttribute('data-magic', 'it works!');

        state.isMounted = false;
        flush();

        assert.is(1, references.length);
        assert.isFalsy(testRoot.contains(references[0]));

        state.isMounted = true;
        flush();

        assert.is(2, references.length);
        assert.isNot(references[0], references[1]);
        assert.isFalsy(testRoot.contains(references[0]));
        assert.isTruthy(testRoot.contains(references[1]));
        assert.isFalsy(references[1].hasAttribute('data-magic'));
    });

    test('a deep element that is unmounted and then remounted holds the same element reference if retained', () => {
        const references: Element[] = [];
        const refFunc = (val: Element | undefined) => {
            if (val) references.push(val);
        };
        const state = model({ isMounted: false });
        const jsx = (
            <div id="outer">
                <p ref={refFunc}>
                    <strong>hello</strong>, <em>world</em>!
                </p>
            </div>
        );
        jsx.retain();
        mount(testRoot, <div>{calc(() => state.isMounted && jsx)}</div>);

        assert.deepEqual([], references);

        state.isMounted = true;
        flush();

        assert.is(1, references.length);
        references[0].setAttribute('data-magic', 'it works!');

        state.isMounted = false;
        flush();

        assert.is(1, references.length);
        assert.isFalsy(testRoot.contains(references[0]));

        state.isMounted = true;
        flush();

        assert.is(2, references.length);
        assert.is(references[0], references[1]);
        assert.isTruthy(testRoot.contains(references[0]));
        assert.is('it works!', references[1].getAttribute('data-magic'));
    });

    test('a deep element that is unmounted and then remounted holds different element references if not retained', () => {
        const references: Element[] = [];
        const refFunc = (val: Element | undefined) => {
            if (val) references.push(val);
        };
        const state = model({ isMounted: false });
        const jsx = (
            <div id="outer">
                <p ref={refFunc}>
                    <strong>hello</strong>, <em>world</em>!
                </p>
            </div>
        );
        mount(testRoot, <div>{calc(() => state.isMounted && jsx)}</div>);

        assert.deepEqual([], references);

        state.isMounted = true;
        flush();

        assert.is(1, references.length);
        references[0].setAttribute('data-magic', 'it works!');

        state.isMounted = false;
        flush();

        assert.is(1, references.length);
        assert.isFalsy(testRoot.contains(references[0]));

        state.isMounted = true;
        flush();

        assert.is(2, references.length);
        assert.isNot(references[0], references[1]);
        assert.isFalsy(testRoot.contains(references[0]));
        assert.isTruthy(testRoot.contains(references[1]));
        assert.isFalsy(references[1].hasAttribute('data-magic'));
    });

    test('reused jsx can be reparented', () => {
        const references: Element[] = [];
        const refFunc = (val: Element | undefined) => {
            if (val) references.push(val);
        };
        const state = model({ leftSide: true });
        const jsx = (
            <span ref={refFunc}>
                <strong>hello</strong>, <em>world</em>!
            </span>
        );
        jsx.retain();
        mount(
            testRoot,
            <div>
                <div id="left">
                    Left: {calc(() => (state.leftSide ? jsx : null))}
                </div>
                <div id="right">
                    Right: {calc(() => (state.leftSide ? null : jsx))}
                </div>
            </div>
        );

        assert.is(1, references.length);
        references[0].setAttribute('data-magic', 'it works!');
        assert.is(testRoot.querySelector('#left'), references[0].parentNode);

        state.leftSide = false;
        flush();

        assert.is(2, references.length);
        assert.is(references[0], references[1]);
        assert.is(testRoot.querySelector('#right'), references[0].parentNode);
        assert.is('it works!', references[1].getAttribute('data-magic'));

        state.leftSide = true;
        flush();

        assert.is(3, references.length);
        assert.is(references[1], references[2]);
        assert.is(testRoot.querySelector('#left'), references[0].parentNode);
        assert.is('it works!', references[2].getAttribute('data-magic'));
    });

    test('reused jsx can be reparented into a different mount point', () => {
        const references: Element[] = [];
        const refFunc = (val: Element | undefined) => {
            if (val) references.push(val);
        };
        const state = model({ leftSide: true });
        const jsx = (
            <span ref={refFunc}>
                <strong>hello</strong>, <em>world</em>!
            </span>
        );
        jsx.retain();
        const leftMount = document.createElement('div');
        const rightMount = document.createElement('div');

        testRoot.appendChild(leftMount);
        testRoot.appendChild(rightMount);
        mount(
            leftMount,
            <div id="left">
                Left: {calc(() => (state.leftSide ? jsx : null))}
            </div>
        );
        mount(
            rightMount,
            <div id="right">
                Right: {calc(() => (state.leftSide ? null : jsx))}
            </div>
        );

        assert.is(1, references.length);
        references[0].setAttribute('data-magic', 'it works!');
        assert.is(leftMount.querySelector('#left'), references[0].parentNode);

        state.leftSide = false;
        flush();

        assert.is(2, references.length);
        assert.is(references[0], references[1]);
        assert.is(rightMount.querySelector('#right'), references[0].parentNode);
        assert.is('it works!', references[1].getAttribute('data-magic'));

        state.leftSide = true;
        flush();

        assert.is(3, references.length);
        assert.is(references[1], references[2]);
        assert.is(leftMount.querySelector('#left'), references[0].parentNode);
        assert.is('it works!', references[2].getAttribute('data-magic'));
    });

    test('focus is not lost when reparented', () => {
        const references: HTMLButtonElement[] = [];
        const refFunc = (val: HTMLButtonElement | undefined) => {
            if (val) references.push(val);
        };
        const state = model({ leftSide: true });
        const jsx = (
            <button ref={refFunc}>
                <strong>hello</strong>, <em>world</em>!
            </button>
        );
        jsx.retain();
        const leftMount = document.createElement('div');
        const rightMount = document.createElement('div');

        testRoot.appendChild(leftMount);
        testRoot.appendChild(rightMount);
        mount(
            leftMount,
            <div id="left">
                Left: {calc(() => (state.leftSide ? jsx : null))}
            </div>
        );
        mount(
            rightMount,
            <div id="right">
                Right: {calc(() => (state.leftSide ? null : jsx))}
            </div>
        );

        const buttonEl = references[0];
        buttonEl.focus();
        assert.is(buttonEl, buttonEl.ownerDocument.activeElement);

        state.leftSide = false;
        flush();

        assert.is(buttonEl, buttonEl.ownerDocument.activeElement);

        state.leftSide = true;
        flush();

        assert.is(buttonEl, buttonEl.ownerDocument.activeElement);
    });
});

suite('error handling', () => {
    test('component error throwing while rendering throws when mounting component', () => {
        const Exploder: Component = () => {
            throw new Error('kaboom');
        };
        assert.throwsMatching(/kaboom/, () => mount(testRoot, <Exploder />));
    });

    test('component error throwing while rendering throws when mounting deeply nested component', () => {
        const Exploder: Component = () => {
            throw new Error('kaboom');
        };
        assert.throwsMatching(/kaboom/, () =>
            mount(
                testRoot,
                <div>
                    <Exploder />
                </div>
            )
        );
    });

    test('components can catch render errors', () => {
        const Exploder: Component = () => {
            throw new Error('oh no');
        };
        const ErrorHandler: Component = (props, { onError }) => {
            onError((error: Error) => {
                return (
                    <div class="target" id="error">
                        Got error: {error.message}
                    </div>
                );
            });
            return (
                <div class="target" id="normal">
                    Normal
                    <div id="inner">
                        <Exploder />
                    </div>
                </div>
            );
        };
        mount(testRoot, <ErrorHandler />);
        assert.is(
            'Got error: oh no',
            testRoot.querySelector('.target')?.textContent
        );
    });

    test('components can catch calculation render errors when children rendered', () => {
        const Exploder: Component = () => {
            throw new Error('oh no');
        };
        const state = model({
            error: true,
        });
        const ErrorHandler: Component = (props, { onError }) => {
            onError((error: Error) => {
                return (
                    <div class="target" id="error">
                        Got error: {error.message}
                    </div>
                );
            });
            return (
                <div class="target" id="normal">
                    Normal
                    <div id="inner">
                        {calc(() => state.error && <Exploder />)}
                    </div>
                </div>
            );
        };
        mount(testRoot, <ErrorHandler />);
        assert.is(
            'Got error: oh no',
            testRoot.querySelector('.target')?.textContent
        );
    });

    test('components can catch render errors when calculation children rerendered', () => {
        const Exploder: Component = () => {
            throw new Error('oh no');
        };
        const state = model({
            error: false,
        });
        const ErrorHandler: Component = (props, { onError }) => {
            onError((error: Error) => {
                return (
                    <div class="target" id="error">
                        Got error: {error.message}
                    </div>
                );
            });
            return (
                <div class="target" id="normal">
                    Normal
                    <div id="inner">
                        {calc(() => state.error && <Exploder />)}
                    </div>
                </div>
            );
        };
        mount(testRoot, <ErrorHandler />);
        assert.is('Normal', testRoot.querySelector('.target')?.textContent);
        state.error = true;
        flush();
        assert.is(
            'Got error: oh no',
            testRoot.querySelector('.target')?.textContent
        );
    });

    test('components can catch render errors when collection children rendered', () => {
        const Exploder: Component = () => {
            throw new Error('oh no');
        };
        const items = collection([0, 1, 2]);
        const ErrorHandler: Component = (props, { onError }) => {
            onError((error: Error) => {
                return (
                    <div class="target" id="error">
                        Got error: {error.message}
                    </div>
                );
            });
            return (
                <div class="target" id="normal">
                    Normal
                    <div id="inner">
                        {items.mapView((num) =>
                            num % 2 === 1 ? <Exploder /> : <div>num:${num}</div>
                        )}
                    </div>
                </div>
            );
        };
        mount(testRoot, <ErrorHandler />);
        assert.is(
            'Got error: oh no',
            testRoot.querySelector('.target')?.textContent
        );
    });

    test('components can catch render errors when collection children rendered', () => {
        const Exploder: Component = () => {
            throw new Error('oh no');
        };
        const items = collection([0, 2]);
        const ErrorHandler: Component = (props, { onError }) => {
            onError((error: Error) => {
                return (
                    <div class="target" id="error">
                        Got error: {error.message}
                    </div>
                );
            });
            return (
                <div class="target" id="normal">
                    Normal{' '}
                    <div id="inner">
                        {items.mapView((num) =>
                            num % 2 === 1 ? <Exploder /> : <div>num:{num};</div>
                        )}
                    </div>
                </div>
            );
        };
        mount(testRoot, <ErrorHandler />);
        assert.is(
            'Normal num:0;num:2;',
            testRoot.querySelector('.target')?.textContent
        );
        items.splice(1, 0, 1); // [0, 2] -> [0, 1, 2]
        flush();
        assert.is(
            'Got error: oh no',
            testRoot.querySelector('.target')?.textContent
        );
    });
});

// Type tests
// eslint-disable-next-line no-constant-condition
if (2 < 1) {
    suite('parent with no children', () => {
        const ParentWithNoChildren: Component<{}> = (_props) => <div />;

        test('typechecks with no children', () => {
            assert.isTruthy(<ParentWithNoChildren />);
        });

        test('fails when passed one or more children', () => {
            assert.isTruthy(
                // @ts-expect-error
                <ParentWithNoChildren>
                    <div />
                </ParentWithNoChildren>
            );

            assert.isTruthy(
                // @ts-expect-error
                <ParentWithNoChildren>
                    <div />
                    <div />
                </ParentWithNoChildren>
            );
        });

        test('fails when passed one or more nodes', () => {
            assert.isTruthy(
                // @ts-expect-error
                <ParentWithNoChildren>{'hi'}</ParentWithNoChildren>
            );

            assert.isTruthy(
                // @ts-expect-error
                <ParentWithNoChildren>
                    {'hi'}
                    {'hi'}
                </ParentWithNoChildren>
            );
        });
    });

    suite('parent with one child', () => {
        const ParentWithExactlyOneChild: Component<{
            children: JSX.Element;
        }> = () => <div />;
        const ParentWithOptionallyOneChild: Component<{
            children?: JSX.Element;
        }> = () => <div />;

        test('exact fails with no children', () => {
            // @ts-expect-error
            assert.isTruthy(<ParentWithExactlyOneChild />);
            assert.isTruthy(<ParentWithOptionallyOneChild />);
        });

        test('typechecks with one child', () => {
            assert.isTruthy(
                <ParentWithExactlyOneChild>
                    <div />
                </ParentWithExactlyOneChild>
            );
            assert.isTruthy(
                <ParentWithOptionallyOneChild>
                    <div />
                </ParentWithOptionallyOneChild>
            );
        });

        test('fails with multiple children', () => {
            assert.isTruthy(
                // @ts-expect-error
                <ParentWithExactlyOneChild>
                    <div />
                    <div />
                </ParentWithExactlyOneChild>
            );
            assert.isTruthy(
                // @ts-expect-error
                <ParentWithOptionallyOneChild>
                    <div />
                    <div />
                </ParentWithOptionallyOneChild>
            );
        });
    });

    suite('parent with one child node', () => {
        const ParentWithExactlyOneChild: Component<{
            children: JSX.Node;
        }> = () => <div />;
        const ParentWithOptionallyOneChild: Component<{
            children?: JSX.Node;
        }> = () => <div />;

        test('exact fails with no children', () => {
            // @ts-expect-error
            assert.isTruthy(<ParentWithExactlyOneChild />);
            assert.isTruthy(<ParentWithOptionallyOneChild />);
        });

        test('typechecks with one child', () => {
            assert.isTruthy(
                <ParentWithExactlyOneChild>{'hi'}</ParentWithExactlyOneChild>
            );
            assert.isTruthy(
                <ParentWithOptionallyOneChild>
                    {'hi'}
                </ParentWithOptionallyOneChild>
            );
        });

        test('fails with multiple children', () => {
            assert.isTruthy(
                // TODO: ts-expect-error does not work here because JSX.Node is a recursive array of JSX.Node
                <ParentWithExactlyOneChild>
                    {'hi'}
                    {'hi'}
                </ParentWithExactlyOneChild>
            );
            assert.isTruthy(
                // TODO: ts-expect-error does not work here because JSX.Node is a recursive array of JSX.Node
                <ParentWithOptionallyOneChild>
                    {'hi'}
                    {'hi'}
                </ParentWithOptionallyOneChild>
            );
        });
    });

    suite(
        'parent with zero or 2+ children (this is odd and a weird limitation of TypeScript & JSX)',
        () => {
            const ParentWithExactlyManyChild: Component<{
                children: JSX.Element[];
            }> = () => <div />;
            const ParentWithOptionallyManyChild: Component<{
                children?: JSX.Element[];
            }> = () => <div />;

            test('typechecks fails with no children', () => {
                // @ts-expect-error
                assert.isTruthy(<ParentWithExactlyManyChild />);
                assert.isTruthy(<ParentWithOptionallyManyChild />);
            });

            test('fails with one child (this is odd!)', () => {
                assert.isTruthy(
                    // @ts-expect-error
                    <ParentWithExactlyManyChild>
                        <div />
                    </ParentWithExactlyManyChild>
                );
                assert.isTruthy(
                    <ParentWithOptionallyManyChild>
                        {/* @ts-expect-error */}
                        <div />
                    </ParentWithOptionallyManyChild>
                );
            });

            test('typechecks with multiple children', () => {
                assert.isTruthy(
                    <ParentWithExactlyManyChild>
                        <div />
                        <div />
                    </ParentWithExactlyManyChild>
                );
                assert.isTruthy(
                    <ParentWithOptionallyManyChild>
                        <div />
                        <div />
                    </ParentWithOptionallyManyChild>
                );
            });
        }
    );

    suite(
        'parent with zero or 2+ children nodes (this is odd and a weird limitation of TypeScript & JSX)',
        () => {
            const ParentWithExactlyManyChild: Component<{
                children: JSX.Node[];
            }> = () => <div />;
            const ParentWithOptionallyManyChild: Component<{
                children?: JSX.Node[];
            }> = () => <div />;

            test('typechecks fails with no children', () => {
                // @ts-expect-error
                assert.isTruthy(<ParentWithExactlyManyChild />);
                assert.isTruthy(<ParentWithOptionallyManyChild />);
            });

            test('fails with one child (this is odd!)', () => {
                assert.isTruthy(
                    // @ts-expect-error
                    <ParentWithExactlyManyChild>
                        {'hi'}
                    </ParentWithExactlyManyChild>
                );
                assert.isTruthy(
                    <ParentWithOptionallyManyChild>
                        {/* @ts-expect-error */}
                        {'hi'}
                    </ParentWithOptionallyManyChild>
                );
            });

            test('typechecks with multiple children', () => {
                assert.isTruthy(
                    <ParentWithExactlyManyChild>
                        {'hi'}
                        {'hi'}
                    </ParentWithExactlyManyChild>
                );
                assert.isTruthy(
                    <ParentWithOptionallyManyChild>
                        {'hi'}
                        {'hi'}
                    </ParentWithOptionallyManyChild>
                );
            });
        }
    );

    suite('parent with any number of children', () => {
        const ParentWithOneOrMoreChildren: Component<{
            children: JSX.Element | JSX.Element[];
        }> = () => <div />;
        const ParentWithOptionallyAnyChildren: Component<{
            children?: JSX.Element | JSX.Element[];
        }> = () => <div />;

        test('typechecks fails with no children', () => {
            // @ts-expect-error
            assert.isTruthy(<ParentWithOneOrMoreChildren />);
            assert.isTruthy(<ParentWithOptionallyAnyChildren />);
        });

        test('typechecks with one child (this is odd!)', () => {
            assert.isTruthy(
                <ParentWithOneOrMoreChildren>
                    <div />
                </ParentWithOneOrMoreChildren>
            );
            assert.isTruthy(
                <ParentWithOptionallyAnyChildren>
                    <div />
                </ParentWithOptionallyAnyChildren>
            );
        });

        test('typechecks with multiple children', () => {
            assert.isTruthy(
                <ParentWithOneOrMoreChildren>
                    <div />
                    <div />
                </ParentWithOneOrMoreChildren>
            );
            assert.isTruthy(
                <ParentWithOptionallyAnyChildren>
                    <div />
                    <div />
                </ParentWithOptionallyAnyChildren>
            );
        });
    });

    suite('parent with any number of child nodes', () => {
        const ParentWithOneOrMoreChildren: Component<{
            children: JSX.Node | JSX.Node[];
        }> = () => <div />;
        const ParentWithOptionallyAnyChildren: Component<{
            children?: JSX.Node | JSX.Node[];
        }> = () => <div />;

        test('typechecks fails with no children', () => {
            // @ts-expect-error
            assert.isTruthy(<ParentWithOneOrMoreChildren />);
            assert.isTruthy(<ParentWithOptionallyAnyChildren />);
        });

        test('typechecks with one child (this is odd!)', () => {
            assert.isTruthy(
                <ParentWithOneOrMoreChildren>
                    {'hi'}
                </ParentWithOneOrMoreChildren>
            );
            assert.isTruthy(
                <ParentWithOptionallyAnyChildren>
                    {'hi'}
                </ParentWithOptionallyAnyChildren>
            );
        });

        test('typechecks with multiple children', () => {
            assert.isTruthy(
                <ParentWithOneOrMoreChildren>
                    {'hi'}
                    {'hi'}
                </ParentWithOneOrMoreChildren>
            );
            assert.isTruthy(
                <ParentWithOptionallyAnyChildren>
                    {'hi'}
                    {'hi'}
                </ParentWithOptionallyAnyChildren>
            );
        });
    });

    suite('Built-in html elements', () => {
        test('data attributes work on all element types', () => {
            assert.isTruthy(<div data-yes="cool" />);
            assert.isTruthy(<p data-x="cool" />);
        });

        test('unexpected attributes are rejected', () => {
            // @ts-expect-error
            assert.isTruthy(<div src="cool" />);
            assert.isTruthy(<script src="cool" />);
        });

        test('css properties work on all element types', () => {
            assert.isTruthy(
                <div
                    style:color={calc(() => 'red')}
                    style:display="inline-block"
                />
            );
            assert.isTruthy(<div cssprop:okay="none" />);
        });

        test('on: attributes infer correctly', () => {
            assert.isTruthy(
                <div
                    on:click={(e) => {
                        const mouseEvent: PointerEvent = e;
                        return mouseEvent;
                    }}
                    on:keydown={(e) => {
                        const keyEvent: KeyboardEvent = e;
                        return keyEvent;
                    }}
                    on:customevent={(e) => {
                        const customEvent: Event = e;
                        return customEvent;
                    }}
                />
            );
        });

        test('empty elements do not accept children', () => {
            assert.isTruthy(
                <area>
                    {/* @ts-expect-error */}
                    <div />
                </area>
            );
            assert.isTruthy(
                <base>
                    {/* @ts-expect-error */}
                    <div />
                </base>
            );
            assert.isTruthy(
                <br>
                    {/* @ts-expect-error */}
                    <div />
                </br>
            );
            assert.isTruthy(
                <col>
                    {/* @ts-expect-error */}
                    <div />
                </col>
            );
            assert.isTruthy(
                <embed>
                    {/* @ts-expect-error */}
                    <div />
                </embed>
            );
            assert.isTruthy(
                <hr>
                    {/* @ts-expect-error */}
                    <div />
                </hr>
            );
            assert.isTruthy(
                <img>
                    {/* @ts-expect-error */}
                    <div />
                </img>
            );
            assert.isTruthy(
                <input>
                    {/* @ts-expect-error */}
                    <div />
                </input>
            );
            assert.isTruthy(
                <link>
                    {/* @ts-expect-error */}
                    <div />
                </link>
            );
            assert.isTruthy(
                <meta>
                    {/* @ts-expect-error */}
                    <div />
                </meta>
            );
            assert.isTruthy(
                <param>
                    {/* @ts-expect-error */}
                    <div />
                </param>
            );
            assert.isTruthy(
                <source>
                    {/* @ts-expect-error */}
                    <div />
                </source>
            );
            assert.isTruthy(
                <track>
                    {/* @ts-expect-error */}
                    <div />
                </track>
            );
            assert.isTruthy(
                <wbr>
                    {/* @ts-expect-error */}
                    <div />
                </wbr>
            );
        });
    });

    suite('JSX.Element', () => {
        function receiveJSXElement(jsxElement: JSX.Element) {
            return true;
        }

        test('JSX.Element can only receive rendered jsx', () => {
            /* @ts-expect-error */
            assert.isFalsy(receiveJSXElement('strings'));
            /* @ts-expect-error */
            assert.isFalsy(receiveJSXElement(123));
            /* @ts-expect-error */
            assert.isFalsy(receiveJSXElement(null));
            /* @ts-expect-error */
            assert.isFalsy(receiveJSXElement(undefined));
            /* @ts-expect-error */
            assert.isFalsy(receiveJSXElement(Symbol('hi')));
            /* @ts-expect-error */
            assert.isFalsy(receiveJSXElement((a: number, b: number) => a + b));
            /* @ts-expect-error */
            assert.isFalsy(receiveJSXElement(calc(() => 'strings')));
            /* @ts-expect-error */
            assert.isFalsy(receiveJSXElement(collection(['strings'])));
            assert.isFalsy(
                receiveJSXElement(
                    /* @ts-expect-error */
                    collection(['strings']).mapView((item) => item)
                )
            );
            assert.isTruthy(receiveJSXElement(<p>exising jsx</p>));

            function Component() {
                return <p>cool</p>;
            }
            assert.isTruthy(receiveJSXElement(<Component />));

            class MyClass {
                render() {
                    return <div>nope</div>;
                }
            }
            assert.isFalsy(receiveJSXElement(<MyClass />));
        });
    });

    suite('JSX.Node', () => {
        function receiveJSXElement(jsxElement: JSX.Node) {
            return true;
        }

        test('JSX.Node can receive any valid jsx node', () => {
            assert.isTruthy(receiveJSXElement('strings'));
            assert.isTruthy(receiveJSXElement(123));
            assert.isTruthy(receiveJSXElement(null));
            assert.isTruthy(receiveJSXElement(undefined));
            assert.isTruthy(receiveJSXElement(Symbol('hi')));
            assert.isTruthy(receiveJSXElement((a: number, b: number) => a + b));
            assert.isTruthy(receiveJSXElement(<p>exising jsx</p>));
            function Component() {
                return <p>cool</p>;
            }
            assert.isTruthy(receiveJSXElement(<Component />));
        });

        test('JSX.Node cannot receive arbitrary objects', () => {
            /* @ts-expect-error */
            assert.isFalsy(receiveJSXElement({ what: 'ok' }));
        });

        test('JSX.Node can receive basic types wrapped in calculations', () => {
            assert.isTruthy(receiveJSXElement(calc(() => 'strings')));
            assert.isTruthy(receiveJSXElement(calc(() => 123)));
            assert.isTruthy(receiveJSXElement(calc(() => null)));
            assert.isTruthy(receiveJSXElement(calc(() => undefined)));
            assert.isTruthy(receiveJSXElement(calc(() => Symbol('hi'))));
            assert.isTruthy(
                receiveJSXElement(calc(() => (a: number, b: number) => a + b))
            );
            assert.isTruthy(receiveJSXElement(calc(() => <p>exising jsx</p>)));
            function Component() {
                return <p>cool</p>;
            }
            assert.isTruthy(receiveJSXElement(calc(() => <Component />)));
        });

        test('JSX.Node can receive basic types wrapped in collections', () => {
            assert.isTruthy(receiveJSXElement(collection(['strings'])));
            assert.isTruthy(receiveJSXElement(collection([123])));
            assert.isTruthy(receiveJSXElement(collection([null])));
            assert.isTruthy(receiveJSXElement(collection([undefined])));
            assert.isTruthy(receiveJSXElement(collection([Symbol('hi')])));
            assert.isTruthy(
                receiveJSXElement(collection([(a: number, b: number) => a + b]))
            );
            assert.isTruthy(
                receiveJSXElement(collection([<p>exising jsx</p>]))
            );
            function Component() {
                return <p>cool</p>;
            }
            assert.isTruthy(receiveJSXElement(collection([<Component />])));
        });

        test('JSX.Node can receive basic types wrapped in views', () => {
            assert.isTruthy(
                receiveJSXElement(
                    collection(['strings']).mapView((item) => item)
                )
            );
            assert.isTruthy(
                receiveJSXElement(collection([123]).mapView((item) => item))
            );
            assert.isTruthy(
                receiveJSXElement(collection([null]).mapView((item) => item))
            );
            assert.isTruthy(
                receiveJSXElement(
                    collection([undefined]).mapView((item) => item)
                )
            );
            assert.isTruthy(
                receiveJSXElement(
                    collection([Symbol('hi')]).mapView((item) => item)
                )
            );
            assert.isTruthy(
                receiveJSXElement(
                    collection([(a: number, b: number) => a + b]).mapView(
                        (item) => item
                    )
                )
            );
            assert.isTruthy(
                receiveJSXElement(
                    collection([<p>exising jsx</p>]).mapView((item) => item)
                )
            );
            function Component() {
                return <p>cool</p>;
            }
            assert.isTruthy(
                receiveJSXElement(
                    collection([<Component />]).mapView((item) => item)
                )
            );
        });
    });

    test('event target passed as second parameter', () => {
        const divHandler = (event: MouseEvent, div: HTMLDivElement) => {
            return false;
        };

        const goodJSx = <div on:click={divHandler} />;
        assert.isTruthy(goodJSx);

        // @ts-expect-error
        const badJSX = <button on:click={divHandler} />;
        assert.isTruthy(badJSX);
    });

    test('keyof JSX.IntrinsicElement can be used as element', () => {
        const makeThing = (): keyof JSX.IntrinsicElements => 'div';
        const El = makeThing();
        const jsx = <El />;
        assert.isTruthy(jsx);
    });

    test('invalid props on elements are detected', () => {
        // @ts-expect-error
        const jsx = <div badprop />;
        assert.isTruthy(jsx);
    });

    test('attributes can accept fields with a subset of types', () => {
        // tabindex is string | number | undefined
        const numberCalc = calc<number>(() => 3);
        const maybeNumberCalc = calc<number | undefined>(() => 3);
        const stringCalc = calc<string>(() => 'a');
        const maybeStringCalc = calc<string | undefined>(() => 'a');
        const maybeStringNumberCalc = calc<string | number | undefined>(
            () => 'a'
        );

        const objectStringNumberUndefinedCalc = calc<
            string | { foo: string } | number | undefined
        >(() => 'a');
        const objectCalc = calc<{ foo: string }>(() => ({ foo: 'hi' }));

        const a = <div tabindex={numberCalc} />;
        const b = <div tabindex={maybeNumberCalc} />;
        const c = <div tabindex={stringCalc} />;
        const d = <div tabindex={maybeStringCalc} />;
        const e = <div tabindex={maybeStringNumberCalc} />;

        // @ts-expect-error
        const f = <div tabindex={objectStringNumberUndefinedCalc} />;
        // @ts-expect-error
        const g = <div tabindex={objectCalc} />;

        assert.isTruthy([a, b, c, d, e, f, g]);
    });

    test('attributes can accept fields with a subset of types', () => {
        // tabindex is string | number | undefined
        const numberField = field<number>(3);
        const maybeNumberField = field<number | undefined>(3);
        const stringField = field<string>('a');
        const maybeStringField = field<string | undefined>('a');
        const maybeStringNumberField = field<string | number | undefined>('a');

        const objectStringNumberUndefinedField = field<
            string | { foo: string } | number | undefined
        >('a');
        const objectField = field<{ foo: string }>({ foo: 'a' });

        const a = <div tabindex={numberField} />;
        const b = <div tabindex={maybeNumberField} />;
        const c = <div tabindex={stringField} />;
        const d = <div tabindex={maybeStringField} />;
        const e = <div tabindex={maybeStringNumberField} />;

        // @ts-expect-error
        const f = <div tabindex={objectStringNumberUndefinedField} />;
        // @ts-expect-error
        const g = <div tabindex={objectField} />;

        assert.isTruthy([a, b, c, d, e, f, g]);
    });

    test('ref callback infers element correctly', () => {
        function assertIsNever(val: never): never {
            throw new Error('Ruh roh');
        }
        <div
            ref={(el) => {
                if (el && !(el instanceof HTMLDivElement)) {
                    assertIsNever(el);
                }
            }}
        />;
    });

    test('ref prop value not accepted by different kind of element', () => {
        const divRef = ref<HTMLDivElement>();
        <div ref={divRef} />;
        // @ts-expect-error
        <span ref={divRef} />;
    });

    test('ref constructor can build a specialized ref', () => {
        const r: Ref<string | undefined> = ref();
        assert.isTruthy(r);
    });

    test('unspecified custom elements have "any" props', () => {
        <my-custom-element />;
        <my-custom-element name="foo" />;
        <my-custom-element name={{ yeehaw: true }} />;
        <my-custom-element>
            <div>children</div>
        </my-custom-element>;
    });
}

// More type tests
declare module './index' {
    interface CustomElements {
        'my-interface-merged-custom-element': {
            name: Dyn<string>;
            children: JSX.Element;
        };
    }
}

// eslint-disable-next-line no-constant-condition
if (2 < 1) {
    // Note: the test below requires the merged declaration above
    test('custom elements may be specified by providing an interface to CustomElements', () => {
        <my-interface-merged-custom-element name="yes">
            <div>One child</div>
        </my-interface-merged-custom-element>;

        // @ts-expect-error
        <my-interface-merged-custom-element />;

        // @ts-expect-error
        <my-interface-merged-custom-element name="yes" />;

        // @ts-expect-error
        <my-interface-merged-custom-element>
            <div>Exactly one child</div>
        </my-interface-merged-custom-element>;

        // @ts-expect-error
        <my-interface-merged-custom-element name="yes">
            <div>Exactly one child</div>
            <div>Exactly one child</div>
        </my-interface-merged-custom-element>;
    });
}

suite('automatic memory management', () => {
    test('component with calculation leaves empty graph', () => {
        const Item: Component<{ name: string }> = ({ name }, { onMount }) => {
            const state = model(
                {
                    mountCount: 0,
                    count: 0,
                },
                'item:state'
            );
            onMount(() => {
                state.mountCount += 1;
            });
            return (
                <div>
                    <button
                        on:click={() => {
                            state.count += 1;
                        }}
                    >
                        Increment
                    </button>
                    <div
                        data-mount-count={calc(
                            () => state.mountCount.toString(),
                            'data-mount-count'
                        )}
                    >
                        {name}: {calc(() => state.count, 'click-count')}
                    </div>
                </div>
            );
        };
        const unmount = mount(
            testRoot,
            <div>
                <Item name="cool" />
            </div>
        );
        assert.is(
            '1',
            testRoot
                .querySelector('[data-mount-count]')
                ?.getAttribute('data-mount-count')
        );
        assert.is(
            'cool: 0',
            testRoot.querySelector('[data-mount-count]')?.textContent
        );
        testRoot
            .querySelector('button')
            ?.dispatchEvent(new MouseEvent('click'));
        flush();
        assert.is(
            '1',
            testRoot
                .querySelector('[data-mount-count]')
                ?.getAttribute('data-mount-count')
        );
        assert.is(
            'cool: 1',
            testRoot.querySelector('[data-mount-count]')?.textContent
        );
        testRoot
            .querySelector('button')
            ?.dispatchEvent(new MouseEvent('click'));
        flush();
        assert.is(
            '1',
            testRoot
                .querySelector('[data-mount-count]')
                ?.getAttribute('data-mount-count')
        );
        assert.is(
            'cool: 2',
            testRoot.querySelector('[data-mount-count]')?.textContent
        );
        testRoot
            .querySelector('button')
            ?.dispatchEvent(new MouseEvent('click'));
        flush();
        assert.is(
            '1',
            testRoot
                .querySelector('[data-mount-count]')
                ?.getAttribute('data-mount-count')
        );
        assert.is(
            'cool: 3',
            testRoot.querySelector('[data-mount-count]')?.textContent
        );
        unmount();

        assert.deepEqual([], debugGetGraph().vertices);
    });

    test('component with mapView leaves empty graph', () => {
        const items = collection(['foo', 'bar', 'baz']);
        const Item: Component<{ name: string }> = ({ name }) => <li>{name}</li>;
        const Items: Component<{}> = () => (
            <ul>
                {items.mapView((item) => (
                    <Item name={item} />
                ))}
            </ul>
        );
        const unmount = mount(testRoot, <Items />);
        flush();
        items.push('bum');
        flush();
        unmount();

        assert.deepEqual([], debugGetGraph().vertices);
    });
});

suite('bugs', () => {
    test('event handler that re-renders attribute does not re-render twice', () => {
        const state = model({
            switch: false,
        });
        mount(
            testRoot,
            <div
                id="test"
                data-one={calc(() => (state.switch ? 'on' : 'off'))}
                data-two={calc(() => (state.switch ? 'yes' : 'no'))}
                on:click={() => {
                    state.switch = !state.switch;
                }}
            >
                {calc(() => (state.switch ? <div>on</div> : <div>off</div>))}
            </div>
        );
        testRoot.querySelector('#test')?.dispatchEvent(new MouseEvent('click'));
        flush();
        testRoot.querySelector('#test')?.dispatchEvent(new MouseEvent('click'));
        flush();
    });

    test('event that triggers rerender on other element on refocus does not cause an infinite loop (note: requires window to be focused!)', () => {
        let numRenders = 0;
        let numFocuses = 0;
        const state = field({ numFocuses });
        const buttonRef = ref<HTMLButtonElement>();
        mount(
            testRoot,
            <div>
                <div class="p-lg">
                    <h1>Beepsheet</h1>
                </div>
                <hr />
                {calc(() => {
                    numRenders += 1;
                    return (
                        <div>
                            Value: {state.get().numFocuses} / {numRenders}
                        </div>
                    );
                })}
                <hr />
                <div class="adjacent">
                    <button
                        class="button"
                        ref={buttonRef}
                        on:focus={() => {
                            numFocuses += 1;
                            if (numFocuses < 10) {
                                state.set({ numFocuses });
                            }
                        }}
                    >
                        Click me
                    </button>
                </div>
            </div>
        );
        assert.is(1, numRenders);
        buttonRef.current?.focus();
        flush();
        assert.is(2, numRenders);
    });
});

let uniqueid = 0;
const makeUniqueTagname = (name: string): `${string}-${string}` =>
    `${name}-${uniqueid++}`;

suite('custom elements', () => {
    test('a non-shadow custom element renders contents as expected via createElement', () => {
        const tagName = makeUniqueTagname('custom-non-shadow');
        const val = field('After');
        defineCustomElement({
            tagName,
            observedAttributes: [],
            Component: ({ children }) => {
                return (
                    <>
                        <div>Before</div>
                        {children}
                        <div>{calc(() => val)}</div>
                    </>
                );
            },
        });
        const el = document.createElement(tagName);
        el.appendChild(document.createTextNode('Middle1'));
        el.appendChild(document.createTextNode('Middle2'));
        testRoot.appendChild(el);
        flush();
        assert.is(el.textContent, 'BeforeMiddle1Middle2After');
        val.set('Updated');
        flush();
        assert.is(el.textContent, 'BeforeMiddle1Middle2Updated');
        testRoot.removeChild(el);
        flush();
        assert.is(el.textContent, 'BeforeMiddle1Middle2Updated');
    });

    test('a non-shadow custom element renders contents as expected via innerHTML', () => {
        const tagName = makeUniqueTagname('custom-non-shadow');
        const val = field('After');
        defineCustomElement({
            tagName,
            observedAttributes: [],
            Component: ({ children }) => {
                return (
                    <>
                        <div>Before</div>
                        {children}
                        <div>{calc(() => val)}</div>
                    </>
                );
            },
        });
        testRoot.innerHTML = `<${tagName}>Middle1Middle2</${tagName}>`;
        const el = testRoot.childNodes[0];
        flush();
        assert.is(el.textContent, 'BeforeMiddle1Middle2After');
        val.set('Updated');
        flush();
        assert.is(el.textContent, 'BeforeMiddle1Middle2Updated');
        testRoot.removeChild(el);
        flush();
        assert.is(el.textContent, 'BeforeMiddle1Middle2Updated');
    });

    test('a non-shadow custom element renders contents as expected via jsx', () => {
        const tagName = makeUniqueTagname('custom-non-shadow');
        const val = field('After');
        defineCustomElement({
            tagName,
            observedAttributes: [],
            Component: ({ children }) => {
                return (
                    <>
                        <div>Before</div>
                        {children}
                        <div>{calc(() => val)}</div>
                    </>
                );
            },
        });
        const TagName: string = tagName;
        const elRef = ref<HTMLElement | undefined>();
        mount(testRoot, <TagName ref={elRef}>Middle1Middle2</TagName>);
        flush();
        const el = elRef.current as HTMLElement;
        assert.is(el.textContent, 'BeforeMiddle1Middle2After');
        val.set('Updated');
        flush();
        assert.is(el.textContent, 'BeforeMiddle1Middle2Updated');
        testRoot.removeChild(el);
        flush();
        assert.is(el.textContent, 'BeforeMiddle1Middle2Updated');
    });

    test('a non-shadow custom element can be rendered as jsx', () => {
        const tagName = makeUniqueTagname('custom-non-shadow');
        const val = field('After');
        defineCustomElement({
            tagName,
            observedAttributes: [],
            Component: ({ children }) => {
                return (
                    <>
                        <div>Before</div>
                        {children}
                        <div>{calc(() => val)}</div>
                    </>
                );
            },
        });
        const TagName: string = tagName;
        mount(
            testRoot,
            <>
                <TagName>
                    <div>Foo</div>
                    <div>Bar</div>
                </TagName>
            </>
        );
        flush();
        assert.is(testRoot.textContent, 'BeforeFooBarAfter');
        val.set('Updated');
        flush();
        assert.is(testRoot.textContent, 'BeforeFooBarUpdated');
    });

    test('a non-shadow custom element can observe attributes', () => {
        const tagName = makeUniqueTagname('custom-non-shadow');

        defineCustomElement({
            tagName,
            observedAttributes: ['name'],
            Component: ({ name, children }) => {
                return <>Hello, {calc(() => dynGet(name) ?? 'world')}</>;
            },
        });
        testRoot.innerHTML = `<div>1: <${tagName}></${tagName}></div>
<div>2: <${tagName} name="human" id="updateable"></${tagName}>`;
        flush();
        assert.is(testRoot.textContent, '1: Hello, world\n2: Hello, human');
        testRoot.querySelector(tagName)?.setAttribute('name', 'first');
        testRoot.querySelector('#updateable')?.setAttribute('name', 'second');
        flush();
        assert.is(testRoot.textContent, '1: Hello, first\n2: Hello, second');
        testRoot.querySelector(tagName)?.removeAttribute('name');
        testRoot.querySelector('#updateable')?.removeAttribute('name');
        flush();
        assert.is(testRoot.textContent, '1: Hello, world\n2: Hello, world');
    });

    test('an open shadow custom element renders to the shadow dom', () => {
        const tagName = makeUniqueTagname('custom-shadow');

        defineCustomElement({
            tagName,
            observedAttributes: ['name'],
            shadowMode: 'open',
            Component: ({ name }) => {
                return (
                    <>
                        <div>One {name}</div>
                        <slot name="one" />
                        <div>Two</div>
                        <slot name="two" />
                        <div>Three</div>
                        <slot id="empty-slot" />
                        <div>Four</div>
                    </>
                );
            },
        });
        testRoot.innerHTML = `<${tagName} name="foo"><span slot="two">Goodbye</span><span>Other stuff</span><span slot="one">Hello</span></${tagName}>`;
        flush();
        assert.is(
            'One fooTwoThreeFour',
            testRoot.querySelector(tagName)?.shadowRoot?.textContent
        );
        testRoot.querySelector(tagName)?.setAttribute('name', 'hooray');
        flush();
        assert.is(
            'One hoorayTwoThreeFour',
            testRoot.querySelector(tagName)?.shadowRoot?.textContent
        );
        assert.is(
            'Hello',
            (
                testRoot
                    .querySelector(tagName)
                    ?.shadowRoot?.querySelector(
                        'slot[name="one"]'
                    ) as HTMLSlotElement
            ).assignedNodes()[0].textContent
        );
        assert.is(
            'Goodbye',
            (
                testRoot
                    .querySelector(tagName)
                    ?.shadowRoot?.querySelector(
                        'slot[name="two"]'
                    ) as HTMLSlotElement
            ).assignedNodes()[0].textContent
        );
        assert.is(
            'Other stuff',
            (
                testRoot
                    .querySelector(tagName)
                    ?.shadowRoot?.querySelector(
                        'slot#empty-slot'
                    ) as HTMLSlotElement
            ).assignedNodes()[0].textContent
        );
    });

    test('a closed shadow custom element renders to the shadow dom, but users do not have access', () => {
        const tagName = makeUniqueTagname('custom-shadow');

        defineCustomElement({
            tagName,
            observedAttributes: ['name'],
            shadowMode: 'closed',
            Component: ({ name }) => {
                return (
                    <>
                        <div>One {name}</div>
                        <slot name="one" />
                        <div>Two</div>
                        <slot name="two" />
                        <div>Three</div>
                        <slot id="empty-slot" />
                        <div>Four</div>
                    </>
                );
            },
        });
        testRoot.innerHTML = `
            <${tagName} name="foo"><span slot="two">Goodbye</span><span>Other stuff</span><span slot="one">Hello</span></${tagName}>
            <div name="foo"><span slot="two">Goodbye</span><span>Other stuff</span><span slot="one">Hello</span></div>
        `;
        flush();
        assert.is(null, testRoot.querySelector(tagName)?.shadowRoot);
        const shadowMeasured = testRoot
            .querySelector(tagName)!
            .getBoundingClientRect();
        const normalMeasured = testRoot
            .querySelector('div')!
            .getBoundingClientRect();

        // We cannot directly query the presence of the shadow dom, but we can
        // assume that the height of the normal element, which renders in a
        // single line, is equal to the height of the rendered-as-a-shadow
        // element, which renders in 7 lines
        // Note: we use ABS(diff) < 0.1 to account for subtle precision differences (firefox is not exact in this regard)
        assert.lessThan(
            Math.abs(normalMeasured.height * 7 - shadowMeasured.height),
            0.1
        );
    });

    test('a customized built-in element renders as expected (NOTE: fails in safari, see https://bugs.webkit.org/show_bug.cgi?id=182671)', () => {
        const tagName = makeUniqueTagname('custom-builtin');

        defineCustomElement({
            tagName,
            observedAttributes: ['name'],
            extends: 'button',
            Component: ({ name, children }) => {
                return (
                    <>
                        Hello {name} this is {children}
                    </>
                );
            },
        });
        mount(
            testRoot,
            <button is={tagName} name="cool">
                nice
            </button>
        );
        flush();
        assert.is('Hello cool this is nice', testRoot.textContent);
    });

    test('a non-shadow custom element can add event handlers', () => {
        const tagName = makeUniqueTagname('custom-non-shadow');
        const clicks = field(0);
        defineCustomElement({
            tagName,
            observedAttributes: [],
            Component: ({ children }, { addEventListener }) => {
                addEventListener('click', () => {
                    clicks.set(clicks.get() + 1);
                });
                return (
                    <div id="component-main">
                        <div id="component-inner-1">component-inner-1</div>
                        {children}
                        <div id="component-inner-2">component-inner-2</div>
                    </div>
                );
            },
        });
        const TagName: string = tagName;
        mount(
            testRoot,
            <>
                <fieldset>
                    <legend>Component</legend>
                    <TagName>
                        <div id="host-child-1">host-child-1</div>
                        <div id="host-child-2">host-child-2</div>
                    </TagName>
                </fieldset>
                <fieldset>
                    <legend>Diagnostics</legend>
                    <button on:click={() => clicks.set(clicks.get() + 1)}>
                        Click
                    </button>
                    <p>{clicks} clicks</p>
                </fieldset>
            </>
        );
        assert.is(0, clicks.get());
        testRoot.querySelector(tagName)?.dispatchEvent(new MouseEvent('click'));
        flush();
        assert.is(1, clicks.get());
    });

    test('a shadow custom element can add event handlers', () => {
        const tagName = makeUniqueTagname('custom-non-shadow');
        const clicks = field(0);
        defineCustomElement({
            tagName,
            observedAttributes: [],
            shadowMode: 'closed',
            Component: (props, { addEventListener }) => {
                addEventListener('click', () => {
                    clicks.set(clicks.get() + 1);
                });
                return (
                    <div id="component-main">
                        <div id="component-inner-1">component-inner-1</div>
                        <slot />
                        <div id="component-inner-2">component-inner-2</div>
                    </div>
                );
            },
        });
        const TagName: string = tagName;
        mount(
            testRoot,
            <>
                <fieldset>
                    <legend>Component</legend>
                    <TagName>
                        <div id="host-child-1">host-child-1</div>
                        <div id="host-child-2">host-child-2</div>
                    </TagName>
                </fieldset>
                <fieldset>
                    <legend>Diagnostics</legend>
                    <button on:click={() => clicks.set(clicks.get() + 1)}>
                        Click
                    </button>
                    <p>{clicks} clicks</p>
                </fieldset>
            </>
        );
        assert.is(0, clicks.get());
        testRoot
            .querySelector(tagName)
            ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        flush();
        assert.is(1, clicks.get());
        testRoot
            .querySelector('#host-child-1')
            ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        flush();
        assert.is(2, clicks.get());
    });

    test('a custom element can bind form values', () => {
        const tagName = makeUniqueTagname('my-custom');
        defineCustomElement({
            tagName,
            observedAttributes: [],
            formAssociated: true,
            delegatesFocus: true,
            shadowMode: 'closed',
            Component: (props, { addEventListener, bindFormValue }) => {
                const label = field('hello');
                bindFormValue(label);
                addEventListener('click', () => {
                    label.set('goodbye');
                    flush();
                });
                return (
                    <div>
                        <div
                            tabindex={0}
                            style="width: 100px; height: 100px; background-color: green"
                        />
                        {label}
                    </div>
                );
            },
        });
        const TagName: string = tagName;
        const formRef = ref<HTMLFormElement | undefined>(undefined);
        mount(
            testRoot,
            <>
                <fieldset>
                    <legend>Component</legend>
                    <form ref={formRef}>
                        <TagName name="cool" />
                        <button>submit</button>
                    </form>
                </fieldset>
            </>
        );
        flush();
        assert.is('hello', new FormData(formRef.current!).get('cool'));
        testRoot.querySelector(tagName)?.dispatchEvent(new MouseEvent('click'));
        flush();
        assert.is('goodbye', new FormData(formRef.current!).get('cool'));
    });

    test('custom shadow components hydrated from HTML may contain a <template> wrapper which is erased when rendering the contents of the element', () => {
        const tagName = makeUniqueTagname('my-custom');
        testRoot.innerHTML = `
<p id="without-template">
	Before-text
	<${tagName}>
		<div slot="foo">slot-foo</div>
		<div slot="bar">slot-bar</div>
	</${tagName}>
	After-text
</p><p id="with-template">
	Before-text
	<${tagName}>
        <template>
            <div slot="foo">slot-foo</div>
            <div slot="bar">slot-bar</div>
        </template>
    </${tagName}>
	After-text
</p>
`.trim();
        defineCustomElement({
            tagName,
            shadowMode: 'open',
            Component: () => {
                return (
                    <>
                        <style>{`
:host { display: block; padding: 16px; background-color: #ddd; }
.grid { grid-template-columns: max-content 1fr; gap: 4px; }
`}</style>
                        <div class="grid">
                            <span>foo is</span>
                            <span>
                                <slot name="foo" />
                            </span>
                            <span>bar is</span>
                            <span>
                                <slot name="bar" />
                            </span>
                            <span>rest is</span>
                            <span>
                                <slot />
                            </span>
                        </div>
                    </>
                );
            },
        });
        flush();

        /*
         * The following assertions confirm the surprising html5 rules that parsing the above html for
         *     <p id="without-template">
         *         Before-text
         *         <custom-shadow-element>
         *             <div slot="foo">slot-foo</div>
         *             <div slot="bar">slot-bar</div>
         *         </custom-shadow-element>
         *         After-text
         *     </p>
         *
         * Results in the DOM tree:
         * - P#without-template
         *   - Text: Before-text
         * - DIV[slot="foo"]
         *   - Text: slot-foo
         * - DIV[slot="foo"]
         *   - Text: slot-bar
         * - Text: After text
         * - P (empty, no children)
         *
         * This is because <p> elements cannot have child <div> elements when being constructed via parsing html.
         */
        assert.is(
            'Before-text',
            document.getElementById('without-template')?.textContent?.trim()
        );
        assert.is(
            'DIV',
            document.getElementById('without-template')?.nextElementSibling
                ?.tagName
        );
        assert.is(
            'slot-foo',
            document.getElementById('without-template')?.nextElementSibling
                ?.textContent
        );
        assert.is(
            'DIV',
            document.getElementById('without-template')?.nextElementSibling
                ?.nextElementSibling?.tagName
        );
        assert.is(
            'slot-bar',
            document.getElementById('without-template')?.nextElementSibling
                ?.nextElementSibling?.textContent
        );
        assert.is(
            'P',
            document.getElementById('without-template')?.nextElementSibling
                ?.nextElementSibling?.nextElementSibling?.tagName
        );
        assert.is(
            'After-text',
            (
                document.getElementById('without-template')?.nextElementSibling
                    ?.nextElementSibling?.nextElementSibling
                    ?.previousSibling as Text
            ).data.trim()
        );

        const withTemplateP = document.getElementById('with-template');
        assert.is(
            '<WS>Before-text<WS>slot-foo<WS>slot-bar<WS>After-text<WS>',
            withTemplateP?.textContent?.replace(/\s+/g, '<WS>')
        );
        assert.is(
            'Before-text',
            (withTemplateP?.childNodes[0] as Text)?.data?.trim()
        );
        assert.is(
            tagName.toUpperCase(),
            (withTemplateP?.childNodes[1] as Element)?.tagName
        );
        const renderedComponent = withTemplateP?.childNodes[1] as HTMLElement;
        assert.is('DIV', renderedComponent.children[0].tagName);
        assert.is('foo', renderedComponent.children[0].getAttribute('slot'));
        assert.is('DIV', renderedComponent.children[1].tagName);
        assert.is('bar', renderedComponent.children[1].getAttribute('slot'));
        assert.is(
            'After-text',
            (withTemplateP?.childNodes[2] as Text)?.data?.trim()
        );
    });

    test('custom non-shadow components hydrated from HTML may contain a <template> wrapper which is erased when rendering the contents of the element', () => {
        const tagName = makeUniqueTagname('custom-non-shadow');
        testRoot.innerHTML = `
<p id="without-template">
	Before-text
	<${tagName}>
        <div>host-child-1</div>
        <div>host-child-2</div>
    </${tagName}>
	After-text
</p><p id="with-template">
	Before-text
	<${tagName}>
        <template>
            <div>host-child-1</div>
            <div>host-child-2</div>
        </template>
    </${tagName}>
	After-text
</p>
`.trim();
        defineCustomElement({
            tagName,
            Component: ({ children }) => {
                return (
                    <>
                        <div>inner-child-1</div>
                        {children}
                        <div>inner-child-2</div>
                    </>
                );
            },
        });
        flush();

        /*
         * The following assertions confirm the surprising html5 rules that parsing the above html for
         *     <p id="without-template">
         *         Before-text
         *         <custom-nonshadow-element>
         *             <div>host-child-1</div>
         *             <div>host-child-2</div>
         *         </custom-nonshadow-element>
         *         After-text
         *     </p>
         *
         * Results in the DOM tree:
         * - P#without-template
         *   - Text: Before-text
         * - DIV
         *   - Text: host-child-1
         * - DIV
         *   - Text: host-child-2
         * - Text: After text
         * - P (empty, no children)
         *
         * So when the custom element is rendered, it has no children, so the rendered DOM tree becomes:
         * - P#without-template
         *   - Text: Before-text
         *   - DIV
         *     - Text: inner-child-1
         *   - DIV
         *     - Text: inner-child-2
         * - DIV
         *   - Text: host-child-1
         * - DIV
         *   - Text: host-child-2
         * - Text: After text
         * - P (empty, no children)
         *
         * This is because <p> elements cannot have child <div> elements when being constructed via parsing html.
         */
        assert.is(
            'Before-text',
            (
                document.getElementById('without-template')
                    ?.childNodes[0] as Text
            )?.data?.trim()
        );
        assert.is(
            tagName.toUpperCase(),
            (
                document.getElementById('without-template')
                    ?.childNodes[1] as HTMLElement
            )?.tagName
        );
        assert.is(
            '<div>inner-child-1</div>',
            (
                document.getElementById('without-template')
                    ?.childNodes[1] as HTMLElement
            )?.children[0]?.outerHTML
        );
        assert.is(
            '<div>inner-child-2</div>',
            (
                document.getElementById('without-template')
                    ?.childNodes[1] as HTMLElement
            )?.children[1]?.outerHTML
        );
        assert.is(
            'DIV',
            document.getElementById('without-template')?.nextElementSibling
                ?.tagName
        );
        assert.is(
            'host-child-1',
            document.getElementById('without-template')?.nextElementSibling
                ?.textContent
        );
        assert.is(
            'DIV',
            document.getElementById('without-template')?.nextElementSibling
                ?.nextElementSibling?.tagName
        );
        assert.is(
            'host-child-2',
            document.getElementById('without-template')?.nextElementSibling
                ?.nextElementSibling?.textContent
        );
        assert.is(
            'P',
            document.getElementById('without-template')?.nextElementSibling
                ?.nextElementSibling?.nextElementSibling?.tagName
        );
        assert.is(
            'After-text',
            (
                document.getElementById('without-template')?.nextElementSibling
                    ?.nextElementSibling?.nextElementSibling
                    ?.previousSibling as Text
            ).data.trim()
        );

        // Ok! now to test the "fixed" version
        const withTemplateP = document.getElementById('with-template');
        assert.is(
            '<WS>Before-text<WS>inner-child-1<WS>host-child-1<WS>host-child-2<WS>inner-child-2<WS>After-text<WS>',
            withTemplateP?.textContent?.replace(/\s+/g, '<WS>')
        );
        assert.is(
            'Before-text',
            (withTemplateP?.childNodes[0] as Text)?.data?.trim()
        );
        assert.is(
            tagName.toUpperCase(),
            (withTemplateP?.childNodes[1] as Element)?.tagName
        );
        const renderedComponent = withTemplateP?.childNodes[1] as HTMLElement;
        assert.is('inner-child-1', renderedComponent.children[0].textContent);
        assert.is('host-child-1', renderedComponent.children[1].textContent);
        assert.is('host-child-2', renderedComponent.children[2].textContent);
        assert.is('inner-child-2', renderedComponent.children[3].textContent);
        assert.is(
            'After-text',
            (withTemplateP?.childNodes[2] as Text)?.data?.trim()
        );
    });

    test('custom components can opt out of <template> hydration with a boolean flag', () => {
        const tagName = makeUniqueTagname('my-custom');
        testRoot.innerHTML = `
<p id="with-template">
	Before-text
	<${tagName}>
        <template>
            <div slot="foo">slot-foo</div>
            <div slot="bar">slot-bar</div>
        </template>
    </${tagName}>
	After-text
</p>
`.trim();
        defineCustomElement({
            tagName,
            shadowMode: 'open',
            hydrateTemplateChild: false,
            Component: () => {
                return (
                    <>
                        <style>{`
:host { display: block; padding: 16px; background-color: #ddd; }
.grid { grid-template-columns: max-content 1fr; gap: 4px; }
`}</style>
                        <div class="grid">
                            <span>foo is</span>
                            <span>
                                <slot name="foo" />
                            </span>
                            <span>bar is</span>
                            <span>
                                <slot name="bar" />
                            </span>
                            <span>rest is</span>
                            <span>
                                <slot />
                            </span>
                        </div>
                    </>
                );
            },
        });
        flush();

        const withTemplateP = document.getElementById('with-template');
        assert.is(
            tagName.toUpperCase(),
            (withTemplateP?.childNodes[1] as Element)?.tagName
        );
        const renderedComponent = withTemplateP?.childNodes[1] as HTMLElement;
        assert.is('TEMPLATE', renderedComponent.children[0].tagName);
    });

    test('custom elements can be retained, unmounted, and remounted', () => {
        const tagName = makeUniqueTagname('my-custom');
        const log: string[] = [];

        defineCustomElement({
            tagName,
            Component: ({ children }, { onMount, onUnmount, onDestroy }) => {
                log.push('render');
                onMount(() => {
                    log.push('onMount');
                });
                onUnmount(() => {
                    log.push('onUnmount');
                });
                onDestroy(() => {
                    log.push('onDestroy');
                });
                return (
                    <>
                        Before
                        <div class="children">{children}</div>
                        After
                    </>
                );
            },
        });
        const span = document.createElement('span');
        span.innerHTML = `<${tagName}>
                <div class="child-one">child-one</div>
                <div class="child-two">child-two</div>
        </${tagName}>`;

        flush();

        assert.is(
            '<WS>child-one<WS>child-two<WS>',
            span.textContent?.replace(/\s+/g, '<WS>')
        );
        assert.deepEqual([], log);

        (span.childNodes[0] as any).retain();
        flush();

        assert.is(
            'Before<WS>child-one<WS>child-two<WS>After',
            span.textContent?.replace(/\s+/g, '<WS>')
        );
        assert.deepEqual(['render'], log);

        testRoot.appendChild(span);
        flush();

        assert.deepEqual(['render', 'onMount'], log);

        testRoot.removeChild(span);
        flush();

        assert.deepEqual(['render', 'onMount', 'onUnmount'], log);

        testRoot.appendChild(span);
        flush();

        assert.deepEqual(['render', 'onMount', 'onUnmount', 'onMount'], log);

        testRoot.removeChild(span);
        flush();

        assert.deepEqual(
            ['render', 'onMount', 'onUnmount', 'onMount', 'onUnmount'],
            log
        );

        (span.childNodes[0] as any).release();
        flush();

        assert.deepEqual(
            [
                'render',
                'onMount',
                'onUnmount',
                'onMount',
                'onUnmount',
                'onDestroy',
            ],
            log
        );
    });

    test('custom elements are initialized and deinitialized on unmount & remount', () => {
        const tagName = makeUniqueTagname('my-custom');
        const log: string[] = [];

        defineCustomElement({
            tagName,
            Component: ({ children }, { onMount, onUnmount, onDestroy }) => {
                log.push('render');
                onMount(() => {
                    log.push('onMount');
                });
                onUnmount(() => {
                    log.push('onUnmount');
                });
                onDestroy(() => {
                    log.push('onDestroy');
                });
                return (
                    <>
                        Before
                        <div class="children">{children}</div>
                        After
                    </>
                );
            },
        });
        const span = document.createElement('span');
        span.innerHTML = `<${tagName}>
                <div class="child-one">child-one</div>
                <div class="child-two">child-two</div>
        </${tagName}>`;
        testRoot.appendChild(span);

        flush();
        assert.is(
            'Before<WS>child-one<WS>child-two<WS>After',
            span.textContent?.replace(/\s+/g, '<WS>')
        );
        assert.deepEqual(['render', 'onMount'], log);

        testRoot.removeChild(span);
        flush();

        assert.deepEqual(['render', 'onMount', 'onUnmount', 'onDestroy'], log);

        testRoot.appendChild(span);
        flush();

        assert.deepEqual(
            [
                'render',
                'onMount',
                'onUnmount',
                'onDestroy',
                'render',
                'onMount',
            ],
            log
        );

        testRoot.removeChild(span);
        flush();

        assert.deepEqual(
            [
                'render',
                'onMount',
                'onUnmount',
                'onDestroy',
                'render',
                'onMount',
                'onUnmount',
                'onDestroy',
            ],
            log
        );
    });

    // Type-only tests
    // eslint-disable-next-line no-constant-condition
    if (2 < 1) {
        test('closed shadow dom elements cannot have children', () => {
            defineCustomElement({
                tagName: 'foo-bar',
                observedAttributes: [],
                shadowMode: 'closed',
                // @ts-expect-error
                Component: ({ children }) => {
                    return <></>;
                },
            });
        });
        test('open shadow dom elements cannot have children', () => {
            defineCustomElement({
                tagName: 'foo-bar',
                observedAttributes: [],
                shadowMode: 'open',
                // @ts-expect-error
                Component: ({ children }) => {
                    return <></>;
                },
            });
        });
        test('non-shadow custom elements may have children', () => {
            defineCustomElement({
                tagName: 'foo-bar',
                observedAttributes: [],
                shadowMode: undefined,
                Component: ({ children }) => {
                    return <></>;
                },
            });
        });

        test('custom elements must have a hyphen in their tagname', () => {
            defineCustomElement({
                // @ts-expect-error
                tagName: 'foobar',
                observedAttributes: [],
                shadowMode: undefined,
                Component: ({ children }) => {
                    return <></>;
                },
            });
        });

        test('custom elements attributes must match component props', () => {
            defineCustomElement({
                tagName: 'foo-bar',
                observedAttributes: [
                    'name',
                    'age',
                    'sex',
                    'occupationOrModeOfEmploymentJustALongIdentifierSoWeCanGetOnePerLine',
                ],
                shadowMode: undefined,
                Component: ({
                    name,
                    age,
                    occupationOrModeOfEmploymentJustALongIdentifierSoWeCanGetOnePerLine,
                    // @ts-expect-error
                    dateOfBirth,
                }) => {
                    return <></>;
                },
            });
        });

        test('the "is" prop cannot be dynamic', () => {
            defineCustomElement({
                tagName: 'foo-bar',
                observedAttributes: ['name'],
                extends: 'div',
                Component: ({ name }) => {
                    return <></>;
                },
            });
            <div is="foo-bar" />;
            <div is={undefined} />;

            // @ts-expect-error
            <div is={field('foo-bar')} />;
            // @ts-expect-error
            <div is={calc(() => 'foo-bar')} />;
        });
    }
});
