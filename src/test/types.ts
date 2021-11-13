export interface InitMessageTest {
    id: number;
    name: string;
    only: boolean;
}

export function isInitMessageTest(test: any): test is InitMessageTest {
    return !!(
        typeof test === 'object' &&
        test &&
        typeof test.id === 'number' &&
        typeof test.name === 'string' &&
        typeof test.only === 'boolean'
    );
}

export interface InitMessageSuite {
    id: number;
    name: string;
    parentSuiteId: number | undefined;
    only: boolean;
    tests: InitMessageTest[];
}

export function isInitMessageSuite(suite: any): suite is InitMessageSuite {
    return !!(
        typeof suite === 'object' &&
        suite &&
        typeof suite.id === 'number' &&
        typeof suite.name === 'string' &&
        (typeof suite.parentSuiteId === 'number' ||
            suite.parentSuiteId === undefined) &&
        typeof suite.only === 'boolean' &&
        Array.isArray(suite.tests) &&
        suite.tests.every((test: any) => isInitMessageTest(test))
    );
}

export interface InitMessage {
    url: string;
    type: 'init';
    suites: InitMessageSuite[];
}

export function isInitMessage(msg: any): msg is InitMessage {
    return !!(
        typeof msg === 'object' &&
        msg &&
        typeof msg.url === 'string' &&
        msg.type === 'init' &&
        Array.isArray(msg.suites) &&
        msg.suites.every((suite: any) => isInitMessageSuite(suite))
    );
}

export interface Response<T> {
    id: number;
    type: 'response';
    response: T;
    isPartial: boolean;
}

export function makeResponse<T>(id: number, item: T): Response<T> {
    return {
        id,
        type: 'response',
        response: item,
        isPartial: false,
    };
}

export function makePartialResponse<T>(id: number, item: T): Response<T> {
    return {
        id,
        type: 'response',
        response: item,
        isPartial: true,
    };
}

export interface Request<T> {
    id: number;
    type: 'request';
    request: T;
}

export interface InitRequest {
    type: 'init';
}

export function makeRequest<T>(id: number, item: T): Request<T> {
    return {
        id,
        type: 'request',
        request: item,
    };
}

export interface RunTestRequest {
    type: 'runtest';
    suiteId: number;
    testId: number;
}

export function isRequest(msg: any): msg is Request<unknown> {
    return (
        typeof msg.id === 'number' && msg.type === 'request' && 'request' in msg
    );
}

export function isInitRequest(msg: any): msg is Request<InitRequest> {
    if (!isRequest(msg)) return false;
    const request: any = msg.request;
    return !!(request && request.type === 'init');
}

export function isResponse(msg: any): msg is Response<unknown> {
    return (
        typeof msg.id === 'number' &&
        msg.type === 'response' &&
        typeof msg.response === 'object' &&
        typeof msg.isPartial === 'boolean'
    );
}

export function makeRunTestRequest({
    suiteId,
    testId,
}: {
    suiteId: number;
    testId: number;
}): RunTestRequest {
    return {
        type: 'runtest',
        suiteId,
        testId,
    };
}

export function isRunTestRequest(msg: any): msg is Request<RunTestRequest> {
    if (!isRequest(msg)) return false;
    const request: any = msg.request;
    return !!(
        request &&
        request.type === 'runtest' &&
        typeof request.suiteId === 'number' &&
        typeof request.testId === 'number'
    );
}

export type RunResponse =
    | { type: 'runtest'; result: 'done' }
    | { type: 'runtest'; result: 'error'; error: string };

export function isRunResponse(msg: any): msg is RunResponse {
    return (
        msg.type === 'runtest' &&
        (msg.result === 'done' ||
            (msg.result === 'error' && typeof msg.error === 'string'))
    );
}

export type RunUpdate =
    | { type: 'internal'; error: string }
    | {
          type: 'test';
          suiteId: number;
          testId: number;
          result: 'fail';
          error: string;
      }
    | {
          type: 'test';
          suiteId: number;
          testId: number;
          result: 'pass';
          duration: number;
          selfDuration: number;
      }
    | {
          type: 'test';
          suiteId: number;
          testId: number;
          result: 'run';
      };

export function isRunUpdate(msg: any): msg is RunUpdate {
    if (msg && msg.type === 'internal' && typeof msg.error === 'string') {
        return true;
    }
    if (
        msg &&
        msg.type === 'test' &&
        typeof msg.testId === 'number' &&
        typeof msg.suiteId === 'number' &&
        msg.result === 'pass' &&
        typeof msg.duration === 'number' &&
        typeof msg.selfDuration === 'number'
    ) {
        return true;
    }
    if (
        msg &&
        msg.type === 'test' &&
        typeof msg.testId === 'number' &&
        typeof msg.suiteId === 'number' &&
        msg.result === 'run'
    ) {
        return true;
    }
    if (
        msg &&
        msg.type === 'test' &&
        typeof msg.testId === 'number' &&
        typeof msg.suiteId === 'number' &&
        msg.result === 'fail' &&
        typeof msg.error === 'string'
    ) {
        return true;
    }
    return false;
}
