import { isEqual } from 'lodash';

type TestContext = any;

type SuiteAction = () => Promise<void> | void;
type TestAction = (ctx: TestContext) => Promise<void> | void;

interface Suite {
    name: string;
    beforeAll: SuiteAction[];
    beforeEach: TestAction[];
    tests: Test[];
    afterEach: TestAction[];
    afterAll: SuiteAction[];
    parent: Suite | undefined;
    assertions: number;
    result: 'PASS' | 'FAIL' | 'NOT RUN';
    only: boolean;
}

interface Test {
    name: string;
    impl: TestAction;
    parent: Suite | undefined;
    assertions: number;
    result: 'PASS' | 'FAIL' | 'NOT RUN';
    only: boolean;
}

function repr(obj: any) {
    return JSON.stringify(obj, null, 4);
}

const makeTest = ({
    name,
    impl,
    parent = undefined,
    only,
}: {
    name: string;
    impl: TestAction;
    parent?: Suite;
    only: boolean;
}): Test => ({
    name,
    impl,
    parent,
    assertions: 0,
    result: 'NOT RUN',
    only,
});

const makeSuite = ({
    name,
    parent = undefined,
    only,
}: {
    name: string;
    parent?: Suite;
    only: boolean;
}): Suite => ({
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

let currentSuite: Suite = makeSuite({ name: '', only: false });
const rootSuite: Suite = currentSuite;

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

async function log(...msgs: any[]) {
    console.log(...msgs);
}

type Report =
    | {
          type: 'internal';
          e: any;
      }
    | {
          type: 'suite';
          suite: Suite;
          result: 'register';
      }
    | {
          type: 'suite';
          suite: Suite;
          result: 'pass';
          duration: number;
      }
    | {
          type: 'suite';
          suite: Suite;
          result: 'run';
          phase: 'beforeAll' | 'tests' | 'afterAll';
      }
    | {
          type: 'suite';
          suite: Suite;
          result: 'skip';
      }
    | {
          type: 'suite';
          suite: Suite;
          result: 'fail';
          phase: 'beforeAll' | 'tests' | 'afterAll';
          e: any;
      }
    | {
          type: 'test';
          test: Test;
          result: 'register';
      }
    | {
          type: 'test';
          test: Test;
          result: 'run';
      }
    | {
          type: 'test';
          test: Test;
          result: 'skip';
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
    return (name: string, body: () => void, only: boolean = false) => {
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

function suiteInner(name: string, body: () => void, only: boolean) {
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

export function suite(name: string, body: () => void) {
    suiteInner(name, body, false);
}
suite.only = function suiteQnly(name: string, body: () => void) {
    suiteInner(name, body, true);
};

export function beforeAll(action: SuiteAction) {
    currentSuite.beforeAll.push(action);
}

export function beforeEach(action: TestAction) {
    currentSuite.beforeEach.push(action);
}

export function afterEach(action: TestAction) {
    currentSuite.afterEach.push(action);
}

export function afterAll(action: SuiteAction) {
    currentSuite.afterAll.push(action);
}

function testInner(name: string, impl: TestAction, only: boolean = false) {
    const test = makeTest({ name, impl, parent: currentSuite, only });
    report({
        type: 'test',
        test,
        result: 'register',
    });
    currentSuite.tests.push(test);
}
export function test(name: string, impl: TestAction) {
    testInner(name, impl, false);
}
test.only = function testOnly(name: string, impl: TestAction) {
    testInner(name, impl, true);
};

function makeNameInner(node: Suite | Test) {
    let name = '';
    if (node.parent) name = makeNameInner(node.parent);
    if (name) return `${name}:${node.name}`;
    return node.name;
}

function makeName(node: Suite | Test) {
    return `${makeNameInner(node)}`;
}

async function runBeforeAll(name: string, suite: Suite | undefined) {
    if (suite) {
        await runBeforeAll(name, suite.parent);
        for (let beforeAll of suite.beforeAll) await beforeAll();
    }
}

async function runBeforeEach(
    ctx: TestContext,
    name: string,
    suite: Suite | undefined
) {
    if (suite) {
        await runBeforeEach(ctx, name, suite.parent);
        for (let beforeEach of suite.beforeEach) await beforeEach(ctx);
    }
}

async function runAfterEach(
    ctx: TestContext,
    name: string,
    suite: Suite | undefined
) {
    if (suite) {
        for (let afterEach of suite.afterEach) await afterEach(ctx);
        await runAfterEach(ctx, name, suite.parent);
    }
}

async function runAfterAll(name: string, suite: Suite | undefined) {
    if (suite) {
        await runAfterAll(name, suite.parent);
        for (let afterAll of suite.afterAll) await afterAll();
    }
}

let runningTest: Test | undefined = undefined;
let runningSuite: Suite | undefined = undefined;
async function runTests() {
    const onlySuites = new Set<Suite>();
    const onlyTests = new Set<Test>();
    for (let suite of suites) {
        if (suite.only) {
            onlySuites.add(suite);
        }
        for (let test of suite.tests) {
            if (suite.only || test.only) {
                onlySuites.add(suite);
                onlyTests.add(test);
            }
        }
    }

    const isLimited = onlySuites.size > 0 || onlyTests.size > 0;

    for (let suite of suites) {
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
        } catch (e) {
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
        for (let test of suite.tests) {
            const isTestSkipped = isLimited && !onlyTests.has(test);
            runningTest = test;
            const name = makeName(test);
            report({
                type: 'test',
                test,
                result: isTestSkipped ? 'skip' : 'run',
            });
            if (isTestSkipped) continue;
            const ctx: TestContext = {};
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
            } catch (e) {
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
        } catch (e) {
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
        throw new Error(
            'Internal test integrity issue: assertion performed outside of test?'
        );
    }
    if (!runningSuite) {
        throw new Error(
            'Internal test integrity issue: assertion performed outside of test suite?'
        );
    }
    runningTest.assertions += 1;
    runningSuite.assertions += 1;
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
    arrayIncludes: (haystack: any[], needle: any, msg?: string) => {
        countAssertion();
        if (!haystack.includes(needle)) {
            throw new AssertionError(
                'arrayIncludes',
                () => `${repr(needle)} not found within ${repr(haystack)}`,
                msg
            );
        }
    },
    notArrayIncludes: (haystack: any[], needle: any, msg?: string) => {
        countAssertion();
        if (haystack.includes(needle)) {
            throw new AssertionError(
                'notArrayIncludes',
                () => `${repr(needle)} is found within ${repr(haystack)}`,
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
};

const suiteRow = new Map<Suite, Element>();
const testRow = new Map<Test, Element>();

function getSuiteRow(suite: Suite): Element {
    let row = suiteRow.get(suite);
    if (row) return row;

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

function getTestRow(test: Test): Element {
    let row = testRow.get(test);
    if (row) return row;

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

function report(info: Report) {
    if (info.type === 'internal') {
        alert('Uh oh');
        console.error(info.e);
    } else if (info.type === 'suite' && info.result === 'register') {
        testUi.appendChild(getSuiteRow(info.suite));
    } else if (info.type === 'test' && info.result === 'register') {
        testUi.appendChild(getTestRow(info.test));
    } else if (info.type === 'suite') {
        const row = getSuiteRow(info.suite);
        row.classList.toggle('status_pending', false);
        row.classList.toggle('status_running', info.result === 'run');
        row.classList.toggle('status_skipped', info.result === 'skip');
        row.classList.toggle('status_passed', info.result === 'pass');
        row.classList.toggle('status_failed', info.result === 'fail');
        row.querySelector('.row_status')!.textContent = info.result;
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
            row.querySelector('.row_msg')!.textContent = msg;
            row.setAttribute('open', '');
        }
        if (info.result === 'pass') {
            row.querySelector(
                '.row_msg'
            )!.textContent = `Passed in ${info.duration.toFixed(3)}ms`;
        }
    } else if (info.type === 'test') {
        const row = getTestRow(info.test);
        row.classList.toggle('status_pending', false);
        row.classList.toggle('status_running', info.result === 'run');
        row.classList.toggle('status_skipped', info.result === 'skip');
        row.classList.toggle('status_passed', info.result === 'pass');
        row.classList.toggle('status_failed', info.result === 'fail');
        row.querySelector('.row_status')!.textContent = info.result;
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
            row.querySelector('.row_msg')!.textContent = msg;
            row.setAttribute('open', '');
        }
        if (info.result === 'pass') {
            row.querySelector(
                '.row_msg'
            )!.textContent = `Passed in ${info.selfDuration.toFixed(
                3
            )}ms (${info.duration.toFixed(3)}ms including setup)\n`;
        }
    }
}

setTimeout(async () => {
    try {
        await runTests();
    } catch (e) {
        report({
            type: 'internal',
            e,
        });
    }
}, 0);
