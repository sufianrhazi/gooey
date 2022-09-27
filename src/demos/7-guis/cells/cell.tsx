import Gooey, {
    Component,
    Calculation,
    field,
    calc,
    flush,
    ref,
    Ref,
} from '../../..';
import { EvalResult } from './spreadsheet-state';
import { Position, positionToString } from './utils';
import './cells.css';

export interface CellApi {
    edit: () => void;
    focus: () => void;
}
export const Cell: Component<{
    position: Position;
    isActive: Calculation<boolean>;
    onClick: (e: MouseEvent) => void;
    rawContent: Calculation<string>;
    evalContent: Calculation<EvalResult>;
    onContentChange: (newContent: string) => void;
    api: Ref<CellApi>;
}> = ({
    position,
    isActive,
    onClick,
    rawContent,
    evalContent,
    onContentChange,
    api,
}) => {
    const inputEl = ref<HTMLInputElement>();
    const isEditing = field(false, 'isEditing');
    const cellRef = ref<HTMLTableCellElement>();

    api.current = {
        edit: () => {
            isEditing.set(true);
            flush();
            inputEl.current?.focus();
        },
        focus: () => {
            cellRef.current?.focus();
            cellRef.current?.scrollIntoView({
                behavior: 'smooth',
                block: 'nearest',
                inline: 'nearest',
            });
        },
    };

    return (
        <td
            ref={cellRef}
            class={calc(() =>
                ['cell', isActive() ? 'cell--active' : ''].join(' ')
            )}
            tabindex={calc(() => (isActive() ? 0 : -1))}
            id={positionToString(position)}
            on:click={(e, tdEl) => {
                if (e.target === tdEl) {
                    onClick(e);
                }
            }}
            on:dblclick={() => api.current?.edit()}
        >
            {calc(() => {
                if (isEditing.get()) {
                    return (
                        <input
                            class="cell_input"
                            ref={inputEl}
                            type="text"
                            value={rawContent}
                            on:input={(e, el) => onContentChange(el.value)}
                            on:blur={() => {
                                isEditing.set(false);
                            }}
                            on:keydown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    isEditing.set(false);
                                    cellRef.current?.focus();
                                }
                                if (e.key === 'Tab') {
                                    isEditing.set(false);
                                    cellRef.current?.focus();
                                    return; // Allow Tab to be handled by table
                                }
                                e.stopPropagation();
                            }}
                        />
                    );
                }
                const result = evalContent();
                if (result.ok) return result.value;
                return (
                    <div class="cell__error">
                        {result.isCycle ? (
                            '!CYCLE!'
                        ) : (
                            <>
                                !ERR!
                                <div class="cell__error_detail">
                                    An exception was thrown:{' '}
                                    {result.error.message}
                                </div>
                            </>
                        )}
                    </div>
                );
            })}
        </td>
    );
};
