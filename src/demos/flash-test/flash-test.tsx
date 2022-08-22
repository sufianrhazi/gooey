import Gooey, { Component, model, calc, mount } from '../..';

const TickProcessor: Component = () => {
    let lastTask = 0;
    let ticks = 0;
    let frames = 1;
    const calculateRate = () => `${(ticks / frames).toFixed(3)} ticks / frame`;
    const state = model({ flashing: false, toggle: false, ms: 10 });

    const textCalc = calc(
        () =>
            (state.toggle ? 'on ' : 'off') +
            `
Flash rate: ${calculateRate()}
`
    );
    textCalc.onRecalc(() => {
        const now = performance.now();
        if (lastTask === 0) {
            lastTask = now;
        }
        if (now - lastTask < state.ms) {
            queueMicrotask(tick);
        } else {
            setTimeout(tick, 0);
            lastTask = now;
            frames++;
        }
    });

    const tick = () => {
        if (!state.flashing) return;
        ticks += 1;
        state.toggle = !state.toggle;
    };

    return (
        <fieldset>
            <legend>TickProcessor</legend>
            <div>
                <button
                    disabled={calc(() => state.flashing)}
                    on:click={() => {
                        setTimeout(() => {
                            state.flashing = true;
                            tick();
                        }, 0);
                    }}
                >
                    Start
                </button>
                <button
                    disabled={calc(() => !state.flashing)}
                    on:click={() => {
                        state.flashing = false;
                    }}
                >
                    Stop
                </button>
                <input
                    type="number"
                    min="1"
                    value="10"
                    max="30"
                    on:input={(e, el) => {
                        state.ms = parseInt(el.value, 10);
                        ticks = 0;
                        frames = 1;
                    }}
                />
            </div>
            <pre>
                The toggle is {textCalc}
                Ms per frame: {calc(() => state.ms)}
            </pre>
        </fieldset>
    );
};

mount(
    document.body,
    <>
        <h1>Tick Processor</h1>
        <p>
            Rapidly queue microtasks that cause re-renders until N milliseconds
            occur. Used to measure the framerate of rapidly mutating the DOM via
            transactions.
        </p>
        <p>Note: I'm honestly not sure how accurate this is.</p>
        <TickProcessor />
    </>
);
