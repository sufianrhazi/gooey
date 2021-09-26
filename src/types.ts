export class InvariantError extends Error {}

export type SourceItem = {
    type: 'model';
    model: any;
    key: string | symbol;
};

export type ComputationItem = {
    type: 'computation';
    computation: () => any;
    invalidate: () => void;
};

export type Item = SourceItem | ComputationItem;
