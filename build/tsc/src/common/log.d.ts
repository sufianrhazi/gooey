export type LogLevel = 'error' | 'warn' | 'info' | 'debug';
export declare function getLogLevel(): LogLevel;
export declare function setLogLevel(logLevel: LogLevel): void;
export declare function debug(...items: any[]): void;
export declare function info(...items: any[]): void;
export declare function warn(...items: any[]): void;
export declare function error(...items: any[]): void;
export declare function group(...items: any[]): void;
export declare function groupEnd(): void;
export declare function exception(exception: any, ...items: any[]): void;
export declare function invariant(check: () => any, ...items: any[]): void;
export declare function fail(msg: string, ...items: any[]): never;
export declare function assert(check: any, msg: string, ...items: any[]): asserts check;
export declare function assertExhausted(context: never, ...items: any[]): never;
//# sourceMappingURL=log.d.ts.map