export function isInitMessageTest(test) {
    return !!(typeof test === 'object' &&
        test &&
        typeof test.id === 'number' &&
        typeof test.name === 'string' &&
        typeof test.only === 'boolean');
}
export function isInitMessageSuite(suite) {
    return !!(typeof suite === 'object' &&
        suite &&
        typeof suite.id === 'number' &&
        typeof suite.name === 'string' &&
        (typeof suite.parentSuiteId === 'number' ||
            suite.parentSuiteId === undefined) &&
        typeof suite.only === 'boolean' &&
        Array.isArray(suite.tests) &&
        suite.tests.every((test) => isInitMessageTest(test)));
}
export function isInitMessage(msg) {
    return !!(typeof msg === 'object' &&
        msg &&
        typeof msg.url === 'string' &&
        msg.type === 'init' &&
        Array.isArray(msg.suites) &&
        msg.suites.every((suite) => isInitMessageSuite(suite)));
}
export function makeResponse(id, item) {
    return {
        id,
        type: 'response',
        response: item,
        isPartial: false,
    };
}
export function makePartialResponse(id, item) {
    return {
        id,
        type: 'response',
        response: item,
        isPartial: true,
    };
}
export function makeRequest(id, item) {
    return {
        id,
        type: 'request',
        request: item,
    };
}
export function isRequest(msg) {
    return (typeof msg.id === 'number' && msg.type === 'request' && 'request' in msg);
}
export function isInitRequest(msg) {
    if (!isRequest(msg))
        return false;
    const request = msg.request;
    return !!(request && request.type === 'init');
}
export function isResponse(msg) {
    return (typeof msg.id === 'number' &&
        msg.type === 'response' &&
        typeof msg.response === 'object' &&
        typeof msg.isPartial === 'boolean');
}
export function makeRunTestRequest({ suiteId, testId, }) {
    return {
        type: 'runtest',
        suiteId,
        testId,
    };
}
export function isRunTestRequest(msg) {
    if (!isRequest(msg))
        return false;
    const request = msg.request;
    return !!(request &&
        request.type === 'runtest' &&
        typeof request.suiteId === 'number' &&
        typeof request.testId === 'number');
}
export function isRunResponse(msg) {
    return (msg.type === 'runtest' &&
        (msg.result === 'done' ||
            (msg.result === 'error' && typeof msg.error === 'string')));
}
export function isRunUpdate(msg) {
    if (msg && msg.type === 'internal' && typeof msg.error === 'string') {
        return true;
    }
    if (msg &&
        msg.type === 'test' &&
        typeof msg.testId === 'number' &&
        typeof msg.suiteId === 'number' &&
        msg.result === 'pass' &&
        typeof msg.duration === 'number' &&
        typeof msg.selfDuration === 'number' &&
        Array.isArray(msg.extraInfo) &&
        msg.extraInfo.every((info) => typeof info === 'string')) {
        return true;
    }
    if (msg &&
        msg.type === 'test' &&
        typeof msg.testId === 'number' &&
        typeof msg.suiteId === 'number' &&
        msg.result === 'run') {
        return true;
    }
    if (msg &&
        msg.type === 'test' &&
        typeof msg.testId === 'number' &&
        typeof msg.suiteId === 'number' &&
        msg.result === 'fail' &&
        typeof msg.error === 'string') {
        return true;
    }
    return false;
}
//# sourceMappingURL=types.js.map