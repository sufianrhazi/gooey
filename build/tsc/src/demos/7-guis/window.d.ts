import { Component } from '../..';
import './window.css';
export interface WindowPosition {
    x: number;
    y: number;
}
export declare const Window: Component<{
    children: JSX.Node;
    name: string;
    onClose?: () => void;
    startPosition?: WindowPosition | undefined;
    onMove?: (position: WindowPosition) => void;
    minWidth?: number;
    minHeight?: number;
}>;
//# sourceMappingURL=window.d.ts.map