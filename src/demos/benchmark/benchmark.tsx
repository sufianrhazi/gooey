import Gooey, {
    mount,
    model,
    collection,
    calc,
    flush,
    Component,
    Model,
    Collection,
    subscribe,
} from '../../index';

// Disable default flushing
// eslint-disable-next-line @typescript-eslint/no-empty-function
subscribe(() => () => {});

function _random(max: number): number {
    return Math.round(Math.random() * 1000) % max;
}

interface Store {
    selected?: number;
    items: Collection<Model<Item>>;
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
    children?: JSX.Node | JSX.Node[];
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

const Controls = ({ store }: { store: Model<Store> }) => {
    let maxId = 1;
    const makeRows = (count: number): Model<Item>[] => {
        const adjectives = [
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
        const colours = [
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
        const nouns = [
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
        const data: Model<Item>[] = [];
        for (let i = 0; i < count; i++)
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
        if (store.items.length > 999) {
            store.items.moveSlice(998, 1, 1);
            store.items.moveSlice(2, 1, 999);
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

const Row = ({ store, item }: { store: Model<Store>; item: Model<Item> }) => {
    function selectItem(e: MouseEvent) {
        e.preventDefault();
        store.selected = item.id;
        flush();
    }

    function removeItem(e: MouseEvent) {
        e.preventDefault();
        store.items.reject((otherItem) => item === otherItem);
        flush();
    }

    return (
        <tr class={calc(() => (store.selected === item.id ? 'danger' : ''))}>
            <td class="col-md-1">{calc(() => item.id)}</td>
            <td class="col-md-4">
                <a class="lbl" on:click={time(selectItem)}>
                    {calc(() => item.label)}
                </a>
            </td>
            <td class="col-md-1">
                <a class="remove" on:click={time(removeItem)}>
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

const Table = ({ store }: { store: Model<Store> }) => {
    return (
        <tbody id="tbody">
            {store.items.mapView((item) => (
                <Row store={store} item={item} />
            ))}
        </tbody>
    );
};

const JsFrameworkBenchmark = () => {
    const store = model<Store>({
        selected: undefined,
        items: collection<Model<Item>>([]),
    });

    return (
        <div class="container">
            <div class="jumbotron">
                <div class="row">
                    <div class="col-md-6">
                        <h1>Gooey-"keyed"</h1>
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
