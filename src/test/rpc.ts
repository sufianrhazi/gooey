import { isResponse, makeRequest } from './types';
import { makePromise } from '../util';

const makeId = (() => {
    let maxId = 0;
    return () => maxId++;
})();

const requests: Record<
    number,
    (response: unknown, isPartial: boolean) => void
> = {};
export function request<T>(
    targetWindow: Window,
    request: any,
    validator: (response: any) => response is T
): Promise<T> {
    const id = makeId();
    const promise = new Promise<T>((resolve, reject) => {
        requests[id] = (response: unknown, isPartial: boolean) => {
            if (isPartial) {
                console.error(
                    'Got partial response when full response expected',
                    response
                );
                reject(
                    new Error(
                        'Got partial response when full response expected'
                    )
                );
            }
            if (validator(response)) {
                resolve(response);
            } else {
                reject(new Error('Failed validation'));
            }
            delete requests[id];
        };
    });
    const msg = makeRequest(id, request);
    targetWindow.postMessage(msg);
    return promise;
}

export async function* requestStream(
    targetWindow: Window,
    request: any
): AsyncGenerator<unknown, void> {
    const id = makeId();

    const messages: {
        response: unknown;
        isPartial: boolean;
    }[] = [];

    let notify = makePromise<void>().resolve;
    requests[id] = (response: unknown, isPartial: boolean) => {
        messages.push({ response, isPartial });
        notify();
    };
    const msg = makeRequest(id, request);
    targetWindow.postMessage(msg);

    while (true) {
        if (messages.length === 0) {
            const { promise, resolve } = makePromise();
            notify = resolve;
            await promise;
        }
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const { response, isPartial } = messages.shift()!;
        yield response;
        if (!isPartial) {
            delete requests[id];
            return;
        }
    }
}

window.addEventListener(
    'message',
    (event) => {
        if (event.origin !== window.location.origin) {
            return;
        }
        const source = event.source;
        if (!source) {
            return;
        }
        const msg = event.data;
        if (!isResponse(msg)) {
            console.error(
                'Received malformed message, message not response',
                event
            );
            return;
        }
        if (!requests[msg.id]) {
            console.log(
                'Received unexpected message, message id not expected',
                event
            );
            return;
        }
        requests[msg.id](msg.response, msg.isPartial);
    },
    false
);
