import Revise, {
    mount,
    Fragment,
    Model,
    model,
    collection,
    calc,
    flush,
    debug,
    subscribe,
    Component,
    Collection,
    setLogLevel,
} from '../index';

/*
 * Initialize flush subscription, so everything automatically updates on next event loop
 */
setLogLevel('debug');
subscribe(() => {
    setTimeout(() => flush(), 0);
});

const App = () => {
    const bag: Model<Record<string, string>> = model(
        {} as Record<string, string>
    );
    const state = model({
        key: '',
        value: '',
    });

    const onClickSet = () => {
        bag[state.key] = state.value;
    };

    const onClickDelete = () => {
        delete bag[state.key];
    };

    return (
        <>
            <h1>Bag demo</h1>
            <ul>
                {model.keys(bag).mapView((key) => (
                    <li>
                        {key} = {calc(() => bag[key])}
                    </li>
                ))}
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
            <p>key: {calc(() => state.key)}</p>
            <p>value: {calc(() => state.value)}</p>
        </>
    );
};

const root = document.getElementById('app');
if (root) {
    mount(root, <App />);
}
