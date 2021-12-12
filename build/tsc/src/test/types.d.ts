export interface InitMessageTest {
    id: number;
    name: string;
    only: boolean;
}
export declare function isInitMessageTest(test: any): test is InitMessageTest;
export interface InitMessageSuite {
    id: number;
    name: string;
    parentSuiteId: number | undefined;
    only: boolean;
    tests: InitMessageTest[];
}
export declare function isInitMessageSuite(suite: any): suite is InitMessageSuite;
export interface InitMessage {
    url: string;
    type: 'init';
    suites: InitMessageSuite[];
}
export declare function isInitMessage(msg: any): msg is InitMessage;
export interface Response<T> {
    id: number;
    type: 'response';
    response: T;
    isPartial: boolean;
}
export declare function makeResponse<T>(id: number, item: T): Response<T>;
export declare function makePartialResponse<T>(id: number, item: T): Response<T>;
export interface Request<T> {
    id: number;
    type: 'request';
    request: T;
}
export interface InitRequest {
    type: 'init';
}
export declare function makeRequest<T>(id: number, item: T): Request<T>;
export interface RunTestRequest {
    type: 'runtest';
    suiteId: number;
    testId: number;
}
export declare function isRequest(msg: any): msg is Request<unknown>;
export declare function isInitRequest(msg: any): msg is Request<InitRequest>;
export declare function isResponse(msg: any): msg is Response<unknown>;
export declare function makeRunTestRequest({ suiteId, testId, }: {
    suiteId: number;
    testId: number;
}): RunTestRequest;
export declare function isRunTestRequest(msg: any): msg is Request<RunTestRequest>;
export declare type RunResponse = {
    type: 'runtest';
    result: 'done';
} | {
    type: 'runtest';
    result: 'error';
    error: string;
};
export declare function isRunResponse(msg: any): msg is RunResponse;
export declare type RunUpdate = {
    type: 'internal';
    error: string;
} | {
    type: 'test';
    suiteId: number;
    testId: number;
    result: 'fail';
    error: string;
} | {
    type: 'test';
    suiteId: number;
    testId: number;
    result: 'pass';
    duration: number;
    selfDuration: number;
    extraInfo: string[];
} | {
    type: 'test';
    suiteId: number;
    testId: number;
    result: 'run';
};
export declare function isRunUpdate(msg: any): msg is RunUpdate;
//# sourceMappingURL=types.d.ts.map