import { exit } from 'process';
import { write } from 'fs';
import { inspect } from 'util';
import { isEqual } from 'lodash';
import * as chalk from 'chalk';

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
    duration: [number, number] | undefined;
    result: 'PASS' | 'FAIL' | 'NOT RUN';
}

interface Test {
    name: string;
    impl: TestAction;
    parent: Suite | undefined;
    assertions: number;
    duration: [number, number] | undefined;
    selfDuration: [number, number] | undefined;
    result: 'PASS' | 'FAIL' | 'NOT RUN';
}

function repr(obj: any) {
    return inspect(obj, {
        showHidden: true,
        depth: Infinity,
        colors: process.stdout.isTTY,
        showProxy: true,
        maxArrayLength: Infinity,
        maxStringLength: Infinity,
        compact: 3,
    });
}

const makeTest = ({
    name,
    impl,
    parent = undefined,
}: {
    name: string;
    impl: TestAction;
    parent?: Suite;
}): Test => ({
    name,
    impl,
    parent,
    assertions: 0,
    duration: undefined,
    selfDuration: undefined,
    result: 'NOT RUN',
});

const makeSuite = ({
    name,
    parent = undefined,
}: {
    name: string;
    parent?: Suite;
}): Suite => ({
    name,
    beforeAll: [],
    beforeEach: [],
    tests: [],
    afterEach: [],
    afterAll: [],
    parent,
    assertions: 0,
    duration: undefined,
    result: 'NOT RUN',
});

let currentSuite: Suite = makeSuite({ name: '' });
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

export function abstractSuite(name: string, body: () => void) {
    const fixture = makeSuite({ name, parent: undefined });
    const lastSuite = currentSuite;
    currentSuite = fixture;
    body();
    currentSuite = lastSuite;
    return (name: string, body: () => void) => {
        const realSuite = makeSuite({ name, parent: currentSuite });
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

export function suite(name: string, body: () => void) {
    currentSuite = makeSuite({ name, parent: currentSuite });
    body();
    suites.push(currentSuite);
    if (!currentSuite.parent) {
        throw new Error('Internal test integrity issue: suite tree empty?');
    }
    currentSuite = currentSuite.parent;
}

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

export function test(name: string, impl: TestAction) {
    currentSuite.tests.push(makeTest({ name, impl, parent: currentSuite }));
}

function makeNameInner(node: Suite | Test) {
    let name = '';
    if (node.parent) name = makeNameInner(node.parent);
    if (name) return `${name}:${node.name}`;
    return node.name;
}

function makeName(node: Suite | Test) {
    return `<${makeNameInner(node)}>`;
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

let numSuitesRun = 0;
let numSuitesFailed = 0;
let numSuitesPassed = 0;
let numTestsRun = 0;
let numTestsFailed = 0;
let numTestsPassed = 0;

let runningTest: Test | undefined = undefined;
let runningSuite: Suite | undefined = undefined;
async function runTests() {
    for (let suite of suites) {
        runningSuite = suite;
        numSuitesRun += 1;
        const suiteName = makeName(suite);
        const suiteStart = process.hrtime();
        try {
            await runBeforeAll(suiteName, suite);
        } catch (e) {
            numSuitesFailed += 1;
            suite.result = 'FAIL';
            await log(`${chalk.red('FAIL')} beforeAll ${name}`);
            if (e instanceof AssertionError) {
                if (e.msg) {
                    await log(`Message: ${e.msg}`);
                }
                await log(`Reason: ${e.format()}`);
            }
            if (e instanceof Error) {
                await log(e.stack);
            }
            continue;
        }
        for (let test of suite.tests) {
            runningTest = test;
            numTestsRun += 1;
            const name = makeName(test);
            const ctx: TestContext = {};
            try {
                const testStart = process.hrtime();
                await runBeforeEach(ctx, name, suite);
                const testImplStart = process.hrtime();
                await test.impl(ctx);
                test.selfDuration = process.hrtime(testImplStart);
                await runAfterEach(ctx, name, suite);
                test.duration = process.hrtime(testStart);
                test.result = 'PASS';
                await log(
                    `${chalk.green('PASS')} ${chalk.bold(
                        name
                    )} in ${formatDuration(
                        test.selfDuration
                    )} (in ${formatDuration(test.duration)} with setup)`
                );
                numTestsPassed += 1;
            } catch (e) {
                numTestsFailed += 1;
                suite.result = 'FAIL';
                test.result = 'FAIL';
                await log(`${chalk.red('FAIL')} ${chalk.bold(name)}`);
                if (e instanceof AssertionError) {
                    if (e.msg) {
                        await log(`Message: ${e.msg}`);
                    }
                    await log(`Reason: ${e.format()}`);
                }
                if (e instanceof Error) {
                    await log(e.stack);
                }
                if (!isEqual(ctx, {})) {
                    await log(`Context: ${repr(ctx)}`);
                }
            }
        }
        try {
            await runAfterAll(suiteName, suite);
        } catch (e) {
            numSuitesFailed += 1;
            suite.result = 'FAIL';
            await log(`${chalk.red('FAIL')} afterAll ${name}`);
            if (e instanceof AssertionError) {
                if (e.msg) {
                    await log(`Message: ${e.msg}`);
                }
                await log(`Reason: ${e.format()}`);
            }
            if (e instanceof Error) {
                await log(e.stack);
            }
        }
        suite.result = 'PASS';
        numSuitesPassed += 1;
        suite.duration = process.hrtime(suiteStart);
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
        if (a !== b) {
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

function formatDuration(duration: [number, number] | undefined) {
    if (!duration) return 'no time';
    return chalk.yellow(`${duration[0]}s ${duration[1]}µs`);
}

setImmediate(async () => {
    try {
        await runTests();
    } catch (e) {
        await log('INTERNAL TEST ERROR');
        if (e instanceof Error) {
            await log(e.stack);
        }
        process.exit(2);
    }
    const success = numSuitesFailed === 0 && numTestsFailed === 0;
    if (success) {
        await log(chalk.green.bold('FILE PASSED'));
    } else {
        await log(chalk.red.bold('FILE FAILED'));
    }
    process.exit(success ? 1 : 0);
});
