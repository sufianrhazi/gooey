export declare function request<T>(targetWindow: Window, request: any, validator: (response: any) => response is T): Promise<T>;
export declare function requestStream(targetWindow: Window, request: any): AsyncGenerator<unknown, void>;
//# sourceMappingURL=rpc.d.ts.map