export class InvariantError extends Error {
    detail?: any;
    constructor(msg: string, detail?: any) {
        super(msg);
        this.detail = detail;
    }
}
