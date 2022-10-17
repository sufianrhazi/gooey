import { flush, reset, subscribe } from './engine';
import { calc } from './calc';
import { collection } from './collection';
import { model } from './model';
import {
    RenderNode,
    RenderNodeType,
    ArrayRenderNode,
    CalculationRenderNode,
    CollectionRenderNode,
    ComponentRenderNode,
    EmptyRenderNode,
    ForeignRenderNode,
    IntrinsicObserverRenderNode,
    IntrinsicObserverEventType,
    IntrinsicRenderNode,
    TextRenderNode,
    NodeEmitter,
    mount,
    Component,
} from './rendernode';
import { ArrayEventType } from './arrayevent';
import { SymDebugName, SymRefcount, SymAlive, SymDead } from './symbols';
import { suite, test, beforeEach, assert } from '@srhazi/gooey-test';

const HTML_NAMESPACE = 'http://www.w3.org/1999/xhtml';

let testRoot: HTMLElement = document.getElementById('test-root')!;

beforeEach(() => {
    testRoot = document.getElementById('test-root')!;
    reset();
    subscribe();
});

class TracingRenderNode implements RenderNode {
    public _type: typeof RenderNodeType = RenderNodeType;
    public events: any[];
    public emitter: NodeEmitter | null;
    public [SymRefcount]: number;
    public [SymDebugName]: string;

    constructor() {
        this.events = [];
        this[SymRefcount] = 0;
        this[SymDebugName] = 'TracingRenderNode';
        this.emitter = null;
    }

    log(event: any) {
        this.events.push(event);
    }

    clear() {
        this.events = [];
    }

    detach() {
        this.events.push('detach');
    }

    attach(emitter: NodeEmitter) {
        this.emitter = emitter;
        this.events.push('attach');
    }

    onMount() {
        this.events.push('onMount');
    }

    onUnmount() {
        this.events.push('onUnmount');
    }

    retain() {
        this.events.push('retain');
    }

    release() {
        this.events.push('release');
    }

    [SymAlive]() {
        this.events.push('alive');
    }

    [SymDead]() {
        this.events.push('dead');
    }
}

suite('EmptyRenderNode', () => {
    test('does nothing', () => {
        const empty = new EmptyRenderNode();
        const unmount = mount(testRoot, empty);
        assert.deepEqual([], Array.from(testRoot.childNodes));
        unmount();
        assert.deepEqual([], Array.from(testRoot.childNodes));
    });

    test('can be mounted and unmounted while retained', () => {
        const empty = new EmptyRenderNode();
        empty.retain();
        let unmount = mount(testRoot, empty);
        unmount();
        unmount = mount(testRoot, empty);
        empty.release();
        unmount();
        assert.deepEqual([], Array.from(testRoot.childNodes));
    });
});

suite('TextRenderNode', () => {
    test('renders text', () => {
        const text = new TextRenderNode('hello');
        const unmount = mount(testRoot, text);
        assert.is(1, testRoot.childNodes.length);
        assert.isTruthy(testRoot.childNodes[0] instanceof Text);
        assert.isTruthy('hello', (testRoot.childNodes[0] as Text).data);
        unmount();
        assert.deepEqual([], Array.from(testRoot.childNodes));
    });

    test('fails if mounted twice', () => {
        const text = new TextRenderNode('hello');
        let unmount = mount(testRoot, text);
        assert.throwsMatching(/Text node double attached/, () =>
            mount(testRoot, text)
        );
        unmount();
        unmount = mount(testRoot, text);
        assert.throwsMatching(/Text node double attached/, () =>
            mount(testRoot, text)
        );
        unmount();
    });

    test('can be mounted and unmounted while retained', () => {
        const text = new TextRenderNode('hello');
        text.retain();
        let unmount = mount(testRoot, text);
        unmount();
        unmount = mount(testRoot, text);
        text.release();
        unmount();
    });
});

suite('ForeignRenderNode', () => {
    test('renders provided element', () => {
        const node = document.createElement('div');
        node.textContent = 'hello';
        const foreign = new ForeignRenderNode(node);
        const unmount = mount(testRoot, foreign);
        assert.is(1, testRoot.childNodes.length);
        assert.is(node, testRoot.childNodes[0]);
        unmount();
        assert.is(0, testRoot.childNodes.length);
    });

    test('fails if mounted twice', () => {
        const node = document.createElement('div');
        const foreign = new ForeignRenderNode(node);
        const unmount = mount(testRoot, foreign);
        assert.throwsMatching(/Foreign node double attached/, () =>
            mount(testRoot, foreign)
        );
        unmount();
    });

    test('can be mounted and unmounted while retained', () => {
        const node = document.createElement('div');
        const foreign = new ForeignRenderNode(node);
        foreign.retain();
        let unmount = mount(testRoot, foreign);
        unmount();
        unmount = mount(testRoot, foreign);
        foreign.release();
        unmount();
    });
});

suite('IntrinsicRenderNode', () => {
    test('renders element element', () => {
        const intrinsic = new IntrinsicRenderNode('div', {}, []);
        const unmount = mount(testRoot, intrinsic);
        assert.is(1, testRoot.childNodes.length);
        assert.isTruthy(testRoot.childNodes[0] instanceof HTMLDivElement);
        unmount();
        assert.is(0, testRoot.childNodes.length);
    });

    test('recreates new elements on each attach if not retained', () => {
        const intrinsic = new IntrinsicRenderNode('div', {}, []);
        let unmount = mount(testRoot, intrinsic);
        const first = testRoot.childNodes[0];
        unmount();
        unmount = mount(testRoot, intrinsic);
        const second = testRoot.childNodes[0];
        unmount();
        assert.isNot(first, second);
    });

    test('reuses existing element on each attach if retained', () => {
        const intrinsic = new IntrinsicRenderNode('div', {}, []);
        intrinsic.retain();
        let unmount = mount(testRoot, intrinsic);
        const first = testRoot.childNodes[0];
        unmount();
        unmount = mount(testRoot, intrinsic);
        intrinsic.release();
        const second = testRoot.childNodes[0];
        unmount();
        assert.is(first, second);
    });

    test('child gets standard lifecycle called on mount', () => {
        const tracer = new TracingRenderNode();
        const intrinsic = new IntrinsicRenderNode('div', {}, [tracer]);
        mount(testRoot, intrinsic);
        assert.deepEqual(['alive', 'attach', 'onMount'], tracer.events);
    });

    test('child gets standard unmount lifecycle called on detach', () => {
        const tracer = new TracingRenderNode();
        const intrinsic = new IntrinsicRenderNode('div', {}, [tracer]);
        const unmount = mount(testRoot, intrinsic);
        tracer.clear();
        unmount();
        assert.deepEqual(['onUnmount', 'dead'], tracer.events);
    });

    test('child can be repeatedly mounted / unmounted if intrinsic node retained', () => {
        const tracer = new TracingRenderNode();
        const intrinsic = new IntrinsicRenderNode('div', {}, [tracer]);
        tracer.log('0: retain');
        intrinsic.retain();
        tracer.log('1: mount');
        let unmount = mount(testRoot, intrinsic);
        tracer.log('2: unmount');
        unmount();
        tracer.log('3: mount');
        unmount = mount(testRoot, intrinsic);
        tracer.log('4: release');
        intrinsic.release();
        tracer.log('5: unmount');
        unmount();
        assert.deepEqual(
            [
                '0: retain',
                'alive',
                'attach',
                '1: mount',
                'onMount',
                '2: unmount',
                'onUnmount',
                '3: mount',
                'onMount',
                '4: release',
                '5: unmount',
                'onUnmount',
                'dead',
            ],
            tracer.events
        );
    });

    test('child can be repeatedly mounted / unmounted if intrinsic node retained (release after unmount)', () => {
        const tracer = new TracingRenderNode();
        const intrinsic = new IntrinsicRenderNode('div', {}, [tracer]);
        tracer.log('0: retain');
        intrinsic.retain();
        tracer.log('1: mount');
        let unmount = mount(testRoot, intrinsic);
        tracer.log('2: unmount');
        unmount();
        tracer.log('3: mount');
        unmount = mount(testRoot, intrinsic);
        tracer.log('4: unmount');
        unmount();
        tracer.log('5: release');
        intrinsic.release();
        assert.deepEqual(
            [
                '0: retain',
                'alive',
                'attach',
                '1: mount',
                'onMount',
                '2: unmount',
                'onUnmount',
                '3: mount',
                'onMount',
                '4: unmount',
                'onUnmount',
                '5: release',
                'dead',
            ],
            tracer.events
        );
    });

    test('child receives emitted elements while rendered', () => {
        const tracer = new TracingRenderNode();
        const intrinsic = new IntrinsicRenderNode('div', {}, [tracer]);
        mount(testRoot, intrinsic);
        const node1 = document.createElement('a');
        const node2 = document.createElement('b');
        const node3 = document.createElement('code');
        const node4 = document.createElement('div');
        tracer.emitter?.({
            type: ArrayEventType.SPLICE,
            index: 0,
            count: 0,
            items: [node1, node2],
        });
        tracer.emitter?.({
            type: ArrayEventType.SPLICE,
            index: 1,
            count: 0,
            items: [node3],
        });
        tracer.emitter?.({
            type: ArrayEventType.SPLICE,
            index: 0,
            count: 1,
            items: [node4],
        });
        assert.is(3, testRoot.childNodes[0].childNodes.length);
        assert.is(node4, testRoot.childNodes[0].childNodes[0]);
        assert.is(node3, testRoot.childNodes[0].childNodes[1]);
        assert.is(node1, testRoot.childNodes[0].childNodes[2]);
    });

    test('child processes emitted elements while retained detached', () => {
        const tracer = new TracingRenderNode();
        const intrinsic = new IntrinsicRenderNode('div', {}, [tracer]);
        intrinsic.retain();
        const unmount = mount(testRoot, intrinsic);
        const intrinsicEl = testRoot.childNodes[0];
        unmount();
        const node1 = document.createElement('a');
        const node2 = document.createElement('b');
        const node3 = document.createElement('code');
        const node4 = document.createElement('div');
        tracer.emitter?.({
            type: ArrayEventType.SPLICE,
            index: 0,
            count: 0,
            items: [node1, node2],
        });
        tracer.emitter?.({
            type: ArrayEventType.SPLICE,
            index: 1,
            count: 0,
            items: [node3],
        });
        tracer.emitter?.({
            type: ArrayEventType.SPLICE,
            index: 0,
            count: 1,
            items: [node4],
        });
        assert.is(3, intrinsicEl.childNodes.length);
        assert.is(node4, intrinsicEl.childNodes[0]);
        assert.is(node3, intrinsicEl.childNodes[1]);
        assert.is(node1, intrinsicEl.childNodes[2]);
    });
});

suite('CalculationRenderNode', () => {
    test('emits jsx when attached', () => {
        const state = model({ name: 'hello' });
        const greet = calc(
            () =>
                new IntrinsicRenderNode('b', {}, [
                    new TextRenderNode(state.name),
                ])
        );
        const node = new CalculationRenderNode(greet);
        node.retain();
        const events: any[] = [];
        node.attach((event) => {
            events.push(event);
        }, HTML_NAMESPACE);

        assert.is(1, events.length);
        assert.is('splice', events[0].type);
        assert.is(0, events[0].index);
        assert.is(0, events[0].count);
        assert.is(1, events[0].items.length);
        assert.is('B', events[0].items[0].tagName);
        assert.is('hello', events[0].items[0].textContent);
    });

    test('re-emits jsx when recalculated while attached', () => {
        const state = model({ name: 'hello' });
        const greet = calc(
            () =>
                new IntrinsicRenderNode('b', {}, [
                    new TextRenderNode(state.name),
                ])
        );
        const node = new CalculationRenderNode(greet);
        node.retain();
        const events: any[] = [];
        node.attach((event) => {
            events.push(event);
        }, HTML_NAMESPACE);

        state.name = 'goodbye';
        flush();

        assert.is(3, events.length);

        assert.is('splice', events[0].type);
        assert.is(0, events[0].index);
        assert.is(0, events[0].count);
        assert.is(1, events[0].items.length);
        assert.is('B', events[0].items[0].tagName);
        assert.is('hello', events[0].items[0].textContent);

        assert.is('splice', events[1].type);
        assert.is(0, events[1].index);
        assert.is(1, events[1].count);
        assert.is(0, events[1].items?.length ?? 0);

        assert.is('splice', events[2].type);
        assert.is(0, events[2].index);
        assert.is(0, events[2].count);
        assert.is(1, events[2].items.length);
        assert.is('B', events[2].items[0].tagName);
        assert.is('goodbye', events[2].items[0].textContent);

        assert.isNot(events[0].items[0], events[2].items[0]);
    });

    test('does not emit jsx when recalculated while detached', () => {
        const state = model({ name: 'hello' });
        const greet = calc(
            () =>
                new IntrinsicRenderNode('b', {}, [
                    new TextRenderNode(state.name),
                ])
        );
        const node = new CalculationRenderNode(greet);
        node.retain();
        const events: any[] = [];
        node.attach((event) => {
            events.push(event);
        }, HTML_NAMESPACE);
        node.detach();

        state.name = 'goodbye';
        flush();

        assert.is(2, events.length);

        assert.is('splice', events[0].type);
        assert.is(0, events[0].index);
        assert.is(0, events[0].count);
        assert.is(1, events[0].items.length);
        assert.is('B', events[0].items[0].tagName);
        assert.is('hello', events[0].items[0].textContent);

        assert.is('splice', events[1].type);
        assert.is(0, events[1].index);
        assert.is(1, events[1].count);
        assert.is(0, events[1].items?.length ?? 0);
    });

    test('result after recalculation while detached is emitted when attached again', () => {
        const state = model({ name: 'hello' });
        const greet = calc(
            () =>
                new IntrinsicRenderNode('b', {}, [
                    new TextRenderNode(state.name),
                ])
        );
        const node = new CalculationRenderNode(greet);
        node.retain();
        const events: any[] = [];
        node.attach((event) => {
            events.push(event);
        }, HTML_NAMESPACE);
        node.detach();

        state.name = 'goodbye';
        flush();

        node.attach((event) => {
            events.push(event);
        }, HTML_NAMESPACE);

        assert.is('splice', events[0].type);
        assert.is(0, events[0].index);
        assert.is(0, events[0].count);
        assert.is(1, events[0].items.length);
        assert.is('B', events[0].items[0].tagName);
        assert.is('hello', events[0].items[0].textContent);

        assert.is('splice', events[1].type);
        assert.is(0, events[1].index);
        assert.is(1, events[1].count);
        assert.is(0, events[1].items?.length ?? 0);

        assert.is('splice', events[2].type);
        assert.is(0, events[2].index);
        assert.is(0, events[2].count);
        assert.is(1, events[2].items.length);
        assert.is('B', events[2].items[0].tagName);
        assert.is('goodbye', events[2].items[0].textContent);
    });

    test('mount and unmount are passed through', () => {
        const tracer = new TracingRenderNode();
        const constantCalc = calc(() => tracer);
        const node = new CalculationRenderNode(constantCalc);
        const events: any[] = [];

        tracer.log('0: retain');
        node.retain();
        tracer.log('1: attach');
        node.attach((event) => {
            events.push(event);
        }, HTML_NAMESPACE);
        tracer.log('2: mount');
        node.onMount();
        tracer.log('3: unmount');
        node.onUnmount();
        tracer.log('4: mount');
        node.onMount();
        tracer.log('5: unmount');
        node.onUnmount();
        tracer.log('6: detach');
        node.detach();
        tracer.log('7: attach');
        node.attach((event) => {
            events.push(event);
        }, HTML_NAMESPACE);
        tracer.log('8: attach');
        node.detach();
        tracer.log('9: release');
        node.release();

        assert.deepEqual(
            [
                '0: retain',
                'alive',
                '1: attach',
                'attach',
                '2: mount',
                'onMount',
                '3: unmount',
                'onUnmount',
                '4: mount',
                'onMount',
                '5: unmount',
                'onUnmount',
                '6: detach',
                'detach',
                '7: attach',
                'attach',
                '8: attach',
                'detach',
                '9: release',
                'dead',
            ],
            tracer.events
        );
    });

    test('synchronous errors on attach are passed up', () => {
        const state = model({
            isError: true,
        });
        const events: any[] = [];
        const constantCalc = calc(() => {
            events.push('calc');
            if (state.isError) throw new Error('boom');
            return 'ok';
        });
        const node = new CalculationRenderNode(constantCalc);
        node.retain();
        node.attach((event) => {
            events.push(event);
        }, HTML_NAMESPACE);
        assert.is(2, events.length);
        assert.is('calc', events[0]);
        assert.isTruthy(events[1] instanceof Error);
        assert.isTruthy(events[1].message.includes('boom')); // Note: should this be the original error? It's a wrapped error now...
    });

    test('errors on recalc are passed through', () => {
        const state = model({
            isError: false,
        });
        const events: any[] = [];
        const constantCalc = calc(() => {
            events.push('calc');
            if (state.isError) throw new Error('boom');
            return 'ok';
        });
        const node = new CalculationRenderNode(constantCalc);
        node.retain();
        node.attach((event) => {
            events.push(event);
        }, HTML_NAMESPACE);

        assert.is(2, events.length);
        assert.is('calc', events[0]);
        assert.is('splice', events[1].type);
        assert.is(0, events[1].index);
        assert.is(0, events[1].count);
        assert.is(1, events[1].items.length);
        assert.is('ok', events[1].items[0].data);

        state.isError = true;
        flush();

        assert.is(5, events.length);
        assert.is('calc', events[2]);
        assert.is('splice', events[3].type);
        assert.is(0, events[3].index);
        assert.is(1, events[3].count);
        assert.is(0, events[3].items?.length ?? 0);
        assert.isTruthy(events[4] instanceof Error);
        assert.isTruthy(events[4].message.includes('boom')); // Note: should this be the original error? It's a wrapped error now...
    });
});

suite('ArrayRenderNode', () => {
    test('events are shifted', () => {
        const tracer1 = new TracingRenderNode();
        const tracer2 = new TracingRenderNode();
        const tracer3 = new TracingRenderNode();
        const node = new ArrayRenderNode([tracer1, tracer2, tracer3]);
        const events: any[] = [];
        node.retain();
        node.attach((event) => {
            events.push(event);
        }, HTML_NAMESPACE);
        const div1 = document.createElement('div');
        const div2 = document.createElement('div');
        const div3 = document.createElement('div');
        const div4 = document.createElement('div');
        const div5 = document.createElement('div');
        tracer1.emitter?.({
            type: ArrayEventType.SPLICE,
            index: 0,
            count: 0,
            items: [div1, div2],
        });
        tracer2.emitter?.({
            type: ArrayEventType.SPLICE,
            index: 0,
            count: 0,
            items: [div3],
        });
        tracer1.emitter?.({
            type: ArrayEventType.SPLICE,
            index: 1,
            count: 1,
            items: [div4],
        });
        tracer3.emitter?.({
            type: ArrayEventType.SPLICE,
            index: 0,
            count: 0,
            items: [div5],
        });
        assert.deepEqual(
            [
                {
                    type: ArrayEventType.SPLICE,
                    index: 0,
                    count: 0,
                    items: [div1, div2],
                },
                {
                    type: ArrayEventType.SPLICE,
                    index: 2,
                    count: 0,
                    items: [div3],
                },
                {
                    type: ArrayEventType.SPLICE,
                    index: 1,
                    count: 1,
                    items: [div4],
                },
                {
                    type: ArrayEventType.SPLICE,
                    index: 3,
                    count: 0,
                    items: [div5],
                },
            ],
            events
        );
    });

    test('standard lifecycle on mount', () => {
        const tracer = new TracingRenderNode();
        const node = new ArrayRenderNode([tracer]);
        mount(testRoot, node)();
        assert.deepEqual(
            ['alive', 'attach', 'onMount', 'onUnmount', 'detach', 'dead'],
            tracer.events
        );
    });

    test('can be unmounted and remounted while retained', () => {
        const tracer = new TracingRenderNode();
        const node = new ArrayRenderNode([tracer]);
        node.retain();
        mount(testRoot, node)();
        mount(testRoot, node)();
        node.release();
        assert.deepEqual(
            [
                'alive',
                'attach',
                'onMount',
                'onUnmount',
                'detach',
                'attach',
                'onMount',
                'onUnmount',
                'detach',
                'dead',
            ],
            tracer.events
        );
    });
});

suite('CollectionRenderNode', () => {
    test('emits jsx when attached', () => {
        const items = collection(['hello', 'goodbye']);
        const node = new CollectionRenderNode(items);
        node.retain();
        const events: any[] = [];
        node.attach((event) => {
            events.push(event);
        }, HTML_NAMESPACE);

        assert.is(2, events.length);
        assert.is('splice', events[0].type);
        assert.is(0, events[0].index);
        assert.is(0, events[0].count);
        assert.is(1, events[0].items.length);
        assert.is('hello', events[0].items[0].data);
        assert.is('splice', events[1].type);
        assert.is(1, events[1].index);
        assert.is(0, events[1].count);
        assert.is(1, events[1].items.length);
        assert.is('goodbye', events[1].items[0].data);
    });

    test('emits events when modified', () => {
        const items = collection(['foo', 'bar', 'baz']);
        const node = new CollectionRenderNode(items);
        node.retain();
        const events: any[] = [];
        node.attach((event) => {
            events.push(event);
        }, HTML_NAMESPACE);

        events.splice(0, events.length);
        items.unshift('first');
        items.push('last');
        items.splice(2, 1, 'mid');
        flush();

        assert.is(4, events.length);
        assert.is('splice', events[0].type);
        assert.is(0, events[0].index);
        assert.is(0, events[0].count);
        assert.is(1, events[0].items.length);
        assert.is('first', events[0].items[0].data);

        assert.is('splice', events[1].type);
        assert.is(4, events[1].index);
        assert.is(0, events[1].count);
        assert.is(1, events[1].items.length);
        assert.is('last', events[1].items[0].data);

        // TODO: why is this splice(2, 1, 'mid') decomposed into two events? It should be just one
        assert.is('splice', events[2].type);
        assert.is(2, events[2].index);
        assert.is(1, events[2].count);
        assert.is(0, events[2].items?.length ?? 0);

        assert.is('splice', events[3].type);
        assert.is(2, events[3].index);
        assert.is(0, events[3].count);
        assert.is(1, events[3].items.length);
        assert.is('mid', events[3].items[0].data);
    });

    test('emits result when modified while detached', () => {
        const items = collection(['foo', 'bar', 'baz']);
        const node = new CollectionRenderNode(items);
        node.retain();
        const events: any[] = [];
        node.attach((event) => {
            events.push(event);
        }, HTML_NAMESPACE);
        node.detach();

        events.splice(0, events.length);
        items.unshift('first');
        items.push('last');
        items.splice(2, 1, 'mid');
        flush();

        assert.is(0, events.length);
        node.attach((event) => {
            events.push(event);
        }, HTML_NAMESPACE);

        assert.is(5, events.length);
        assert.is('splice', events[0].type);
        assert.is(0, events[0].index);
        assert.is(0, events[0].count);
        assert.is(1, events[0].items.length);
        assert.is('first', events[0].items[0].data);

        assert.is('splice', events[1].type);
        assert.is(1, events[1].index);
        assert.is(0, events[1].count);
        assert.is(1, events[1].items.length);
        assert.is('foo', events[1].items[0].data);

        assert.is('splice', events[2].type);
        assert.is(2, events[2].index);
        assert.is(0, events[2].count);
        assert.is(1, events[2].items.length);
        assert.is('mid', events[2].items[0].data);

        assert.is('splice', events[3].type);
        assert.is(3, events[3].index);
        assert.is(0, events[3].count);
        assert.is(1, events[3].items.length);
        assert.is('baz', events[3].items[0].data);

        assert.is('splice', events[4].type);
        assert.is(4, events[4].index);
        assert.is(0, events[4].count);
        assert.is(1, events[4].items.length);
        assert.is('last', events[4].items[0].data);
    });

    test('synchronous errors on attach are passed up', () => {
        const state = model({
            isError: true,
        });
        const events: any[] = [];
        const constantCalc = calc(() => {
            events.push('calc');
            if (state.isError) throw new Error('boom');
            return 'ok';
        });
        const node = new CalculationRenderNode(constantCalc);
        node.retain();
        node.attach((event) => {
            events.push(event);
        }, HTML_NAMESPACE);
        assert.is(2, events.length);
        assert.is('calc', events[0]);
        assert.isTruthy(events[1] instanceof Error);
        assert.isTruthy(events[1].message.includes('boom')); // Note: should this be the original error? It's a wrapped error now...
    });

    test('errors on recalc are passed through', () => {
        const state = model({
            isError: false,
        });
        const events: any[] = [];
        const constantCalc = calc(() => {
            events.push('calc');
            if (state.isError) throw new Error('boom');
            return 'ok';
        });
        const node = new CalculationRenderNode(constantCalc);
        node.retain();
        node.attach((event) => {
            events.push(event);
        }, HTML_NAMESPACE);

        assert.is(2, events.length);
        assert.is('calc', events[0]);
        assert.is('splice', events[1].type);
        assert.is(0, events[1].index);
        assert.is(0, events[1].count);
        assert.is(1, events[1].items.length);
        assert.is('ok', events[1].items[0].data);

        state.isError = true;
        flush();

        assert.is(5, events.length);
        assert.is('calc', events[2]);
        assert.is('splice', events[3].type);
        assert.is(0, events[3].index);
        assert.is(1, events[3].count);
        assert.is(0, events[3].items?.length ?? 0);
        assert.isTruthy(events[4] instanceof Error);
        assert.is('boom', events[4].message);
    });

    test('errors on recalc while detached occur but are ignored', () => {
        const state = model({
            isError: false,
        });
        let events: any[] = [];
        const constantCalc = calc(() => {
            events.push('calc');
            if (state.isError) throw new Error('boom');
            return 'ok';
        });
        const node = new CalculationRenderNode(constantCalc);
        node.retain();
        node.attach((event) => {
            events.push(event);
        }, HTML_NAMESPACE);
        node.detach();
        events = [];

        state.isError = true;
        flush();
        // We are not attached, so we don't get an error event
        assert.is(1, events.length);
        assert.is('calc', events[0]);
        events = [];

        node.attach((event) => {
            events.push(event);
        }, HTML_NAMESPACE);

        assert.is(1, events.length);
        assert.isTruthy(events[0] instanceof Error);
        assert.is('boom', events[0].message);
    });

    test('calls lifecycle methods when added while mounted', () => {
        const tracer1 = new TracingRenderNode();
        const tracer2 = new TracingRenderNode();
        const items = collection([tracer1]);
        const node = new CollectionRenderNode(items);
        const events: any[] = [];
        node.retain();
        node.attach((event) => events.push(event), HTML_NAMESPACE);
        node.onMount();
        assert.deepEqual(['alive', 'attach', 'onMount'], tracer1.events);
        assert.deepEqual([], tracer2.events);
        items.push(tracer2);
        flush();
        assert.deepEqual(['alive', 'attach', 'onMount'], tracer1.events);
        assert.deepEqual(['alive', 'attach', 'onMount'], tracer2.events);
        items.shift();
        flush();
        assert.deepEqual(
            ['alive', 'attach', 'onMount', 'onUnmount', 'detach', 'dead'],
            tracer1.events
        );
        assert.deepEqual(['alive', 'attach', 'onMount'], tracer2.events);
    });

    test('calls lifecycle methods when added while unmounted', () => {
        const tracer1 = new TracingRenderNode();
        const tracer2 = new TracingRenderNode();
        const items = collection([tracer1]);
        const node = new CollectionRenderNode(items);
        const events: any[] = [];
        node.retain();
        node.attach((event) => events.push(event), HTML_NAMESPACE);
        assert.deepEqual(['alive', 'attach'], tracer1.events);
        assert.deepEqual([], tracer2.events);
        items.push(tracer2);
        flush();
        assert.deepEqual(['alive', 'attach'], tracer1.events);
        assert.deepEqual(['alive', 'attach'], tracer2.events);
        items.shift();
        flush();
        assert.deepEqual(['alive', 'attach', 'detach', 'dead'], tracer1.events);
        assert.deepEqual(['alive', 'attach'], tracer2.events);
    });
});

suite('ComponentRenderNode', () => {
    test('lifecycle methods called in correct order', () => {
        const events: any[] = [];
        const div = document.createElement('div');
        const foreign = new ForeignRenderNode(div);

        const Component: Component = (
            _props,
            { onMount, onDestroy, onUnmount }
        ) => {
            onMount(() => {
                events.push('Component:onMount');
                return () => {
                    events.push('Component:onMount cleanup');
                };
            });

            onUnmount(() => {
                events.push('Component:onUnmount');
            });

            onDestroy(() => {
                events.push('Component:onDestroy');
            });

            events.push(`Component:render`);

            return foreign;
        };

        const node = new ComponentRenderNode(Component, {}, []);
        events.push('0:retain');
        node.retain();
        events.push('1:attach');
        node.attach((event) => {
            events.push(event);
        }, HTML_NAMESPACE);
        events.push('2:onMount');
        node.onMount();
        events.push('3:onUnmount');
        node.onUnmount();
        events.push('4:detach');
        node.detach();
        events.push('5:release');
        node.release();

        assert.deepEqual(
            [
                '0:retain',
                'Component:render',
                '1:attach',
                {
                    type: 'splice',
                    index: 0,
                    count: 0,
                    items: [div],
                },
                '2:onMount',
                'Component:onMount',
                '3:onUnmount',
                'Component:onUnmount',
                'Component:onMount cleanup',
                '4:detach',
                {
                    type: 'splice',
                    index: 0,
                    count: 1,
                },
                '5:release',
                'Component:onDestroy',
            ],
            events
        );
    });

    test('can be detached and reattached while retained', () => {
        const events: any[] = [];
        const div = document.createElement('div');
        const foreign = new ForeignRenderNode(div);

        const Component: Component = (
            _props,
            { onMount, onDestroy, onUnmount }
        ) => {
            onMount(() => {
                events.push('Component:onMount');
                return () => {
                    events.push('Component:onMount cleanup');
                };
            });

            onUnmount(() => {
                events.push('Component:onUnmount');
            });

            onDestroy(() => {
                events.push('Component:onDestroy');
            });

            events.push(`Component:render`);

            return foreign;
        };

        const node = new ComponentRenderNode(Component, {}, []);
        events.push('0:retain');
        node.retain();
        events.push('1:mount');
        let unmount = mount(testRoot, node);
        events.push('2:unmount');
        unmount();
        events.push('3:mount');
        unmount = mount(testRoot, node);
        events.push('4:unmount');
        unmount();
        events.push('5:release');
        node.release();

        assert.deepEqual(
            [
                '0:retain',
                'Component:render',
                '1:mount',
                'Component:onMount',
                '2:unmount',
                'Component:onUnmount',
                'Component:onMount cleanup',
                '3:mount',
                'Component:onMount',
                '4:unmount',
                'Component:onUnmount',
                'Component:onMount cleanup',
                '5:release',
                'Component:onDestroy',
            ],
            events
        );
    });

    test('can be retained and released without attach', () => {
        const events: any[] = [];
        const empty = new EmptyRenderNode();

        const Component: Component = (
            _props,
            { onMount, onDestroy, onUnmount }
        ) => {
            onMount(() => {
                events.push('Component:onMount');
                return () => {
                    events.push('Component:onMount cleanup');
                };
            });

            onUnmount(() => {
                events.push('Component:onUnmount');
            });

            onDestroy(() => {
                events.push('Component:onDestroy');
            });

            events.push(`Component:render`);

            return empty;
        };

        const node = new ComponentRenderNode(Component, {}, []);
        node.retain();
        node.release();

        assert.deepEqual(['Component:render', 'Component:onDestroy'], events);
    });
});

suite('IntrinsicObserverRenderNode', () => {
    test('renders children normally', () => {
        const tracer = new TracingRenderNode();
        const node = new IntrinsicObserverRenderNode(undefined, undefined, [
            tracer,
        ]);
        node.retain();
        node.attach((event) => tracer.log(event), HTML_NAMESPACE);
        node.onMount();
        node.onUnmount();
        node.detach();
        node.release();
        assert.deepEqual(
            ['alive', 'attach', 'onMount', 'onUnmount', 'detach', 'dead'],
            tracer.events
        );
    });

    test('calls callback with existing nodes on mount and unmount', () => {
        const tracer = new TracingRenderNode();
        const nodeCalls: [Node, IntrinsicObserverEventType][] = [];
        const elementCalls: [Element, IntrinsicObserverEventType][] = [];
        const node = new IntrinsicObserverRenderNode(
            (node, type) => nodeCalls.push([node, type]),
            (node, type) => elementCalls.push([node, type]),
            [tracer]
        );

        const text = document.createTextNode('text');
        const div = document.createElement('div');

        node.retain();
        node.attach((event) => tracer.log(event), HTML_NAMESPACE);
        tracer.emitter?.({
            type: ArrayEventType.SPLICE,
            index: 0,
            count: 0,
            items: [text, div],
        });

        assert.deepEqual([], nodeCalls);
        assert.deepEqual([], elementCalls);

        node.onMount();

        assert.deepEqual(
            [
                [text, IntrinsicObserverEventType.MOUNT],
                [div, IntrinsicObserverEventType.MOUNT],
            ],
            nodeCalls
        );
        assert.deepEqual(
            [[div, IntrinsicObserverEventType.MOUNT]],
            elementCalls
        );

        node.onUnmount();

        assert.deepEqual(
            [
                [text, IntrinsicObserverEventType.MOUNT],
                [div, IntrinsicObserverEventType.MOUNT],
                [text, IntrinsicObserverEventType.UNMOUNT],
                [div, IntrinsicObserverEventType.UNMOUNT],
            ],
            nodeCalls
        );
        assert.deepEqual(
            [
                [div, IntrinsicObserverEventType.MOUNT],
                [div, IntrinsicObserverEventType.UNMOUNT],
            ],
            elementCalls
        );
    });

    test('calls callback with added/removed nodes while mounted', () => {
        const tracer = new TracingRenderNode();
        const nodeCalls: [Node, IntrinsicObserverEventType][] = [];
        const elementCalls: [Element, IntrinsicObserverEventType][] = [];
        const node = new IntrinsicObserverRenderNode(
            (node, type) => nodeCalls.push([node, type]),
            (node, type) => elementCalls.push([node, type]),
            [tracer]
        );

        const text = document.createTextNode('text');
        const div = document.createElement('div');

        node.retain();
        node.attach((event) => tracer.log(event), HTML_NAMESPACE);
        node.onMount();

        tracer.emitter?.({
            type: ArrayEventType.SPLICE,
            index: 0,
            count: 0,
            items: [text, div],
        });

        assert.deepEqual(
            [
                [text, IntrinsicObserverEventType.MOUNT],
                [div, IntrinsicObserverEventType.MOUNT],
            ],
            nodeCalls
        );
        assert.deepEqual(
            [[div, IntrinsicObserverEventType.MOUNT]],
            elementCalls
        );

        tracer.emitter?.({
            type: ArrayEventType.SPLICE,
            index: 1,
            count: 1,
            items: [],
        });

        assert.deepEqual(
            [
                [text, IntrinsicObserverEventType.MOUNT],
                [div, IntrinsicObserverEventType.MOUNT],
                [div, IntrinsicObserverEventType.UNMOUNT],
            ],
            nodeCalls
        );

        assert.deepEqual(
            [
                [div, IntrinsicObserverEventType.MOUNT],
                [div, IntrinsicObserverEventType.UNMOUNT],
            ],
            elementCalls
        );

        tracer.emitter?.({
            type: ArrayEventType.SPLICE,
            index: 0,
            count: 1,
            items: [],
        });

        assert.deepEqual(
            [
                [text, IntrinsicObserverEventType.MOUNT],
                [div, IntrinsicObserverEventType.MOUNT],
                [div, IntrinsicObserverEventType.UNMOUNT],
                [text, IntrinsicObserverEventType.UNMOUNT],
            ],
            nodeCalls
        );
        assert.deepEqual(
            [
                [div, IntrinsicObserverEventType.MOUNT],
                [div, IntrinsicObserverEventType.UNMOUNT],
            ],
            elementCalls
        );
    });
});
