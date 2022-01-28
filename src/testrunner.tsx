import { Chart, registerables } from 'chart.js';
import type { Component, Collection, View, Model } from './index';
import Revise, {
    Fragment,
    calc,
    model,
    mount,
    nextFlush,
    debug,
} from './index';
import {
    isInitMessage,
    isRunUpdate,
    isRunResponse,
    makeRunTestRequest,
    ExtraInfo,
} from './test/types';
import * as log from './log';
import { request, requestStream } from './test/rpc';
import { groupBy2 } from './util';
import testManifest from '../test-manifest.json'; // Generated from s/test

Chart.register(...registerables);
(window as any).graphviz = debug;

function classes(...args: (string | boolean | null | undefined)[]) {
    return args.filter((x) => !!x).join(' ');
}

type NeverReadonly<T> = T & { __neverReadonly: true };

type DeepReadonly<T> = T extends NeverReadonly<T>
    ? Omit<T, '__neverReadonly'>
    : T extends string | number | boolean | undefined | null | symbol
    ? T
    : T extends Collection<infer TItem>
    ? View<DeepReadonly<TItem>>
    : T extends Model<infer TModel>
    ? Model<{
          readonly [Key in keyof TModel]: DeepReadonly<TModel[Key]>;
      }>
    : T;

const millis = (ms?: number) => `${(ms || 0).toFixed(3)}ms`;

/**
 * Record types
 */
type TestFileRecord = Model<{
    src: string;
    iframe: HTMLIFrameElement;
    suites: Model<Record<number | string, SuiteRecord>>;
    status: 'error' | 'loading' | 'ready' | 'fail' | 'pass' | 'run';
    error?: string;
    isOpen: boolean;
    extraInfo: ExtraInfo[];
}>;

type SuiteRecord = Model<{
    testFileSrc: string;
    id: number;
    name: string;
    only: boolean;
    localOnly: boolean;
    tests: Model<Record<number | string, TestRecord>>;
    parentSuiteId: number | undefined;
    status: 'error' | 'ready' | 'fail' | 'pass' | 'run';
    error?: string;
    isOpen: boolean;
}>;

type TestRecord = Model<{
    testFileSrc: string;
    suiteId: number;
    id: number;
    name: string;
    only: boolean;
    localOnly: boolean;
    status: 'error' | 'ready' | 'fail' | 'pass' | 'run';
    error?: string;
    selfDuration?: number;
    duration?: number;
    isOpen: boolean;
    extraInfo: ExtraInfo[];
}>;

/**
 * State
 */
const { actions, selectors } = (() => {
    const testFiles: Model<Record<string, TestFileRecord>> = model({});
    const testFileKeys = model.keys(testFiles);
    const testFilesView = testFileKeys.mapView((key) => testFiles[key]);

    const globalState = calc(() => {
        let anyReady = false;
        if (testFilesView.length === 0) return 'loading';
        if (uiState.isActive) return 'run';
        for (const testFile of testFilesView) {
            switch (testFile.status) {
                case 'error':
                case 'fail':
                case 'loading':
                case 'run':
                    return testFile.status;
                case 'pass':
                    break;
                case 'ready':
                    anyReady = true;
                    break;
                default:
                    log.assertExhausted(testFile.status);
            }
        }
        return anyReady ? 'ready' : 'pass';
    });

    const globalStateDisplay = calc(() => {
        const state = globalState();
        if (
            (state === 'run' ||
                state === 'fail' ||
                state === 'pass' ||
                state === 'error') &&
            uiState.startTime &&
            uiState.lastActionTime
        ) {
            let numTests = 0;
            let numPass = 0;
            testFilesView.forEach((testFile) => {
                Object.values(testFile.suites).forEach((suite) => {
                    Object.values(suite.tests).forEach((test) => {
                        numTests += 1;
                        if (test.status === 'pass') {
                            numPass += 1;
                        }
                    });
                });
            });
            return `${state} (${numPass}/${numTests} in ${millis(
                uiState.lastActionTime - uiState.startTime
            )})`;
        }
        return state;
    });

    const uiState = model<{
        stopOnFailure: boolean;
        error: string | null;
        isActive: boolean;
        lastActionTime?: number;
        startTime?: number;
    }>({
        stopOnFailure: true,
        error: null,
        isActive: false,
    });

    const selectors = {
        getTestFile: (src: string): DeepReadonly<TestFileRecord> =>
            testFiles[src],
        getTestFiles: () => testFilesView,
        getTestFileKeys: () => testFileKeys,
        getUiState: (): DeepReadonly<typeof uiState> => uiState,
        getGlobalState: () => globalState,
        getGlobalStateDisplay: () => globalStateDisplay,
    };
    const actions = {
        setIsRunning: (isRunning: boolean) => {
            uiState.isActive = isRunning;
            if (isRunning) {
                uiState.startTime = performance.now();
                uiState.lastActionTime = uiState.startTime;
            } else {
                uiState.lastActionTime = performance.now();
            }
        },
        registerTestFile: ({
            src,
            iframe,
        }: {
            src: string;
            iframe: HTMLIFrameElement;
        }) => {
            testFiles[src] = model({
                src,
                iframe,
                suites: model({}),
                status: 'loading',
                isOpen: true,
                extraInfo: [],
            });
        },

        setTestFileSuites(
            src: string,
            suites: Record<number | string, SuiteRecord>
        ) {
            testFiles[src].suites = model(suites);
            testFiles[src].status = 'ready';
            testFiles[src].isOpen = true;
        },

        resetAllTestState: () => {
            for (const testFile of Object.values(testFiles)) {
                actions.clearTestFileResults(testFile.src);
                testFile.isOpen = true;
                for (const suite of Object.values(testFile.suites)) {
                    suite.localOnly = false;
                    suite.isOpen = true;
                    for (const test of Object.values(suite.tests)) {
                        test.localOnly = false;
                    }
                }
            }
        },

        setTestFileRunning: (src: string) => {
            testFiles[src].status = 'run';
            uiState.lastActionTime = performance.now();
        },

        setSuiteRunning: (src: string, suiteId: number) => {
            testFiles[src].suites[suiteId].status = 'run';
            uiState.lastActionTime = performance.now();
        },

        clearTestFileResults: (src: string) => {
            testFiles[src].status = 'ready';
            testFiles[src].error = undefined;
            Object.values(testFiles[src].suites).forEach((suite) => {
                suite.status = 'ready';
                suite.error = undefined;
                Object.values(suite.tests).forEach((test) => {
                    test.status = 'ready';
                    test.error = undefined;
                    test.duration = undefined;
                    test.selfDuration = undefined;
                });
            });
        },

        setTestRunning: ({
            src,
            suiteId,
            testId,
        }: {
            src: string;
            suiteId: number;
            testId: number;
        }) => {
            const testFile = testFiles[src];
            const suite = testFile.suites[suiteId];
            const test = suite.tests[testId];
            test.status = 'run';
            uiState.lastActionTime = performance.now();
        },

        setTestFail: ({
            src,
            suiteId,
            testId,
            error,
            extraInfo,
        }: {
            src: string;
            suiteId: number;
            testId: number;
            error: string;
            extraInfo: ExtraInfo[];
        }) => {
            const testFile = testFiles[src];
            const suite = testFile.suites[suiteId];
            const test = suite.tests[testId];
            testFile.status = 'fail';
            suite.status = 'fail';
            test.status = 'fail';
            test.error = error;
            test.extraInfo = extraInfo;
            uiState.lastActionTime = performance.now();
        },

        setTestPass: ({
            src,
            suiteId,
            testId,
            duration,
            selfDuration,
            extraInfo,
        }: {
            src: string;
            suiteId: number;
            testId: number;
            duration: number;
            selfDuration: number;
            extraInfo: ExtraInfo[];
        }) => {
            const suite = testFiles[src].suites[suiteId];
            const test = suite.tests[testId];
            test.status = 'pass';
            test.duration = duration;
            test.selfDuration = selfDuration;
            test.extraInfo = extraInfo;
            uiState.lastActionTime = performance.now();
        },

        setSuiteDone: ({
            src,
            suiteId,
            numFailures,
        }: {
            src: string;
            suiteId: number;
            numFailures: number;
        }) => {
            const testFile = testFiles[src];
            const suite = testFile.suites[suiteId];
            if (numFailures > 0) {
                testFile.status = 'fail';
                suite.status = 'fail';
                testFile.isOpen = true;
                suite.isOpen = true;
            } else {
                suite.status = 'pass';
                suite.isOpen =
                    suite.localOnly ||
                    Object.values(suite.tests).some((test) => test.localOnly);
            }
            uiState.lastActionTime = performance.now();
        },

        setTestFileDone: ({
            src,
            numFailures,
        }: {
            src: string;
            numFailures: number;
        }) => {
            const testFile = testFiles[src];
            if (numFailures > 0) {
                testFile.status = 'fail';
                testFile.isOpen = true;
            } else {
                testFile.status = 'pass';
                testFile.isOpen = Object.values(testFile.suites).some(
                    (suite) =>
                        suite.localOnly ||
                        Object.values(suite.tests).some(
                            (test) => test.localOnly
                        )
                );
            }
            uiState.lastActionTime = performance.now();
        },

        setInternalError: ({
            src,
            suiteId,
            testId,
            error,
        }: {
            src?: string;
            suiteId?: number;
            testId?: number;
            error: string;
        }) => {
            const testFile = !!src && testFiles[src];
            const suite = !!testFile && !!suiteId && testFile.suites[suiteId];
            const test =
                !!testFile && !!suite && !!testId && suite.tests[testId];
            if (testFile) testFile.status = 'error';
            if (suite) suite.status = 'error';
            if (test) test.status = 'error';

            if (test) test.error = error;
            else if (suite) suite.error = error;
            else if (testFile) testFile.error = error;
            else uiState.error = error;
            uiState.lastActionTime = performance.now();
        },

        toggleTestOnly: ({
            src,
            suiteId,
            testId,
        }: {
            src: string;
            suiteId: number;
            testId: number;
        }) => {
            const test = testFiles[src].suites[suiteId].tests[testId];
            test.localOnly = !test.localOnly;
        },

        setStopOnFailure: (stopOnFailure: boolean) => {
            uiState.stopOnFailure = stopOnFailure;
        },

        setSuiteIsOpen: ({
            src,
            suiteId,
            isOpen,
        }: {
            src: string;
            suiteId: number;
            isOpen: boolean;
        }) => {
            testFiles[src].suites[suiteId].isOpen = isOpen;
        },

        setTestFileIsOpen: ({
            src,
            isOpen,
        }: {
            src: string;
            isOpen: boolean;
        }) => {
            testFiles[src].isOpen = isOpen;
        },
    };
    return { selectors, actions };
})();

/**
 * Selectors
 */

function initializeTestSandbox(
    testFile: { src: string },
    iframeElement: HTMLIFrameElement
) {
    iframeElement.addEventListener('load', () => {
        const contentWindow = iframeElement.contentWindow;
        const contentDocument = iframeElement.contentDocument;
        if (!contentWindow) throw new Error('iframe missing contentWindow');
        if (!contentDocument) throw new Error('iframe missing contentDocument');

        actions.registerTestFile({
            src: testFile.src,
            iframe: iframeElement,
        });

        const script = contentDocument.createElement('script');
        script.setAttribute('type', 'module');
        script.src = testFile.src;
        script.onload = () => {
            request(
                contentWindow,
                {
                    type: 'init',
                },
                isInitMessage
            )
                .then((initMessage) => {
                    const suites: Record<number | string, SuiteRecord> = {};
                    initMessage.suites.forEach((suite) => {
                        const tests = model<
                            Record<number | string, TestRecord>
                        >({});
                        suite.tests.forEach((test) => {
                            tests[test.id] = model({
                                testFileSrc: testFile.src,
                                suiteId: suite.id,
                                id: test.id,
                                name: test.name,
                                only: test.only,
                                localOnly: test.only,
                                status: 'ready',
                                isOpen: true,
                                extraInfo: [],
                            });
                        });
                        suites[suite.id] = model({
                            testFileSrc: testFile.src,
                            id: suite.id,
                            name: suite.name,
                            tests,
                            only: suite.only,
                            localOnly: suite.only,
                            parentSuiteId: suite.parentSuiteId,
                            status: 'ready',
                            isOpen: true,
                        });
                    });
                    actions.setTestFileSuites(testFile.src, suites);
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
async function runTests() {
    actions.setIsRunning(true);
    try {
        const allSuites: [
            DeepReadonly<TestFileRecord>,
            DeepReadonly<SuiteRecord>,
            DeepReadonly<TestRecord>
        ][] = [];
        let toRun: [
            DeepReadonly<TestFileRecord>,
            DeepReadonly<SuiteRecord>,
            DeepReadonly<TestRecord>
        ][] = [];

        // Determine tests to run; clear out prior results
        for (const testFile of selectors.getTestFiles()) {
            actions.clearTestFileResults(testFile.src);
            for (const suite of Object.values(testFile.suites)) {
                if (suite.localOnly) {
                    Object.values(suite.tests).forEach((test) => {
                        allSuites.push([testFile, suite, test]);
                        toRun.push([testFile, suite, test]);
                    });
                } else {
                    for (const test of Object.values(suite.tests)) {
                        allSuites.push([testFile, suite, test]);
                        if (test.localOnly) {
                            toRun.push([testFile, suite, test]);
                        }
                    }
                }
            }
        }
        if (toRun.length === 0) {
            toRun = allSuites;
        }

        const groupedTests = groupBy2(toRun, (item) => [
            item[0],
            item[1],
            item[2],
        ]);

        // Run selected tests
        for (const [testFile, suites] of groupedTests) {
            const contentWindow = testFile.iframe.contentWindow;
            if (!contentWindow) {
                console.error('No content window!?');
                continue;
            }

            actions.setTestFileRunning(testFile.src);
            const failedSuites = new Set<DeepReadonly<SuiteRecord>>();
            for (const [suite, tests] of suites) {
                actions.setSuiteRunning(testFile.src, suite.id);
                const failedTests = new Set<DeepReadonly<TestRecord>>();
                for (const test of tests) {
                    actions.setTestRunning({
                        src: testFile.src,
                        suiteId: suite.id,
                        testId: test.id,
                    });
                    await nextFlush();
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
                                    actions.setInternalError({
                                        src: testFile.src,
                                        suiteId: suite.id,
                                        testId: test.id,
                                        error: msg.error,
                                    });
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
                                    switch (msg.result) {
                                        case 'fail':
                                            actions.setTestFail({
                                                src: testFile.src,
                                                suiteId: suite.id,
                                                testId: test.id,
                                                error: msg.error,
                                                extraInfo: msg.extraInfo,
                                            });
                                            failedSuites.add(suite);
                                            failedTests.add(test);
                                            if (
                                                selectors.getUiState()
                                                    .stopOnFailure
                                            ) {
                                                actions.setSuiteDone({
                                                    src: testFile.src,
                                                    suiteId: suite.id,
                                                    numFailures:
                                                        failedTests.size,
                                                });
                                                actions.setTestFileDone({
                                                    src: testFile.src,
                                                    numFailures:
                                                        failedSuites.size,
                                                });
                                                return;
                                            }
                                            break;
                                        case 'pass':
                                            actions.setTestPass({
                                                src: testFile.src,
                                                suiteId: suite.id,
                                                testId: test.id,
                                                duration: msg.duration,
                                                selfDuration: msg.selfDuration,
                                                extraInfo: msg.extraInfo,
                                            });
                                            break;
                                        case 'run':
                                            break;
                                        default:
                                            log.assertExhausted(msg);
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
                        await nextFlush();
                    }
                }
                actions.setSuiteDone({
                    src: testFile.src,
                    suiteId: suite.id,
                    numFailures: failedTests.size,
                });
            }
            actions.setTestFileDone({
                src: testFile.src,
                numFailures: failedSuites.size,
            });
        }
    } finally {
        actions.setIsRunning(false);
    }
}

/**
 * Views
 */

const Histogram: Component<{
    label: string;
    data: number[];
    format: (val: number) => string;
}> = ({ label, data, format }) => {
    const maxVal = Math.max(...data);
    const minVal = Math.min(...data);
    const numBuckets = Math.round(data.length / 2);
    const bucketWidth = (maxVal - minVal) / (numBuckets - 1);
    const buckets: number[] = [];
    for (let i = 0; i < numBuckets; ++i) {
        buckets.push(0);
    }
    data.forEach((item) => {
        const bucket = Math.floor((item - minVal) / bucketWidth);
        buckets[bucket] += 1;
    });

    let chart: Chart | undefined;
    const refCallback = (div: HTMLCanvasElement | undefined) => {
        if (!div) {
            chart?.destroy();
            return;
        }
        chart = new Chart(div, {
            type: 'bar',
            data: {
                labels: buckets.map((bucket, index) =>
                    format(minVal + bucketWidth * index)
                ),
                datasets: [
                    {
                        label,
                        data: buckets,
                    },
                ],
            },
            options: {
                animation: {
                    duration: 0,
                },
            },
        });
    };

    return (
        <div>
            <canvas
                style="background-color: rgba(255,255,255,0.8)"
                ref={refCallback}
            />
        </div>
    );
    // TODO: find out what breaks if items are mixed elements and strings
};

const ExtraInfo: Component<{ info: ExtraInfo }> = ({ info }) => {
    if (info.type === 'string') {
        return <pre>{info.value}</pre>;
    }
    const state = model({ expanded: false });
    if (info.type === 'perf') {
        return (
            <pre>
                {calc(() =>
                    state.expanded ? (
                        <Histogram
                            label="wallclock"
                            data={info.value}
                            format={(time) => `${time}ms`}
                        />
                    ) : (
                        <a
                            href="#"
                            on:click={(e) => {
                                e.preventDefault();
                                state.expanded = true;
                            }}
                        >
                            Show time histogram
                        </a>
                    )
                )}
            </pre>
        );
    }
    if (info.type === 'used') {
        return (
            <pre>
                {calc(() =>
                    state.expanded ? (
                        <Histogram
                            label="used"
                            data={info.value}
                            format={(memory) =>
                                `${(memory / 1024).toFixed(2)}kb`
                            }
                        />
                    ) : (
                        <a
                            href="#"
                            on:click={(e) => {
                                e.preventDefault();
                                state.expanded = true;
                            }}
                        >
                            Show memory histogram
                        </a>
                    )
                )}
            </pre>
        );
    }
    return <pre>Other stuff: {JSON.stringify(info)}</pre>;
};

const TestView: Component<{ test: DeepReadonly<TestRecord> }> = ({ test }) => {
    const onClick = (e: MouseEvent) => {
        e.preventDefault();
        if (!e.shiftKey) {
            actions.resetAllTestState();
        }
        actions.toggleTestOnly({
            src: test.testFileSrc,
            suiteId: test.suiteId,
            testId: test.id,
        });
        runTests();
    };
    const statusText = {
        error: 'ERR:',
        ready: '',
        run: 'RUN:',
        pass: 'PASS',
        fail: 'FAIL',
    } as const;
    return (
        <div
            class={calc(() =>
                classes(
                    'test',
                    test.localOnly && 'test--only',
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
                    test.status === 'fail' && (
                        <>
                            {test.error && <pre>{test.error}</pre>}
                            {test.extraInfo.map((info) => (
                                <ExtraInfo info={info} />
                            ))}
                        </>
                    )
            )}
            {calc(
                () =>
                    test.status === 'pass' &&
                    test.extraInfo.map((info) => <ExtraInfo info={info} />)
            )}
        </div>
    );
};

const SuiteView: Component<{ suite: SuiteRecord }> = ({ suite }) => (
    <details
        class={calc(() =>
            classes(
                'suite',
                suite.localOnly && 'suite--only',
                suite.status === 'run' && 'suite--running',
                suite.status === 'pass' && 'suite--pass',
                suite.status === 'fail' && 'suite--fail'
            )
        )}
        open={calc(() => suite.status === 'run' || suite.isOpen)}
    >
        <summary
            class="suite__top"
            on:click={(event: MouseEvent) => {
                event.preventDefault();
                actions.setSuiteIsOpen({
                    src: suite.testFileSrc,
                    suiteId: suite.id,
                    isOpen: !suite.isOpen,
                });
            }}
        >
            <div class="suite__name">{calc(() => suite.name || '<root>')}</div>
            {calc(
                () =>
                    suite.status && (
                        <div class="suite__info">{suite.status}</div>
                    )
            )}
            {calc(
                () =>
                    Object.keys(suite.tests).length > 0 &&
                    suite.status === 'pass' && (
                        <div class="suite__info">
                            {
                                Object.values(suite.tests).filter(
                                    (test) => test.status === 'pass'
                                ).length
                            }{' '}
                            / {Object.keys(suite.tests).length}
                        </div>
                    )
            )}
            {calc(
                () =>
                    Object.keys(suite.tests).length > 0 &&
                    (suite.status === 'pass' || suite.status === 'fail') && (
                        <div class="suite__info">
                            in{' '}
                            {millis(
                                Object.values(suite.tests).reduce(
                                    (acc, test) => acc + (test?.duration ?? 0),
                                    0
                                )
                            )}
                        </div>
                    )
            )}
        </summary>
        {calc(() =>
            model
                .keys(suite.tests)
                .mapView((testId) => <TestView test={suite.tests[testId]} />)
        )}
    </details>
);

const TestFileView: Component<{ testFile: DeepReadonly<TestFileRecord> }> = ({
    testFile,
}) => {
    return (
        <details
            class={calc(() =>
                classes(
                    'testfile',
                    testFile.status === 'run' && 'testfile--run',
                    testFile.status === 'error' && 'testfile--fail',
                    testFile.status === 'fail' && 'testfile--fail',
                    testFile.status === 'pass' && 'testfile--pass'
                )
            )}
            open={calc(() => testFile.status === 'run' || testFile.isOpen)}
        >
            <summary
                class="testfile__status"
                on:click={(event: MouseEvent) => {
                    event.preventDefault();
                    actions.setTestFileIsOpen({
                        src: testFile.src,
                        isOpen: !testFile.isOpen,
                    });
                }}
            >
                {calc(() => testFile.src)}
            </summary>
            {calc(
                () =>
                    model
                        .keys(testFile.suites, `${testFile.src} keys`)
                        .mapView(
                            (suiteId) =>
                                calc(() => (
                                    <SuiteView
                                        suite={testFile.suites[suiteId]}
                                    />
                                )),
                            `${testFile.src} keys.mapView`
                        ),
                `${testFile.src} suites`
            )}
        </details>
    );
};

const TestRunner: Component<{}> = (props, { onMount, onEffect }) => {
    // Kick off tests once everything is initialized
    onEffect(() => {
        const testFiles = selectors.getTestFiles();
        if (
            testFiles.length === testManifest.length &&
            testFiles.every((testFile) => testFile.status === 'ready')
        ) {
            runTests();
        }
    });

    const onClickRunAll = () => {
        actions.resetAllTestState();
        runTests();
    };
    const onClickRerun = () => {
        runTests();
    };

    const anyTestsRunning = calc(() => {
        const globalState = selectors.getGlobalState()();
        return globalState === 'run' || globalState === 'loading';
    });

    const hasAnyOnly = calc(() => {
        const testFiles = selectors.getTestFiles();
        return testFiles.some((testFile) => {
            return Object.values(testFile.suites).some((suite) => {
                return (
                    suite.localOnly ||
                    Object.values(suite.tests).some((test) => test.localOnly)
                );
            });
        });
    });

    const onStopToggle = (e: Event) => {
        actions.setStopOnFailure(!!(e.target as HTMLInputElement)?.checked);
    };

    return (
        <div
            class={calc(() =>
                classes(
                    'testrunner',
                    selectors.getGlobalState()() === 'fail' &&
                        'testrunner--fail',
                    selectors.getGlobalState()() === 'pass' &&
                        'testrunner--pass'
                )
            )}
        >
            <div class="test-ui">
                <div class="test-ui-controls">
                    <button
                        class="test-ui-control"
                        disabled={anyTestsRunning}
                        on:click={onClickRunAll}
                    >
                        Run all tests
                    </button>
                    <button
                        class="test-ui-control"
                        disabled={calc(
                            () => !hasAnyOnly() || anyTestsRunning()
                        )}
                        on:click={onClickRerun}
                    >
                        Rerun selected tests
                    </button>
                    <input
                        id="stop-on-toggle"
                        class="test-ui-control"
                        type="checkbox"
                        checked={calc(
                            () => selectors.getUiState().stopOnFailure
                        )}
                        on:change={onStopToggle}
                    />
                    <label for="stop-on-toggle" class="test-ui-control">
                        Stop on failure
                    </label>
                    <div class="test-ui-control test-ui-global-state">
                        STATUS: {selectors.getGlobalStateDisplay()}
                    </div>
                </div>
                {selectors.getTestFiles().mapView((testFile) => (
                    <TestFileView testFile={testFile} />
                ))}
            </div>
            <div class="test-sandboxes">
                {testManifest.map((testEntry) =>
                    calc(() => (
                        <iframe
                            class={calc(() =>
                                classes(
                                    (selectors.getTestFile(testEntry.src)
                                        ?.status === 'fail' ||
                                        selectors.getTestFile(testEntry.src)
                                            ?.status === 'run') &&
                                        'active'
                                )
                            )}
                            ref={(iframeElement) => {
                                if (!iframeElement) {
                                    return;
                                }
                                initializeTestSandbox(testEntry, iframeElement);
                            }}
                            src={`testsandbox.html#${encodeURI(testEntry.src)}`}
                        />
                    ))
                )}
            </div>
        </div>
    );
};

mount(document.body, <TestRunner />);
