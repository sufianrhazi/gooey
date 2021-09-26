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
    test('basic behavior', () => {
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

        let rerenders: string[] = [];

        const makeItemRenderer = (item: TodoItem) => {
            return revise.computation(() => {
                rerenders.push(`item:${itemNames.get(item)}`);
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
                rerenders.push('list');
                const lines = [`${todoList.name}:`];
                todoList.items.forEach((item) => {
                    lines.push(getItemRenderer(item)());
                });
                return lines.join('\n');
            });
        };

        const app = makeTodoListRenderer(todoList);

        // Initial render
        assert.is(app(), 'Shopping:\n[ ] apples\n[ ] bananas');
        assert.deepEqual(rerenders, ['list', 'item:model0', 'item:model1']);
        rerenders = [];

        // no-op render
        assert.is(app(), 'Shopping:\n[ ] apples\n[ ] bananas');
        assert.deepEqual(rerenders, []);

        // change a dependency, but don't flush
        model0.done = true;
        assert.is(app(), 'Shopping:\n[ ] apples\n[ ] bananas');
        assert.deepEqual(rerenders, []);

        // flush causes update on next recompute
        revise.flush();
        assert.deepEqual(rerenders, ['item:model0', 'list']);
        rerenders = [];

        // Next recomupute
        assert.is(app(), 'Shopping:\n[x] apples\n[ ] bananas');

        // Recompute does not actually cause rerenders
        assert.deepEqual(rerenders, []);

        // change another dependency
        model1.task = 'cherries';
        revise.flush();
        assert.deepEqual(rerenders, ['item:model1', 'list']);
        rerenders = [];
        assert.is(app(), 'Shopping:\n[x] apples\n[ ] cherries');

        // change a higher level dependency
        todoList.name = 'Grocery';
        revise.flush();
        assert.deepEqual(rerenders, ['list']);
        rerenders = [];
        assert.is(app(), 'Grocery:\n[x] apples\n[ ] cherries');

        // add some new items
        todoList.items.push(model2);
        todoList.items.unshift(model3);
        revise.flush();
        assert.deepEqual(rerenders, ['list', 'item:model3', 'item:model2']);
        rerenders = [];
        assert.is(
            app(),
            'Grocery:\n[ ] cookies\n[x] apples\n[ ] cherries\n[ ] milk'
        );

        // more manipulation
        todoList.items.splice(1, 2, model4);
        revise.flush();
        assert.deepEqual(rerenders, ['list', 'item:model4']);
        rerenders = [];
        assert.is(app(), 'Grocery:\n[ ] cookies\n[x] and\n[ ] milk');
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
