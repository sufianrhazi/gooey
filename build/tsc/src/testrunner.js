import Revise, { Fragment, calc, model, mount, nextFlush } from './index';
import { isInitMessage, isRunUpdate, isRunResponse, makeRunTestRequest, } from './test/types';
import * as log from './log';
import { request, requestStream } from './test/rpc';
import { groupBy2 } from './util';
import testManifest from '../test-manifest.json'; // Generated from s/test
function classes(...args) {
    return args.filter((x) => !!x).join(' ');
}
const millis = (ms) => `${(ms || 0).toFixed(3)}ms`;
/**
 * State
 */
const { actions, selectors } = (() => {
    const testFiles = model({});
    const testFileKeys = model.keys(testFiles);
    const sortedTestFileKeys = testFileKeys.sortedView((key) => key);
    const sortedTestFiles = sortedTestFileKeys.mapView((key) => testFiles[key]);
    const globalState = calc(() => {
        let anyReady = false;
        if (sortedTestFiles.length === 0)
            return 'loading';
        for (const testFile of sortedTestFiles) {
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
    const uiState = model({
        stopOnFailure: true,
        error: null,
    });
    const selectors = {
        getTestFile: (src) => testFiles[src],
        getTestFiles: () => sortedTestFiles,
        getTestFileKeys: () => sortedTestFileKeys,
        getUiState: () => uiState,
        getGlobalState: () => globalState,
    };
    const actions = {
        registerTestFile: ({ src, iframe, }) => {
            testFiles[src] = model({
                src,
                iframe,
                suites: model({}),
                status: 'loading',
                isOpen: false,
                extraInfo: [],
            });
        },
        setTestFileSuites(src, suites) {
            testFiles[src].suites = model(suites);
            testFiles[src].status = 'ready';
            testFiles[src].isOpen = Object.values(suites).some((suite) => suite.only ||
                Object.values(suite.tests).some((test) => test.only));
        },
        resetAllTestState: () => {
            for (const testFile of Object.values(testFiles)) {
                actions.clearTestFileResults(testFile.src);
                for (const suite of Object.values(testFile.suites)) {
                    suite.localOnly = false;
                    for (const test of Object.values(suite.tests)) {
                        test.localOnly = false;
                    }
                }
            }
        },
        setTestFileRunning: (src) => {
            testFiles[src].status = 'run';
        },
        setSuiteRunning: (src, suiteId) => {
            testFiles[src].suites[suiteId].status = 'run';
        },
        clearTestFileResults: (src) => {
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
        setTestRunning: ({ src, suiteId, testId, }) => {
            const testFile = testFiles[src];
            const suite = testFile.suites[suiteId];
            const test = suite.tests[testId];
            test.status = 'run';
        },
        setTestFail: ({ src, suiteId, testId, error, }) => {
            const testFile = testFiles[src];
            const suite = testFile.suites[suiteId];
            const test = suite.tests[testId];
            testFile.status = 'fail';
            suite.status = 'fail';
            test.status = 'fail';
            test.error = error;
        },
        setTestPass: ({ src, suiteId, testId, duration, selfDuration, extraInfo, }) => {
            const suite = testFiles[src].suites[suiteId];
            const test = suite.tests[testId];
            test.status = 'pass';
            test.duration = duration;
            test.selfDuration = selfDuration;
            test.extraInfo = extraInfo;
        },
        setSuiteDone: ({ src, suiteId, numFailures, }) => {
            const testFile = testFiles[src];
            const suite = testFile.suites[suiteId];
            if (numFailures > 0) {
                testFile.status = 'fail';
                suite.status = 'fail';
                testFile.isOpen = true;
                suite.isOpen = true;
            }
            else {
                suite.status = 'pass';
                suite.isOpen =
                    suite.localOnly ||
                        Object.values(suite.tests).some((test) => test.localOnly);
            }
        },
        setTestFileDone: ({ src, numFailures, }) => {
            const testFile = testFiles[src];
            if (numFailures > 0) {
                testFile.status = 'fail';
                testFile.isOpen = true;
            }
            else {
                testFile.status = 'pass';
                testFile.isOpen = Object.values(testFile.suites).some((suite) => suite.localOnly ||
                    Object.values(suite.tests).some((test) => test.localOnly));
            }
        },
        setInternalError: ({ src, suiteId, testId, error, }) => {
            const testFile = !!src && testFiles[src];
            const suite = !!testFile && !!suiteId && testFile.suites[suiteId];
            const test = !!testFile && !!suite && !!testId && suite.tests[testId];
            if (testFile)
                testFile.status = 'error';
            if (suite)
                suite.status = 'error';
            if (test)
                test.status = 'error';
            if (test)
                test.error = error;
            else if (suite)
                suite.error = error;
            else if (testFile)
                testFile.error = error;
            else
                uiState.error = error;
        },
        toggleTestOnly: ({ src, suiteId, testId, }) => {
            const test = testFiles[src].suites[suiteId].tests[testId];
            test.localOnly = !test.localOnly;
        },
        setStopOnFailure: (stopOnFailure) => {
            uiState.stopOnFailure = stopOnFailure;
        },
        setSuiteIsOpen: ({ src, suiteId, isOpen, }) => {
            testFiles[src].suites[suiteId].isOpen = isOpen;
        },
        setTestFileIsOpen: ({ src, isOpen, }) => {
            testFiles[src].isOpen = isOpen;
        },
    };
    return { selectors, actions };
})();
/**
 * Selectors
 */
function initializeTestSandbox(testFile, iframeElement) {
    iframeElement.addEventListener('load', () => {
        const contentWindow = iframeElement.contentWindow;
        const contentDocument = iframeElement.contentDocument;
        if (!contentWindow)
            throw new Error('iframe missing contentWindow');
        if (!contentDocument)
            throw new Error('iframe missing contentDocument');
        actions.registerTestFile({
            src: testFile.src,
            iframe: iframeElement,
        });
        const script = contentDocument.createElement('script');
        script.setAttribute('type', 'module');
        script.src = testFile.src;
        script.onload = () => {
            request(contentWindow, {
                type: 'init',
            }, isInitMessage)
                .then((initMessage) => {
                const suites = {};
                initMessage.suites.forEach((suite) => {
                    const tests = model({});
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
    const allSuites = [];
    let toRun = [];
    // Determine tests to run; clear out prior results
    for (const testFile of selectors.getTestFiles()) {
        actions.clearTestFileResults(testFile.src);
        for (const suite of Object.values(testFile.suites)) {
            if (suite.localOnly) {
                Object.values(suite.tests).forEach((test) => {
                    allSuites.push([testFile, suite, test]);
                    toRun.push([testFile, suite, test]);
                });
            }
            else {
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
    const groupedTests = groupBy2(toRun, (item) => [item[0], item[1], item[2]]);
    // Run selected tests
    for (const [testFile, suites] of groupedTests) {
        const contentWindow = testFile.iframe.contentWindow;
        if (!contentWindow) {
            console.error('No content window!?');
            continue;
        }
        actions.setTestFileRunning(testFile.src);
        const failedSuites = new Set();
        for (const [suite, tests] of suites) {
            actions.setSuiteRunning(testFile.src, suite.id);
            const failedTests = new Set();
            for (const test of tests) {
                actions.setTestRunning({
                    src: testFile.src,
                    suiteId: suite.id,
                    testId: test.id,
                });
                await nextFlush();
                const stream = requestStream(contentWindow, makeRunTestRequest({
                    suiteId: suite.id,
                    testId: test.id,
                }));
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
                                throw new Error('Internal error: ' + msg.error);
                                break;
                            case 'test': {
                                if (msg.suiteId !== suite.id) {
                                    throw new Error('Malformed message; suite mismatch');
                                }
                                switch (msg.result) {
                                    case 'fail':
                                        actions.setTestFail({
                                            src: testFile.src,
                                            suiteId: suite.id,
                                            testId: test.id,
                                            error: msg.error,
                                        });
                                        failedSuites.add(suite);
                                        failedTests.add(test);
                                        if (selectors.getUiState().stopOnFailure) {
                                            actions.setSuiteDone({
                                                src: testFile.src,
                                                suiteId: suite.id,
                                                numFailures: failedTests.size,
                                            });
                                            actions.setTestFileDone({
                                                src: testFile.src,
                                                numFailures: failedSuites.size,
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
}
/**
 * Views
 */
const TestView = ({ test }) => {
    const onClick = (e) => {
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
    };
    return (Revise("div", { class: calc(() => classes('test', test.localOnly && 'test--only', test.status === 'run' && 'test--running', test.status === 'pass' && 'test--pass', test.status === 'fail' && 'test--fail')) },
        Revise("a", { class: "test__link", href: "#", "on:click": onClick },
            calc(() => (test.status ? statusText[test.status] : '')),
            ' ',
            calc(() => test.name),
            calc(() => test.duration !== undefined &&
                test.selfDuration !== undefined && (Revise(Fragment, null,
                ": (",
                millis(test.selfDuration),
                ";",
                ' ',
                millis(test.duration),
                " including setup)")))),
        calc(() => test.status === 'fail' &&
            test.error && Revise("pre", null, test.error)),
        calc(() => test.status === 'pass' &&
            test.extraInfo.map((info) => Revise("pre", null, info)))));
};
const SuiteView = ({ suite }) => (Revise("details", { class: calc(() => classes('suite', suite.localOnly && 'suite--only', suite.status === 'run' && 'suite--running', suite.status === 'pass' && 'suite--pass', suite.status === 'fail' && 'suite--fail')), open: calc(() => suite.status === 'run' || suite.isOpen) },
    Revise("summary", { class: "suite__top", "on:click": (event) => {
            event.preventDefault();
            actions.setSuiteIsOpen({
                src: suite.testFileSrc,
                suiteId: suite.id,
                isOpen: !suite.isOpen,
            });
        } },
        Revise("div", { class: "suite__name" }, calc(() => suite.name || '<root>')),
        calc(() => suite.status && (Revise("div", { class: "suite__info" }, suite.status))),
        calc(() => Object.keys(suite.tests).length > 0 &&
            suite.status === 'pass' && (Revise("div", { class: "suite__info" },
            Object.values(suite.tests).filter((test) => test.status === 'pass').length,
            ' ',
            "/ ",
            Object.keys(suite.tests).length))),
        calc(() => Object.keys(suite.tests).length > 0 &&
            (suite.status === 'pass' || suite.status === 'fail') && (Revise("div", { class: "suite__info" },
            "in",
            ' ',
            millis(Object.values(suite.tests).reduce((acc, test) => { var _a; return acc + ((_a = test === null || test === void 0 ? void 0 : test.duration) !== null && _a !== void 0 ? _a : 0); }, 0)))))),
    calc(() => model
        .keys(suite.tests)
        .mapView((testId) => Revise(TestView, { test: suite.tests[testId] })))));
const TestFileView = ({ testFile, }) => {
    return (Revise("details", { class: calc(() => classes('testfile', testFile.status === 'run' && 'testfile--run', testFile.status === 'error' && 'testfile--fail', testFile.status === 'fail' && 'testfile--fail', testFile.status === 'pass' && 'testfile--pass')), open: calc(() => testFile.status === 'run' || testFile.isOpen) },
        Revise("summary", { class: "testfile__status", "on:click": (event) => {
                event.preventDefault();
                actions.setTestFileIsOpen({
                    src: testFile.src,
                    isOpen: !testFile.isOpen,
                });
            } }, calc(() => testFile.src)),
        calc(() => model
            .keys(testFile.suites)
            .mapView((suiteId) => calc(() => (Revise(SuiteView, { suite: testFile.suites[suiteId] })))))));
};
const TestRunner = (props, { onMount, onEffect }) => {
    // Kick off tests once everything is initialized
    onEffect(() => {
        const testFiles = selectors.getTestFiles();
        if (testFiles.length === testManifest.length &&
            testFiles.every((testFile) => testFile.status === 'ready')) {
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
                return (suite.localOnly ||
                    Object.values(suite.tests).some((test) => test.localOnly));
            });
        });
    });
    const onStopToggle = (e) => {
        var _a;
        actions.setStopOnFailure(!!((_a = e.target) === null || _a === void 0 ? void 0 : _a.checked));
    };
    return (Revise("div", { class: calc(() => classes('testrunner', selectors.getGlobalState()() === 'fail' &&
            'testrunner--fail', selectors.getGlobalState()() === 'pass' &&
            'testrunner--pass')) },
        Revise("div", { class: "test-ui" },
            Revise("div", { class: "test-ui-controls" },
                Revise("button", { class: "test-ui-control", disabled: anyTestsRunning, "on:click": onClickRunAll }, "Run all tests"),
                Revise("button", { class: "test-ui-control", disabled: calc(() => !hasAnyOnly() || anyTestsRunning()), "on:click": onClickRerun }, "Rerun selected tests"),
                Revise("input", { id: "stop-on-toggle", class: "test-ui-control", type: "checkbox", checked: calc(() => selectors.getUiState().stopOnFailure), "on:change": onStopToggle }),
                Revise("label", { for: "stop-on-toggle", class: "test-ui-control" }, "Stop on failure"),
                Revise("div", { class: "test-ui-control test-ui-global-state" },
                    "STATUS: ",
                    selectors.getGlobalState())),
            selectors.getTestFiles().mapView((testFile) => (Revise(TestFileView, { testFile: testFile })))),
        Revise("div", { class: "test-sandboxes" }, testManifest.map((testEntry) => calc(() => (Revise("iframe", { class: calc(() => {
                var _a, _b;
                return classes((((_a = selectors.getTestFile(testEntry.src)) === null || _a === void 0 ? void 0 : _a.status) === 'fail' ||
                    ((_b = selectors.getTestFile(testEntry.src)) === null || _b === void 0 ? void 0 : _b.status) === 'run') &&
                    'active');
            }), ref: (iframeElement) => {
                if (!iframeElement) {
                    return;
                }
                initializeTestSandbox(testEntry, iframeElement);
            }, src: "testsandbox.html" })))))));
};
mount(document.body, Revise(TestRunner, null));
//# sourceMappingURL=testrunner.js.map