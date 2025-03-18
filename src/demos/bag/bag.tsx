import Gooey, { calc, dict, model, mount, setLogLevel } from '../../index';
import { makeGraphvizDebuggerRef } from '../debug';

const graphvizRef = makeGraphvizDebuggerRef();

setLogLevel('debug');

const App = () => {
    const bag = dict<string, string>(
        [
            ['some', 'starter'],
            ['text', 'here'],
        ],
        'bag'
    );
    const state = model(
        {
            key: '',
            value: '',
        },
        'state'
    );
    const keys = bag.keysView('bagKeys');

    const onClickSet = () => {
        bag.set(state.key, state.value);
    };

    const onClickDelete = () => {
        bag.delete(state.key);
    };

    return (
        <>
            <h1>dict keys demo</h1>
            <p>Key items:</p>
            <ul>
                {calc(
                    () =>
                        keys.mapView(
                            (key) => (
                                <li>
                                    {key}
                                    {' = '}
                                    {calc(() => bag.get(key))}
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
                    keys
                        .filterView((key) => key.length % 2 === 0)
                        .mapView((key) => (
                            <li>
                                {key} = {calc(() => bag.get(key))}
                            </li>
                        ))
                )}
            </ul>

            <p>FlatMap items:</p>
            <ul>
                {calc(() =>
                    keys
                        .flatMapView((key) => [key, key])
                        .mapView((key) => (
                            <li>
                                {key} = {calc(() => bag.get(key))}
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
