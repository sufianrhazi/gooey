import Revise, {
    Fragment,
    Component,
    Collection,
    Model,
    collection,
    calc,
    model,
    mount,
} from './index';
import {
    isInitMessage,
    isRunUpdate,
    isRunResponse,
    makeRunTestRequest,
} from './test/types';
import { request, requestStream } from './test/rpc';
import { groupBy2 } from './util';
import testManifest from '../test-manifest.json'; // Generated from s/test

function classes(...args: (string | boolean | null | undefined)[]) {
    return args.filter((x) => !!x).join(' ');
}

const millis = (ms?: number) => `${(ms || 0).toFixed(3)}ms`;

/**
 * Record types
 */
type TestFileRecord = Model<{
    src: string;
    buildTarget: string;
    iframe: HTMLIFrameElement;
    suites: Collection<SuiteRecord>;
    active: boolean;
    initialized: boolean;
}>;

type SuiteRecord = Model<{
    id: number;
    name: string;
    only: boolean;
    tests: Collection<TestRecord>;
    parentSuiteId: number | undefined;
    status?: 'fail' | 'pass' | 'run';
    error?: string;
}>;

type TestRecord = Model<{
    id: number;
    name: string;
    only: boolean;
    status?: 'fail' | 'pass' | 'run';
    error?: string;
    selfDuration?: number;
    duration?: number;
}>;

/**
 * State
 */
const testFiles: Model<Record<string, TestFileRecord>> = model({});
const uiState = model({
    stopOnFailure: true,
});

function initializeTestSandbox(
    testFile: { src: string; buildTarget: string },
    iframeElement: HTMLIFrameElement
) {
    iframeElement.addEventListener('load', () => {
        const contentWindow = iframeElement.contentWindow;
        const contentDocument = iframeElement.contentDocument;
        if (!contentWindow) throw new Error('iframe missing contentWindow');
        if (!contentDocument) throw new Error('iframe missing contentDocument');

        const suites = collection<SuiteRecord>([]);

        testFiles[testFile.buildTarget] = model({
            src: testFile.src,
            buildTarget: testFile.buildTarget,
            iframe: iframeElement,
            suites,
            active: false,
            initialized: false,
        });

        const script = contentDocument.createElement('script');
        script.src = testFile.buildTarget;
        script.onload = () => {
            request(
                contentWindow,
                {
                    type: 'init',
                },
                isInitMessage
            )
                .then((initMessage) => {
                    initMessage.suites.forEach((suite) => {
                        const tests = collection<TestRecord>([]);
                        suite.tests.forEach((test) => {
                            const testModel = model({
                                id: test.id,
                                name: test.name,
                                only: test.only,
                            });
                            tests.push(testModel);
                        });
                        const suiteModel = model({
                            id: suite.id,
                            name: suite.name,
                            tests,
                            only: suite.only,
                            parentSuiteId: suite.parentSuiteId,
                        });
                        suites.push(suiteModel);
                    });
                    testFiles[testFile.buildTarget].initialized = true;
                })
                .catch((e) => {
                    console.error('Failed to initialize', testFile, e);
                });
        };
        contentDocument.body.appendChild(script);
    });
}

/**
 * Actions
 */
function resetAllTestState() {
    for (const testFile of Object.values(testFiles)) {
        resetTestFileState(testFile);
    }
}

function resetTestFileState(testFile: TestFileRecord) {
    for (const suite of testFile.suites) {
        suite.status = undefined;
        suite.error = undefined;
        suite.only = false;
        for (const test of suite.tests) {
            test.status = undefined;
            test.only = false;
        }
    }
}

async function runTests() {
    const allSuites: [TestFileRecord, SuiteRecord, TestRecord][] = [];
    let toRun: [TestFileRecord, SuiteRecord, TestRecord][] = [];

    // Determine tests to run; clear out prior results
    for (const testFile of Object.values(testFiles)) {
        for (const suite of testFile.suites) {
            suite.status = undefined;
            suite.error = undefined;
            if (suite.only) {
                suite.tests.forEach((test) => {
                    allSuites.push([testFile, suite, test]);
                    toRun.push([testFile, suite, test]);
                });
            } else {
                for (const test of suite.tests) {
                    test.status = undefined;
                    test.error = undefined;
                    test.duration = undefined;
                    test.selfDuration = undefined;

                    allSuites.push([testFile, suite, test]);
                    if (test.only) {
                        toRun.push([testFile, suite, test]);
                    }
                }
            }
        }
    }
    if (toRun.length === 0) {
        toRun = allSuites;
    }

    const groupedTests = groupBy2(toRun, (item) => [item[0], item[1], item[2]]);

    // Run selected tests
    for (const [testFile, suites] of groupedTests) {
        const contentWindow = testFile.iframe.contentWindow;
        if (!contentWindow) {
            console.error('No content window!?');
            continue;
        }

        testFile.active = true;
        try {
            for (const [suite, tests] of suites) {
                let numFailures = 0;
                suite.status = 'run';
                for (const test of tests) {
                    const stream = requestStream(
                        contentWindow,
                        makeRunTestRequest({
                            suiteId: suite.id,
                            testId: test.id,
                        })
                    );
                    for await (const msg of stream) {
                        if (isRunUpdate(msg)) {
                            switch (msg.type) {
                                case 'internal':
                                    suite.status = 'fail';
                                    test.status = 'fail';
                                    test.error = msg.error;
                                    throw new Error(
                                        'Internal error: ' + msg.error
                                    );
                                    break;
                                case 'test': {
                                    if (msg.suiteId !== suite.id) {
                                        throw new Error(
                                            'Malformed message; suite mismatch'
                                        );
                                    }
                                    test.status = msg.result;
                                    if (msg.result === 'fail') {
                                        suite.status = 'fail';
                                        test.error = msg.error;
                                        numFailures += 1;
                                        continue;
                                    }
                                    if (msg.result === 'pass') {
                                        test.duration = msg.duration;
                                        test.selfDuration = msg.selfDuration;
                                    }
                                    break;
                                }
                            }
                        }
                        if (isRunResponse(msg)) {
                            switch (msg.type) {
                                case 'runtest':
                                    break;
                            }
                        }
                    }
                    if (numFailures > 0 && uiState.stopOnFailure) {
                        return;
                    }
                }
                suite.status = numFailures > 0 ? 'fail' : 'pass';
            }
        } finally {
            testFile.active = false;
        }
    }
}

/**
 * Views
 */
const TestView: Component<{ test: TestRecord }> = ({ test }) => {
    const onClick = (e: MouseEvent) => {
        e.preventDefault();
        if (!e.shiftKey) {
            resetAllTestState();
        }
        test.only = !test.only;
        runTests();
    };
    const statusText = {
        run: 'RUN:',
        pass: 'PASS',
        fail: 'FAIL',
    } as const;
    return (
        <div
            class={calc(() =>
                classes(
                    'test',
                    test.only && 'test--only',
                    test.status === 'run' && 'test--running',
                    test.status === 'pass' && 'test--pass',
                    test.status === 'fail' && 'test--fail'
                )
            )}
        >
            <a class="test__link" href="#" on:click={onClick}>
                {calc(() => (test.status ? statusText[test.status] : ''))}{' '}
                {calc(() => test.name)}
                {calc(
                    () =>
                        test.duration !== undefined &&
                        test.selfDuration !== undefined && (
                            <>
                                : ({millis(test.selfDuration)};{' '}
                                {millis(test.duration)} including setup)
                            </>
                        )
                )}
            </a>
            {calc(
                () =>
                    test.status === 'fail' &&
                    test.error && <pre>{test.error}</pre>
            )}
        </div>
    );
};

const SuiteView: Component<{ suite: SuiteRecord }> = ({ suite }) =>
    suite.tests.length > 0 && (
        <details
            class={calc(() =>
                classes(
                    'suite',
                    suite.status === 'run' && 'suite--running',
                    suite.status === 'pass' && 'suite--pass',
                    suite.status === 'fail' && 'suite--fail'
                )
            )}
            open={calc(
                () =>
                    !(
                        suite.status === 'pass' &&
                        suite.tests.every((test) => test.status === 'pass')
                    )
            )}
        >
            <summary class="suite__top">
                <div class="suite__name">
                    {calc(() => suite.name || '<root>')}
                </div>
                {calc(
                    () =>
                        suite.status && (
                            <div class="suite__info">{suite.status}</div>
                        )
                )}
                {calc(
                    () =>
                        suite.tests.length > 0 &&
                        suite.status === 'pass' && (
                            <div class="suite__info">
                                {
                                    suite.tests.filter(
                                        (test) => test.status === 'pass'
                                    ).length
                                }{' '}
                                / {suite.tests.length}
                            </div>
                        )
                )}
                {calc(
                    () =>
                        suite.tests.length > 0 &&
                        (suite.status === 'pass' ||
                            suite.status === 'fail') && (
                            <div class="suite__info">
                                in{' '}
                                {millis(
                                    suite.tests.reduce(
                                        (acc, test) =>
                                            acc + (test?.duration ?? 0),
                                        0
                                    )
                                )}
                            </div>
                        )
                )}
            </summary>
            {suite.tests.mapView((test) => (
                <TestView test={test} />
            ))}
        </details>
    );

const TestFileView: Component<{ testFile: TestFileRecord }> = ({
    testFile,
}) => (
    <details class="testfile" open>
        <summary class="testfile__status">{calc(() => testFile.src)}</summary>
        {calc(() =>
            testFile.suites.mapView((suite) =>
                calc(() => <SuiteView suite={suite} />)
            )
        )}
    </details>
);

const TestRunner: Component<{}> = (props, { onMount, onEffect }) => {
    const testFileKeys = model.keys(testFiles);

    // Kick off tests once everything is initialized
    onEffect(() => {
        if (
            testFileKeys.length === testManifest.length &&
            testFileKeys.every(
                (testFileKey) => testFiles[testFileKey].initialized
            )
        ) {
            runTests();
        }
    });

    const onClickRunAll = () => {
        resetAllTestState();
        runTests();
    };
    const onClickRerun = () => {
        runTests();
    };

    const hasEmptyTests = calc(() => {
        return testFileKeys.every((testFileKey) => {
            return testFiles[testFileKey].suites.every((suite) => {
                return suite.tests.length === 0;
            });
        });
    });

    const hasAnyOnlyItems = calc(() => {
        return !testFileKeys.some((testFileKey) => {
            return testFiles[testFileKey].suites.some((suite) => {
                return suite.only || suite.tests.some((test) => test.only);
            });
        });
    });

    const onStopToggle = (e: UIEvent) => {
        uiState.stopOnFailure = !!(e.target as HTMLInputElement)?.checked;
    };

    return (
        <div class="testrunner">
            <div class="test-ui">
                <button disabled={hasEmptyTests} on:click={onClickRunAll}>
                    Run all tests
                </button>
                <button disabled={hasAnyOnlyItems} on:click={onClickRerun}>
                    Rerun selected tests
                </button>
                <label>
                    <input
                        type="checkbox"
                        checked={calc(() => uiState.stopOnFailure)}
                        on:change={onStopToggle}
                    />{' '}
                    Stop on failure
                </label>
                {testFileKeys.mapView((testFile) => (
                    <TestFileView testFile={testFiles[testFile]} />
                ))}
            </div>
            <div class="test-sandboxes">
                {testManifest.map((testFile) => (
                    <iframe
                        class={calc(() =>
                            classes(
                                testFiles[testFile.buildTarget]?.active &&
                                    'active'
                            )
                        )}
                        ref={(iframeElement: HTMLIFrameElement | null) => {
                            if (!iframeElement) {
                                return;
                            }
                            initializeTestSandbox(testFile, iframeElement);
                        }}
                        src="testsandbox.html"
                    />
                ))}
            </div>
        </div>
    );
};

mount(document.body, <TestRunner />);
