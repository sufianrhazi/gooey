import type { Component, Calculation, Ref } from '../../..';
import type { EvalResult } from './spreadsheet-state';
import type { Position } from './utils';
import './cells.css';
export interface CellApi {
    edit: () => void;
    focus: () => void;
}
export declare const Cell: Component<{
    position: Position;
    isActive: Calculation<boolean>;
    onClick: (e: MouseEvent) => void;
    rawContent: Calculation<string>;
    evalContent: Calculation<EvalResult>;
    onContentChange: (newContent: string) => void;
    api: Ref<CellApi | undefined>;
}>;
//# sourceMappingURL=cell.d.ts.map