import Gooey, { model, collection, calc, mount } from '../../index';

const DICE_SIDES = [2, 4, 6, 8, 10, 12, 20];
const scores = collection<{ sides: number; roll: number }>([]);
const state = model({ total: 0 });

const onRoll = (sides: number) => {
    const roll = 1 + Math.floor(Math.random() * sides);

    state.total += roll;
    scores.unshift({ sides, roll });
    if (scores.length > 10) {
        scores.splice(10, scores.length - 10);
    }
};

mount(
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    document.getElementById('dice-roller')!,
    <>
        <p>Dice Roller</p>
        {DICE_SIDES.map((sides) => (
            <button on:click={() => onRoll(sides)}>d{sides}</button>
        ))}
        <ul>
            <li>Roll results:</li>
            {scores.mapView(({ sides, roll }) => (
                <li>
                    d{sides} rolled <strong>{roll}</strong> at{' '}
                    {new Date().toLocaleTimeString()}
                </li>
            ))}
            <li>Total: {calc(() => state.total)}</li>
        </ul>
    </>
);
