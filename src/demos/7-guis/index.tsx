import type { Component } from '../../index';
import Gooey, { calc, model, mount } from '../../index';
import { Cells } from './cells/cells';
import { CircleDrawer } from './circledrawer';
import { Counter } from './counter';
import { CRUD } from './crud';
import { FlightBooker } from './flightbooker';
import { TemperatureConverter } from './temperatureconverter';
import { Timer } from './timer';
import { Window } from './window';

import './95.css';

interface AppRecord {
    app: Component;
    name: string;
    description: JSX.Element;
}
const Apps: AppRecord[] = [
    {
        app: Counter,
        name: 'Counter',
        description: <>Understanding the basic ideas of a language/toolkit</>,
    },
    {
        app: TemperatureConverter,
        name: 'Temperature Converter',
        description: <>bidirectional data flow, user-provided text input</>,
    },
    { app: FlightBooker, name: 'Flight Booker', description: <>Constraints</> },
    {
        app: Timer,
        name: 'Timer',
        description: (
            <>Concurrency, competing user/signal interactions, responsiveness</>
        ),
    },
    {
        app: CRUD,
        name: 'CRUD',
        description: (
            <>
                separating the domain and presentation logic, managing mutation,
                building a non-trivial layout
            </>
        ),
    },
    {
        app: CircleDrawer,
        name: 'Circle Drawer',
        description: <>undo/redo, custom drawing, dialog control</>,
    },
    {
        app: Cells,
        name: 'Cells',
        description: (
            <>
                change propagation, widget customization, implementing a more
                authentic/involved GUI application
            </>
        ),
    },
];

const App: Component = (_props, { onMount }) => {
    const state = model<{ app: null | number }>({
        app: null,
    });

    const updateHash = () => {
        const hash = parseInt(window.location.hash.slice(1), 10);
        state.app =
            isFinite(hash) && hash >= 0 && hash < Apps.length ? hash : null;
    };

    onMount(() => {
        window.addEventListener('hashchange', updateHash);
        updateHash();
        return () => {
            window.removeEventListener('hashchange', updateHash);
        };
    });

    return (
        <>
            <h1>7 GUIs Demo</h1>
            <p>
                The 7 GUIs comes from{' '}
                <a href="https://eugenkiss.github.io/7guis/tasks">
                    this set of tasks
                </a>{' '}
                which are meant to exercise different kinds of common tasks
                found in GUI applications. Here are a series of idiomatic demos
                which complete these 7 GUIs.
            </p>

            <p>Select a UI to use</p>

            <ul>
                {Apps.map((app, index) => (
                    <li>
                        <label>
                            <input
                                type="radio"
                                name="app"
                                value={index.toString()}
                                checked={calc(() => index === state.app)}
                                on:change={(e, el) => {
                                    if (el.checked) {
                                        window.location.hash = index.toString();
                                        state.app = index;
                                    }
                                }}
                            />
                            {app.name}: <em>{app.description}</em>
                        </label>
                    </li>
                ))}
            </ul>

            {calc(() => {
                if (state.app === null) return null;
                const Selected = Apps[state.app].app;
                return (
                    <>
                        <hr />
                        <Window name={Apps[state.app].name}>
                            <Selected />
                        </Window>
                    </>
                );
            })}
        </>
    );
};

const root = document.getElementById('root');
mount(root!, <App />);
