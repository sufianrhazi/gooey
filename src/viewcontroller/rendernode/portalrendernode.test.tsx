import { assert, beforeEach, suite, test } from '@srhazi/gooey-test';

import { ArrayEventType } from '../../common/arrayevent';
import { flush, reset, subscribe } from '../../model/engine';
import { HTML_NAMESPACE } from '../xmlnamespace';
import { PortalRenderNode } from './portalrendernode';
import { emptyRenderNode, SingleChildRenderNode } from './rendernode';

beforeEach(() => {
    reset();
    subscribe();
    const element: HTMLElement = document.getElementById('test-root')!;
    element.replaceChildren();
});

const mkdiv = (id: string) => {
    const div = document.createElement('div');
    div.id = id;
    return div;
};

const mktext = (text: string) => {
    const el = document.createElement('span');
    el.textContent = text;
    return el;
};

suite('PortalRenderNode', () => {
    const setup = () => {
        const singleChildRenderNode = new SingleChildRenderNode(
            {},
            emptyRenderNode
        );
        const element: HTMLElement = document.getElementById('test-root')!;
        const portalRenderNode = PortalRenderNode(
            element,
            singleChildRenderNode,
            undefined
        );

        portalRenderNode.attach({
            errorEmitter: (err) => assert.isNot(null, err, 'unexpected error'),
            nodeEmitter: (node) => assert.isNot(null, node, 'unexpected node'),
            xmlNamespace: HTML_NAMESPACE,
        });

        return { element, portalRenderNode, singleChildRenderNode };
    };
    test('insert 1 node from empty', () => {
        const { singleChildRenderNode, element } = setup();

        singleChildRenderNode.emitEvent({
            type: ArrayEventType.SPLICE,
            index: 0,
            count: 0,
            items: [mkdiv('one')],
        });

        flush();

        assert.is(`<div id="one"></div>`, element.innerHTML);
    });

    test('delete 1 node to empty', () => {
        const { singleChildRenderNode, element } = setup();

        singleChildRenderNode.emitEvent({
            type: ArrayEventType.SPLICE,
            index: 0,
            count: 0,
            items: [mkdiv('one')],
        });

        flush();

        assert.is(`<div id="one"></div>`, element.innerHTML);

        singleChildRenderNode.emitEvent({
            type: ArrayEventType.SPLICE,
            index: 0,
            count: 1,
        });

        flush();

        assert.is(``, element.innerHTML);
    });
    test('insert 3 nodes from empty in one go', () => {
        const { singleChildRenderNode, element } = setup();

        singleChildRenderNode.emitEvent({
            type: ArrayEventType.SPLICE,
            index: 0,
            count: 0,
            items: [mkdiv('one'), mkdiv('two'), mkdiv('three')],
        });

        flush();

        assert.is(
            `<div id="one"></div><div id="two"></div><div id="three"></div>`,
            element.innerHTML
        );
    });
    test('insert 3 nodes from empty in three inserts', () => {
        const { singleChildRenderNode, element } = setup();

        singleChildRenderNode.emitEvent({
            type: ArrayEventType.SPLICE,
            index: 0,
            count: 0,
            items: [mkdiv('one')],
        });
        singleChildRenderNode.emitEvent({
            type: ArrayEventType.SPLICE,
            index: 1,
            count: 0,
            items: [mkdiv('three')],
        });
        singleChildRenderNode.emitEvent({
            type: ArrayEventType.SPLICE,
            index: 1,
            count: 0,
            items: [mkdiv('two')],
        });

        flush();

        assert.is(
            `<div id="one"></div><div id="two"></div><div id="three"></div>`,
            element.innerHTML
        );
    });
    test('remove 1st of 3 nodes', () => {
        const { singleChildRenderNode, element } = setup();

        singleChildRenderNode.emitEvent({
            type: ArrayEventType.SPLICE,
            index: 0,
            count: 0,
            items: [mkdiv('one'), mkdiv('two'), mkdiv('three')],
        });

        flush();

        singleChildRenderNode.emitEvent({
            type: ArrayEventType.SPLICE,
            index: 0,
            count: 1,
        });

        flush();
        assert.is(
            `<div id="two"></div><div id="three"></div>`,
            element.innerHTML
        );
    });
    test('remove 2nd of 3 nodes', () => {
        const { singleChildRenderNode, element } = setup();

        singleChildRenderNode.emitEvent({
            type: ArrayEventType.SPLICE,
            index: 0,
            count: 0,
            items: [mkdiv('one'), mkdiv('two'), mkdiv('three')],
        });

        flush();

        singleChildRenderNode.emitEvent({
            type: ArrayEventType.SPLICE,
            index: 1,
            count: 1,
        });

        flush();
        assert.is(
            `<div id="one"></div><div id="three"></div>`,
            element.innerHTML
        );
    });
    test('remove 3rd of 3 nodes', () => {
        const { singleChildRenderNode, element } = setup();

        singleChildRenderNode.emitEvent({
            type: ArrayEventType.SPLICE,
            index: 0,
            count: 0,
            items: [mkdiv('one'), mkdiv('two'), mkdiv('three')],
        });

        flush();

        singleChildRenderNode.emitEvent({
            type: ArrayEventType.SPLICE,
            index: 2,
            count: 1,
        });

        flush();
        assert.is(
            `<div id="one"></div><div id="two"></div>`,
            element.innerHTML
        );
    });
    test('replace 1st of 3 nodes with 2 nodes', () => {
        const { singleChildRenderNode, element } = setup();

        singleChildRenderNode.emitEvent({
            type: ArrayEventType.SPLICE,
            index: 0,
            count: 0,
            items: [mkdiv('one'), mkdiv('two'), mkdiv('three')],
        });

        flush();

        singleChildRenderNode.emitEvent({
            type: ArrayEventType.SPLICE,
            index: 0,
            count: 1,
            items: [mkdiv('a'), mkdiv('b')],
        });

        flush();
        assert.is(
            `<div id="a"></div><div id="b"></div><div id="two"></div><div id="three"></div>`,
            element.innerHTML
        );
    });
    test('replace 2nd of 3 nodes with 2 nodes', () => {
        const { singleChildRenderNode, element } = setup();

        singleChildRenderNode.emitEvent({
            type: ArrayEventType.SPLICE,
            index: 0,
            count: 0,
            items: [mkdiv('one'), mkdiv('two'), mkdiv('three')],
        });

        flush();

        singleChildRenderNode.emitEvent({
            type: ArrayEventType.SPLICE,
            index: 1,
            count: 1,
            items: [mkdiv('a'), mkdiv('b')],
        });

        flush();
        assert.is(
            `<div id="one"></div><div id="a"></div><div id="b"></div><div id="three"></div>`,
            element.innerHTML
        );
    });
    test('replace 3rd of 3 nodes with 2 nodes', () => {
        const { singleChildRenderNode, element } = setup();

        singleChildRenderNode.emitEvent({
            type: ArrayEventType.SPLICE,
            index: 0,
            count: 0,
            items: [mkdiv('one'), mkdiv('two'), mkdiv('three')],
        });

        flush();

        singleChildRenderNode.emitEvent({
            type: ArrayEventType.SPLICE,
            index: 2,
            count: 1,
            items: [mkdiv('a'), mkdiv('b')],
        });

        flush();
        assert.is(
            `<div id="one"></div><div id="two"></div><div id="a"></div><div id="b"></div>`,
            element.innerHTML
        );
    });
    test('replace 2nd and 4th of 5 nodes with 2 nodes each', () => {
        const { singleChildRenderNode, element } = setup();

        singleChildRenderNode.emitEvent({
            type: ArrayEventType.SPLICE,
            index: 0,
            count: 0,
            items: [
                mkdiv('one'),
                mkdiv('two'),
                mkdiv('three'),
                mkdiv('four'),
                mkdiv('five'),
            ],
        });

        flush();

        singleChildRenderNode.emitEvent({
            type: ArrayEventType.SPLICE,
            index: 3,
            count: 1,
            items: [mkdiv('c'), mkdiv('d')],
        });

        singleChildRenderNode.emitEvent({
            type: ArrayEventType.SPLICE,
            index: 1,
            count: 1,
            items: [mkdiv('a'), mkdiv('b')],
        });

        flush();
        assert.deepEqual(
            ['one', 'a', 'b', 'three', 'c', 'd', 'five'],
            Array.from(element.childNodes).map((n) => (n as Element).id)
        );
    });
    test('complex operation (splice and sort)', () => {
        const { singleChildRenderNode, element } = setup();

        singleChildRenderNode.emitEvent({
            type: ArrayEventType.SPLICE,
            index: 0,
            count: 0,
            items: [
                mktext('1'),
                mktext('2'),
                mktext('3'),
                mktext('4'),
                mktext('5'),
                mktext('6'),
                mktext('7'),
            ],
        });

        flush();

        // Start:
        // 1 2 3 4 5 6 7
        //
        // splice [4,5] -> [x,y,z]
        // -> 1 2 3 x y z 6 7
        singleChildRenderNode.emitEvent({
            type: ArrayEventType.SPLICE,
            index: 3,
            count: 2,
            items: [mktext('x'), mktext('y'), mktext('z')],
        });
        // move [z,6] -> index 1
        // -> 1 z 6 2 3 x y 7

        singleChildRenderNode.emitEvent({
            type: ArrayEventType.MOVE,
            from: 5,
            count: 2,
            to: 1,
        });

        flush();

        assert.is('1z623xy7', element.textContent);
    });
});
