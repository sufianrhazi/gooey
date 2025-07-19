import type { Component } from '../..';
import Gooey, { calc, model, mount } from '../..';

const Counter: Component<{ min: number; max: number }> = ({ min, max }) => {
    const state = model({ count: min });

    return (
        <fieldset class="counter">
            <legend>
                Range: [{min} to {max}]
            </legend>
            <p>Count: {calc(() => state.count)}</p>
            <div class="counter__controls">
                <button
                    disabled={calc(() => state.count - 1 < min)}
                    on:click={() => (state.count -= 1)}
                >
                    -1
                </button>
                <button
                    disabled={calc(() => state.count + 1 > max)}
                    on:click={() => (state.count += 1)}
                >
                    +1
                </button>
            </div>
        </fieldset>
    );
};

mount(
    document.getElementById('app')!,
    <>
        <Counter min={0} max={10} />
        <Counter min={1} max={5} />
    </>
);
