import { isEqual } from 'lodash';
function repr(obj) {
    return JSON.stringify(obj, null, 4);
}
const makeTest = ({ name, impl, parent = undefined, only, }) => ({
    name,
    impl,
    parent,
    assertions: 0,
    result: 'NOT RUN',
    only,
});
const makeSuite = ({ name, parent = undefined, only, }) => ({
    name,
    beforeAll: [],
    beforeEach: [],
    tests: [],
    afterEach: [],
    afterAll: [],
    parent,
    assertions: 0,
    result: 'NOT RUN',
    only,
});
let currentSuite = makeSuite({ name: '', only: false });
const suites = [];
suites.push(currentSuite);
class AssertionError extends Error {
    constructor(name, format, msg) {
        super(`AssertionError: assert.${name}`);
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
        realSuite.beforeAll = [...fixture.beforeAll];
        realSuite.beforeEach = [...fixture.beforeEach];
        realSuite.tests = [...fixture.tests];
        realSuite.afterEach = [...fixture.afterEach];
        realSuite.afterAll = [...fixture.afterAll];
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
    report({
        type: 'suite',
        suite: currentSuite,
        result: 'register',
    });
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
export function beforeAll(action) {
    currentSuite.beforeAll.push(action);
}
export function beforeEach(action) {
    currentSuite.beforeEach.push(action);
}
export function afterEach(action) {
    currentSuite.afterEach.push(action);
}
export function afterAll(action) {
    currentSuite.afterAll.push(action);
}
function testInner(name, impl, only = false) {
    const test = makeTest({ name, impl, parent: currentSuite, only });
    report({
        type: 'test',
        test,
        result: 'register',
    });
    currentSuite.tests.push(test);
}
export function test(name, impl) {
    testInner(name, impl, false);
}
test.only = function testOnly(name, impl) {
    testInner(name, impl, true);
};
function makeNameInner(node) {
    let name = '';
    if (node.parent)
        name = makeNameInner(node.parent);
    if (name)
        return `${name}:${node.name}`;
    return node.name;
}
function makeName(node) {
    return `${makeNameInner(node)}`;
}
async function runBeforeAll(name, suite) {
    if (suite) {
        await runBeforeAll(name, suite.parent);
        for (const beforeAll of suite.beforeAll)
            await beforeAll();
    }
}
async function runBeforeEach(ctx, name, suite) {
    if (suite) {
        await runBeforeEach(ctx, name, suite.parent);
        for (const beforeEach of suite.beforeEach)
            await beforeEach(ctx);
    }
}
async function runAfterEach(ctx, name, suite) {
    if (suite) {
        for (const afterEach of suite.afterEach)
            await afterEach(ctx);
        await runAfterEach(ctx, name, suite.parent);
    }
}
async function runAfterAll(name, suite) {
    if (suite) {
        await runAfterAll(name, suite.parent);
        for (const afterAll of suite.afterAll)
            await afterAll();
    }
}
let runningTest = undefined;
let runningSuite = undefined;
async function runTests() {
    const onlySuites = new Set();
    const onlyTests = new Set();
    for (const suite of suites) {
        if (suite.only) {
            onlySuites.add(suite);
        }
        for (const test of suite.tests) {
            if (suite.only || test.only) {
                onlySuites.add(suite);
                onlyTests.add(test);
            }
        }
    }
    const isLimited = onlySuites.size > 0 || onlyTests.size > 0;
    for (const suite of suites) {
        const isSuiteSkipped = isLimited && !onlySuites.has(suite);
        runningSuite = suite;
        const suiteName = makeName(suite);
        const suiteStart = performance.now();
        report({
            type: 'suite',
            suite,
            result: isSuiteSkipped ? 'skip' : 'run',
            phase: 'beforeAll',
        });
        try {
            if (!isSuiteSkipped) {
                await runBeforeAll(suiteName, suite);
            }
        }
        catch (e) {
            suite.result = 'FAIL';
            report({
                type: 'suite',
                suite,
                result: 'fail',
                phase: 'beforeAll',
                e,
            });
            continue;
        }
        report({
            type: 'suite',
            suite,
            result: isSuiteSkipped ? 'skip' : 'run',
            phase: 'tests',
        });
        for (const test of suite.tests) {
            const isTestSkipped = isLimited && !onlyTests.has(test);
            runningTest = test;
            const name = makeName(test);
            report({
                type: 'test',
                test,
                result: isTestSkipped ? 'skip' : 'run',
            });
            if (isTestSkipped)
                continue;
            const ctx = {};
            try {
                const testStart = performance.now();
                await runBeforeEach(ctx, name, suite);
                const testImplStart = performance.now();
                await test.impl(ctx);
                const selfDuration = performance.now() - testImplStart;
                await runAfterEach(ctx, name, suite);
                const duration = performance.now() - testStart;
                test.result = 'PASS';
                report({
                    type: 'test',
                    test,
                    result: 'pass',
                    selfDuration,
                    duration,
                });
            }
            catch (e) {
                suite.result = 'FAIL';
                test.result = 'FAIL';
                report({
                    type: 'test',
                    test,
                    result: 'fail',
                    e,
                });
            }
        }
        report({
            type: 'suite',
            suite,
            phase: 'afterAll',
            result: isSuiteSkipped ? 'skip' : 'run',
        });
        try {
            if (!isSuiteSkipped) {
                await runAfterAll(suiteName, suite);
            }
        }
        catch (e) {
            suite.result = 'FAIL';
            report({
                type: 'suite',
                suite,
                phase: 'afterAll',
                result: 'fail',
                e,
            });
        }
        suite.result = 'PASS';
        report({
            type: 'suite',
            suite,
            result: isSuiteSkipped ? 'skip' : 'pass',
            duration: performance.now() - suiteStart,
        });
    }
}
function countAssertion() {
    if (!runningTest) {
        throw new Error('Internal test integrity issue: assertion performed outside of test?');
    }
    if (!runningSuite) {
        throw new Error('Internal test integrity issue: assertion performed outside of test suite?');
    }
    runningTest.assertions += 1;
    runningSuite.assertions += 1;
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
        if (!a) {
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
};
const suiteRow = new Map();
const testRow = new Map();
function getSuiteRow(suite) {
    let row = suiteRow.get(suite);
    if (row)
        return row;
    const name = makeName(suite);
    row = document.createElement('details');
    row.className = 'row_suite status_pending';
    const summary = document.createElement('summary');
    summary.className = 'row_summary';
    row.appendChild(summary);
    const msgEl = document.createElement('pre');
    msgEl.className = 'row_msg';
    row.appendChild(msgEl);
    const nameEl = document.createElement('a');
    nameEl.href = '#suite=' + encodeURIComponent(name);
    nameEl.textContent = name;
    summary.appendChild(nameEl);
    const statusEl = document.createElement('span');
    statusEl.className = 'row_status';
    statusEl.textContent = '----';
    summary.appendChild(statusEl);
    suiteRow.set(suite, row);
    return row;
}
function getTestRow(test) {
    let row = testRow.get(test);
    if (row)
        return row;
    const name = makeName(test);
    row = document.createElement('details');
    row.className = 'row_test status_pending';
    const summary = document.createElement('summary');
    summary.className = 'row_summary';
    row.appendChild(summary);
    const msgEl = document.createElement('pre');
    msgEl.className = 'row_msg';
    row.appendChild(msgEl);
    const nameEl = document.createElement('a');
    nameEl.href = '#test=' + encodeURIComponent(name);
    nameEl.textContent = name;
    summary.appendChild(nameEl);
    const statusEl = document.createElement('span');
    statusEl.className = 'row_status';
    statusEl.textContent = '----';
    summary.appendChild(statusEl);
    testRow.set(test, row);
    return row;
}
const testRoot = document.createElement('div');
testRoot.id = 'test-root';
document.body.appendChild(testRoot);
const testUi = document.createElement('div');
testUi.id = 'test-ui';
document.body.appendChild(testUi);
beforeEach(() => {
    while (testRoot.childNodes.length > 0) {
        testRoot.removeChild(testRoot.childNodes[0]);
    }
});
function report(info) {
    if (info.type === 'internal') {
        alert('Uh oh');
        console.error(info.e);
    }
    else if (info.type === 'suite' && info.result === 'register') {
        testUi.appendChild(getSuiteRow(info.suite));
    }
    else if (info.type === 'test' && info.result === 'register') {
        testUi.appendChild(getTestRow(info.test));
    }
    else if (info.type === 'suite') {
        const row = getSuiteRow(info.suite);
        row.classList.toggle('status_pending', false);
        row.classList.toggle('status_running', info.result === 'run');
        row.classList.toggle('status_skipped', info.result === 'skip');
        row.classList.toggle('status_passed', info.result === 'pass');
        row.classList.toggle('status_failed', info.result === 'fail');
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        row.querySelector('.row_status').textContent = info.result;
        if (info.result === 'fail') {
            let msg = '';
            if (info.e instanceof AssertionError) {
                if (info.e.msg) {
                    msg += `Message: ${info.e.msg}\n`;
                }
                msg += `Reason: ${info.e.format()}\n`;
            }
            if (info.e instanceof Error) {
                msg += `${info.e.stack}\n`;
            }
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            row.querySelector('.row_msg').textContent = msg;
            row.setAttribute('open', '');
        }
        if (info.result === 'pass') {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            row.querySelector('.row_msg').textContent = `Passed in ${info.duration.toFixed(3)}ms`;
        }
    }
    else if (info.type === 'test') {
        const row = getTestRow(info.test);
        row.classList.toggle('status_pending', false);
        row.classList.toggle('status_running', info.result === 'run');
        row.classList.toggle('status_skipped', info.result === 'skip');
        row.classList.toggle('status_passed', info.result === 'pass');
        row.classList.toggle('status_failed', info.result === 'fail');
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        row.querySelector('.row_status').textContent = info.result;
        if (info.result === 'fail') {
            let msg = '';
            if (info.e instanceof AssertionError) {
                if (info.e.msg) {
                    msg += `Message: ${info.e.msg}\n`;
                }
                msg += `Reason: ${info.e.format()}\n`;
            }
            if (info.e instanceof Error) {
                msg += `${info.e.stack}\n`;
            }
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            row.querySelector('.row_msg').textContent = msg;
            row.setAttribute('open', '');
        }
        if (info.result === 'pass') {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            row.querySelector('.row_msg').textContent = `Passed in ${info.selfDuration.toFixed(3)}ms (${info.duration.toFixed(3)}ms including setup)\n`;
        }
    }
}
setTimeout(async () => {
    try {
        await runTests();
    }
    catch (e) {
        report({
            type: 'internal',
            e,
        });
    }
}, 0);
//# sourceMappingURL=test.js.map