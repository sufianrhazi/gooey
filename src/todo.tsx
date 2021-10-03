import {
    React,
    name,
    model,
    collection,
    computation,
    flush,
    debug,
    mount,
    Component,
} from './index';

interface TodoItem {
    done: boolean;
    task: string;
}

interface TodoList {
    name: string;
    items: TodoItem[];
}

const list: TodoList = name(
    model({
        name: 'Shopping',
        items: name(
            collection([
                name(
                    model({
                        done: false,
                        task: 'apple',
                    }),
                    'item:0'
                ),
                name(
                    model({
                        done: false,
                        task: 'banana',
                    }),
                    'item:1'
                ),
                name(
                    model({
                        done: false,
                        task: 'celery',
                    }),
                    'item:3'
                ),
            ]),
            'items'
        ),
    }),
    'list'
);
(window as any).list = list;

type TodoItemProps = { item: TodoItem };
const TodoItem: Component<TodoItemProps> = ({ item }, { onUnmount }) => {
    console.log('Mounting TodoItem', item);
    onUnmount(() => {
        console.log('Unmounting TodoItem', item);
    });
    const onChange = (event: any) => {
        item.done = event.target.checked;
    };
    return (
        <li>
            <label>
                <input
                    type="checkbox"
                    on:change={onChange}
                    checked={name(
                        computation(() => item.done),
                        'TodoItem:checked'
                    )}
                />{' '}
                {name(
                    computation(() => item.task),
                    'TodoItem:task'
                )}
            </label>
        </li>
    );
};

type TodoListProps = { list: TodoList };
const TodoList: Component<TodoListProps> = ({ list }, { onUnmount }) => {
    const localState = model({ isShowingStuff: true });
    console.log('Mounting TodoList');
    onUnmount(() => {
        console.log('Unmounting TodoList');
    });
    const onClickAdd = () => {
        const el = document.getElementById('input');
        if (!el || !(el instanceof HTMLInputElement)) return;
        list.items.push(
            model({
                done: false,
                task: el.value,
            })
        );
        el.value = '';
    };

    const onClickToggle = () => {
        localState.isShowingStuff = !localState.isShowingStuff;
    };

    const onClickClear = () => {
        list.items.splice(
            0,
            list.items.length,
            ...list.items.filter((item) => !item.done)
        );
    };

    return (
        <>
            <h1 class="whatever">
                To do:{' '}
                {name(
                    computation(() => list.name),
                    'TodoList:name'
                )}
                {' - '}
                {name(
                    computation(() =>
                        localState.isShowingStuff ? 'stuff' : 'not stuff'
                    ),
                    'TodoList:stuff'
                )}
            </h1>
            <ul>
                {name(
                    computation(() =>
                        list.items.map((item) => <TodoItem item={item} />)
                    ),
                    'TodoList:items'
                )}
            </ul>
            <hr />
            <button on:click={onClickAdd}>+</button>{' '}
            <button on:click={onClickToggle}>toggle extra</button>{' '}
            <input id="input" type="text" value="Don't forget the milk" />
            <br />
            <button on:click={onClickClear}>Clear completed</button>
        </>
    );
};

// main
const root = document.getElementById('root');
if (root) {
    mount(root, <TodoList list={list} />);
}

// ui
const flushButton = document.createElement('button');
flushButton.textContent = 'flush';
flushButton.addEventListener('click', () => {
    flush();
});
document.body.appendChild(flushButton);

const doSomethingButton = document.createElement('button');
doSomethingButton.textContent = 'doSomething';
doSomethingButton.addEventListener('click', () => {
    list.items.forEach((item) => {
        item.done = Math.random() < 0.5;
        item.task = item.task + '!';
    });
});
document.body.appendChild(doSomethingButton);

const debugButon = document.createElement('button');
debugButon.textContent = 'graphviz';
debugButon.addEventListener('click', () => {
    console.log(debug());
});
document.body.appendChild(debugButon);
