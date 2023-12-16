import { ClassComponent, EmptyProps, Model, Ref } from '../../..';
import { SpreadsheetState } from './spreadsheet-state';
import { Position } from './utils';
import { CellApi } from './cell';
import './cells.css';
export declare class Cells extends ClassComponent {
    cellState: SpreadsheetState;
    cellRefs: Record<string, Ref<CellApi | undefined>>;
    state: Model<{
        hasFocus: boolean;
        activePosition: Position;
        editing: false;
    }>;
    tableRef: Ref<HTMLTableElement | undefined>;
    constructor(props: EmptyProps);
    moveFocusTo(position: Position): void;
    onKeyDown: (e: KeyboardEvent, tableEl: HTMLTableElement) => void;
    renderCell(position: Position): import("../../../rendernode").RenderNode;
    render(): import("../../../rendernode").RenderNode;
}
//# sourceMappingURL=cells.d.ts.map