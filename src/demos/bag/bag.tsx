import { graphviz } from '@hpcc-js/wasm';
import Revise, {
    mount,
    Fragment,
    Model,
    model,
    collection,
    calc,
    setLogLevel,
    debug,
    subscribe,
    flush,
    ref,
} from '../../index';

const graphvizRef = ref<HTMLDivElement>();

function debugGraph() {
    graphviz.layout(debug(), 'svg', 'dot').then((svg) => {
        if (graphvizRef.current) {
            graphvizRef.current.innerHTML = svg;
        }
    });
}

subscribe(() => {
    setTimeout(() => {
        flush();
        debugGraph();
    }, 0);
});
setTimeout(() => {
    debugGraph();
}, 0);

setLogLevel('debug');

const App = () => {
    const bag: Model<Record<string, string>> = model(
        {
            some: 'starter',
            text: 'here',
        },
        'bag'
    );
    const state = model(
        {
            key: '',
            value: '',
            keysView: true,
        },
        'state'
    );
    const keysCollection = collection<string>(
        Object.keys(bag),
        'keysCollection'
    );

    const onClickSet = () => {
        bag[state.key] = state.value;
        keysCollection.push(state.key);
    };

    const onClickDelete = () => {
        delete bag[state.key];
        keysCollection.reject((key) => key === state.key);
    };

    return (
        <>
            <h1>Bag demo</h1>
            <p>Key items:</p>
            <ul>
                {calc(
                    () =>
                        (state.keysView
                            ? model.keys(bag, 'bagKeys')
                            : keysCollection
                        ).mapView(
                            (key) => (
                                <li>
                                    {key} ={' '}
                                    {calc(() => bag[key], 'view bag value')}
                                </li>
                            ),
                            'key item mapView'
                        ),
                    'view list'
                )}
            </ul>

            <p>Filtered items:</p>
            <ul>
                {calc(() =>
                    (state.keysView
                        ? model.keys(bag, 'bagKeys2')
                        : keysCollection
                    )
                        .filterView((key) => key.length % 2 === 0)
                        .mapView((key) => (
                            <li>
                                {key} = {calc(() => bag[key])}
                            </li>
                        ))
                )}
            </ul>

            <p>FlatMap items:</p>
            <ul>
                {calc(() =>
                    (state.keysView
                        ? model.keys(bag, 'bagKeys3')
                        : keysCollection
                    )
                        .flatMapView((key) => [key, key])
                        .mapView((key) => (
                            <li>
                                {key} = {calc(() => bag[key])}
                            </li>
                        ))
                )}
            </ul>

            <p>
                <label>
                    Key:{' '}
                    <input
                        type="text"
                        on:input={(e: any) => {
                            state.key = e.target.value;
                        }}
                    />
                </label>
            </p>
            <p>
                <label>
                    Value:{' '}
                    <input
                        type="text"
                        on:input={(e: any) => {
                            state.value = e.target.value;
                        }}
                    />
                </label>
            </p>
            <button
                on:click={onClickSet}
                disabled={calc(
                    () => !(state.key && state.value),
                    'button:set:disabled'
                )}
            >
                set key = value
            </button>
            <button
                on:click={onClickDelete}
                disabled={calc(() => !state.key, 'button:delete:disabled')}
            >
                delete key
            </button>
            <label>
                <input
                    type="checkbox"
                    checked={calc(
                        () => state.keysView,
                        'checkbox:keysView:checked'
                    )}
                    on:input={() => (state.keysView = !state.keysView)}
                />{' '}
                model.keys
            </label>
            <p>key: {calc(() => state.key, 'text:key')}</p>
            <p>value: {calc(() => state.value, 'text:value')}</p>
            <hr />
            <h2>Graphviz</h2>
            <div ref={graphvizRef} />
        </>
    );
};

const root = document.getElementById('app');
if (root) {
    mount(root, <App />);
}
