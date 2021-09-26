import * as path from 'path';

import { suite, test, beforeEach, afterEach, assert } from './test';
import * as revise from './index';

const packageJson = require(path.join(
    process.env['PROJECT_ROOT']!,
    '/package.json'
));

test('package.json version is consistent with exported version', () => {
    assert.is(packageJson.version, revise.version);
});

suite('behavior', () => {
    function setUp() {
        type Renderer = () => string;

        interface TodoItem {
            task: string;
            done: boolean;
        }
        interface TodoList {
            name: string;
            items: TodoItem[];
        }

        const model0 = revise.model<TodoItem>({
            task: 'apples',
            done: false,
        });
        const model1 = revise.model<TodoItem>({
            task: 'bananas',
            done: false,
        });
        const model2 = revise.model<TodoItem>({
            task: 'milk',
            done: false,
        });
        const model3 = revise.model<TodoItem>({
            task: 'cookies',
            done: false,
        });
        const model4 = revise.model<TodoItem>({
            task: 'and',
            done: true,
        });

        const todoList = revise.model<TodoList>({
            name: 'Shopping',
            items: revise.collection<TodoItem>([model0, model1]),
        });

        const itemNames = new Map<TodoItem, string>();
        itemNames.set(model0, 'model0');
        itemNames.set(model1, 'model1');
        itemNames.set(model2, 'model2');
        itemNames.set(model3, 'model3');
        itemNames.set(model4, 'model4');

        const renders: string[] = [];

        const makeItemRenderer = (item: TodoItem) => {
            return revise.computation(() => {
                renders.push(`item:${itemNames.get(item)}`);
                return `[${item.done ? 'x' : ' '}] ${item.task}`;
            });
        };

        const itemRenderers = new WeakMap();
        const getItemRenderer = (todoItem: TodoItem): Renderer => {
            let renderer = itemRenderers.get(todoItem);
            if (!renderer) {
                renderer = makeItemRenderer(todoItem);
                itemRenderers.set(todoItem, renderer);
            }
            return renderer;
        };

        const makeTodoListRenderer = (todoList: TodoList) => {
            return revise.computation(() => {
                renders.push('list');
                const lines = [`${todoList.name}:`];
                todoList.items.forEach((item) => {
                    lines.push(getItemRenderer(item)());
                });
                return lines.join('\n');
            });
        };

        const app = makeTodoListRenderer(todoList);

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
        const { app, renders } = setUp();

        assert.is(app(), 'Shopping:\n[ ] apples\n[ ] bananas');
        assert.deepEqual(renders, ['list', 'item:model0', 'item:model1']);
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
        assert.deepEqual(renders, [
            'list',
            'item:model0',
            'item:model1',
            // <<flush here>>
            'item:model0',
            'item:model1',
            'list',
        ]);
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
        assert.is(
            app(),
            'Shopping:\n[ ] cookies\n[ ] apples\n[ ] bananas\n[ ] milk'
        );
    });

    test('fancy array stuff like splicing works', () => {
        const {
            model0,
            model1,
            model2,
            model3,
            model4,
            todoList,
            app,
            renders,
        } = setUp();
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
        const { model0, model3, todoList, app, renders } = setUp();
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
            'item:model0', // TODO: figure out how to do garbage collection
        ]);
        assert.is(app(), 'Shopping:\n[ ] bananas');
    });
});

suite('invariants', () => {
    suite('models feel like objects', () => {
        interface Ctx {
            model: {
                foo: number;
                bar: any;
            };
        }

        beforeEach((ctx: Ctx) => {
            ctx.model = revise.model({
                foo: 3,
                bar: {
                    hello: 'world',
                },
            });
        });

        test('reads feel like reads', (ctx: Ctx) => {
            assert.is(ctx.model.foo, 3);
            assert.deepEqual(ctx.model.bar, { hello: 'world' });
        });

        test('deepEquality works as expected', (ctx: Ctx) => {
            assert.deepEqual(ctx.model, {
                foo: 3,
                bar: { hello: 'world' },
            });
        });

        test('writes are written', (ctx: Ctx) => {
            ctx.model.foo = 4;
            assert.is(ctx.model.foo, 4);
        });

        test('keys are correct', (ctx: Ctx) => {
            const keys = Object.keys(ctx.model);
            assert.arrayIncludes(keys, 'foo');
            assert.arrayIncludes(keys, 'bar');
        });
    });
});
