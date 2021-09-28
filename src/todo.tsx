import { React, model, collection, computation, flush, debug } from './index';

declare global {
    namespace JSX {
        interface IntrinsicElements {
            div: any;
            input: any;
            ul: any;
            li: any;
            h1: any;
        }
    }
}

interface TodoItem {
    done: boolean;
    task: string;
}

interface TodoList {
    name: string;
    items: TodoItem[];
}

const list: TodoList = model({
    name: 'Shopping',
    items: collection([
        model({
            done: false,
            task: 'apple',
        }),
        model({
            done: false,
            task: 'banana',
        }),
        model({
            done: false,
            task: 'celery',
        }),
    ]),
});

type TodoItemProps = { item: TodoItem };
const TodoItem = ({ item }: TodoItemProps) => {
    return (
        <li>
            <input type="checkbox" checked={computation(() => item.done)} />{' '}
            {computation(() => item.task)}
        </li>
    );
};

type TodoListProps = { list: TodoList };
const TodoList = ({ list }: TodoListProps) => {
    return (
        <div>
            <h1 class="whatever">To do: {computation(() => list.name)}</h1>
            <ul>
                {computation(() =>
                    list.items.map((item) => <TodoItem item={item} />)
                )}
            </ul>
        </div>
    );
};

// main
const rendered = TodoList({ list });
console.log(rendered);
document.body.appendChild(rendered.node);

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
alert('All ready to go');
