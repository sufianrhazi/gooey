import Gooey, {
    Collection,
    Component,
    Model,
    calc,
    collection,
    model,
    mount,
    ref,
    debugGetGraph,
} from '../../index';
import { makeGraphvizDebuggerRef } from '../debug';

const graphvizRef = makeGraphvizDebuggerRef();

////////////////////////////////////////////////////////////////////////////////
// Application State
////////////////////////////////////////////////////////////////////////////////
interface TodoItem {
    done: boolean;
    task: string;
}

interface TodoList {
    name: string;
    items: Collection<Model<TodoItem>>;
}

function makeTodoListItem(task: string): Model<TodoItem> {
    return model({ done: false, task }, `TodoItem:${task}`);
}

const globalState: Model<TodoList> = model(
    {
        name: 'Groceries',
        items: collection<Model<TodoItem>>(
            [makeTodoListItem('eggs'), makeTodoListItem('bread')],
            'TodoListItems'
        ),
    },
    'TodoList'
);
// Exported to window, so you can play with it in the console!
(window as any).globalState = globalState;

////////////////////////////////////////////////////////////////////////////////
// Components
////////////////////////////////////////////////////////////////////////////////

const TodoItem: Component<{ item: TodoItem }> = ({ item }) => {
    const onChange = (event: Event) => {
        item.done = (event.target as HTMLInputElement).checked;
    };
    return (
        <li class="list-group-item p-0">
            <label class="d-block px-3 py-2">
                <input
                    type="checkbox"
                    class="form-check-input me-3"
                    on:change={onChange}
                    checked={calc(() => item.done, `item:${item.task}:checked`)}
                />
                <span
                    style={calc(
                        () =>
                            item.done ? 'text-decoration: line-through' : '',
                        `item:${item.task}:style`
                    )}
                >
                    {calc(() => item.task, `item:${item.task}:text`)}
                </span>
            </label>
        </li>
    );
};

const TodoList = () => {
    return (
        <div class="my-2">
            <ul class="list-group">
                {calc(
                    () =>
                        globalState.items.mapView(
                            (item) => <TodoItem item={item} />,
                            'globalState.items.mapView'
                        ),
                    'ItemList'
                )}
            </ul>
        </div>
    );
};

const TodoControls: Component<{}> = (_props, { onMount }) => {
    const inputRef = ref<HTMLInputElement>();

    onMount(() => {
        // Auto-focus the input on render
        if (inputRef.current) inputRef.current.focus();
    });

    const onClickAdd = () => {
        if (!inputRef.current) return;
        if (!inputRef.current.value) return;
        globalState.items.push(makeTodoListItem(inputRef.current.value));
        inputRef.current.value = '';

        if (inputRef.current) inputRef.current.focus();
    };

    const onClickClear = () => {
        globalState.items.reject((item) => item.done);

        if (inputRef.current) inputRef.current.focus();
    };

    const onKeyDown = (e: KeyboardEvent) => {
        if (e.code === 'Enter') {
            e.preventDefault();
            onClickAdd();
        }
    };

    return (
        <>
            <div class="input-group mb-3">
                <label class="input-group-text" for="add-item">
                    Add item
                </label>
                <input
                    id="add-item"
                    class="form-control"
                    ref={inputRef}
                    type="text"
                    value="Don't forget the milk"
                    on:keydown={onKeyDown}
                />
                <button class="btn btn-primary" on:click={onClickAdd}>
                    +
                </button>
            </div>
            <div class="input-group mb-3">
                <button
                    class="btn btn-secondary"
                    disabled={calc(
                        () => globalState.items.every((item) => !item.done),
                        'ClearButtonDisabled'
                    )}
                    on:click={onClickClear}
                >
                    Clear completed
                </button>
            </div>
        </>
    );
};

const App = () => {
    const onClickMutate = () => {
        globalState.items.forEach((item) => {
            item.done = Math.random() < 0.5;
            item.task = item.task + '!';
        });
    };

    return (
        <>
            <div class="container">
                <h1>List: {calc(() => globalState.name, 'ListName')}</h1>
                <TodoList />
                <TodoControls />
                <hr class="my-4 border border-2 border-dark" />
                <div class="input-group mb-3">
                    <button class="btn btn-warning" on:click={onClickMutate}>
                        Mutate items
                    </button>
                </div>
            </div>
            <hr />
            <div class="container my-4">
                <button
                    class="btn btn-secondary"
                    on:click={() => console.log(debugGetGraph())}
                >
                    Export Graph
                </button>
            </div>
            <div class="container-fluid d-flex my-4 justify-content-center">
                <div class="border" ref={graphvizRef} />
            </div>
        </>
    );
};

const root = document.getElementById('app');
if (root) {
    mount(root, <App />);
}
