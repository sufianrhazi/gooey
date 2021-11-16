import { isEqual } from 'lodash';
import {
    InitMessage,
    InitMessageSuite,
    InitMessageTest,
    isRequest,
    isInitRequest,
    isRunTestRequest,
    makeResponse,
    makePartialResponse,
    RunTestRequest,
    RunUpdate,
    RunResponse,
} from './test/types';
import { setLogLevel } from './log';

setLogLevel('debug');

type TestContext = any;

type TestAction = (ctx: TestContext) => Promise<void> | void;

interface Suite {
    id: number;
    name: string;
    beforeEach: TestAction[];
    tests: Test[];
    afterEach: TestAction[];
    parent: Suite | undefined;
    assertions: number;
    only: boolean;
}

interface Test {
    id: number;
    name: string;
    impl: TestAction;
    parent: Suite;
    assertions: number;
    only: boolean;
}

function repr(obj: any) {
    if (obj instanceof RegExp) {
        return obj.toString();
    }
    return JSON.stringify(obj, null, 4);
}

let id = 0;
const makeId = () => ++id;

const suitesById: Record<number, Suite> = {};
const testsById: Record<number, Test> = {};

const makeTest = ({
    name,
    impl,
    parent,
    only,
}: {
    name: string;
    impl: TestAction;
    parent: Suite;
    only: boolean;
}): Test => {
    const newTest: Test = {
        id: makeId(),
        name,
        impl,
        parent,
        assertions: 0,
        only,
    };
    testsById[newTest.id] = newTest;
    return newTest;
};

const makeSuite = ({
    name,
    parent = undefined,
    only,
}: {
    name: string;
    parent?: Suite;
    only: boolean;
}): Suite => {
    const newSuite: Suite = {
        id: makeId(),
        name,
        beforeEach: [],
        tests: [],
        afterEach: [],
        parent,
        assertions: 0,
        only,
    };
    suitesById[newSuite.id] = newSuite;
    return newSuite;
};

let currentSuite: Suite = makeSuite({ name: '', only: false });

const suites: Suite[] = [];

suites.push(currentSuite);

class AssertionError extends Error {
    public format: () => string;
    public msg: string | undefined;

    constructor(name: string, format: () => string, msg?: string) {
        super(`AssertionError: assert.${name}`);
        this.format = format;
        this.msg = msg;
    }
}

type Report =
    | {
          type: 'runtest';
          result: 'done';
      }
    | {
          type: 'runtest';
          result: 'error';
          error: any;
      }
    | {
          type: 'internal';
          e: any;
      }
    | {
          type: 'test';
          test: Test;
          result: 'run';
      }
    | {
          type: 'test';
          test: Test;
          result: 'pass';
          selfDuration: number;
          duration: number;
      }
    | {
          type: 'test';
          test: Test;
          result: 'fail';
          e: any;
      };

export function abstractSuite(name: string, body: () => void) {
    const fixture = makeSuite({ name, parent: undefined, only: false });
    const lastSuite = currentSuite;
    currentSuite = fixture;
    body();
    currentSuite = lastSuite;
    return (name: string, body: () => void, only = false) => {
        const realSuite = makeSuite({ name, parent: currentSuite, only });
        realSuite.beforeEach = [...fixture.beforeEach];
        realSuite.tests = [...fixture.tests];
        realSuite.afterEach = [...fixture.afterEach];

        currentSuite = realSuite;
        body();
        suites.push(currentSuite);
        if (!currentSuite.parent) {
            throw new Error('Internal test integrity issue: suite tree empty?');
        }
        currentSuite = currentSuite.parent;
    };
}

function suiteInner(name: string, body: () => void, only: boolean) {
    currentSuite = makeSuite({ name, parent: currentSuite, only });
    body();
    suites.push(currentSuite);
    if (!currentSuite.parent) {
        throw new Error('Internal test integrity issue: suite tree empty?');
    }
    currentSuite = currentSuite.parent;
}

export function suite(name: string, body: () => void) {
    suiteInner(name, body, false);
}
suite.only = function suiteQnly(name: string, body: () => void) {
    suiteInner(name, body, true);
};

export function beforeEach(action: TestAction) {
    currentSuite.beforeEach.push(action);
}

export function afterEach(action: TestAction) {
    currentSuite.afterEach.push(action);
}

function testInner(name: string, impl: TestAction, only = false) {
    const test = makeTest({ name, impl, parent: currentSuite, only });
    currentSuite.tests.push(test);
}
export function test(name: string, impl: TestAction) {
    testInner(name, impl, false);
}
test.only = function testOnly(name: string, impl: TestAction) {
    testInner(name, impl, true);
};

async function runBeforeEach(ctx: TestContext, suite: Suite | undefined) {
    if (suite) {
        await runBeforeEach(ctx, suite.parent);
        for (const beforeEach of suite.beforeEach) await beforeEach(ctx);
    }
}

async function runAfterEach(ctx: TestContext, suite: Suite | undefined) {
    if (suite) {
        for (const afterEach of suite.afterEach) await afterEach(ctx);
        await runAfterEach(ctx, suite.parent);
    }
}

let runningTest: Test | undefined = undefined;

function countAssertion() {
    if (!runningTest) {
        throw new Error(
            'Internal test integrity issue: assertion performed outside of test?'
        );
    }
    runningTest.assertions += 1;
}

export const assert = {
    fail: (msg?: string) => {
        countAssertion();
        throw new AssertionError('fail', () => `FAIL`, msg);
    },
    is: (a: any, b: any, msg?: string) => {
        countAssertion();
        if (a !== b) {
            throw new AssertionError(
                'is',
                () => `${repr(a)} is not ${repr(b)}`,
                msg
            );
        }
    },
    isNot: (a: any, b: any, msg?: string) => {
        countAssertion();
        if (a === b) {
            throw new AssertionError(
                'isNot',
                () => `${repr(a)} is ${repr(b)}`,
                msg
            );
        }
    },
    isTruthy: (a: any, msg?: string) => {
        countAssertion();
        if (!a) {
            throw new AssertionError(
                'isTruthy',
                () => `${repr(a)} is not truthy`,
                msg
            );
        }
    },
    isFalsy: (a: any, msg?: string) => {
        countAssertion();
        if (!a) {
            throw new AssertionError(
                'isFalsy',
                () => `${repr(a)} is not falsy`,
                msg
            );
        }
    },
    lessThan: (a: string | number, b: string | number, msg?: string) => {
        countAssertion();
        if (!(a < b)) {
            throw new AssertionError(
                'lessThan',
                () => `${repr(a)} not < ${repr(b)}`,
                msg
            );
        }
    },
    lessThanOrEqual: (a: string | number, b: string | number, msg?: string) => {
        countAssertion();
        if (!(a <= b)) {
            throw new AssertionError(
                'lessThanOrEqual',
                () => `${repr(a)} not <= ${repr(b)}`,
                msg
            );
        }
    },
    greaterThan: (a: string | number, b: string | number, msg?: string) => {
        countAssertion();
        if (!(a > b)) {
            throw new AssertionError(
                'greaterThan',
                () => `${repr(a)} not > ${repr(b)}`,
                msg
            );
        }
    },
    greaterThanOrEqual: (
        a: string | number,
        b: string | number,
        msg?: string
    ) => {
        countAssertion();
        if (!(a >= b)) {
            throw new AssertionError(
                'greaterThan',
                () => `${repr(a)} not >= ${repr(b)}`,
                msg
            );
        }
    },
    arrayIncludes: (haystack: readonly any[], needle: any, msg?: string) => {
        countAssertion();
        if (!haystack.includes(needle)) {
            throw new AssertionError(
                'arrayIncludes',
                () => `${repr(needle)} not found within ${repr(haystack)}`,
                msg
            );
        }
    },
    notArrayIncludes: (haystack: readonly any[], needle: any, msg?: string) => {
        countAssertion();
        if (haystack.includes(needle)) {
            throw new AssertionError(
                'notArrayIncludes',
                () => `${repr(needle)} is found within ${repr(haystack)}`,
                msg
            );
        }
    },
    arrayEqualsUnsorted: (
        a: readonly any[],
        b: readonly any[],
        msg?: string
    ) => {
        const setA = new Set(a);
        const setB = new Set(b);
        const isEqual =
            Array.from(setA).every((a) => setB.has(a)) &&
            Array.from(setB).every((b) => setA.has(b));
        if (!isEqual) {
            throw new AssertionError(
                'arrayEqualsUnsorted',
                () =>
                    `${repr(a)} does not contain the exact same items as ${repr(
                        b
                    )}`,
                msg
            );
        }
    },
    deepEqual: (a: any, b: any, msg?: string) => {
        countAssertion();
        if (!isEqual(a, b)) {
            throw new AssertionError(
                'isEqual',
                () => `${repr(a)} not deeply equal to ${repr(b)}`,
                msg
            );
        }
    },
    notDeepEqual: (a: any, b: any, msg?: string) => {
        countAssertion();
        if (isEqual(a, b)) {
            throw new AssertionError(
                'notDeepEqual',
                () => `${repr(a)} is deeply equal to ${repr(b)}`,
                msg
            );
        }
    },
    assertionCount: (num: number, msg?: string) => {
        if (!runningTest) {
            throw new Error(
                'Internal test integrity issue: assert.assertionCount() performed outside of test?'
            );
        }
        const currentAssertions = runningTest.assertions;
        countAssertion();
        if (currentAssertions !== num) {
            throw new AssertionError(
                'assertionCount',
                () =>
                    `expected ${repr(
                        num
                    )} assertions in test, but only performed ${repr(
                        currentAssertions
                    )}`,
                msg
            );
        }
    },
    throwsMatching: (match: string | RegExp, fn: () => void, msg?: string) => {
        countAssertion();
        let err: any = undefined;
        try {
            fn();
        } catch (e) {
            err = e;
        }
        if (!err) {
            throw new AssertionError(
                'throwsMatching',
                () => `expected ${repr(fn)} to throw, but it did not`
            );
        }
        const re = new RegExp(match);
        if (!re.test(err.message)) {
            throw new AssertionError(
                'throwsMatching',
                () =>
                    `expected ${repr(fn)} to throw matching ${repr(
                        match
                    )}, but it threw:\n\n${repr(err.message)}`,
                msg
            );
        }
    },
};

const testRoot = document.createElement('div');
testRoot.id = 'test-root';
document.body.appendChild(testRoot);

beforeEach(() => {
    while (testRoot.childNodes.length > 0) {
        testRoot.removeChild(testRoot.childNodes[0]);
    }
});

function formatError(e: any) {
    let msg = '';
    if (e instanceof AssertionError) {
        if (e.msg) {
            msg += `Message: ${e.msg}\n`;
        }
        msg += `Reason: ${e.format()}\n`;
    }
    if (e instanceof Error) {
        msg += `${e.stack}\n`;
    }
    return msg === '' ? 'unknown error' : msg;
}

function sendUpdate(
    source: MessageEventSource,
    id: number,
    response: RunUpdate
) {
    source.postMessage(makePartialResponse(id, response));
}

function sendResponse(
    source: MessageEventSource,
    id: number,
    response: RunResponse
) {
    source.postMessage(makeResponse(id, response));
}

function respond(info: Report, id: number, source: MessageEventSource) {
    if (info.type === 'internal') {
        sendUpdate(source, id, {
            type: 'internal',
            error: formatError(info.e),
        });
        console.error(info.e);
    } else if (info.type === 'test') {
        switch (info.result) {
            case 'fail':
                sendUpdate(source, id, {
                    type: 'test',
                    suiteId: info.test.parent.id,
                    testId: info.test.id,
                    result: 'fail',
                    error: formatError(info.e),
                });
                break;
            case 'pass':
                sendUpdate(source, id, {
                    type: 'test',
                    suiteId: info.test.parent.id,
                    testId: info.test.id,
                    result: 'pass',
                    duration: info.duration,
                    selfDuration: info.selfDuration,
                });
                break;
            case 'run':
                sendUpdate(source, id, {
                    type: 'test',
                    suiteId: info.test.parent.id,
                    testId: info.test.id,
                    result: 'run',
                });
                break;
        }
    } else if (info.type === 'runtest') {
        switch (info.result) {
            case 'done':
                sendResponse(source, id, {
                    type: info.type,
                    result: 'done',
                });
                break;
            case 'error':
                sendResponse(source, id, {
                    type: info.type,
                    result: 'error',
                    error: info.error,
                });
                break;
        }
    }
}

function makeInitPayload(allSuites: Suite[]): InitMessage {
    const suitesList: InitMessageSuite[] = [];
    allSuites.forEach((suite) => {
        const tests: InitMessageTest[] = [];
        suite.tests.forEach((test) => {
            tests.push({
                id: test.id,
                name: test.name,
                only: test.only,
            });
        });
        suitesList.push({
            id: suite.id,
            name: suite.name,
            parentSuiteId: suite.parent ? suite.parent.id : undefined,
            tests,
            only: suite.only,
        });
    });

    return {
        url: window.location.toString(),
        type: 'init',
        suites: suitesList,
    };
}

async function handleRunTest(
    event: RunTestRequest,
    id: number,
    source: MessageEventSource
) {
    const suite = suitesById[event.suiteId];
    const test = testsById[event.testId];
    runningTest = test;
    respond(
        {
            type: 'test',
            test,
            result: 'run',
        },
        id,
        source
    );
    const ctx: TestContext = {};
    try {
        const testStart = performance.now();
        await runBeforeEach(ctx, suite);
        const testImplStart = performance.now();
        await test.impl(ctx);
        const selfDuration = performance.now() - testImplStart;
        await runAfterEach(ctx, suite);
        const duration = performance.now() - testStart;
        respond(
            {
                type: 'test',
                test,
                result: 'pass',
                selfDuration,
                duration,
            },
            id,
            source
        );
    } catch (e) {
        console.error(
            'Test failure',
            window.location,
            suite.name,
            test.name,
            e
        );
        respond(
            {
                type: 'test',
                test,
                result: 'fail',
                e,
            },
            id,
            source
        );
        return;
    }
}

// Main initialization
setTimeout(() => 0);

// Event initialization
window.addEventListener(
    'message',
    (event) => {
        if (event.origin !== window.location.origin) {
            return;
        }
        if (!isRequest(event.data)) {
            return;
        }
        const source = event.source;
        if (!source) {
            return;
        }
        if (isInitRequest(event.data)) {
            window.parent.postMessage(
                makeResponse(event.data.id, makeInitPayload(suites)),
                window.location.origin
            );
        }
        if (isRunTestRequest(event.data)) {
            handleRunTest(event.data.request, event.data.id, source)
                .then(() => {
                    respond(
                        {
                            type: 'runtest',
                            result: 'done',
                        },
                        event.data.id,
                        source
                    );
                })
                .catch((e) => {
                    respond(
                        {
                            type: 'runtest',
                            result: 'error',
                            error: e,
                        },
                        event.data.id,
                        source
                    );
                });
        }
    },
    false
);
