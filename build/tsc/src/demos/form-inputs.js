import Revise, { Fragment, ref, mount, model, collection, calc, } from '../index';
const Log = ({ messages }, { onEffect }) => {
    const logRef = ref();
    onEffect(() => {
        if (logRef.current && messages.length > 0) {
            logRef.current.scrollTop = logRef.current.scrollHeight;
        }
    });
    return (Revise("pre", { class: "log", ref: logRef }, messages.mapView((message) => (Revise("div", null,
        new Date().toISOString().split('T')[1].slice(0, -1),
        ":",
        ' ',
        message)))));
};
const Checkbox = (props, { onEffect }) => {
    const state = model({
        checked: false,
        disabled: false,
        indeterminate: false,
        messages: collection([]),
    });
    const inputRef = ref();
    function log(message) {
        state.messages.push(message);
    }
    const logEvent = (name) => () => log(name);
    onEffect(() => {
        state.messages.push(`state change: checked=${state.checked}, disabled=${state.disabled}, indeterminate=${state.indeterminate}`);
    });
    const onChange = () => {
        log(`on:change checked=${state.checked}->${!state.checked} -- setting checked=${!state.checked}, indeterminate=false`);
        state.checked = !state.checked;
        state.indeterminate = false;
    };
    return (Revise("fieldset", null,
        Revise("h2", null, "input type=\"checkbox\""),
        Revise("div", { class: "target" },
            Revise("label", null,
                Revise("input", { ref: inputRef, type: "checkbox", checked: calc(() => state.checked), disabled: calc(() => state.disabled), indeterminate: calc(() => state.indeterminate), "on:change": onChange, "on:input": logEvent('on:input'), "on:click": logEvent('on:click'), "on:focus": logEvent('on:focus'), "on:blur": logEvent('on:blur') }),
                ' ',
                "Item")),
        Revise("div", { class: "buttons" },
            Revise("button", { "on:click": () => {
                    state.checked = !state.checked;
                } }, "Toggle checked"),
            Revise("button", { "on:click": () => {
                    state.disabled = !state.disabled;
                } }, "Toggle disabled"),
            Revise("button", { "on:click": () => {
                    state.indeterminate = !state.indeterminate;
                } }, "Toggle indeterminate")),
        Revise(Log, { messages: state.messages })));
};
const Radio = (props, { onEffect }) => {
    const state = model({
        selected: 'one',
        disabledOne: false,
        disabledTwo: false,
        messages: collection([]),
    });
    function log(message) {
        state.messages.push(message);
    }
    const logEvent = (name) => () => log(name);
    onEffect(() => {
        state.messages.push(`state change: selected=${state.selected}, disabledOne=${state.disabledOne}, disabledTwo=${state.disabledTwo}`);
    });
    const onChange = (e) => {
        log(`on:change ${e.target.value} -- setting state.selected=${e.target.value}`);
        state.selected = e.target.value;
    };
    return (Revise("fieldset", null,
        Revise("h2", null, "input type=\"radio\""),
        Revise("div", { class: "target" },
            Revise("label", null,
                Revise("input", { type: "radio", name: "radio-group", value: "one", checked: calc(() => state.selected === 'one'), disabled: calc(() => state.disabledOne), "on:change": onChange, "on:input": logEvent('on:input one'), "on:click": logEvent('on:click one'), "on:focus": logEvent('on:focus one'), "on:blur": logEvent('on:blur one') }),
                ' ',
                "One"),
            Revise("label", null,
                Revise("input", { type: "radio", name: "radio-group", value: "two", checked: calc(() => state.selected === 'two'), disabled: calc(() => state.disabledTwo), "on:change": onChange, "on:input": logEvent('on:input two'), "on:click": logEvent('on:click two'), "on:focus": logEvent('on:focus two'), "on:blur": logEvent('on:blur two') }),
                ' ',
                "Two")),
        Revise("div", { class: "buttons" },
            Revise("button", { "on:click": () => {
                    state.selected =
                        state.selected === 'one' ? 'two' : 'one';
                } }, "Toggle choice"),
            Revise("button", { "on:click": () => {
                    state.disabledOne = !state.disabledOne;
                } }, "Toggle One disabled"),
            Revise("button", { "on:click": () => {
                    state.disabledTwo = !state.disabledTwo;
                } }, "Toggle Two disabled")),
        Revise(Log, { messages: state.messages })));
};
const ButtonLike = ({ inputType }, { onEffect }) => {
    const state = model({
        disabled: false,
        messages: collection([]),
    });
    const inputRef = ref();
    function log(message) {
        state.messages.push(message);
    }
    const logEvent = (name) => () => log(name);
    onEffect(() => {
        state.messages.push(`state change: disabled=${state.disabled}`);
    });
    const onClick = () => {
        log(`on:click`);
    };
    return (Revise("fieldset", null,
        Revise("h2", null,
            "input type=\"",
            inputType,
            "\""),
        Revise("div", { class: "target" },
            Revise("input", { ref: inputRef, type: "button", value: "Button", disabled: calc(() => state.disabled), "on:click": onClick, "on:input": logEvent('on:input'), "on:focus": logEvent('on:focus'), "on:blur": logEvent('on:blur') })),
        Revise("div", { class: "buttons" },
            Revise("button", { "on:click": () => {
                    state.disabled = !state.disabled;
                } }, "Toggle disabled")),
        Revise(Log, { messages: state.messages })));
};
const Color = (props, { onEffect }) => {
    const state = model({
        disabled: false,
        inputValue: '#FF0000',
        changeValue: '#FF0000',
        messages: collection([]),
    });
    const inputRef = ref();
    function log(message) {
        state.messages.push(message);
    }
    const logEvent = (name) => () => { var _a; return log(`${name} value=${(_a = inputRef.current) === null || _a === void 0 ? void 0 : _a.value}`); };
    onEffect(() => {
        state.messages.push(`state change: disabled=${state.disabled}`);
    });
    const onChange = () => {
        var _a, _b;
        const newValue = (_b = (_a = inputRef.current) === null || _a === void 0 ? void 0 : _a.value) !== null && _b !== void 0 ? _b : 'unknown';
        log(`on:change -- setting changeValue=${newValue}`);
        state.changeValue = newValue;
    };
    const onInput = () => {
        var _a, _b;
        const newValue = (_b = (_a = inputRef.current) === null || _a === void 0 ? void 0 : _a.value) !== null && _b !== void 0 ? _b : 'unknown';
        log(`on:input -- setting inputValue=${newValue}`);
        state.inputValue = newValue;
    };
    return (Revise("fieldset", null,
        Revise("h2", null, "input type=\"color\""),
        Revise("div", { class: "target target--color" },
            Revise("input", { ref: inputRef, type: "color", value: calc(() => state.changeValue), disabled: calc(() => state.disabled), "on:click": logEvent('on:click'), "on:change": onChange, "on:input": onInput, "on:focus": logEvent('on:focus'), "on:blur": logEvent('on:blur') }),
            Revise("p", null,
                "on:input value:",
                ' ',
                Revise("div", { class: "color-block", style: calc(() => `background-color: ${state.inputValue}`) }, calc(() => state.inputValue))),
            Revise("p", null,
                "on:change value:",
                ' ',
                Revise("div", { class: "color-block", style: calc(() => `background-color: ${state.changeValue}`) }, calc(() => state.changeValue)))),
        Revise("div", { class: "buttons" },
            Revise("button", { "on:click": () => {
                    state.disabled = !state.disabled;
                } }, "Toggle disabled")),
        Revise(Log, { messages: state.messages })));
};
const TextLike = ({ inputType }, { onEffect }) => {
    const state = model({
        disabled: false,
        readonly: false,
        value: 'Hello, world!',
        messages: collection([]),
    });
    const inputRef = ref();
    function log(message) {
        state.messages.push(message);
    }
    const logEvent = (name) => () => { var _a; return log(`${name} value=${(_a = inputRef.current) === null || _a === void 0 ? void 0 : _a.value}`); };
    const logCompositionEvent = (name) => (e) => { var _a; return log(`${name} value=${(_a = inputRef.current) === null || _a === void 0 ? void 0 : _a.value}; data=${e.data}`); };
    const logKeyEvent = (name) => (e) => log(`${name} key=${e.key}; code=${e.code}; repeat=${e.repeat}; shiftKey=${e.shiftKey}; metaKey=${e.metaKey}; ctrlKey=${e.ctrlKey}; altKey=${e.altKey}; isComposing=${e.isComposing}`);
    onEffect(() => {
        state.messages.push(`state change: disabled=${state.disabled}`);
    });
    const onChange = () => {
        var _a, _b;
        const newValue = (_b = (_a = inputRef.current) === null || _a === void 0 ? void 0 : _a.value) !== null && _b !== void 0 ? _b : 'unknown';
        log(`on:change -- setting value=${newValue}`);
        state.value = newValue;
    };
    const ElementType = inputType === 'textarea' ? 'textarea' : 'input';
    return (Revise("fieldset", null,
        Revise("h2", null, inputType === 'textarea' ? ('textarea') : (Revise(Fragment, null,
            "input type=\"",
            inputType,
            "\""))),
        Revise("div", { class: "target" },
            Revise(ElementType, { ref: inputRef, type: inputType, value: calc(() => state.value), disabled: calc(() => state.disabled), readonly: calc(() => state.readonly), "on:click": logEvent('on:click'), "on:change": onChange, "on:input": logEvent('on:input'), "on:focus": logEvent('on:focus'), "on:blur": logEvent('on:blur'), "on:keydown": logKeyEvent('on:keydown'), "on:keyup": logKeyEvent('on:keyup'), "on:compositionstart": logCompositionEvent('on:compositionstart'), "on:compositionend": logCompositionEvent('on:compositionend'), "on:compositionupdate": logCompositionEvent('on:compositionupdate') })),
        Revise("div", { class: "buttons" },
            Revise("button", { "on:click": () => {
                    state.disabled = !state.disabled;
                } }, "Toggle disabled"),
            Revise("button", { "on:click": () => {
                    state.readonly = !state.readonly;
                } }, "Toggle readonly"),
            Revise("button", { "on:click": () => {
                    state.value = 'Reset';
                } }, "Set to \"Reset\"")),
        Revise(Log, { messages: state.messages })));
};
const Range = (props, { onEffect }) => {
    const state = model({
        disabled: false,
        value: '50',
        messages: collection([]),
    });
    const inputRef = ref();
    function log(message) {
        state.messages.push(message);
    }
    const logEvent = (name) => () => { var _a; return log(`${name} value=${(_a = inputRef.current) === null || _a === void 0 ? void 0 : _a.value}`); };
    onEffect(() => {
        state.messages.push(`state change: disabled=${state.disabled}`);
    });
    const onChange = () => {
        var _a, _b;
        const newValue = (_b = (_a = inputRef.current) === null || _a === void 0 ? void 0 : _a.value) !== null && _b !== void 0 ? _b : '0';
        log(`on:change -- setting value=${newValue}`);
        state.value = newValue;
    };
    return (Revise("fieldset", null,
        Revise("h2", null, "input type=\"range\""),
        Revise("div", { class: "target" },
            Revise("input", { ref: inputRef, type: "range", min: 0, max: 100, step: 5, value: calc(() => state.value), disabled: calc(() => state.disabled), "on:click": logEvent('on:click'), "on:change": onChange, "on:input": logEvent('on:input'), "on:focus": logEvent('on:focus'), "on:blur": logEvent('on:blur') })),
        Revise("div", { class: "buttons" },
            Revise("button", { "on:click": () => {
                    state.disabled = !state.disabled;
                } }, "Toggle disabled"),
            Revise("button", { "on:click": () => {
                    state.value = '50';
                } }, "Set to 50")),
        Revise(Log, { messages: state.messages })));
};
const Select = (props, { onEffect }) => {
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
        messages: collection([]),
    });
    const inputRef = ref();
    function log(message) {
        state.messages.push(message);
    }
    const logEvent = (name) => () => { var _a; return log(`${name} value=${(_a = inputRef.current) === null || _a === void 0 ? void 0 : _a.value}`); };
    onEffect(() => {
        state.messages.push(`state change: disabled=${state.disabled}`);
    });
    function onChange() {
        if (!inputRef.current)
            return;
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
        }
        else {
            state.value = inputRef.current.value;
            state.optionSelected.a = inputRef.current.value === 'a';
            state.optionSelected.b = inputRef.current.value === 'b';
            state.optionSelected.c = inputRef.current.value === 'c';
            state.optionSelected.d = inputRef.current.value === 'd';
            state.optionSelected.e = inputRef.current.value === 'e';
        }
    }
    return (Revise("fieldset", null,
        Revise("h2", null, "select"),
        Revise("div", { class: "target" },
            Revise("select", { ref: inputRef, value: calc(() => state.value), disabled: calc(() => state.disabled), multiple: calc(() => state.multiple), size: calc(() => (state.multiple ? 5 : undefined)), "on:click": logEvent('on:click select'), "on:change": onChange, "on:input": logEvent('on:input select'), "on:focus": logEvent('on:focus select'), "on:blur": logEvent('on:blur select') }, ['a', 'b', 'c', 'd', 'e'].map((item) => (Revise("option", { disabled: calc(() => state.optionDisabled[item]), selected: calc(() => state.multiple
                    ? state.optionSelected[item]
                    : state.value === item), "on:click": logEvent(`on:click option ${item}`), "on:change": logEvent(`on:change option ${item}`), "on:input": logEvent(`on:input option ${item}`), "on:focus": logEvent(`on:focus option ${item}`), "on:blur": logEvent(`on:blur option ${item}`), value: item },
                "Option ",
                item))))),
        Revise("div", { class: "buttons" },
            Revise("button", { "on:click": () => {
                    state.disabled = !state.disabled;
                } }, "Toggle select disabled"),
            Revise("button", { "on:click": () => {
                    state.multiple = !state.multiple;
                } }, "Toggle select multiple"),
            Revise("button", { disabled: calc(() => state.multiple), "on:click": () => {
                    state.value = 'c';
                } }, "Set to option c")),
        Revise("div", { class: "buttons" },
            "Toggle disabled:",
            ' ',
            ['a', 'b', 'c', 'd', 'e'].map((item) => (Revise("button", { "on:click": () => {
                    state.optionDisabled[item] =
                        !state.optionDisabled[item];
                } },
                "Option ",
                item)))),
        Revise("div", { class: "buttons" },
            "Toggle selected:",
            ' ',
            ['a', 'b', 'c', 'd', 'e'].map((item) => (Revise("button", { disabled: calc(() => !state.multiple), "on:click": () => {
                    state.optionSelected[item] =
                        !state.optionSelected[item];
                    if (!inputRef.current)
                        return;
                    if (state.optionSelected.a)
                        state.value = 'a';
                    else if (state.optionSelected.b)
                        state.value = 'b';
                    else if (state.optionSelected.c)
                        state.value = 'c';
                    else if (state.optionSelected.d)
                        state.value = 'd';
                    else if (state.optionSelected.e)
                        state.value = 'e';
                    else
                        state.value = '';
                } },
                "Option ",
                item)))),
        Revise(Log, { messages: state.messages })));
};
const Details = (props, { onEffect }) => {
    const state = model({
        open: false,
        disabled: false,
        messages: collection([]),
    });
    const detailsRef = ref();
    function log(message) {
        state.messages.push(message);
    }
    const logEvent = (name) => () => { var _a; return log(`${name} open=${(_a = detailsRef.current) === null || _a === void 0 ? void 0 : _a.open}`); };
    const onClickToggle = () => {
        state.open = !state.open;
    };
    return (Revise("fieldset", null,
        Revise("h2", null, "select"),
        Revise("div", { class: "target" },
            Revise("details", { ref: detailsRef, open: calc(() => state.open), "on:toggle": logEvent('on:toggle details'), "on:click": logEvent('on:click details'), "on:change": logEvent('on:change details'), "on:input": logEvent('on:input details'), "on:focus": logEvent('on:focus details'), "on:blur": logEvent('on:blur details') },
                Revise("summary", { "on:toggle": logEvent('on:toggle summary'), "on:click": (e) => {
                        e.preventDefault();
                        state.open = !state.open;
                        logEvent('on:click summary')();
                    }, "on:change": logEvent('on:change summary'), "on:input": logEvent('on:input summary'), "on:focus": logEvent('on:focus summary'), "on:blur": logEvent('on:blur summary') }, "The summary"),
                "The details")),
        Revise("div", { class: "buttons" },
            Revise("button", { "on:click": onClickToggle }, "Toggle open")),
        Revise(Log, { messages: state.messages })));
};
mount(document.body, Revise("div", null,
    ['button', 'reset', 'submit'].map((inputType) => (Revise(ButtonLike, { inputType: inputType }))),
    Revise(Checkbox, null),
    Revise(Radio, null),
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
    ].map((inputType) => (Revise(TextLike, { inputType: inputType }))),
    Revise(Color, null),
    Revise(Range, null),
    Revise(Select, null),
    Revise(Details, null)));
//# sourceMappingURL=form-inputs.js.map