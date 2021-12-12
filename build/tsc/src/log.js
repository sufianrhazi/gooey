const levels = {
    error: 0,
    warn: 1,
    info: 2,
    debug: 3,
};
let currentLevel = levels.warn;
export function getLogLevel() {
    if (currentLevel >= levels.info)
        return 'info';
    if (currentLevel >= levels.warn)
        return 'warn';
    if (currentLevel >= levels.debug)
        return 'debug';
    return 'error';
}
export function setLogLevel(logLevel) {
    invariant(() => logLevel in levels, logLevel);
    currentLevel = levels[logLevel];
}
export function debug(...items) {
    if (currentLevel >= levels.debug) {
        console.log(...items);
    }
}
export function info(...items) {
    if (currentLevel >= levels.info) {
        console.log(...items);
    }
}
export function warn(...items) {
    if (currentLevel >= levels.warn) {
        console.warn(...items);
    }
}
export function error(...items) {
    if (currentLevel >= levels.error) {
        console.error(...items);
    }
}
export function exception(exception, ...items) {
    if (exception instanceof Error) {
        error(exception);
        error(...items);
    }
    else {
        error(exception, ...items);
    }
}
export function invariant(check, ...items) {
    if (!check()) {
        error('Invariant error', check.toString(), 'is not truthy', ...items);
    }
}
export function assert(check, ...items) {
    if (!check) {
        error('Assertion failure', check === undefined
            ? 'undefined'
            : check === null
                ? 'null'
                : check.toString(), 'is not truthy', ...items);
        throw new Error('Assertion failure');
    }
}
export function assertExhausted(context, ...items) {
    error('Assertion failure', context, 'is not exhausted', ...items);
    throw new Error('Assertion failure');
}
//# sourceMappingURL=log.js.map