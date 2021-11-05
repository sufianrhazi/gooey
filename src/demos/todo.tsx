import Revise, {
    mount,
    Fragment,
    Ref,
    ref,
    model,
    Model,
    collection,
    calc,
    debug,
    Component,
    Collection,
    setLogLevel,
} from '../index';
import * as vis from 'vis-network/esnext';

setLogLevel('debug');

////////////////////////////////////////////////////////////////////////////////
// Application State
////////////////////////////////////////////////////////////////////////////////
interface TodoItem {
    done: boolean;
    task: string;
}

interface TodoList {
    name: string;
    items: Collection<TodoItem>;
}

function makeTodoListItem(task: string): Model<TodoItem> {
    return model({ done: false, task }, `TodoItem:${task}`);
}

const globalState: TodoList = model(
    {
        name: 'Groceries',
        items: collection(
            [
                makeTodoListItem('apples'),
                makeTodoListItem('bananas'),
                makeTodoListItem('celery'),
            ],
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
    const onChange = (event: InputEvent) => {
        item.done = (event.target as HTMLInputElement).checked;
    };
    return (
        <li class="list-group-item p-0">
            <label class="d-block px-3 py-2">
                <input
                    type="checkbox"
                    class="form-check-input me-3"
                    on:change={onChange}
                    checked={calc(() => item.done, 'ItemCheckbox')}
                />
                <span
                    style={calc(
                        () =>
                            item.done ? 'text-decoration: line-through' : '',
                        'ItemStyle'
                    )}
                >
                    {calc(() => item.task, 'ItemName')}
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
                        globalState.items.mapView((item) => (
                            <TodoItem item={item} />
                        )),
                    'ItemList'
                )}
            </ul>
        </div>
    );
};

const TodoControls: Component<{}> = (_props, { onMount }) => {
    const inputRef: Ref<HTMLInputElement> = ref();

    onMount(() => {
        // Auto-focus the input on render
        if (inputRef.current) inputRef.current.focus();
    });

    const onClickAdd = () => {
        if (!inputRef.current) return;
        if (!inputRef.current.value) return;
        globalState.items.push(
            model({
                done: false,
                task: inputRef.current.value,
            })
        );
        inputRef.current.value = '';

        if (inputRef.current) inputRef.current.focus();
    };

    const onClickClear = () => {
        for (let i = globalState.items.length - 1; i >= 0; --i) {
            if (globalState.items[i].done) {
                globalState.items.splice(i, 1);
            }
        }

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
    const graphvizContainerRef = ref<HTMLElement | undefined>();
    const onClickMutate = () => {
        globalState.items.forEach((item) => {
            item.done = Math.random() < 0.5;
            item.task = item.task + '!';
        });
    };

    const onClickDebug = () => {
        if (!graphvizContainerRef.current) return;
        const parsedData = vis.parseDOTNetwork(debug());

        const data = {
            nodes: parsedData.nodes,
            edges: parsedData.edges,
        };

        const options = parsedData.options;
        options.width = '1024px';
        options.height = '1024px';
        options.layout = {
            hierarchical: {
                direction: 'UD',
                sortMethod: 'directed',
                shakeTowards: 'leaves',
            },
        };

        // create a network
        new vis.Network(graphvizContainerRef.current, data, options);
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
                    <button
                        class="btn btn-outline-warning"
                        on:click={onClickDebug}
                    >
                        Render graphviz
                    </button>
                </div>
            </div>
            <div class="container-fluid d-flex my-4 justify-content-center">
                <div class="border" ref={graphvizContainerRef}></div>
            </div>
        </>
    );
};

const root = document.getElementById('app');
if (root) {
    mount(root, <App />);
}
