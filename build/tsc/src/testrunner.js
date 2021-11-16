import Revise, { Fragment, collection, calc, model, mount } from './index';
import { isInitMessage, isRunUpdate, isRunResponse, makeRunTestRequest, } from './test/types';
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
const testFiles = model({});
const uiState = model({
    stopOnFailure: true,
});
function initializeTestSandbox(testFile, iframeElement) {
    iframeElement.addEventListener('load', () => {
        const contentWindow = iframeElement.contentWindow;
        const contentDocument = iframeElement.contentDocument;
        if (!contentWindow)
            throw new Error('iframe missing contentWindow');
        if (!contentDocument)
            throw new Error('iframe missing contentDocument');
        const suites = collection([]);
        testFiles[testFile.src] = model({
            src: testFile.src,
            iframe: iframeElement,
            suites,
            active: false,
            initialized: false,
        });
        const script = contentDocument.createElement('script');
        script.setAttribute('type', 'module');
        script.src = testFile.src;
        script.onload = () => {
            request(contentWindow, {
                type: 'init',
            }, isInitMessage)
                .then((initMessage) => {
                initMessage.suites.forEach((suite) => {
                    const tests = collection([]);
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
                testFiles[testFile.src].initialized = true;
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
function resetTestFileState(testFile) {
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
    const allSuites = [];
    let toRun = [];
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
            }
            else {
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
                    const stream = requestStream(contentWindow, makeRunTestRequest({
                        suiteId: suite.id,
                        testId: test.id,
                    }));
                    for await (const msg of stream) {
                        if (isRunUpdate(msg)) {
                            switch (msg.type) {
                                case 'internal':
                                    suite.status = 'fail';
                                    test.status = 'fail';
                                    test.error = msg.error;
                                    throw new Error('Internal error: ' + msg.error);
                                    break;
                                case 'test': {
                                    if (msg.suiteId !== suite.id) {
                                        throw new Error('Malformed message; suite mismatch');
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
        }
        finally {
            testFile.active = false;
        }
    }
}
/**
 * Views
 */
const TestView = ({ test }) => {
    const onClick = (e) => {
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
    };
    return (Revise("div", { class: calc(() => classes('test', test.only && 'test--only', test.status === 'run' && 'test--running', test.status === 'pass' && 'test--pass', test.status === 'fail' && 'test--fail')) },
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
            test.error && Revise("pre", null, test.error))));
};
const SuiteView = ({ suite }) => suite.tests.length > 0 && (Revise("details", { class: calc(() => classes('suite', suite.status === 'run' && 'suite--running', suite.status === 'pass' && 'suite--pass', suite.status === 'fail' && 'suite--fail')), open: calc(() => !(suite.status === 'pass' &&
        suite.tests.every((test) => test.status === 'pass'))) },
    Revise("summary", { class: "suite__top" },
        Revise("div", { class: "suite__name" }, calc(() => suite.name || '<root>')),
        calc(() => suite.status && (Revise("div", { class: "suite__info" }, suite.status))),
        calc(() => suite.tests.length > 0 &&
            suite.status === 'pass' && (Revise("div", { class: "suite__info" },
            suite.tests.filter((test) => test.status === 'pass').length,
            ' ',
            "/ ",
            suite.tests.length))),
        calc(() => suite.tests.length > 0 &&
            (suite.status === 'pass' ||
                suite.status === 'fail') && (Revise("div", { class: "suite__info" },
            "in",
            ' ',
            millis(suite.tests.reduce((acc, test) => { var _a; return acc + ((_a = test === null || test === void 0 ? void 0 : test.duration) !== null && _a !== void 0 ? _a : 0); }, 0)))))),
    suite.tests.mapView((test) => (Revise(TestView, { test: test })))));
const TestFileView = ({ testFile, }) => (Revise("details", { class: "testfile", open: true },
    Revise("summary", { class: "testfile__status" }, calc(() => testFile.src)),
    calc(() => testFile.suites.mapView((suite) => calc(() => Revise(SuiteView, { suite: suite }))))));
const TestRunner = (props, { onMount, onEffect }) => {
    const testFileKeys = model.keys(testFiles);
    // Kick off tests once everything is initialized
    onEffect(() => {
        if (testFileKeys.length === testManifest.length &&
            testFileKeys.every((testFileKey) => testFiles[testFileKey].initialized)) {
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
    const onStopToggle = (e) => {
        var _a;
        uiState.stopOnFailure = !!((_a = e.target) === null || _a === void 0 ? void 0 : _a.checked);
    };
    return (Revise("div", { class: "testrunner" },
        Revise("div", { class: "test-ui" },
            Revise("button", { disabled: hasEmptyTests, "on:click": onClickRunAll }, "Run all tests"),
            Revise("button", { disabled: hasAnyOnlyItems, "on:click": onClickRerun }, "Rerun selected tests"),
            Revise("label", null,
                Revise("input", { type: "checkbox", checked: calc(() => uiState.stopOnFailure), "on:change": onStopToggle }),
                ' ',
                "Stop on failure"),
            testFileKeys.mapView((testFile) => (Revise(TestFileView, { testFile: testFiles[testFile] })))),
        Revise("div", { class: "test-sandboxes" }, testManifest.map((testEntry) => (Revise("iframe", { class: calc(() => {
                var _a;
                return classes(((_a = testFiles[testEntry.src]) === null || _a === void 0 ? void 0 : _a.active) && 'active');
            }), ref: (iframeElement) => {
                if (!iframeElement) {
                    return;
                }
                initializeTestSandbox(testEntry, iframeElement);
            }, src: "testsandbox.html" }))))));
};
mount(document.body, Revise(TestRunner, null));
//# sourceMappingURL=testrunner.js.map