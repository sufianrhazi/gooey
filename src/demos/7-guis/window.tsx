import Gooey, { model, calc, ref, Component } from '../..';
import './window.css';

export interface WindowPosition {
    x: number;
    y: number;
}

interface State {
    isSized: boolean;
    top: null | number;
    left: null | number;
    width: number;
    height: number;
}

export const Window: Component<{
    children: JSX.Node;
    name: string;
    onClose?: () => void;
    startPosition?: WindowPosition | undefined;
    onMove?: (position: WindowPosition) => void;
    minWidth?: number;
    minHeight?: number;
}> = (
    { children, name, onClose, startPosition, onMove, minWidth, minHeight },
    { onMount }
) => {
    const windowRef = ref<HTMLDivElement>();
    const contentEl = ref<HTMLDivElement>();
    const state = model<State>({
        isSized: false,
        top: null,
        left: null,
        width: 0,
        height: 0,
    });

    let anchor = 0;
    let anchorX = 0;
    let anchorY = 0;
    let isDragging = false;
    const startDrag = (locationAnchor: number) => (e: MouseEvent) => {
        anchor = locationAnchor;
        anchorX = e.clientX;
        anchorY = e.clientY;
        isDragging = true;
        e.preventDefault();
    };

    const onMouseMove = (e: MouseEvent) => {
        if (isDragging === false) return;
        e.preventDefault();
        let dx = e.clientX - anchorX;
        let dy = e.clientY - anchorY;
        anchorX = e.clientX;
        anchorY = e.clientY;
        let left = state.left ?? 0;
        let top = state.top ?? 0;
        // Anchor point map: (0) is window title; (5) is window content
        //   1 2 3
        //   4 0 6
        //   4 5 6
        //   7 8 9
        if (anchor === 4 || anchor === 6) dy = 0;
        if (anchor === 2 || anchor === 8) dx = 0;

        if (anchor === 0) {
            left += dx;
        } else if (anchor === 1 || anchor === 4 || anchor === 7) {
            left += dx;
            state.width -= dx;
        } else {
            state.width += dx;
        }

        if (anchor === 0) {
            top += dy;
        } else if (anchor === 1 || anchor === 2 || anchor === 3) {
            top += dy;
            state.height -= dy;
        } else {
            state.height += dy;
        }

        state.left = left;
        state.top = top;

        onMove?.({ x: left, y: top });
    };

    const onMoveEnd = (e: MouseEvent) => {
        if (isDragging === false) return;
        e.preventDefault();
        isDragging = false;
    };

    onMount(() => {
        document.documentElement.addEventListener('mousemove', onMouseMove);
        document.documentElement.addEventListener('mouseup', onMoveEnd);

        const size = windowRef.current?.getBoundingClientRect();
        if (size) {
            state.isSized = true;
            const maxWidth = window.innerWidth * 0.8;
            const maxHeight = window.innerHeight * 0.8;
            const width = Math.min(size.width, maxWidth);
            const height = Math.min(size.height, maxHeight);
            state.top = startPosition?.y ?? (window.innerHeight - height) / 2;
            state.left = startPosition?.x ?? (window.innerWidth - width) / 2;
            state.width = width;
            state.height = height;
        }

        return () => {
            state.isSized = false;
            document.documentElement.removeEventListener(
                'mousemove',
                onMouseMove
            );
            document.documentElement.removeEventListener('mouseup', onMoveEnd);
        };
    });

    return (
        <>
            <style>{`
    `}</style>
            <div
                ref={windowRef}
                class="window"
                style={calc(() =>
                    state.isSized
                        ? `position: fixed; top: ${state.top}px; left: ${
                              state.left
                          }px; width: ${Math.max(
                              state.width
                          )}px; height: ${Math.max(state.height)}px`
                        : 'width: max-content; height: max-content;'
                )}
            >
                <div class="resize_border nw" on:mousedown={startDrag(1)} />
                <div class="resize_border nn" on:mousedown={startDrag(2)} />
                <div class="resize_border ne" on:mousedown={startDrag(3)} />
                <div class="resize_border ww" on:mousedown={startDrag(4)} />
                <div class="window_title" on:mousedown={startDrag(0)}>
                    Demo: {name}
                    {onClose && (
                        <button class="window_title_button" on:click={onClose}>
                            ✖️
                        </button>
                    )}
                </div>
                <div class="resize_border ee" on:mousedown={startDrag(6)} />
                <div ref={contentEl} class="window_content">
                    {children}
                </div>
                <div class="resize_border sw" on:mousedown={startDrag(7)} />
                <div class="resize_border ss" on:mousedown={startDrag(8)} />
                <div class="resize_border se" on:mousedown={startDrag(9)} />
            </div>
        </>
    );
};
