import {
    React,
    name,
    model,
    collection,
    computation,
    flush,
    debug,
    mount,
    subscribe,
    setLogLevel,
    Component,
    TrackedModel,
    TrackedCollection,
} from './index';

function _random(max: number): number {
    return Math.round(Math.random() * 1000) % max;
}

interface Store {
    selected?: number;
    items: TrackedCollection<TrackedModel<Item>>;
}
interface Item {
    id: number;
    label: string;
}

function time<Func extends Function>(fn: Func): Func {
    const wrapped = (...args: any) => {
        console.log(`Running ${fn.name}...`);
        const start = performance.now();
        const result = fn(...args);
        const duration = performance.now() - start;
        console.log(`${fn.name} took ${duration}ms`);
        return result;
    };
    return wrapped as unknown as Func;
}

const Button: Component<{
    id: string;
    onClick: (e: MouseEvent) => void;
}> = ({ id, onClick, children }) => (
    <button
        on:click={onClick}
        type="button"
        class="btn btn-primary btn-block"
        id={id}
    >
        {children}
    </button>
);

const Controls = ({ store }: { store: TrackedModel<Store> }) => {
    let maxId: number = 0;
    const makeRows = (count: number): TrackedModel<Item>[] => {
        var adjectives = [
            'pretty',
            'large',
            'big',
            'small',
            'tall',
            'short',
            'long',
            'handsome',
            'plain',
            'quaint',
            'clean',
            'elegant',
            'easy',
            'angry',
            'crazy',
            'helpful',
            'mushy',
            'odd',
            'unsightly',
            'adorable',
            'important',
            'inexpensive',
            'cheap',
            'expensive',
            'fancy',
        ];
        var colours = [
            'red',
            'yellow',
            'blue',
            'green',
            'pink',
            'brown',
            'purple',
            'brown',
            'white',
            'black',
            'orange',
        ];
        var nouns = [
            'table',
            'chair',
            'house',
            'bbq',
            'desk',
            'car',
            'pony',
            'cookie',
            'sandwich',
            'burger',
            'pizza',
            'mouse',
            'keyboard',
        ];
        var data: TrackedModel<Item>[] = [];
        for (var i = 0; i < count; i++)
            data.push(
                model({
                    id: maxId++,
                    label:
                        adjectives[_random(adjectives.length)] +
                        ' ' +
                        colours[_random(colours.length)] +
                        ' ' +
                        nouns[_random(nouns.length)],
                })
            );
        return data;
    };

    const create1KRows = (e: MouseEvent) => {
        e.preventDefault();
        store.selected = undefined;
        store.items.splice(0, store.items.length, ...makeRows(1000));
        flush();
    };

    const create10KRows = (e: MouseEvent) => {
        e.preventDefault();
        store.selected = undefined;
        store.items.splice(0, store.items.length, ...makeRows(10000));
        flush();
    };

    const append1KRows = (e: MouseEvent) => {
        e.preventDefault();
        store.selected = undefined;
        store.items.splice(store.items.length, 0, ...makeRows(1000));
        flush();
    };

    const updateEvery10Rows = (e: MouseEvent) => {
        e.preventDefault();
        store.selected = undefined;
        for (let i = 0; i < store.items.length; i += 10) {
            store.items[i].label += ' !!!';
        }
        flush();
    };

    const clear = (e: MouseEvent) => {
        e.preventDefault();
        store.selected = undefined;
        store.items.splice(0, store.items.length);
        flush();
    };

    const swapRows = (e: MouseEvent) => {
        e.preventDefault();
        if (store.items.length > 998) {
            var a = store.items[1];
            store.items[1] = store.items[998];
            store.items[998] = a;
        }
        flush();
    };

    return (
        <div class="col-md-6">
            <div class="row">
                <div class="col-sm-6 smallpad">
                    <Button onClick={time(create1KRows)} id="run">
                        Create 1,000 rows
                    </Button>
                </div>
                <div class="col-sm-6 smallpad">
                    <Button onClick={time(create10KRows)} id="runlots">
                        Create 10,000 rows
                    </Button>
                </div>
                <div class="col-sm-6 smallpad">
                    <Button onClick={time(append1KRows)} id="add">
                        Append 1,000 rows
                    </Button>
                </div>
                <div class="col-sm-6 smallpad">
                    <Button onClick={time(updateEvery10Rows)} id="update">
                        Update every 10th row
                    </Button>
                </div>
                <div class="col-sm-6 smallpad">
                    <Button onClick={time(clear)} id="clear">
                        Clear
                    </Button>
                </div>
                <div class="col-sm-6 smallpad">
                    <Button onClick={time(swapRows)} id="swaprows">
                        Swap Rows
                    </Button>
                </div>
            </div>
        </div>
    );
};

const Row = ({
    store,
    item,
}: {
    store: TrackedModel<Store>;
    item: TrackedModel<Item>;
}) => {
    function selectItem(e: MouseEvent) {
        e.preventDefault();
        store.selected = item.id;
        flush();
    }

    return (
        <tr
            class={computation(() =>
                store.selected === item.id ? 'danger' : ''
            )}
        >
            <td class="col-md-1">{computation(() => item.id)}</td>
            <td class="col-md-4">
                <a class="lbl" on:click={time(selectItem)}>
                    {computation(() => item.label)}
                </a>
            </td>
            <td class="col-md-1">
                <a class="remove">
                    <span
                        class="remove glyphicon glyphicon-remove"
                        aria-hidden="true"
                    ></span>
                </a>
            </td>
            <td class="col-md-6"></td>
        </tr>
    );
};

const Table = ({ store }: { store: TrackedModel<Store> }) => {
    return (
        <tbody id="tbody">
            {store.items.mapCollection((item) => (
                <Row store={store} item={item} />
            ))}
        </tbody>
    );
};

const JsFrameworkBenchmark = () => {
    const store = model<Store>({
        selected: undefined,
        items: collection<TrackedModel<Item>>([]),
    });

    return (
        <div class="container">
            <div class="jumbotron">
                <div class="row">
                    <div class="col-md-6">
                        <h1>Revise-"keyed"</h1>
                    </div>
                    <Controls store={store} />
                </div>
            </div>
            <table class="table table-hover table-striped test-data">
                <Table store={store} />
            </table>
            <span
                class="preloadicon glyphicon glyphicon-remove"
                aria-hidden="true"
            ></span>
        </div>
    );
};

// main
const root = document.getElementById('main');
if (root) {
    mount(root, <JsFrameworkBenchmark />);
}
