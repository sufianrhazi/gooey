import Gooey, { Component, model, calc } from '../..';

enum FlightType {
    OneWay = 'OneWay',
    Return = 'Return',
}

const formatDate = (date: Date) => {
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const year = date.getFullYear().toString().padStart(4, '0');
    return `${month}.${day}.${year}`;
};

const parseDate = (str: string) => {
    const parts = str.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
    if (!parts || parts.length !== 4) return null;
    const month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);
    const year = parseInt(parts[3], 10);
    if (!isFinite(month) || !isFinite(day) || !isFinite(year)) {
        return null;
    }
    if (month < 1 || month > 12) return null;
    if (day < 1 || day > 31) return null;
    if (year < 1000 || year > 9999) return null;
    return new Date(year, month - 1, day);
};

export const FlightBooker: Component = () => {
    const today = new Date();
    const state = model({
        type: FlightType.OneWay,
        startDate: new Date(
            today.getFullYear(),
            today.getMonth(),
            today.getDate()
        ),
        startValid: true,
        endDate: new Date(
            today.getFullYear(),
            today.getMonth(),
            today.getDate()
        ),
        endValid: true,
    });

    const calcBookingDisabled = calc(() => {
        if (state.type === FlightType.OneWay) {
            return !state.startValid;
        }
        return (
            !state.startValid ||
            !state.endValid ||
            state.startDate >= state.endDate
        );
    });

    const onDateChange = (
        str: string,
        dateField: 'startDate' | 'endDate',
        validField: 'startValid' | 'endValid'
    ) => {
        const parsed = parseDate(str);
        if (parsed === null) {
            state[validField] = false;
            return;
        }
        state[dateField] = parsed;
        state[validField] = true;
    };

    return (
        <div class="p">
            <style>{`.invalid { background-color: red; }`}</style>
            <p>
                <select
                    value={calc(() => state.type)}
                    on:input={(e, el) => {
                        state.type =
                            el.value === FlightType.Return
                                ? FlightType.Return
                                : FlightType.OneWay;
                    }}
                >
                    <option value={FlightType.OneWay}>one-way flight</option>
                    <option value={FlightType.Return}>return flight</option>
                </select>
            </p>
            <p>
                <input
                    class={calc(() => (state.startValid ? '' : 'invalid'))}
                    value={formatDate(state.startDate)}
                    on:input={(e, el) =>
                        onDateChange(el.value, 'startDate', 'startValid')
                    }
                />
            </p>
            <p>
                <input
                    class={calc(() => (state.endValid ? '' : 'invalid'))}
                    value={formatDate(state.endDate)}
                    disabled={calc(() => state.type === FlightType.OneWay)}
                    on:input={(e, el) =>
                        onDateChange(el.value, 'endDate', 'endValid')
                    }
                />
            </p>
            <p>
                <button
                    class="primary"
                    on:click={() => {
                        if (state.type === FlightType.OneWay) {
                            alert(
                                `Booked one-way flight on ${formatDate(
                                    state.startDate
                                )}`
                            );
                        } else {
                            alert(
                                `Booked round trip flight departing ${formatDate(
                                    state.startDate
                                )} returning ${formatDate(state.endDate)}`
                            );
                        }
                    }}
                    disabled={calcBookingDisabled}
                >
                    Book
                </button>
            </p>
        </div>
    );
};
