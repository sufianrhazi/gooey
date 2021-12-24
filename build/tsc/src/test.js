import { isEqual } from 'lodash';
import { isRequest, isInitRequest, isRunTestRequest, makeResponse, makePartialResponse, } from './test/types';
import { nextFlush } from './index';
function repr(obj) {
    if (obj instanceof RegExp) {
        return obj.toString();
    }
    return JSON.stringify(obj, null, 4);
}
let id = 0;
const makeId = () => ++id;
const suitesById = {};
const testsById = {};
const makeTest = ({ name, impl, parent, only, }) => {
    const newTest = {
        id: makeId(),
        name,
        impl,
        parent,
        assertions: 0,
        only,
        extraInfo: [],
    };
    testsById[newTest.id] = newTest;
    return newTest;
};
function resetTestState(testObj) {
    testObj.assertions = 0;
    testObj.extraInfo = [];
}
const makeSuite = ({ name, parent = undefined, only, }) => {
    const newSuite = {
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
let currentSuite = makeSuite({ name: '', only: false });
const suites = [];
suites.push(currentSuite);
class AssertionError extends Error {
    constructor(name, format, msg) {
        super(`AssertionError: assert.${name}`);
        Object.defineProperty(this, "format", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "msg", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.format = format;
        this.msg = msg;
    }
}
export function abstractSuite(name, body) {
    const fixture = makeSuite({ name, parent: undefined, only: false });
    const lastSuite = currentSuite;
    currentSuite = fixture;
    body();
    currentSuite = lastSuite;
    return (name, body, only = false) => {
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
function suiteInner(name, body, only) {
    currentSuite = makeSuite({ name, parent: currentSuite, only });
    body();
    suites.push(currentSuite);
    if (!currentSuite.parent) {
        throw new Error('Internal test integrity issue: suite tree empty?');
    }
    currentSuite = currentSuite.parent;
}
export function suite(name, body) {
    suiteInner(name, body, false);
}
suite.only = function suiteQnly(name, body) {
    suiteInner(name, body, true);
};
export function beforeEach(action) {
    currentSuite.beforeEach.push(action);
}
export function afterEach(action) {
    currentSuite.afterEach.push(action);
}
function testInner(name, impl, only = false) {
    const test = makeTest({ name, impl, parent: currentSuite, only });
    currentSuite.tests.push(test);
}
export function test(name, impl) {
    testInner(name, impl, false);
}
test.only = function testOnly(name, impl) {
    testInner(name, impl, true);
};
async function runBeforeEach(ctx, suite) {
    if (suite) {
        await runBeforeEach(ctx, suite.parent);
        for (const beforeEach of suite.beforeEach)
            await beforeEach(ctx);
    }
}
async function runAfterEach(ctx, suite) {
    if (suite) {
        for (const afterEach of suite.afterEach)
            await afterEach(ctx);
        await runAfterEach(ctx, suite.parent);
        await nextFlush(); // For good measure, ensure we're flushed
    }
}
let runningTest = undefined;
function countAssertion() {
    if (!runningTest) {
        throw new Error('Internal test integrity issue: assertion performed outside of test?');
    }
    runningTest.assertions += 1;
}
function addTestExtraInfo(info) {
    if (!runningTest) {
        throw new Error('Internal test integrity issue: addTestExtraInfo performed outside of test?');
    }
    runningTest.extraInfo.push(info);
}
export const assert = {
    fail: (msg) => {
        countAssertion();
        throw new AssertionError('fail', () => `FAIL`, msg);
    },
    is: (a, b, msg) => {
        countAssertion();
        if (a !== b) {
            throw new AssertionError('is', () => `${repr(a)} is not ${repr(b)}`, msg);
        }
    },
    isNot: (a, b, msg) => {
        countAssertion();
        if (a === b) {
            throw new AssertionError('isNot', () => `${repr(a)} is ${repr(b)}`, msg);
        }
    },
    isTruthy: (a, msg) => {
        countAssertion();
        if (!a) {
            throw new AssertionError('isTruthy', () => `${repr(a)} is not truthy`, msg);
        }
    },
    isFalsy: (a, msg) => {
        countAssertion();
        if (a) {
            throw new AssertionError('isFalsy', () => `${repr(a)} is not falsy`, msg);
        }
    },
    lessThan: (a, b, msg) => {
        countAssertion();
        if (!(a < b)) {
            throw new AssertionError('lessThan', () => `${repr(a)} not < ${repr(b)}`, msg);
        }
    },
    lessThanOrEqual: (a, b, msg) => {
        countAssertion();
        if (!(a <= b)) {
            throw new AssertionError('lessThanOrEqual', () => `${repr(a)} not <= ${repr(b)}`, msg);
        }
    },
    greaterThan: (a, b, msg) => {
        countAssertion();
        if (!(a > b)) {
            throw new AssertionError('greaterThan', () => `${repr(a)} not > ${repr(b)}`, msg);
        }
    },
    greaterThanOrEqual: (a, b, msg) => {
        countAssertion();
        if (!(a >= b)) {
            throw new AssertionError('greaterThan', () => `${repr(a)} not >= ${repr(b)}`, msg);
        }
    },
    arrayIncludes: (haystack, needle, msg) => {
        countAssertion();
        if (!haystack.includes(needle)) {
            throw new AssertionError('arrayIncludes', () => `${repr(needle)} not found within ${repr(haystack)}`, msg);
        }
    },
    notArrayIncludes: (haystack, needle, msg) => {
        countAssertion();
        if (haystack.includes(needle)) {
            throw new AssertionError('notArrayIncludes', () => `${repr(needle)} is found within ${repr(haystack)}`, msg);
        }
    },
    arrayEqualsUnsorted: (a, b, msg) => {
        const setA = new Set(a);
        const setB = new Set(b);
        const isEqual = Array.from(setA).every((a) => setB.has(a)) &&
            Array.from(setB).every((b) => setA.has(b));
        if (!isEqual) {
            throw new AssertionError('arrayEqualsUnsorted', () => `${repr(a)} does not contain the exact same items as ${repr(b)}`, msg);
        }
    },
    deepEqual: (a, b, msg) => {
        countAssertion();
        if (!isEqual(a, b)) {
            throw new AssertionError('isEqual', () => `${repr(a)} not deeply equal to ${repr(b)}`, msg);
        }
    },
    notDeepEqual: (a, b, msg) => {
        countAssertion();
        if (isEqual(a, b)) {
            throw new AssertionError('notDeepEqual', () => `${repr(a)} is deeply equal to ${repr(b)}`, msg);
        }
    },
    assertionCount: (num, msg) => {
        if (!runningTest) {
            throw new Error('Internal test integrity issue: assert.assertionCount() performed outside of test?');
        }
        const currentAssertions = runningTest.assertions;
        countAssertion();
        if (currentAssertions !== num) {
            throw new AssertionError('assertionCount', () => `expected ${repr(num)} assertions in test, but only performed ${repr(currentAssertions)}`, msg);
        }
    },
    throwsMatching: (match, fn, msg) => {
        countAssertion();
        let err = undefined;
        try {
            fn();
        }
        catch (e) {
            err = e;
        }
        if (!err) {
            throw new AssertionError('throwsMatching', () => `expected ${repr(fn)} to throw, but it did not`);
        }
        const re = new RegExp(match);
        if (!re.test(err.message)) {
            throw new AssertionError('throwsMatching', () => `expected ${repr(fn)} to throw matching ${repr(match)}, but it threw:\n\n${repr(err.message)}`, msg);
        }
    },
    medianRuntimeLessThan: (ms, fn, numRuns = 19, msg) => {
        const runs = [];
        let isWarm = false;
        const startTime = performance.now();
        while (runs.length < numRuns) {
            if (!isWarm && performance.now() - startTime > 1000) {
                isWarm = true;
            }
            const fnStart = performance.now();
            let didMeasure = false;
            fn((measurement) => {
                const start = performance.now();
                const result = measurement();
                didMeasure = true;
                if (isWarm) {
                    runs.push(performance.now() - start);
                }
                return result;
            });
            const fnDuration = performance.now() - fnStart;
            if (isWarm && !didMeasure) {
                runs.push(fnDuration);
            }
        }
        const sortedRuns = runs
            .map((run, index) => [`run ${index.toString().padStart(2, ' ')}`, run])
            .sort((a, b) => a[1] - b[1]);
        const median = (sortedRuns[Math.floor((numRuns - 1) / 2)][1] +
            sortedRuns[Math.ceil((numRuns - 1) / 2)][1]) /
            2;
        addTestExtraInfo(`median run took ${median}ms\nRuntimes: ${JSON.stringify(sortedRuns.map(([msg, ms]) => `${msg}: ${ms}ms`), undefined, 4)}`);
        countAssertion();
        if (!(median < ms)) {
            throw new AssertionError('medianRuntimeLessThan', () => `median run took ${median}ms, which is more than the threshhold of ${ms}ms.\nRuntimes: ${JSON.stringify(sortedRuns.map(([msg, ms]) => `${msg}: ${ms}ms`), undefined, 4)}`, msg);
        }
    },
};
const testRoot = document.createElement('div');
testRoot.id = 'test-root';
document.body.appendChild(testRoot);
beforeEach(() => {
    testRoot.replaceChildren();
});
function formatError(e) {
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
function sendUpdate(source, id, response) {
    source.postMessage(makePartialResponse(id, response));
}
function sendResponse(source, id, response) {
    source.postMessage(makeResponse(id, response));
}
function respond(info, id, source) {
    if (info.type === 'internal') {
        sendUpdate(source, id, {
            type: 'internal',
            error: formatError(info.e),
        });
        console.error(info.e);
    }
    else if (info.type === 'test') {
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
                    extraInfo: info.extraInfo,
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
    }
    else if (info.type === 'runtest') {
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
function makeInitPayload(allSuites) {
    const suitesList = [];
    allSuites.forEach((suite) => {
        const tests = [];
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
async function handleRunTest(event, id, source) {
    const suite = suitesById[event.suiteId];
    const test = testsById[event.testId];
    resetTestState(test);
    runningTest = test;
    respond({
        type: 'test',
        test,
        result: 'run',
    }, id, source);
    const ctx = {};
    try {
        const testStart = performance.now();
        await runBeforeEach(ctx, suite);
        const testImplStart = performance.now();
        await test.impl(ctx);
        const selfDuration = performance.now() - testImplStart;
        await runAfterEach(ctx, suite);
        const duration = performance.now() - testStart;
        respond({
            type: 'test',
            test,
            result: 'pass',
            selfDuration,
            duration,
            extraInfo: test.extraInfo,
        }, id, source);
    }
    catch (e) {
        console.error('Test failure', window.location, suite.name, test.name, e);
        respond({
            type: 'test',
            test,
            result: 'fail',
            e,
        }, id, source);
        return;
    }
}
// Main initialization
setTimeout(() => 0);
// Event initialization
window.addEventListener('message', (event) => {
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
        window.parent.postMessage(makeResponse(event.data.id, makeInitPayload(suites)), window.location.origin);
    }
    if (isRunTestRequest(event.data)) {
        handleRunTest(event.data.request, event.data.id, source)
            .then(() => {
            respond({
                type: 'runtest',
                result: 'done',
            }, event.data.id, source);
        })
            .catch((e) => {
            respond({
                type: 'runtest',
                result: 'error',
                error: e,
            }, event.data.id, source);
        });
    }
}, false);
//# sourceMappingURL=test.js.map