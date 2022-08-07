import Gooey, {
    AttachmentObserver,
    Component,
    Ref,
    ref,
    mount,
    model,
    Collection,
    collection,
    calc,
} from '../../index';

const Log: Component<{ messages: Collection<string> }> = ({ messages }) => {
    const logRef = ref<HTMLPreElement>();

    return (
        <pre class="log" ref={logRef}>
            <AttachmentObserver
                elementCallback={() => {
                    if (logRef.current) {
                        logRef.current.scrollTop = logRef.current.scrollHeight;
                    }
                }}
            >
                {messages.mapView((message) => (
                    <div>
                        {new Date().toISOString().split('T')[1].slice(0, -1)}:{' '}
                        {message}
                    </div>
                ))}
            </AttachmentObserver>
        </pre>
    );
};

const Checkbox: Component<{}> = (props, { onDestroy }) => {
    const state = model({
        checked: false,
        disabled: false,
        indeterminate: false,
        messages: collection<string>([]),
    });
    const inputRef = ref<HTMLInputElement>();

    function log(message: string) {
        state.messages.push(message);
    }
    const logEvent = (name: string) => () => log(name);

    const unsubscribe = model.subscribe(state, (events) => {
        for (const event of events) {
            state.messages.push(
                `state change: ${event.type}:${event.prop}=${event.value}`
            );
        }
    });

    onDestroy(() => {
        unsubscribe();
    });

    const onChange = () => {
        log(
            `on:change checked=${
                state.checked
            }->${!state.checked} -- setting checked=${!state.checked}, indeterminate=false`
        );
        state.checked = !state.checked;
        state.indeterminate = false;
    };

    return (
        <fieldset>
            <h2>input type="checkbox"</h2>
            <div class="target">
                <label>
                    <input
                        ref={inputRef}
                        type="checkbox"
                        checked={calc(() => state.checked)}
                        disabled={calc(() => state.disabled)}
                        indeterminate={calc(() => state.indeterminate)}
                        on:change={onChange}
                        on:input={logEvent('on:input')}
                        on:click={logEvent('on:click')}
                        on:focus={logEvent('on:focus')}
                        on:blur={logEvent('on:blur')}
                    />{' '}
                    Item
                </label>
            </div>
            <div class="buttons">
                <button
                    on:click={() => {
                        state.checked = !state.checked;
                    }}
                >
                    Toggle checked
                </button>
                <button
                    on:click={() => {
                        state.disabled = !state.disabled;
                    }}
                >
                    Toggle disabled
                </button>
                <button
                    on:click={() => {
                        state.indeterminate = !state.indeterminate;
                    }}
                >
                    Toggle indeterminate
                </button>
            </div>
            <Log messages={state.messages} />
        </fieldset>
    );
};

const Radio: Component<{}> = (props, { onDestroy }) => {
    const state = model({
        selected: 'one',
        disabledOne: false,
        disabledTwo: false,
        messages: collection<string>([]),
    });

    function log(message: string) {
        state.messages.push(message);
    }
    const logEvent = (name: string) => () => log(name);

    const unsubscribe = model.subscribe(state, (events) => {
        for (const event of events) {
            state.messages.push(
                `state change: ${event.type}:${event.prop}=${event.value}`
            );
        }
    });
    onDestroy(() => {
        unsubscribe();
    });

    const onChange = (e: Event) => {
        log(
            `on:change ${
                (e.target as HTMLInputElement).value
            } -- setting state.selected=${(e.target as HTMLInputElement).value}`
        );
        state.selected = (e.target as HTMLInputElement).value;
    };

    return (
        <fieldset>
            <h2>input type="radio"</h2>
            <div class="target">
                <label>
                    <input
                        type="radio"
                        name="radio-group"
                        value="one"
                        checked={calc(() => state.selected === 'one')}
                        disabled={calc(() => state.disabledOne)}
                        on:change={onChange}
                        on:input={logEvent('on:input one')}
                        on:click={logEvent('on:click one')}
                        on:focus={logEvent('on:focus one')}
                        on:blur={logEvent('on:blur one')}
                    />{' '}
                    One
                </label>
                <label>
                    <input
                        type="radio"
                        name="radio-group"
                        value="two"
                        checked={calc(() => state.selected === 'two')}
                        disabled={calc(() => state.disabledTwo)}
                        on:change={onChange}
                        on:input={logEvent('on:input two')}
                        on:click={logEvent('on:click two')}
                        on:focus={logEvent('on:focus two')}
                        on:blur={logEvent('on:blur two')}
                    />{' '}
                    Two
                </label>
            </div>
            <div class="buttons">
                <button
                    on:click={() => {
                        state.selected =
                            state.selected === 'one' ? 'two' : 'one';
                    }}
                >
                    Toggle choice
                </button>
                <button
                    on:click={() => {
                        state.disabledOne = !state.disabledOne;
                    }}
                >
                    Toggle One disabled
                </button>
                <button
                    on:click={() => {
                        state.disabledTwo = !state.disabledTwo;
                    }}
                >
                    Toggle Two disabled
                </button>
            </div>
            <Log messages={state.messages} />
        </fieldset>
    );
};

const ButtonLike: Component<{ inputType: 'button' | 'reset' | 'submit' }> = (
    { inputType },
    { onDestroy }
) => {
    const state = model({
        disabled: false,
        messages: collection<string>([]),
    });
    const inputRef = ref<HTMLInputElement>();

    function log(message: string) {
        state.messages.push(message);
    }
    const logEvent = (name: string) => () => log(name);

    const unsubscribe = model.subscribe(state, (events) => {
        for (const event of events) {
            state.messages.push(
                `state change: ${event.type}:${event.prop}=${event.value}`
            );
        }
    });
    onDestroy(() => {
        unsubscribe();
    });

    const onClick = () => {
        log(`on:click`);
    };

    return (
        <fieldset>
            <h2>input type="{inputType}"</h2>
            <div class="target">
                <input
                    ref={inputRef}
                    type="button"
                    value="Button"
                    disabled={calc(() => state.disabled)}
                    on:click={onClick}
                    on:input={logEvent('on:input')}
                    on:focus={logEvent('on:focus')}
                    on:blur={logEvent('on:blur')}
                />
            </div>
            <div class="buttons">
                <button
                    on:click={() => {
                        state.disabled = !state.disabled;
                    }}
                >
                    Toggle disabled
                </button>
            </div>
            <Log messages={state.messages} />
        </fieldset>
    );
};

const Color: Component<{}> = (props, { onDestroy }) => {
    const state = model({
        disabled: false,
        inputValue: '#FF0000',
        changeValue: '#FF0000',
        messages: collection<string>([]),
    });
    const inputRef = ref<HTMLInputElement>();

    function log(message: string) {
        state.messages.push(message);
    }
    const logEvent = (name: string) => () =>
        log(`${name} value=${inputRef.current?.value}`);

    const unsubscribe = model.subscribe(state, (events) => {
        for (const event of events) {
            state.messages.push(
                `state change: ${event.type}:${event.prop}=${event.value}`
            );
        }
    });
    onDestroy(() => {
        unsubscribe();
    });

    const onChange = () => {
        const newValue = inputRef.current?.value ?? 'unknown';
        log(`on:change -- setting changeValue=${newValue}`);
        state.changeValue = newValue;
    };
    const onInput = () => {
        const newValue = inputRef.current?.value ?? 'unknown';
        log(`on:input -- setting inputValue=${newValue}`);
        state.inputValue = newValue;
    };

    return (
        <fieldset>
            <h2>input type="color"</h2>
            <div class="target target--color">
                <input
                    ref={inputRef}
                    type="color"
                    value={calc(() => state.changeValue)}
                    disabled={calc(() => state.disabled)}
                    on:click={logEvent('on:click')}
                    on:change={onChange}
                    on:input={onInput}
                    on:focus={logEvent('on:focus')}
                    on:blur={logEvent('on:blur')}
                />
                <p>
                    on:input value:{' '}
                    <div
                        class="color-block"
                        style={calc(
                            () => `background-color: ${state.inputValue}`
                        )}
                    >
                        {calc(() => state.inputValue)}
                    </div>
                </p>
                <p>
                    on:change value:{' '}
                    <div
                        class="color-block"
                        style={calc(
                            () => `background-color: ${state.changeValue}`
                        )}
                    >
                        {calc(() => state.changeValue)}
                    </div>
                </p>
            </div>
            <div class="buttons">
                <button
                    on:click={() => {
                        state.disabled = !state.disabled;
                    }}
                >
                    Toggle disabled
                </button>
            </div>
            <Log messages={state.messages} />
        </fieldset>
    );
};

const TextLike: Component<{
    inputType:
        | 'date'
        | 'datetime-local'
        | 'email'
        | 'month'
        | 'number'
        | 'password'
        | 'search'
        | 'tel'
        | 'text'
        | 'time'
        | 'url'
        | 'week'
        | 'textarea';
}> = ({ inputType }, { onDestroy }) => {
    const state = model({
        disabled: false,
        readonly: false,
        value: 'Hello, world!',
        messages: collection<string>([]),
    });
    const inputRef: Ref<any> = ref();

    function log(message: string) {
        state.messages.push(message);
    }
    const logEvent = (name: string) => () =>
        log(`${name} value=${inputRef.current?.value}`);
    const logCompositionEvent = (name: string) => (e: CompositionEvent) =>
        log(`${name} value=${inputRef.current?.value}; data=${e.data}`);
    const logKeyEvent = (name: string) => (e: KeyboardEvent) =>
        log(
            `${name} key=${e.key}; code=${e.code}; repeat=${e.repeat}; shiftKey=${e.shiftKey}; metaKey=${e.metaKey}; ctrlKey=${e.ctrlKey}; altKey=${e.altKey}; isComposing=${e.isComposing}`
        );

    const unsubscribe = model.subscribe(state, (events) => {
        for (const event of events) {
            state.messages.push(
                `state change: ${event.type}:${event.prop}=${event.value}`
            );
        }
    });
    onDestroy(() => {
        unsubscribe();
    });

    const onChange = () => {
        const newValue = inputRef.current?.value ?? 'unknown';
        log(`on:change -- setting value=${newValue}`);
        state.value = newValue;
    };

    const ElementType = inputType === 'textarea' ? 'textarea' : 'input';
    const typeProps = inputType === 'textarea' ? {} : { type: inputType };

    return (
        <fieldset>
            <h2>
                {inputType === 'textarea' ? (
                    'textarea'
                ) : (
                    <>input type="{inputType}"</>
                )}
            </h2>
            <div class="target">
                <ElementType
                    ref={inputRef}
                    {...typeProps}
                    value={calc(() => state.value)}
                    disabled={calc(() => state.disabled)}
                    readonly={calc(() => state.readonly)}
                    on:click={logEvent('on:click')}
                    on:change={onChange}
                    on:input={logEvent('on:input')}
                    on:focus={logEvent('on:focus')}
                    on:blur={logEvent('on:blur')}
                    on:keydown={logKeyEvent('on:keydown')}
                    on:keyup={logKeyEvent('on:keyup')}
                    on:compositionstart={logCompositionEvent(
                        'on:compositionstart'
                    )}
                    on:compositionend={logCompositionEvent('on:compositionend')}
                    on:compositionupdate={logCompositionEvent(
                        'on:compositionupdate'
                    )}
                />
            </div>
            <div class="buttons">
                <button
                    on:click={() => {
                        state.disabled = !state.disabled;
                    }}
                >
                    Toggle disabled
                </button>
                <button
                    on:click={() => {
                        state.readonly = !state.readonly;
                    }}
                >
                    Toggle readonly
                </button>
                <button
                    on:click={() => {
                        state.value = 'Reset';
                    }}
                >
                    Set to "Reset"
                </button>
            </div>
            <Log messages={state.messages} />
        </fieldset>
    );
};

const Range: Component<{}> = (props, { onDestroy }) => {
    const state = model({
        disabled: false,
        value: '50',
        messages: collection<string>([]),
    });
    const inputRef = ref<HTMLInputElement>();

    function log(message: string) {
        state.messages.push(message);
    }
    const logEvent = (name: string) => () =>
        log(`${name} value=${inputRef.current?.value}`);

    const unsubscribe = model.subscribe(state, (events) => {
        for (const event of events) {
            state.messages.push(
                `state change: ${event.type}:${event.prop}=${event.value}`
            );
        }
    });
    onDestroy(() => {
        unsubscribe();
    });

    const onChange = () => {
        const newValue = inputRef.current?.value ?? '0';
        log(`on:change -- setting value=${newValue}`);
        state.value = newValue;
    };

    return (
        <fieldset>
            <h2>input type="range"</h2>
            <div class="target">
                <input
                    ref={inputRef}
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={calc(() => state.value)}
                    disabled={calc(() => state.disabled)}
                    on:click={logEvent('on:click')}
                    on:change={onChange}
                    on:input={logEvent('on:input')}
                    on:focus={logEvent('on:focus')}
                    on:blur={logEvent('on:blur')}
                />
            </div>
            <div class="buttons">
                <button
                    on:click={() => {
                        state.disabled = !state.disabled;
                    }}
                >
                    Toggle disabled
                </button>
                <button
                    on:click={() => {
                        state.value = '50';
                    }}
                >
                    Set to 50
                </button>
            </div>
            <Log messages={state.messages} />
        </fieldset>
    );
};

const Select: Component<{}> = (props, { onDestroy }) => {
    // Note: this is a poor implementation of a controlled select
    const state = model({
        disabled: false,
        multiple: false,
        value: 'c',
        optionDisabled: model({
            a: false,
            b: false,
            c: false,
            d: false,
            e: false,
        }),
        optionSelected: model({
            a: false,
            b: false,
            c: true,
            d: false,
            e: false,
        }),
        messages: collection<string>([]),
    });
    const inputRef = ref<HTMLSelectElement>();

    function log(message: string) {
        state.messages.push(message);
    }
    const logEvent = (name: string) => () =>
        log(`${name} value=${inputRef.current?.value}`);

    const unsubscribe = model.subscribe(state, (events) => {
        for (const event of events) {
            state.messages.push(
                `state change: ${event.type}:${event.prop}=${event.value}`
            );
        }
    });
    onDestroy(() => {
        unsubscribe();
    });

    function onChange() {
        if (!inputRef.current) return;
        log('on:change -- setting state');
        if (state.multiple) {
            state.value = inputRef.current.selectedOptions[0]
                ? inputRef.current.selectedOptions[0].value
                : '';
            state.optionSelected.a = inputRef.current.options[0].selected;
            state.optionSelected.b = inputRef.current.options[1].selected;
            state.optionSelected.c = inputRef.current.options[2].selected;
            state.optionSelected.d = inputRef.current.options[3].selected;
            state.optionSelected.e = inputRef.current.options[4].selected;
        } else {
            state.value = inputRef.current.value;
            state.optionSelected.a = inputRef.current.value === 'a';
            state.optionSelected.b = inputRef.current.value === 'b';
            state.optionSelected.c = inputRef.current.value === 'c';
            state.optionSelected.d = inputRef.current.value === 'd';
            state.optionSelected.e = inputRef.current.value === 'e';
        }
    }

    return (
        <fieldset>
            <h2>select</h2>
            <div class="target">
                <select
                    ref={inputRef}
                    value={calc(() => state.value)}
                    disabled={calc(() => state.disabled)}
                    multiple={calc(() => state.multiple)}
                    size={calc(() => (state.multiple ? 5 : undefined))}
                    on:click={logEvent('on:click select')}
                    on:change={onChange}
                    on:input={logEvent('on:input select')}
                    on:focus={logEvent('on:focus select')}
                    on:blur={logEvent('on:blur select')}
                >
                    {(['a', 'b', 'c', 'd', 'e'] as const).map((item) => (
                        <option
                            disabled={calc(() => state.optionDisabled[item])}
                            selected={calc(() =>
                                state.multiple
                                    ? state.optionSelected[item]
                                    : state.value === item
                            )}
                            on:click={logEvent(`on:click option ${item}`)}
                            on:change={logEvent(`on:change option ${item}`)}
                            on:input={logEvent(`on:input option ${item}`)}
                            on:focus={logEvent(`on:focus option ${item}`)}
                            on:blur={logEvent(`on:blur option ${item}`)}
                            value={item}
                        >
                            Option {item}
                        </option>
                    ))}
                </select>
            </div>
            <div class="buttons">
                <button
                    on:click={() => {
                        state.disabled = !state.disabled;
                    }}
                >
                    Toggle select disabled
                </button>
                <button
                    on:click={() => {
                        state.multiple = !state.multiple;
                    }}
                >
                    Toggle select multiple
                </button>
                <button
                    disabled={calc(() => state.multiple)}
                    on:click={() => {
                        state.value = 'c';
                    }}
                >
                    Set to option c
                </button>
            </div>
            <div class="buttons">
                Toggle disabled:{' '}
                {(['a', 'b', 'c', 'd', 'e'] as const).map((item) => (
                    <button
                        on:click={() => {
                            state.optionDisabled[item] =
                                !state.optionDisabled[item];
                        }}
                    >
                        Option {item}
                    </button>
                ))}
            </div>
            <div class="buttons">
                Toggle selected:{' '}
                {(['a', 'b', 'c', 'd', 'e'] as const).map((item) => (
                    <button
                        disabled={calc(() => !state.multiple)}
                        on:click={() => {
                            state.optionSelected[item] =
                                !state.optionSelected[item];
                            if (!inputRef.current) return;
                            if (state.optionSelected.a) state.value = 'a';
                            else if (state.optionSelected.b) state.value = 'b';
                            else if (state.optionSelected.c) state.value = 'c';
                            else if (state.optionSelected.d) state.value = 'd';
                            else if (state.optionSelected.e) state.value = 'e';
                            else state.value = '';
                        }}
                    >
                        Option {item}
                    </button>
                ))}
            </div>
            <Log messages={state.messages} />
        </fieldset>
    );
};

const Details: Component<{}> = (props, { onDestroy }) => {
    const state = model({
        open: false,
        disabled: false,
        messages: collection<string>([]),
    });
    const detailsRef = ref<HTMLDetailsElement>();

    function log(message: string) {
        state.messages.push(message);
    }
    const logEvent = (name: string) => () =>
        log(`${name} open=${detailsRef.current?.open}`);

    const onClickToggle = () => {
        state.open = !state.open;
    };

    const unsubscribe = model.subscribe(state, (events) => {
        for (const event of events) {
            state.messages.push(
                `state change: ${event.type}:${event.prop}=${event.value}`
            );
        }
    });
    onDestroy(() => {
        unsubscribe();
    });

    return (
        <fieldset>
            <h2>details/summary</h2>
            <div class="target">
                <details
                    ref={detailsRef}
                    open={calc(() => state.open)}
                    on:toggle={logEvent('on:toggle details')}
                    on:click={logEvent('on:click details')}
                    on:change={logEvent('on:change details')}
                    on:input={logEvent('on:input details')}
                    on:focus={logEvent('on:focus details')}
                    on:blur={logEvent('on:blur details')}
                >
                    <summary
                        on:toggle={logEvent('on:toggle summary')}
                        on:click={(e) => {
                            e.preventDefault();
                            state.open = !state.open;
                            logEvent('on:click summary')();
                        }}
                        on:change={logEvent('on:change summary')}
                        on:input={logEvent('on:input summary')}
                        on:focus={logEvent('on:focus summary')}
                        on:blur={logEvent('on:blur summary')}
                    >
                        The summary
                    </summary>
                    The details
                </details>
            </div>
            <div class="buttons">
                <button on:click={onClickToggle}>Toggle open</button>
            </div>
            <Log messages={state.messages} />
        </fieldset>
    );
};

mount(
    document.body,
    <div>
        {(['button', 'reset', 'submit'] as const).map((inputType) => (
            <ButtonLike inputType={inputType} />
        ))}
        <Checkbox />
        <Radio />
        {(
            [
                'date',
                'datetime-local',
                'email',
                'month',
                'number',
                'password',
                'search',
                'tel',
                'text',
                'time',
                'url',
                'week',
                'textarea',
            ] as const
        ).map((inputType) => (
            <TextLike inputType={inputType} />
        ))}
        <Color />
        <Range />
        <Select />
        <Details />
    </div>
);
