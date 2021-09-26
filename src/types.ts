export class InvariantError extends Error {}

export type SourceItem = {
    type: 'model';
    model: any;
    key: string | symbol;
};

export type ComputationItem = {
    type: 'computation';
    computation: () => any;
};

export type Item = SourceItem | ComputationItem;
