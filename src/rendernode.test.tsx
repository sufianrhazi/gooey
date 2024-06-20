import { assert, beforeEach, suite, test } from '@srhazi/gooey-test';

import { ArrayEventType } from './arrayevent';
import { calc } from './calc';
import { collection } from './collection';
import { flush, removeRenderNode, reset, subscribe } from './engine';
import { field } from './field';
import { model } from './model';
import { mount } from './mount';
import { renderJSXNode } from './renderjsx';
import { ArrayRenderNode } from './rendernode/arrayrendernode';
import { CalculationRenderNode } from './rendernode/calculationrendernode';
import { CollectionRenderNode } from './rendernode/collectionrendernode';
import type { Component } from './rendernode/componentrendernode';
import { ComponentRenderNode } from './rendernode/componentrendernode';
import { RenderNodeCommitPhase } from './rendernode/constants';
import { FieldRenderNode } from './rendernode/fieldrendernode';
import { ForeignRenderNode } from './rendernode/foreignrendernode';
import {
    IntrinsicObserverEventType,
    IntrinsicObserverRenderNode,
} from './rendernode/intrinsicobserverrendernode';
import { IntrinsicRenderNode } from './rendernode/intrinsicrendernode';
import type { NodeEmitter } from './rendernode/rendernode';
import { EmptyRenderNode, RenderNode } from './rendernode/rendernode';
import { TextRenderNode } from './rendernode/textrendernode';

const HTML_NAMESPACE = 'http://www.w3.org/1999/xhtml';

let testRoot: HTMLElement = document.getElementById('test-root')!;

beforeEach(() => {
    testRoot = document.getElementById('test-root')!;
    reset();
    subscribe();
});

class TracingRenderNode extends RenderNode {
    declare _commitPhase: RenderNodeCommitPhase;
    public events: any[];
    public emitter: NodeEmitter | undefined;
    public __refcount: number;
    public __debugName: string;

    constructor() {
        super({}, []);
        this.events = [];
        this.__refcount = 0;
        this.__debugName = 'TracingRenderNode';
        this.emitter = undefined;
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

    setMounted(isMounted: boolean) {
        this.events.push(`setMounted:${isMounted}`);
    }

    retain() {
        this.events.push('retain');
    }

    release() {
        this.events.push('release');
    }

    __alive() {
        this.events.push('alive');
    }

    __dead() {
        removeRenderNode(this);
        this.events.push('dead');
    }

    commit(phase: RenderNodeCommitPhase) {
        this.events.push(`commit:${RenderNodeCommitPhase[phase]}`);
    }

    clone() {
        return new TracingRenderNode();
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
        const text = TextRenderNode('hello');
        const unmount = mount(testRoot, text);
        assert.is(1, testRoot.childNodes.length);
        assert.isTruthy(testRoot.childNodes[0] instanceof Text);
        assert.isTruthy('hello', (testRoot.childNodes[0] as Text).data);
        unmount();
        assert.deepEqual([], Array.from(testRoot.childNodes));
    });

    test('fails if mounted twice', () => {
        const text = TextRenderNode('hello');
        let unmount = mount(testRoot, text);
        assert.throwsMatching(/double attached/, () => mount(testRoot, text));
        unmount();
        unmount = mount(testRoot, text);
        assert.throwsMatching(/double attached/, () => mount(testRoot, text));
        unmount();
    });

    test('can be mounted and unmounted while retained', () => {
        const text = TextRenderNode('hello');
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
        const foreign = ForeignRenderNode(node);
        const unmount = mount(testRoot, foreign);
        assert.is(1, testRoot.childNodes.length);
        assert.is(node, testRoot.childNodes[0]);
        unmount();
        assert.is(0, testRoot.childNodes.length);
    });

    test('fails if mounted twice', () => {
        const node = document.createElement('div');
        const foreign = ForeignRenderNode(node);
        const unmount = mount(testRoot, foreign);
        assert.throwsMatching(/double attached/, () =>
            mount(testRoot, foreign)
        );
        unmount();
    });

    test('can be mounted and unmounted while retained', () => {
        const node = document.createElement('div');
        const foreign = ForeignRenderNode(node);
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
        const intrinsic = IntrinsicRenderNode('div', {}, new EmptyRenderNode());
        const unmount = mount(testRoot, intrinsic);
        assert.is(1, testRoot.childNodes.length);
        assert.isTruthy(testRoot.childNodes[0] instanceof HTMLDivElement);
        unmount();
        assert.is(0, testRoot.childNodes.length);
    });

    test('recreates new elements on each attach if not retained', () => {
        const intrinsic = IntrinsicRenderNode('div', {}, new EmptyRenderNode());
        let unmount = mount(testRoot, intrinsic);
        const first = testRoot.childNodes[0];
        unmount();
        unmount = mount(testRoot, intrinsic);
        const second = testRoot.childNodes[0];
        unmount();
        assert.isNot(first, second);
    });

    test('reuses existing element on each attach if retained', () => {
        const intrinsic = IntrinsicRenderNode('div', {}, new EmptyRenderNode());
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
        const intrinsic = IntrinsicRenderNode('div', {}, tracer);
        mount(testRoot, intrinsic);
        assert.deepEqual(['alive', 'attach', 'setMounted:true'], tracer.events);
    });

    test('child gets standard unmount lifecycle called on detach', () => {
        const tracer = new TracingRenderNode();
        const intrinsic = IntrinsicRenderNode('div', {}, tracer);
        const unmount = mount(testRoot, intrinsic);
        tracer.clear();
        unmount();
        assert.deepEqual(['setMounted:false', 'dead'], tracer.events);
    });

    test('child can be repeatedly mounted / unmounted if intrinsic node retained', () => {
        const tracer = new TracingRenderNode();
        const intrinsic = IntrinsicRenderNode('div', {}, tracer);
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
                'setMounted:true',
                '2: unmount',
                'setMounted:false',
                '3: mount',
                'setMounted:true',
                '4: release',
                '5: unmount',
                'setMounted:false',
                'dead',
            ],
            tracer.events
        );
    });

    test('child can be repeatedly mounted / unmounted if intrinsic node retained (release after unmount)', () => {
        const tracer = new TracingRenderNode();
        const intrinsic = IntrinsicRenderNode('div', {}, tracer);
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
                'setMounted:true',
                '2: unmount',
                'setMounted:false',
                '3: mount',
                'setMounted:true',
                '4: unmount',
                'setMounted:false',
                '5: release',
                'dead',
            ],
            tracer.events
        );
    });

    test('child receives emitted elements when committed while rendered', () => {
        const tracer = new TracingRenderNode();
        const intrinsic = IntrinsicRenderNode('div', {}, tracer);
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
        assert.is(0, testRoot.childNodes[0].childNodes.length);
        flush();
        assert.is(3, testRoot.childNodes[0].childNodes.length);
        assert.is(node4, testRoot.childNodes[0].childNodes[0]);
        assert.is(node3, testRoot.childNodes[0].childNodes[1]);
        assert.is(node2, testRoot.childNodes[0].childNodes[2]);
    });

    test('child processes emitted elements while retained detached', () => {
        const tracer = new TracingRenderNode();
        const intrinsic = IntrinsicRenderNode('div', {}, tracer);
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
        assert.is(0, intrinsicEl.childNodes.length);
        flush();
        assert.is(3, intrinsicEl.childNodes.length);
        assert.is(node4, intrinsicEl.childNodes[0]);
        assert.is(node3, intrinsicEl.childNodes[1]);
        assert.is(node2, intrinsicEl.childNodes[2]);
    });

    test('element can receive and insert a middle node dynamically', () => {
        const tracerLeft = new TracingRenderNode();
        const tracerCenter = new TracingRenderNode();
        const tracerRight = new TracingRenderNode();
        const a = document.createElement('div');
        a.textContent = 'a';
        const b = document.createElement('div');
        b.textContent = 'b';
        const c = document.createElement('div');
        c.textContent = 'c';
        const d = document.createElement('div');
        d.textContent = 'd';
        const e = document.createElement('div');
        e.textContent = 'e';
        const intrinsic = IntrinsicRenderNode(
            'div',
            {},
            ArrayRenderNode([tracerLeft, tracerCenter, tracerRight])
        );
        mount(testRoot, intrinsic);
        tracerLeft.emitter?.({
            type: ArrayEventType.SPLICE,
            index: 0,
            count: 0,
            items: [a, b],
        });
        tracerRight.emitter?.({
            type: ArrayEventType.SPLICE,
            index: 0,
            count: 0,
            items: [d, e],
        });
        flush();
        tracerCenter.emitter?.({
            type: ArrayEventType.SPLICE,
            index: 0,
            count: 0,
            items: [c],
        });
        flush();
        assert.is(testRoot.textContent, 'abcde');
    });
});

suite('CalculationRenderNode', () => {
    test('emits jsx when attached', () => {
        const state = model({ name: 'hello' });
        const greet = calc(() =>
            IntrinsicRenderNode('b', {}, TextRenderNode(state.name))
        );
        const node = CalculationRenderNode(renderJSXNode, greet);
        node.retain();
        const events: any[] = [];
        node.attach(
            (event) => {
                events.push(event);
            },
            (error) => {
                events.push(error);
            },
            HTML_NAMESPACE
        );

        flush();

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
        const greet = calc(() =>
            IntrinsicRenderNode('b', {}, TextRenderNode(state.name))
        );
        const node = CalculationRenderNode(renderJSXNode, greet);
        node.retain();
        const events: any[] = [];
        node.attach(
            (event) => {
                events.push(event);
            },
            (error) => {
                events.push(error);
            },
            HTML_NAMESPACE
        );

        flush();

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
        const greet = calc(() =>
            IntrinsicRenderNode('b', {}, TextRenderNode(state.name))
        );
        const node = CalculationRenderNode(renderJSXNode, greet);
        node.retain();
        const events: any[] = [];
        node.attach(
            (event) => {
                events.push(event);
            },
            (error) => {
                events.push(error);
            },
            HTML_NAMESPACE
        );
        node.detach();

        flush();

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
        const greet = calc(() =>
            IntrinsicRenderNode('b', {}, TextRenderNode(state.name))
        );
        const node = CalculationRenderNode(renderJSXNode, greet);
        node.retain();
        const events: any[] = [];
        node.attach(
            (event) => {
                events.push(event);
            },
            (error) => {
                events.push(error);
            },
            HTML_NAMESPACE
        );
        node.detach();

        flush();

        state.name = 'goodbye';
        flush();

        node.attach(
            (event) => {
                events.push(event);
            },
            (error) => {
                events.push(error);
            },
            HTML_NAMESPACE
        );

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
        const node = CalculationRenderNode(renderJSXNode, constantCalc);
        const events: any[] = [];

        tracer.log('0: retain');
        node.retain();
        tracer.log('1: attach');
        node.attach(
            (event) => {
                events.push(event);
            },
            (error) => {
                events.push(error);
            },
            HTML_NAMESPACE
        );
        tracer.log('2: mount');
        node.setMounted(true);
        tracer.log('3: unmount');
        node.setMounted(false);
        tracer.log('4: mount');
        node.setMounted(true);
        tracer.log('5: unmount');
        node.setMounted(false);
        tracer.log('6: detach');
        node.detach();
        tracer.log('7: attach');
        node.attach(
            (event) => {
                events.push(event);
            },
            (error) => {
                events.push(error);
            },
            HTML_NAMESPACE
        );
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
                'setMounted:true',
                '3: unmount',
                'setMounted:false',
                '4: mount',
                'setMounted:true',
                '5: unmount',
                'setMounted:false',
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
        const node = CalculationRenderNode(renderJSXNode, constantCalc);
        node.retain();
        node.attach(
            (event) => {
                events.push(event);
            },
            (error) => {
                events.push(error);
            },
            HTML_NAMESPACE
        );
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
        const node = CalculationRenderNode(renderJSXNode, constantCalc);
        node.retain();
        node.attach(
            (event) => {
                events.push(event);
            },
            (error) => {
                events.push(error);
            },
            HTML_NAMESPACE
        );

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

suite('FieldRenderNode', () => {
    test('emits jsx when attached', () => {
        const greeting = field('hello');
        const node = FieldRenderNode(renderJSXNode, greeting);
        node.retain();
        const events: any[] = [];
        node.attach(
            (event) => {
                events.push(event);
            },
            (error) => {
                events.push(error);
            },
            HTML_NAMESPACE
        );

        flush();

        assert.is(1, events.length);
        assert.is('splice', events[0].type);
        assert.is(0, events[0].index);
        assert.is(0, events[0].count);
        assert.is(1, events[0].items.length);
        assert.is('hello', events[0].items[0].data);
    });

    test('re-emits jsx when recalculated while attached', () => {
        const greeting = field('hello');
        const node = FieldRenderNode(renderJSXNode, greeting);
        node.retain();
        const events: any[] = [];
        node.attach(
            (event) => {
                events.push(event);
            },
            (error) => {
                events.push(error);
            },
            HTML_NAMESPACE
        );

        flush();

        greeting.set('goodbye');
        flush();

        assert.is(3, events.length);

        assert.is('splice', events[0].type);
        assert.is(0, events[0].index);
        assert.is(0, events[0].count);
        assert.is(1, events[0].items.length);
        assert.is('hello', events[0].items[0].data);

        assert.is('splice', events[1].type);
        assert.is(0, events[1].index);
        assert.is(1, events[1].count);
        assert.is(0, events[1].items?.length ?? 0);

        assert.is('splice', events[2].type);
        assert.is(0, events[2].index);
        assert.is(0, events[2].count);
        assert.is(1, events[2].items.length);
        assert.is('goodbye', events[2].items[0].data);

        assert.isNot(events[0].items[0], events[2].items[0]);
    });

    test('does not emit jsx when recalculated while detached', () => {
        const greeting = field('hello');
        const node = FieldRenderNode(renderJSXNode, greeting);
        node.retain();
        const events: any[] = [];
        node.attach(
            (event) => {
                events.push(event);
            },
            (error) => {
                events.push(error);
            },
            HTML_NAMESPACE
        );
        node.detach();

        flush();

        greeting.set('goodbye');
        flush();

        assert.is(2, events.length);

        assert.is('splice', events[0].type);
        assert.is(0, events[0].index);
        assert.is(0, events[0].count);
        assert.is(1, events[0].items.length);
        assert.is('hello', events[0].items[0].data);

        assert.is('splice', events[1].type);
        assert.is(0, events[1].index);
        assert.is(1, events[1].count);
        assert.is(0, events[1].items?.length ?? 0);
    });

    test('result after recalculation while detached is emitted when attached again', () => {
        const greeting = field('hello');
        const node = FieldRenderNode(renderJSXNode, greeting);
        node.retain();
        const events: any[] = [];
        node.attach(
            (event) => {
                events.push(event);
            },
            (error) => {
                events.push(error);
            },
            HTML_NAMESPACE
        );
        node.detach();

        flush();

        greeting.set('goodbye');
        flush();

        node.attach(
            (event) => {
                events.push(event);
            },
            (error) => {
                events.push(error);
            },
            HTML_NAMESPACE
        );

        assert.is('splice', events[0].type);
        assert.is(0, events[0].index);
        assert.is(0, events[0].count);
        assert.is(1, events[0].items.length);
        assert.is('hello', events[0].items[0].data);

        assert.is('splice', events[1].type);
        assert.is(0, events[1].index);
        assert.is(1, events[1].count);
        assert.is(0, events[1].items?.length ?? 0);

        assert.is('splice', events[2].type);
        assert.is(0, events[2].index);
        assert.is(0, events[2].count);
        assert.is(1, events[2].items.length);
        assert.is('goodbye', events[2].items[0].data);
    });

    test('mount and unmount are passed through', () => {
        const tracer = new TracingRenderNode();
        const constantField = field(tracer);
        const node = FieldRenderNode(renderJSXNode, constantField);
        const events: any[] = [];

        tracer.log('0: retain');
        node.retain();
        tracer.log('1: attach');
        node.attach(
            (event) => {
                events.push(event);
            },
            (error) => {
                events.push(error);
            },
            HTML_NAMESPACE
        );
        tracer.log('2: mount');
        node.setMounted(true);
        tracer.log('3: unmount');
        node.setMounted(false);
        tracer.log('4: mount');
        node.setMounted(true);
        tracer.log('5: unmount');
        node.setMounted(false);
        tracer.log('6: detach');
        node.detach();
        tracer.log('7: attach');
        node.attach(
            (event) => {
                events.push(event);
            },
            (error) => {
                events.push(error);
            },
            HTML_NAMESPACE
        );
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
                'setMounted:true',
                '3: unmount',
                'setMounted:false',
                '4: mount',
                'setMounted:true',
                '5: unmount',
                'setMounted:false',
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
});

suite('ArrayRenderNode', () => {
    test('events are shifted', () => {
        const tracer1 = new TracingRenderNode();
        const tracer2 = new TracingRenderNode();
        const tracer3 = new TracingRenderNode();
        const node = ArrayRenderNode([tracer1, tracer2, tracer3]);
        const events: any[] = [];
        node.retain();
        node.attach(
            (event) => {
                events.push(event);
            },
            (error) => {
                events.push(error);
            },
            HTML_NAMESPACE
        );
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
                    index: 4,
                    count: 0,
                    items: [div5],
                },
            ],
            events
        );
    });

    test('standard lifecycle on mount', () => {
        const tracer = new TracingRenderNode();
        const tracer2 = new TracingRenderNode();
        const node = ArrayRenderNode([tracer, tracer2]);
        mount(testRoot, node)();
        assert.deepEqual(
            [
                'alive',
                'attach',
                'setMounted:true',
                'setMounted:false',
                'detach',
                'dead',
            ],
            tracer.events
        );
    });

    test('can be unmounted and remounted while retained', () => {
        const tracer = new TracingRenderNode();
        const tracer2 = new TracingRenderNode();
        const node = ArrayRenderNode([tracer, tracer2]);
        node.retain();
        mount(testRoot, node)();
        mount(testRoot, node)();
        node.release();
        assert.deepEqual(
            [
                'alive',
                'attach',
                'setMounted:true',
                'setMounted:false',
                'detach',
                'attach',
                'setMounted:true',
                'setMounted:false',
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
        const node = CollectionRenderNode(renderJSXNode, items);
        node.retain();
        const events: any[] = [];
        node.attach(
            (event) => {
                events.push(event);
            },
            (error) => {
                events.push(error);
            },
            HTML_NAMESPACE
        );

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
        const node = CollectionRenderNode(renderJSXNode, items);
        node.retain();
        const events: any[] = [];
        node.attach(
            (event) => {
                events.push(event);
            },
            (error) => {
                events.push(error);
            },
            HTML_NAMESPACE
        );

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
        const node = CollectionRenderNode(renderJSXNode, items);
        node.retain();
        const events: any[] = [];
        node.attach(
            (event) => {
                events.push(event);
            },
            (error) => {
                events.push(error);
            },
            HTML_NAMESPACE
        );
        node.detach();

        events.splice(0, events.length);
        items.unshift('first');
        items.push('last');
        items.splice(2, 1, 'mid');
        flush();

        assert.is(0, events.length);
        node.attach(
            (event) => {
                events.push(event);
            },
            (error) => {
                events.push(error);
            },
            HTML_NAMESPACE
        );

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
        const node = CalculationRenderNode(renderJSXNode, constantCalc);
        node.retain();
        node.attach(
            (event) => {
                events.push(event);
            },
            (error) => {
                events.push(error);
            },
            HTML_NAMESPACE
        );
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
        const node = CalculationRenderNode(renderJSXNode, constantCalc);
        node.retain();
        node.attach(
            (event) => {
                events.push(event);
            },
            (error) => {
                events.push(error);
            },
            HTML_NAMESPACE
        );

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
        const node = CalculationRenderNode(renderJSXNode, constantCalc);
        node.retain();
        node.attach(
            (event) => {
                events.push(event);
            },
            (error) => {
                events.push(error);
            },
            HTML_NAMESPACE
        );
        node.detach();
        events = [];

        state.isError = true;
        flush();
        // We are not attached, so we don't get an error event
        assert.is(1, events.length);
        assert.is('calc', events[0]);
        events = [];

        node.attach(
            (event) => {
                events.push(event);
            },
            (error) => {
                events.push(error);
            },
            HTML_NAMESPACE
        );

        assert.is(1, events.length);
        assert.isTruthy(events[0] instanceof Error);
        assert.is('boom', events[0].message);
    });

    test('calls lifecycle methods when added while mounted', () => {
        const tracer1 = new TracingRenderNode();
        const tracer2 = new TracingRenderNode();
        const items = collection([tracer1]);
        const node = CollectionRenderNode(renderJSXNode, items);
        const events: any[] = [];
        node.retain();
        node.attach(
            (event) => {
                events.push(event);
            },
            (error) => {
                events.push(error);
            },
            HTML_NAMESPACE
        );
        node.setMounted(true);
        assert.deepEqual(
            ['alive', 'attach', 'setMounted:true'],
            tracer1.events
        );
        assert.deepEqual([], tracer2.events);
        items.push(tracer2);
        tracer1.events.push('flush 1');
        tracer2.events.push('flush 1');
        flush();
        assert.deepEqual(
            ['alive', 'attach', 'setMounted:true', 'flush 1'],
            tracer1.events
        );
        assert.deepEqual(
            ['flush 1', 'alive', 'attach', 'setMounted:true'],
            tracer2.events
        );
        items.shift();
        tracer1.events.push('flush 2');
        tracer2.events.push('flush 2');
        flush();
        assert.deepEqual(
            [
                'alive',
                'attach',
                'setMounted:true',
                'flush 1',
                'flush 2',
                'setMounted:false',
                'detach',
                'dead',
            ],
            tracer1.events
        );
        assert.deepEqual(
            ['flush 1', 'alive', 'attach', 'setMounted:true', 'flush 2'],
            tracer2.events
        );
    });

    test('calls lifecycle methods when added while unmounted', () => {
        const tracer1 = new TracingRenderNode();
        const tracer2 = new TracingRenderNode();
        const items = collection([tracer1]);
        const node = CollectionRenderNode(renderJSXNode, items);
        const events: any[] = [];
        node.retain();
        node.attach(
            (event) => {
                events.push(event);
            },
            (error) => {
                events.push(error);
            },
            HTML_NAMESPACE
        );
        assert.deepEqual(['alive', 'attach'], tracer1.events);
        assert.deepEqual([], tracer2.events);
        items.push(tracer2);
        tracer1.events.push('flush 1');
        tracer2.events.push('flush 1');
        flush();
        assert.deepEqual(['alive', 'attach', 'flush 1'], tracer1.events);
        assert.deepEqual(['flush 1', 'alive', 'attach'], tracer2.events);
        items.shift();
        tracer1.events.push('flush 2');
        tracer2.events.push('flush 2');
        flush();
        assert.deepEqual(
            ['alive', 'attach', 'flush 1', 'flush 2', 'detach', 'dead'],
            tracer1.events
        );
        assert.deepEqual(
            ['flush 1', 'alive', 'attach', 'flush 2'],
            tracer2.events
        );
    });
});

suite('ComponentRenderNode', () => {
    test('lifecycle methods called in correct order', () => {
        const events: any[] = [];
        const div = document.createElement('div');
        const foreign = ForeignRenderNode(div);

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

        const node = ComponentRenderNode(Component, {}, []);
        events.push('0:retain');
        node.retain();
        events.push('1:attach');
        node.attach(
            (event) => {
                events.push(event);
            },
            (error) => {
                events.push(error);
            },
            HTML_NAMESPACE
        );
        events.push('2:onMount');
        node.setMounted(true);
        flush();
        events.push('3:onUnmount');
        node.setMounted(false);
        flush();
        events.push('4:detach');
        node.detach();
        events.push('5:release');
        node.release();
        const expected = [
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
                items: undefined,
            },
            '5:release',
            'Component:onDestroy',
        ];
        assert.deepEqual(expected, events);
    });

    test('can be detached and reattached while retained', () => {
        const events: any[] = [];
        const div = document.createElement('div');
        const foreign = ForeignRenderNode(div);

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

        const node = ComponentRenderNode(Component, {}, []);
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

        const node = ComponentRenderNode(Component, {}, []);
        node.retain();
        node.release();

        assert.deepEqual(['Component:render', 'Component:onDestroy'], events);
    });
});

suite('IntrinsicObserverRenderNode', () => {
    test('renders children normally', () => {
        const tracer = new TracingRenderNode();
        const node = IntrinsicObserverRenderNode(
            undefined,
            undefined,
            ArrayRenderNode([tracer])
        );
        node.retain();
        node.attach(
            (event) => {
                tracer.log(event);
            },
            (error) => {
                tracer.log(error);
            },
            HTML_NAMESPACE
        );
        node.setMounted(true);
        node.setMounted(false);
        node.detach();
        node.release();
        assert.deepEqual(
            [
                'alive',
                'attach',
                'setMounted:true',
                'setMounted:false',
                'detach',
                'dead',
            ],
            tracer.events
        );
    });

    test('calls callback with existing nodes on mount and unmount', () => {
        const tracer = new TracingRenderNode();
        const nodeCalls: [Node, IntrinsicObserverEventType][] = [];
        const elementCalls: [Element, IntrinsicObserverEventType][] = [];
        const node = IntrinsicObserverRenderNode(
            (node, type) => nodeCalls.push([node, type]),
            (node, type) => elementCalls.push([node, type]),
            ArrayRenderNode([tracer])
        );

        const text = document.createTextNode('text');
        const div = document.createElement('div');

        node.retain();
        node.attach(
            (event) => {
                tracer.log(event);
            },
            (error) => {
                tracer.log(error);
            },
            HTML_NAMESPACE
        );
        tracer.emitter?.({
            type: ArrayEventType.SPLICE,
            index: 0,
            count: 0,
            items: [text, div],
        });

        assert.deepEqual([], nodeCalls);
        assert.deepEqual([], elementCalls);

        node.setMounted(true);
        flush();

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

        node.setMounted(false);
        flush();

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
        const node = IntrinsicObserverRenderNode(
            (node, type) => nodeCalls.push([node, type]),
            (node, type) => elementCalls.push([node, type]),
            ArrayRenderNode([tracer])
        );

        const text = document.createTextNode('text');
        const div = document.createElement('div');

        node.retain();
        node.attach(
            (event) => {
                tracer.log(event);
            },
            (error) => {
                tracer.log(error);
            },
            HTML_NAMESPACE
        );
        node.setMounted(true);

        tracer.emitter?.({
            type: ArrayEventType.SPLICE,
            index: 0,
            count: 0,
            items: [text, div],
        });
        flush();

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
        flush();

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
        flush();

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
