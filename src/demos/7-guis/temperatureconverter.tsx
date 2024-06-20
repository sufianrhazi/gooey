import type { Component} from '../..';
import Gooey, { model, calc } from '../..';

const c2f = (c: number) => c * (9 / 5) + 32;
const f2c = (f: number) => ((f - 32) * 5) / 9;

const format = (n: number) => n.toFixed(3).replace(/\.?0+$/g, '');

export const TemperatureConverter: Component = () => {
    const state = model({
        fahrenheit: '65',
        celsius: f2c(65).toFixed(2),
    });

    return (
        <div class="p">
            <label>
                <input
                    type="text"
                    value={calc(() => state.celsius)}
                    on:input={(e, el) => {
                        state.celsius = el.value;
                        const parsed = parseFloat(el.value);
                        if (isNaN(parsed)) return;
                        state.fahrenheit = format(c2f(parsed));
                    }}
                />{' '}
                Celsius
            </label>
            {' = '}
            <label>
                <input
                    type="text"
                    value={calc(() => state.fahrenheit)}
                    on:input={(e, el) => {
                        state.fahrenheit = el.value;
                        const parsed = parseFloat(el.value);
                        if (isNaN(parsed)) return;
                        state.celsius = format(f2c(parsed));
                    }}
                />{' '}
                Fahrenheit
            </label>
        </div>
    );
};
