import { isResponse, makeRequest } from './types';
import { makePromise } from '../util';
const makeId = (() => {
    let maxId = 0;
    return () => maxId++;
})();
const requests = {};
export function request(targetWindow, request, validator) {
    const id = makeId();
    const promise = new Promise((resolve, reject) => {
        requests[id] = (response, isPartial) => {
            if (isPartial) {
                console.error('Got partial response when full response expected', response);
                reject(new Error('Got partial response when full response expected'));
            }
            if (validator(response)) {
                resolve(response);
            }
            else {
                reject(new Error('Failed validation'));
            }
            delete requests[id];
        };
    });
    const msg = makeRequest(id, request);
    targetWindow.postMessage(msg);
    return promise;
}
export async function* requestStream(targetWindow, request) {
    const id = makeId();
    const messages = [];
    let notify = makePromise().resolve;
    requests[id] = (response, isPartial) => {
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
        const { response, isPartial } = messages.shift();
        yield response;
        if (!isPartial) {
            delete requests[id];
            return;
        }
    }
}
window.addEventListener('message', (event) => {
    if (event.origin !== window.location.origin) {
        return;
    }
    const source = event.source;
    if (!source) {
        return;
    }
    const msg = event.data;
    if (!isResponse(msg)) {
        console.error('Received malformed message, message not response', event);
        return;
    }
    if (!requests[msg.id]) {
        console.log('Received unexpected message, message id not expected', event);
        return;
    }
    requests[msg.id](msg.response, msg.isPartial);
}, false);
//# sourceMappingURL=rpc.js.map