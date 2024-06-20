import type { Component} from '../..';
import Gooey, { model, calc } from '../..';

const TICK_INTERVAL = 16;

export const Timer: Component = (_, { onMount }) => {
    let startTime = Date.now();
    const state = model({
        elapsed: 0,
        duration: 1000,
    });

    const checkStart = () => {
        if (handle === null && state.elapsed < state.duration) {
            tick();
        }
    };

    const setDuration = (duration: number) => {
        state.duration = duration;
        checkStart();
    };

    const reset = () => {
        startTime = Date.now();
        state.elapsed = 0;
        checkStart();
    };

    let handle: number | null = null;
    const tick = () => {
        handle = null;
        const newElapsed = Date.now() - startTime;
        if (newElapsed < state.duration) {
            state.elapsed = newElapsed;
            handle = setTimeout(tick, TICK_INTERVAL);
        } else {
            state.elapsed = state.duration;
        }
    };

    onMount(() => {
        reset();
        return () => {
            if (handle !== null) clearTimeout(handle);
        };
    });

    return (
        <div class="p">
            <p>
                Elapsed Time:{' '}
                <meter value={calc(() => state.elapsed / state.duration)} />
            </p>
            <p>{calc(() => (state.elapsed / 1000).toFixed(2))}s</p>
            <p>
                <label>
                    Duration:{' '}
                    <input
                        type="range"
                        min="100"
                        max="20000"
                        value={calc(() => state.duration.toString())}
                        on:input={(e, el) => {
                            const value = parseInt(el.value, 10);
                            if (isFinite(value)) {
                                setDuration(value);
                            }
                        }}
                    />
                </label>
            </p>
            <p>
                <button class="primary" on:click={reset}>
                    Reset
                </button>
            </p>
        </div>
    );
};
