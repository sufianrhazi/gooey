import type { EmptyProps, Model, Ref } from '../../..';
import { ClassComponent } from '../../..';
import { SpreadsheetState } from './spreadsheet-state';
import type { Position } from './utils';
import type { CellApi } from './cell';
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
    renderCell(position: Position): import("../../../viewcontroller/rendernode/rendernode").RenderNode;
    render(): import("../../../viewcontroller/rendernode/rendernode").RenderNode;
}
//# sourceMappingURL=cells.d.ts.map