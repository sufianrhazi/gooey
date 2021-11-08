import Revise, {
    mount,
    Fragment,
    Model,
    model,
    collection,
    calc,
    setLogLevel,
} from '../index';

setLogLevel('debug');

const App = () => {
    const bag: Model<Record<string, string>> = model(
        {} as Record<string, string>
    );
    const state = model({
        key: '',
        value: '',
        keysView: true,
    });
    const keysCollection = collection<string>([]);

    const onClickSet = () => {
        bag[state.key] = state.value;
        keysCollection.push(state.key);
    };

    const onClickDelete = () => {
        delete bag[state.key];
    };

    return (
        <>
            <h1>Bag demo</h1>
            <p>Key items:</p>
            <ul>
                {calc(() =>
                    (state.keysView ? model.keys(bag) : keysCollection).mapView(
                        (key) => (
                            <li>
                                {key} = {calc(() => bag[key])}
                            </li>
                        )
                    )
                )}
            </ul>

            <p>Filtered items:</p>
            <ul>
                {calc(() =>
                    (state.keysView ? model.keys(bag) : keysCollection)
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
                    (state.keysView ? model.keys(bag) : keysCollection)
                        .flatMapView((key) => [key, key])
                        .mapView((key) => (
                            <li>
                                {key} = {calc(() => bag[key])}
                            </li>
                        ))
                )}
            </ul>

            <p>Sorted items:</p>
            <ul>
                {calc(() =>
                    (state.keysView ? model.keys(bag) : keysCollection)
                        .sortedView((a, b) => (a === b ? 0 : a < b ? -1 : 1))
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
                disabled={calc(() => !(state.key && state.value))}
            >
                set key = value
            </button>
            <button on:click={onClickDelete} disabled={calc(() => !state.key)}>
                delete key
            </button>
            <label>
                <input
                    type="checkbox"
                    checked={calc(() => state.keysView)}
                    on:input={() => (state.keysView = !state.keysView)}
                />{' '}
                model.keys
            </label>
            <p>key: {calc(() => state.key)}</p>
            <p>value: {calc(() => state.value)}</p>
        </>
    );
};

const root = document.getElementById('app');
if (root) {
    mount(root, <App />);
}
