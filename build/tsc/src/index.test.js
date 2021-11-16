import { suite, test, beforeEach, assert } from './test';
import * as revise from './index';
suite('behavior', () => {
    beforeEach(() => {
        revise.reset();
    });
    function setUp() {
        const model0 = revise.model({
            task: 'apples',
            done: false,
        });
        const model1 = revise.model({
            task: 'bananas',
            done: false,
        });
        const model2 = revise.model({
            task: 'milk',
            done: false,
        });
        const model3 = revise.model({
            task: 'cookies',
            done: false,
        });
        const model4 = revise.model({
            task: 'and',
            done: true,
        });
        const todoList = revise.model({
            name: 'Shopping',
            items: revise.collection([model0, model1]),
        });
        const itemNames = new Map();
        itemNames.set(model0, 'model0');
        itemNames.set(model1, 'model1');
        itemNames.set(model2, 'model2');
        itemNames.set(model3, 'model3');
        itemNames.set(model4, 'model4');
        const renders = [];
        const makeItemRenderer = (item) => {
            return revise.calc(() => {
                renders.push(`item:${itemNames.get(item)}`);
                return `[${item.done ? 'x' : ' '}] ${item.task}`;
            });
        };
        const itemRenderers = new WeakMap();
        const getItemRenderer = (todoItem) => {
            let renderer = itemRenderers.get(todoItem);
            if (!renderer) {
                renderer = makeItemRenderer(todoItem);
                itemRenderers.set(todoItem, renderer);
            }
            return renderer;
        };
        const makeTodoListRenderer = (todoList) => {
            return revise.calc(() => {
                renders.push('list');
                const lines = [`${todoList.name}:`];
                todoList.items.forEach((item) => {
                    lines.push(getItemRenderer(item)());
                });
                return lines.join('\n');
            });
        };
        const app = makeTodoListRenderer(todoList);
        revise.retain(app);
        return {
            model0,
            model1,
            model2,
            model3,
            model4,
            todoList,
            app,
            renders,
        };
    }
    test('initial render renders tree', () => {
        const { model0, app, renders } = setUp();
        assert.is(app(), 'Shopping:\n[ ] apples\n[ ] bananas');
        assert.deepEqual(renders, ['list', 'item:model0', 'item:model1']);
        model0.task = 'what';
        revise.flush();
        assert.is(app(), 'Shopping:\n[ ] what\n[ ] bananas');
    });
    test('no-op rerender does nothing', () => {
        const { app, renders } = setUp();
        assert.deepEqual(renders, []);
        app();
        assert.deepEqual(renders, ['list', 'item:model0', 'item:model1']);
        app();
        assert.deepEqual(renders, ['list', 'item:model0', 'item:model1']);
    });
    test('change a dependency does nothing if flush not called', () => {
        const { model0, app, renders } = setUp();
        app(); // Force initial render
        model0.done = true;
        assert.is(app(), 'Shopping:\n[ ] apples\n[ ] bananas');
        assert.deepEqual(renders, ['list', 'item:model0', 'item:model1']);
    });
    test('flush causes update', () => {
        const { model0, app, renders } = setUp();
        app(); // Force initial render
        model0.done = true;
        // flush causes update
        revise.flush();
        assert.deepEqual(renders, [
            'list',
            'item:model0',
            'item:model1',
            // <<flush here>>
            'item:model0',
            'list',
        ]);
        // manual recomupute does nothing
        assert.is(app(), 'Shopping:\n[x] apples\n[ ] bananas');
        assert.deepEqual(renders, [
            'list',
            'item:model0',
            'item:model1',
            'item:model0',
            'list',
        ]);
    });
    test('duplicate flush does nothing', () => {
        const { model0, app, renders } = setUp();
        app(); // Force initial render
        model0.done = true;
        // flush causes update
        revise.flush();
        assert.deepEqual(renders, [
            'list',
            'item:model0',
            'item:model1',
            // <<flush 1 here>>
            'item:model0',
            'list',
        ]);
        // flush again does nothing
        revise.flush();
        assert.deepEqual(renders, [
            'list',
            'item:model0',
            'item:model1',
            // <<flush 1 here>>
            'item:model0',
            'list',
            // <<flush 2 here>>
        ]);
    });
    test('change multiple dependencies', () => {
        const { model0, model1, app, renders } = setUp();
        app(); // initial render
        // change another dependency
        model0.done = true;
        model1.task = 'cherries';
        revise.flush();
        assert.deepEqual(renders.slice(0, 3), [
            'list',
            'item:model0',
            'item:model1',
        ]);
        const postFlushRenders = renders.slice(3);
        assert.arrayIncludes(postFlushRenders, 'item:model0');
        assert.arrayIncludes(postFlushRenders, 'item:model1');
        assert.arrayIncludes(postFlushRenders, 'list');
        assert.lessThan(postFlushRenders.indexOf('item:model0'), postFlushRenders.indexOf('list'));
        assert.lessThan(postFlushRenders.indexOf('item:model1'), postFlushRenders.indexOf('list'));
        assert.is(app(), 'Shopping:\n[x] apples\n[ ] cherries');
    });
    test('high level dependencies does not cause child dependencies to rerender', () => {
        const { todoList, app, renders } = setUp();
        app(); // initial render
        todoList.name = 'Grocery';
        revise.flush();
        assert.deepEqual(renders, [
            'list',
            'item:model0',
            'item:model1',
            // <<flush here>>
            'list',
        ]);
        assert.is(app(), 'Grocery:\n[ ] apples\n[ ] bananas');
    });
    test('adding new items updates collection and renders new items', () => {
        const { model2, model3, todoList, app, renders } = setUp();
        app(); // initial render
        todoList.items.push(model2);
        todoList.items.unshift(model3);
        revise.flush();
        assert.deepEqual(renders, [
            'list',
            'item:model0',
            'item:model1',
            // <<flush here>>
            'list',
            'item:model3',
            'item:model2',
        ]);
        assert.is(app(), 'Shopping:\n[ ] cookies\n[ ] apples\n[ ] bananas\n[ ] milk');
    });
    test('fancy array stuff like splicing works', () => {
        const { model0, model1, model2, model3, model4, todoList, app, renders, } = setUp();
        todoList.items = revise.collection([model3, model0, model1, model2]);
        app(); // initial render
        todoList.items.splice(1, 2, model4);
        revise.flush();
        assert.deepEqual(renders, [
            'list',
            'item:model3',
            'item:model0',
            'item:model1',
            'item:model2',
            // <<flush here>>
            'list',
            'item:model4',
        ]);
        assert.is(app(), 'Shopping:\n[ ] cookies\n[x] and\n[ ] milk');
    });
    test('updating items that once caused renders but no longer do takes no effect', () => {
        const { model0, todoList, app, renders } = setUp();
        app(); // initial render
        todoList.items.shift(); // remove model0
        revise.flush(); // flush 1: update with model0 removed
        model0.task = 'whatever';
        revise.flush(); // flush 2: nothing should happen
        assert.deepEqual(renders, [
            'list',
            'item:model0',
            'item:model1',
            // <<flush 1 here>>
            'list',
            // <<flush 2 here>>
        ]);
        assert.is(app(), 'Shopping:\n[ ] bananas');
    });
});
suite('invariants', () => {
    suite('models feel like objects', () => {
        beforeEach((ctx) => {
            ctx.model = revise.model({
                foo: 3,
                bar: {
                    hello: 'world',
                },
            });
        });
        test('reads feel like reads', (ctx) => {
            assert.is(ctx.model.foo, 3);
            assert.deepEqual(ctx.model.bar, { hello: 'world' });
        });
        test('deepEquality works as expected', (ctx) => {
            assert.deepEqual(ctx.model, {
                foo: 3,
                bar: { hello: 'world' },
            });
        });
        test('writes are written', (ctx) => {
            ctx.model.foo = 4;
            assert.is(ctx.model.foo, 4);
        });
        test('keys are correct', (ctx) => {
            const keys = Object.keys(ctx.model);
            assert.arrayIncludes(keys, 'foo');
            assert.arrayIncludes(keys, 'bar');
        });
    });
});
//# sourceMappingURL=index.test.js.map