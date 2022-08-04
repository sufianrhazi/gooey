import Gooey, {
    mount,
    Component,
    model,
    calc,
    AttachmentObserver,
} from '../../index';

const appRoot = document.getElementById('app');
if (!appRoot) {
    throw new Error('Cannot find app root');
}

interface FocusListenerProps {
    onFocusEnter: () => void;
    onFocusLeave: () => void;
    children?: JSX.Element[] | JSX.Element;
}
const FocusListener: Component<FocusListenerProps> = (
    { onFocusEnter, onFocusLeave, children },
    { onMount, onUnmount }
) => {
    const elements = new Set<Element>();

    function onFocusIn(event: FocusEvent) {
        for (const element of elements) {
            if (
                event.target instanceof Element &&
                element.contains(event.target)
            ) {
                onFocusEnter();
                return;
            }
        }
    }

    function onFocusOut(event: FocusEvent) {
        for (const element of elements) {
            if (
                event.target instanceof Element &&
                element.contains(event.target)
            ) {
                onFocusLeave();
                return;
            }
        }
    }

    function addEventListeners(element: HTMLElement) {
        element.addEventListener('focusin', onFocusIn);
        element.addEventListener('focusout', onFocusOut);
    }

    function removeEventListeners(element: HTMLElement) {
        element.removeEventListener('focusin', onFocusIn);
        element.removeEventListener('focusout', onFocusOut);
    }

    return (
        <AttachmentObserver
            elementCallback={(element, event) => {
                if (event === 'add' && element instanceof HTMLElement) {
                    elements.add(element);
                    addEventListeners(element);

                    // If somehow the new element already has focus
                    if (element.contains(document.activeElement)) {
                        onFocusEnter();
                    }
                }
                if (event === 'remove' && element instanceof HTMLElement) {
                    elements.delete(element);
                    removeEventListeners(element);

                    // If somehow the new element currently has focus
                    if (element.contains(document.activeElement)) {
                        onFocusLeave();
                    }
                }
            }}
        >
            {children}
        </AttachmentObserver>
    );
};

const Example: Component<{ children?: JSX.Element | JSX.Element[] }> = ({
    children,
}) => {
    const state = model({
        hasFocus: false,
    });
    return (
        <fieldset>
            <legend>
                Has focus: {calc(() => (state.hasFocus ? 'yes' : 'no'))}
            </legend>
            <FocusListener
                onFocusEnter={() => {
                    state.hasFocus = true;
                }}
                onFocusLeave={() => {
                    state.hasFocus = false;
                }}
            >
                {children}
            </FocusListener>
        </fieldset>
    );
};

const App: Component<{}> = (_props, { onMount, onUnmount }) => {
    let handle: number | null = null;
    const state = model({
        isShowing: true,
    });
    onMount(() => {
        handle = setInterval(() => {
            state.isShowing = !state.isShowing;
        }, 1000);
    });
    onUnmount(() => {
        if (handle !== null) {
            clearInterval(handle);
        }
    });

    return (
        <>
            <h1>AttachmentObserver</h1>
            <p>
                Demonstration of AttachmentObserver to detect and manage focus
            </p>
            <Example>
                <p>
                    Here is some text with a <a href="#">hyperlink</a>
                </p>
            </Example>
            <p>
                Here is some more text with a <a href="#">hyperlink</a>
            </p>
            <Example>
                <ol>
                    <li>
                        More items <a href="#">to focus on</a>
                    </li>
                    <li>
                        Lets make this dynamic:
                        {calc(
                            () =>
                                state.isShowing && (
                                    <ul>
                                        <li>
                                            More items{' '}
                                            <a href="#">to focus on</a>
                                        </li>
                                        <li>
                                            More items{' '}
                                            <button>to focus on</button>
                                        </li>
                                        <li>
                                            More items{' '}
                                            <label>
                                                <input type="checkbox" /> to
                                                interact with
                                            </label>
                                        </li>
                                    </ul>
                                )
                        )}
                    </li>
                    <li>
                        More items{' '}
                        <label>
                            <input type="checkbox" /> to interact with
                        </label>
                    </li>
                </ol>
            </Example>
        </>
    );
};

mount(appRoot, <App />);
