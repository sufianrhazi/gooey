import Revise, {
    Calculation,
    Component,
    Model,
    calc,
    model,
    mount,
    ref,
} from '../../index';
import * as log from '../../log';

type Table = Model<{
    rows: number;
    cols: number;
    code: Model<Record<string, string | null>>;
    data: Model<
        Record<
            string,
            Calculation<
                | { type: 'error'; error: Error }
                | { type: 'cycle' }
                | { type: 'result'; result: any }
            >
        >
    >;
}>;

function classNames(
    ...args: (string | null | undefined | Record<string, boolean>)[]
) {
    return args
        .filter((arg) => !!arg)
        .map((arg) => {
            if (typeof arg === 'string') return arg;
            if (typeof arg === 'object' && arg)
                return Object.entries(arg)
                    .filter((item) => item[1])
                    .map((item) => item[0])
                    .join(' ');
        })
        .join(' ');
}

function repr(value: any) {
    if (typeof value === 'boolean') return value ? 'true' : 'false';
    if (value === null) return '';
    if (value === undefined) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'number') return value.toString();
    return JSON.stringify(value);
}

const colKeys = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const colKey = (col: number) => {
    let key = '';
    do {
        key = colKeys[col % colKeys.length];
        col = Math.floor(col / colKeys.length);
    } while (col > 0);
    return key;
};

function* makeRange(to: number) {
    for (let i = 0; i < to; ++i) {
        yield i;
    }
}

const rowKey = (row: number) => row.toString();

const positionToKey = ({ row, col }: SheetPosition) =>
    `${colKey(col)}${rowKey(row)}`;

type SheetPosition = {
    row: number;
    col: number;
};

type SheetSelection =
    | {
          type: 'cell';
          position: SheetPosition;
      }
    | {
          type: 'range';
          position: SheetPosition;
          start: SheetPosition;
          end: SheetPosition;
      };

const parseKey = (key: string): SheetPosition | null => {
    const match = key.match(/([A-Z]+)([0-9]+)/);
    if (!match) return null;
    const colEnc = match[1];
    let col = 0;
    for (let i = 0; i < colEnc.length; ++i) {
        col = col * 26 + (colEnc.charCodeAt(i) - 65);
    }
    const row = parseInt(match[2], 10);
    return { row, col };
};

const parseRange = (range: string) => {
    const match = range.match(/([A-Z]+[0-9]+):([A-Z]+[0-9]+)/);
    if (!match) return null;
    return {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        start: parseKey(match[1])!,
        startKey: match[1],
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        end: parseKey(match[2])!,
        endKey: match[2],
    };
};

const api = {
    sum: (items: number[]) => {
        return items.reduce((acc, item) => item + acc, 0);
    },
};

const makeTable = ({ rows, cols }: { rows: number; cols: number }): Table => {
    const code: Model<Record<string, string | null>> = model({}, 'code');
    const data: Model<
        Record<
            string,
            Calculation<
                | { type: 'error'; error: Error }
                | { type: 'cycle' }
                | { type: 'result'; result: any }
            >
        >
    > = model({}, 'data');
    const proxy = new Proxy(
        {},
        {
            get: (_target, key: string) => {
                const maybeRange = parseRange(key);
                if (maybeRange) {
                    if (maybeRange.start.row === maybeRange.end.row) {
                        const items: any[] = [];
                        for (
                            let col = Math.max(0, maybeRange.start.col);
                            col <= Math.min(maybeRange.end.col, cols - 1);
                            ++col
                        ) {
                            const item =
                                data[
                                    positionToKey({
                                        col,
                                        row: maybeRange.start.row,
                                    })
                                ]();
                            if (item.type === 'error') {
                                throw new Error('Has dependency on error');
                            }
                            if (item.type === 'cycle') {
                                throw new Error('Has dependency on cycle');
                            }
                            items.push(item.result);
                        }
                        return items;
                    }

                    if (maybeRange.start.col === maybeRange.end.col) {
                        const items: any[] = [];
                        for (
                            let row = Math.max(0, maybeRange.start.row);
                            row <= Math.min(maybeRange.end.row, rows - 1);
                            ++row
                        ) {
                            const item =
                                data[
                                    positionToKey({
                                        col: maybeRange.start.col,
                                        row,
                                    })
                                ]();
                            if (item.type === 'error') {
                                throw new Error('Has dependency on error');
                            }
                            if (item.type === 'cycle') {
                                throw new Error('Has dependency on cycle');
                            }
                            items.push(item.result);
                        }
                        return items;
                    }

                    const items: any[][] = [];
                    for (
                        let row = Math.max(0, maybeRange.start.row);
                        row <= Math.min(maybeRange.end.row, rows - 1);
                        ++row
                    ) {
                        const colItems: any[] = [];
                        for (
                            let col = Math.max(0, maybeRange.start.col);
                            col <= Math.min(maybeRange.end.col, cols - 1);
                            ++col
                        ) {
                            const item = data[positionToKey({ col, row })]();
                            if (item.type === 'error') {
                                throw new Error('Has dependency on error');
                            }
                            if (item.type === 'cycle') {
                                throw new Error('Has dependency on cycle');
                            }
                            colItems.push(item.result);
                        }
                        items.push(colItems);
                    }
                    return items;
                }

                const maybeKey = parseKey(key);
                if (
                    maybeKey &&
                    maybeKey.row >= 0 &&
                    maybeKey.row < rows &&
                    maybeKey.col >= 0 &&
                    maybeKey.col < cols
                ) {
                    const item = data[key as any]();
                    if (item.type === 'error') {
                        throw new Error('Has dependency on error');
                    }
                    if (item.type === 'cycle') {
                        throw new Error('Has dependency on cycle');
                    }
                    return item.result;
                }
                throw new Error('Reference error');
            },
        }
    );
    for (let col = 0; col < cols; ++col) {
        for (let row = 0; row < rows; ++row) {
            const key = positionToKey({ col, row });
            code[key] = null;
            data[key] = calc<
                | { type: 'error'; error: Error }
                | { type: 'cycle' }
                | { type: 'result'; result: any }
            >(() => {
                if (code[key] === null) return { type: 'result', result: null };
                const value = new Function(
                    'cell',
                    'code',
                    'api',
                    `with (api) { return eval(code); }`
                );
                try {
                    return {
                        type: 'result',
                        result: value(proxy, code[key], api),
                    };
                } catch (e) {
                    if (e instanceof Error) {
                        return { type: 'error', error: e };
                    }
                    return {
                        type: 'error',
                        error: new Error('Unknown error: ' + e),
                    };
                }
            }, `datacalc:${col}:${row}`).onError((type) => {
                console.error('Cell', col, row, 'got error!');
                if (type === 'cycle') {
                    return { type: 'cycle' };
                }
                return {
                    type: 'error',
                    error: new Error('Unknown internal error'),
                };
            });
        }
    }
    return model(
        {
            cols,
            rows,
            code,
            data,
        },
        'table'
    );
};

const HeaderCell: Component<{ row?: number; col?: number }> = ({
    row,
    col,
}) => {
    if (typeof row === 'number') {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        return <th class="cell">{rowKey(row!)}</th>;
    } else {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        return <th class="cell">{colKey(col!)}</th>;
    }
};

const Cell: Component<{
    onDblClick: (e: MouseEvent) => void;
    onMouseOver: (e: MouseEvent) => void;
    onMouseDown: (e: MouseEvent) => void;
    table: Table;
    row: number;
    col: number;
    isActive: Calculation<boolean>;
    isFocused: Calculation<boolean>;
}> = (
    {
        onDblClick,
        onMouseDown,
        onMouseOver,
        table,
        row,
        col,
        isActive,
        isFocused,
    },
    { onEffect }
) => {
    const tdRef = ref<HTMLTableCellElement>();
    onEffect(() => {
        if (isFocused()) {
            tdRef.current?.focus();
        }
    });
    return (
        <td
            ref={tdRef}
            id={`cell-${col}-${row}`}
            tabindex={calc(
                () => (isFocused() ? 0 : -1),
                `cell:${col}:${row}:tabindex`
            )}
            on:dblclick={onDblClick}
            on:mouseover={onMouseOver}
            on:mousedown={onMouseDown}
            class={calc(
                () =>
                    classNames('cell', {
                        active: isActive(),
                        error:
                            table.data[positionToKey({ col, row })]().type ===
                            'error',
                    }),
                `cell:${col}:${row}:class`
            )}
        >
            {calc(() => {
                const data = table.data;
                const result = data[positionToKey({ col, row })]();
                if (result.type === 'error') {
                    return <div title={result.error.toString()}>Err!</div>;
                }
                if (result.type === 'cycle') {
                    return (
                        <div title="Calculation contains a cycle">Cycle!</div>
                    );
                }
                return repr(result.result);
            }, `cell:${col}:${row}:display`).onError((type) => {
                console.error('Display cell', col, row, 'got error');
                if (type === 'error') {
                    return <div title="Cell Display Catch Error">Err!</div>;
                }
                if (type === 'cycle') {
                    return <div title="Cell Display Catch Cycle">Cycle!</div>;
                }
            })}
        </td>
    );
};

const inSelection = (
    selection: SheetSelection,
    position: SheetPosition
): boolean => {
    if (selection.type === 'cell') {
        return (
            selection.position.col === position.col &&
            selection.position.row === position.row
        );
    } else if (selection.type === 'range') {
        return (
            Math.min(selection.start.col, selection.end.col) <= position.col &&
            position.col <= Math.max(selection.start.col, selection.end.col) &&
            Math.min(selection.start.row, selection.end.row) <= position.row &&
            position.row <= Math.max(selection.start.row, selection.end.row)
        );
    }
    log.assertExhausted(selection);
};

const Spreadsheet: Component<{ table: Table }> = ({ table }) => {
    interface State {
        selection: null | SheetSelection;
        isDragging: boolean;
    }

    const inputRef = ref<HTMLInputElement>();
    const textAreaRef = ref<HTMLTextAreaElement>();

    const state = model<State>({
        selection: null,
        isDragging: false,
    });

    const getSelectedKey = calc(() => {
        if (state.selection === null || state.selection.type !== 'cell') {
            return undefined;
        }
        return positionToKey(state.selection.position);
    }, 'getSelectedKey');

    const getSelectedCellCode = calc(() => {
        const selectedKey = getSelectedKey();
        if (!selectedKey) {
            return '';
        }
        return table.code[selectedKey] || '';
    }, 'getSelectedCellCode');

    const onInputChange = (e: Event) => {
        const selectedKey = getSelectedKey();
        if (selectedKey && e.target instanceof HTMLInputElement) {
            table.code[selectedKey] = e.target.value;
        }
    };

    const onTextAreaInput = (e: Event) => {
        const selectedKey = getSelectedKey();
        if (selectedKey && textAreaRef.current) {
            table.code[selectedKey] = textAreaRef.current.value;
        }
    };

    const onKeyDown = (e: KeyboardEvent) => {
        if (!state.selection) return;
        if (e.key === 'ArrowUp') {
            e.preventDefault();
            state.selection = {
                type: 'cell',
                position: {
                    row: Math.max(state.selection.position.row - 1, 0),
                    col: state.selection.position.col,
                },
            };
        } else if (e.key === 'ArrowRight') {
            e.preventDefault();
            state.selection = {
                type: 'cell',
                position: {
                    row: state.selection.position.row,
                    col: Math.min(
                        state.selection.position.col + 1,
                        table.cols - 1
                    ),
                },
            };
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            state.selection = {
                type: 'cell',
                position: {
                    row: Math.min(
                        state.selection.position.row + 1,
                        table.rows - 1
                    ),
                    col: state.selection.position.col,
                },
            };
        } else if (e.key === 'ArrowLeft') {
            e.preventDefault();
            state.selection = {
                type: 'cell',
                position: {
                    row: state.selection.position.row,
                    col: Math.max(state.selection.position.col - 1, 0),
                },
            };
        } else if (e.key === 'Enter') {
            e.preventDefault();
            inputRef.current?.focus();
        }
    };

    const isDisabledCalc = calc(() => !getSelectedKey(), 'input:disabled');

    return (
        <div>
            <label>
                Formula:{' '}
                <input
                    type="text"
                    disabled={isDisabledCalc}
                    value={getSelectedCellCode}
                    on:change={onInputChange}
                    ref={inputRef}
                />
            </label>
            <table on:keydown={onKeyDown}>
                {calc(
                    () =>
                        Array.from(makeRange(table.rows + 1)).map(
                            (tableRowIndex) => (
                                <tr>
                                    {Array.from(makeRange(table.cols + 1)).map(
                                        (tableColIndex) => {
                                            const cellPosition = {
                                                row: tableRowIndex - 1,
                                                col: tableColIndex - 1,
                                            };
                                            if (
                                                cellPosition.row < 0 &&
                                                cellPosition.col < 0
                                            ) {
                                                return <td />;
                                            }
                                            if (cellPosition.row < 0) {
                                                return (
                                                    <HeaderCell
                                                        col={cellPosition.col}
                                                    />
                                                );
                                            }
                                            if (cellPosition.col < 0) {
                                                return (
                                                    <HeaderCell
                                                        row={cellPosition.row}
                                                    />
                                                );
                                            }
                                            return (
                                                <Cell
                                                    onDblClick={() => {
                                                        inputRef.current?.focus();
                                                    }}
                                                    onMouseOver={() => {
                                                        if (
                                                            !state.isDragging ||
                                                            !state.selection
                                                        )
                                                            return;
                                                        if (
                                                            state.selection
                                                                .type ===
                                                            'range'
                                                        ) {
                                                            state.selection = {
                                                                type: 'range',
                                                                position:
                                                                    state
                                                                        .selection
                                                                        .position,
                                                                start: state
                                                                    .selection
                                                                    .start,
                                                                end: cellPosition,
                                                            };
                                                        } else if (
                                                            state.selection
                                                                .type === 'cell'
                                                        ) {
                                                            state.selection = {
                                                                type: 'range',
                                                                position:
                                                                    state
                                                                        .selection
                                                                        .position,
                                                                start: state
                                                                    .selection
                                                                    .position,
                                                                end: cellPosition,
                                                            };
                                                        } else {
                                                            log.assertExhausted(
                                                                state.selection
                                                            );
                                                        }
                                                    }}
                                                    onMouseDown={(e) => {
                                                        e.preventDefault();
                                                        state.selection = {
                                                            type: 'cell',
                                                            position:
                                                                cellPosition,
                                                        };
                                                        state.isDragging = true;

                                                        const handler = (
                                                            e: MouseEvent
                                                        ) => {
                                                            e.preventDefault();
                                                            state.isDragging =
                                                                false;
                                                            document.body.removeEventListener(
                                                                'mouseup',
                                                                handler
                                                            );
                                                        };
                                                        document.body.addEventListener(
                                                            'mouseup',
                                                            handler
                                                        );
                                                    }}
                                                    table={table}
                                                    row={cellPosition.row}
                                                    col={cellPosition.col}
                                                    isActive={calc(
                                                        () =>
                                                            !!(
                                                                state.selection &&
                                                                inSelection(
                                                                    state.selection,
                                                                    cellPosition
                                                                )
                                                            ),
                                                        `cell:${cellPosition.col}:${cellPosition.row}:isActive`
                                                    )}
                                                    isFocused={calc(
                                                        () =>
                                                            !!(
                                                                state.selection &&
                                                                state.selection
                                                                    .position
                                                                    .row ===
                                                                    cellPosition.row &&
                                                                state.selection
                                                                    .position
                                                                    .col ===
                                                                    cellPosition.col
                                                            ),
                                                        `cell:${cellPosition.col}:${cellPosition.row}:isFocused`
                                                    )}
                                                />
                                            );
                                        }
                                    )}
                                </tr>
                            )
                        ),
                    'table:body'
                )}
            </table>
            <label>
                Formula (block):{' '}
                <textarea
                    on:input={onTextAreaInput}
                    ref={textAreaRef}
                    disabled={calc(
                        () => !getSelectedKey(),
                        'textarea:disabled'
                    )}
                >
                    {getSelectedCellCode}
                </textarea>
            </label>
        </div>
    );
};

const App: Component<{}> = () => {
    const table = makeTable({ rows: 20, cols: 20 });
    table.code['A0'] = '"Hello,"';
    table.code['B0'] = '"+"';
    table.code['C0'] = '"world"';
    table.code['D0'] = '"+"';
    table.code['E0'] = '"!"';
    table.code['F0'] = '"="';
    table.code['G0'] = '[cell.A0 + cell.C0, cell.E0].join(" ")';
    table.code['A1'] = '"Seq:"';
    table.code['A2'] = '"Sum:"';
    table.code['A3'] = '"SumSum:"';
    for (let i = 1; i < 11; ++i) {
        table.code[`${colKeys[i]}1`] = `${i}`;
    }
    for (let i = 1; i < 11; ++i) {
        table.code[`${colKeys[i]}2`] = `sum(cell["B1:${colKeys[i]}1"])`;
    }
    for (let i = 1; i < 11; ++i) {
        table.code[`${colKeys[i]}3`] = `sum(cell["B2:${colKeys[i]}2"])`;
    }

    return (
        <div class="container">
            <Spreadsheet table={table} />
        </div>
    );
};

const root = document.getElementById('app');
if (root) {
    mount(root, <App />);
}
