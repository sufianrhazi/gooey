import type {
    EmptyProps,
    Model,
    Ref} from '../../..';
import Gooey, {
    ClassComponent,
    model,
    calc,
    flush,
    ref
} from '../../..';
import { SpreadsheetState } from './spreadsheet-state';
import type {
    Position} from './utils';
import {
    COLS,
    ROWS,
    NUM_COL,
    NUM_ROW,
    positionToString,
    colToString,
    rowToString,
} from './utils';
import type { CellApi} from './cell';
import { Cell } from './cell';
import './cells.css';

export class Cells extends ClassComponent {
    cellState: SpreadsheetState;
    cellRefs: Record<string, Ref<CellApi | undefined>>;
    state: Model<{
        hasFocus: boolean;
        activePosition: Position;
        editing: false;
    }>;

    tableRef: Ref<HTMLTableElement | undefined>;

    constructor(props: EmptyProps) {
        super(props);

        this.cellState = new SpreadsheetState();

        this.cellRefs = {};
        for (const col of COLS) {
            for (const row of ROWS) {
                const name = positionToString({ row, col });
                this.cellRefs[name] = ref();
            }
        }

        this.tableRef = ref();

        this.state = model({
            hasFocus: false,
            activePosition: { col: 0, row: 0 },
            editing: false,
        });
    }

    moveFocusTo(position: Position) {
        this.state.activePosition = position;
        this.cellRefs[positionToString(position)]?.current?.focus();
    }

    onKeyDown = (e: KeyboardEvent, tableEl: HTMLTableElement) => {
        if (!this.state.hasFocus) return;
        let handled = false;
        if (e.key === 'ArrowLeft' && this.state.activePosition.col > 0) {
            this.moveFocusTo({
                col: this.state.activePosition.col - 1,
                row: this.state.activePosition.row,
            });
            handled = true;
        } else if (
            e.key === 'ArrowRight' &&
            this.state.activePosition.col < NUM_COL - 1
        ) {
            this.moveFocusTo({
                col: this.state.activePosition.col + 1,
                row: this.state.activePosition.row,
            });
            handled = true;
        } else if (e.key === 'ArrowUp' && this.state.activePosition.row > 0) {
            this.moveFocusTo({
                col: this.state.activePosition.col,
                row: this.state.activePosition.row - 1,
            });
            handled = true;
        } else if (
            e.key === 'ArrowDown' &&
            this.state.activePosition.row < NUM_ROW - 1
        ) {
            this.moveFocusTo({
                col: this.state.activePosition.col,
                row: this.state.activePosition.row + 1,
            });
            handled = true;
        } else if (e.key === 'Home') {
            this.moveFocusTo({
                col: 0,
                row: this.state.activePosition.row,
            });
            handled = true;
        } else if (e.key === 'End') {
            this.moveFocusTo({
                col: NUM_COL - 1,
                row: this.state.activePosition.row,
            });
            handled = true;
        } else if (e.key === 'Backspace' || e.key === 'Delete') {
            this.cellState.set(this.state.activePosition, '');
            handled = true;
        } else if (e.key === 'Enter') {
            this.cellRefs[
                positionToString(this.state.activePosition)
            ].current?.edit();
            handled = true;
        } else if (e.key === 'Tab') {
            if (e.shiftKey && this.state.activePosition.col > 0) {
                this.moveFocusTo({
                    row: this.state.activePosition.row,
                    col: this.state.activePosition.col - 1,
                });
                handled = true;
            }
            if (!e.shiftKey && this.state.activePosition.col < NUM_COL - 1) {
                this.moveFocusTo({
                    row: this.state.activePosition.row,
                    col: this.state.activePosition.col + 1,
                });
                handled = true;
            }
        }
        if (handled) {
            e.preventDefault();
            e.stopPropagation();
        } else if (e.key.match(/^(\p{L}|\p{N}|\p{S}|\p{P})$/u)) {
            this.cellState.set(this.state.activePosition, '');
            this.cellRefs[
                positionToString(this.state.activePosition)
            ].current?.edit();
            flush();
        }
    };

    renderCell(position: Position) {
        return (
            <Cell
                api={this.cellRefs[positionToString(position)]}
                position={position}
                isActive={calc(
                    () =>
                        position.col === this.state.activePosition.col &&
                        position.row === this.state.activePosition.row
                )}
                onClick={(e) => {
                    this.moveFocusTo(position);
                    e.preventDefault();
                }}
                rawContent={calc(() => this.cellState.readRaw(position))}
                evalContent={calc(() => this.cellState.read(position))}
                onContentChange={(val) => {
                    this.cellState.set(position, val);
                }}
            />
        );
    }

    render() {
        return (
            <div class="table-container">
                <table
                    ref={this.tableRef}
                    class="spreadsheet"
                    on:focusin={() => {
                        this.state.hasFocus = true;
                    }}
                    on:focusout={() => {
                        this.state.hasFocus = false;
                    }}
                    on:keydown={this.onKeyDown}
                >
                    <thead>
                        <tr>
                            <th class="cell empty" />
                            {COLS.map((col) => (
                                <th class="cell">{colToString(col)}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {ROWS.map((row) => (
                            <tr>
                                <th scope="row" class="cell">
                                    {rowToString(row)}
                                </th>
                                {COLS.map((col) =>
                                    this.renderCell({ col, row })
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    }
}
