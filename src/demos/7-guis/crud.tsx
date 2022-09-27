import Gooey, {
    Component,
    calc,
    collection,
    model,
    Model,
    field,
    Field,
} from '../..';

type Item = Model<{
    id: number;
    name: string;
    surname: string;
}>;

let nextTextInputId = 1;

interface TextInputProps {
    label: JSX.Node;
    field: Field<string>;
}

const TextInput: Component<TextInputProps> = ({ label, field }) => {
    const id = `textinput_${nextTextInputId++}`;
    return (
        <>
            <label for={id}>{label}</label>
            <input
                id={id}
                type="text"
                value={calc(() => field.get())}
                on:input={(e, el) => {
                    field.set(el.value);
                }}
            />
        </>
    );
};

export const CRUD: Component = () => {
    const filter = field('', 'filter');
    const name = field('', 'name');
    const surname = field('', 'surname');
    const selected = field<null | Item>(null, 'selected');

    let nextId = 0;
    const items = collection<Item>([]);

    const addItem = (itemName: string, itemSurname: string) => {
        items.push(
            model({
                id: nextId++,
                name: itemName,
                surname: itemSurname,
            })
        );
    };
    // Some starting point items
    addItem('Agatha', 'Christie');
    addItem('Barbara', 'Cartland');
    addItem('Danielle', 'Steel');

    const isVisible = (item: Item) =>
        item.surname.toLowerCase().startsWith(filter.get().toLowerCase());

    const onCreate = () => {
        addItem(name.get(), surname.get());
    };
    const onUpdate = () => {
        const item = selected.get();
        if (!item) return;
        item.name = name.get();
        item.surname = surname.get();
    };
    const onDelete = () => {
        const item = selected.get();
        if (!item) return;
        items.reject((otherItem) => item === otherItem);
        selected.set(null);
    };

    return (
        <div class="p col">
            <div class="row grow stretch">
                <div class="col stretch grow">
                    <div class="grid-labels stretch">
                        <TextInput label="Filter prefix:" field={filter} />
                    </div>
                    <select
                        class="stretch grow"
                        size={calc(() => Math.min(3, items.length))}
                        on:input={(e, el) => {
                            const filteredItems = items.filter((item) =>
                                isVisible(item)
                            );
                            const index = el.selectedIndex;
                            const item =
                                index >= 0 && index < filteredItems.length
                                    ? filteredItems[index]
                                    : null;
                            selected.set(item);
                            name.set(item?.name ?? '');
                            surname.set(item?.surname ?? '');
                        }}
                    >
                        {items.mapView((item) =>
                            calc(
                                () =>
                                    isVisible(item) && (
                                        <option
                                            selected={calc(
                                                () => item === selected.get()
                                            )}
                                        >
                                            {calc(() => item.surname)},{' '}
                                            {calc(() => item.name)}
                                        </option>
                                    )
                            )
                        )}
                    </select>
                </div>
                <div class="grid-labels">
                    <TextInput label="Name:" field={name} />
                    <TextInput label="Surname:" field={surname} />
                </div>
            </div>
            <div class="row">
                <button on:click={onCreate}>Create</button>
                <button
                    disabled={calc(() => {
                        const item = selected.get();
                        return !item || !isVisible(item);
                    })}
                    on:click={onUpdate}
                >
                    Update
                </button>
                <button
                    disabled={calc(() => {
                        const item = selected.get();
                        return !item || !isVisible(item);
                    })}
                    on:click={onDelete}
                >
                    Delete
                </button>
            </div>
        </div>
    );
};
