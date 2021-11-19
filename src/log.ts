type LogLevel = 'error' | 'warn' | 'info' | 'debug';
const levels: Record<LogLevel, number> = {
    error: 0,
    warn: 1,
    info: 2,
    debug: 3,
};
let currentLevel: number = levels.warn;

export function setLogLevel(logLevel: LogLevel) {
    invariant(() => logLevel in levels, logLevel);
    currentLevel = levels[logLevel];
}

export function debug(...items: any[]) {
    if (currentLevel >= levels.debug) {
        console.log(...items);
    }
}

export function info(...items: any[]) {
    if (currentLevel >= levels.info) {
        console.log(...items);
    }
}

export function warn(...items: any[]) {
    if (currentLevel >= levels.warn) {
        console.warn(...items);
    }
}

export function error(...items: any[]) {
    if (currentLevel >= levels.error) {
        console.error(...items);
    }
}

export function exception(exception: any, ...items: any[]) {
    if (exception instanceof Error) {
        error(exception);
        error(...items);
    } else {
        error(exception, ...items);
    }
}

export function invariant(check: () => any, ...items: any[]) {
    if (!check()) {
        error('Invariant error', check.toString(), 'is not truthy', ...items);
    }
}

export function assert(check: any, ...items: any[]): asserts check {
    if (!check) {
        error(
            'Assertion failure',
            check === undefined
                ? 'undefined'
                : check === null
                ? 'null'
                : check.toString(),
            'is not truthy',
            ...items
        );
        throw new Error('Assertion failure');
    }
}

export function assertExhausted(context: never, ...items: any[]): never {
    error('Assertion failure', context, 'is not exhausted', ...items);
    throw new Error('Assertion failure');
}
