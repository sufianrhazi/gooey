declare type TestContext = any;
declare type TestAction<Ctx = TestContext> = (ctx: Ctx) => Promise<void> | void;
export declare function abstractSuite(name: string, body: () => void): (name: string, body: () => void, only?: boolean) => void;
export declare function suite(name: string, body: () => void): void;
export declare namespace suite {
    var only: (name: string, body: () => void) => void;
}
export declare function beforeEach(action: TestAction): void;
export declare function afterEach(action: TestAction): void;
export declare function test(name: string, impl: TestAction): void;
export declare namespace test {
    var only: (name: string, impl: TestAction<any>) => void;
}
export declare const assert: {
    fail: (msg?: string | undefined) => never;
    is: (a: any, b: any, msg?: string | undefined) => void;
    isNot: (a: any, b: any, msg?: string | undefined) => void;
    isTruthy: (a: any, msg?: string | undefined) => void;
    isFalsy: (a: any, msg?: string | undefined) => void;
    lessThan: (a: string | number, b: string | number, msg?: string | undefined) => void;
    lessThanOrEqual: (a: string | number, b: string | number, msg?: string | undefined) => void;
    greaterThan: (a: string | number, b: string | number, msg?: string | undefined) => void;
    greaterThanOrEqual: (a: string | number, b: string | number, msg?: string | undefined) => void;
    arrayIs: <T>(expected: T[], received: T[], msg?: string | undefined) => void;
    arrayIncludes: (haystack: readonly any[], needle: any, msg?: string | undefined) => void;
    notArrayIncludes: (haystack: readonly any[], needle: any, msg?: string | undefined) => void;
    arrayEqualsUnsorted: (a: readonly any[], b: readonly any[], msg?: string | undefined) => void;
    deepEqual: (a: any, b: any, msg?: string | undefined) => void;
    notDeepEqual: (a: any, b: any, msg?: string | undefined) => void;
    assertionCount: (num: number, msg?: string | undefined) => void;
    throwsMatching: (match: string | RegExp, fn: () => void, msg?: string | undefined) => void;
    medianRuntimeLessThan: (ms: number, fn: (measure: <T_1>(measurement: () => T_1) => T_1) => void, numRuns?: number, msg?: string | undefined) => void;
    fuzz: <T_2>({ generateItem, checkItem, count, }: {
        generateItem: (priorItems: readonly T_2[]) => T_2;
        checkItem: (item: T_2) => void;
        count?: number | undefined;
    }) => void;
};
export {};
//# sourceMappingURL=test.d.ts.map