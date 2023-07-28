<script lang="ts" context="module">
    import { SvelteComponent, onMount, tick } from "svelte";

    export interface PreviewWindowOptions {
        target: EventTarget;
        width?: number;
        height?: number;
        maxWidth?: number;
        maxHeight?: number;
        slot?: {
            component?: typeof SvelteComponent;
            props?: any;
            innerHTML?: string;
        };
    }

    /** The previewWindow Element, expects it from the component's contructor */
    export let previewWindow: HTMLDialogElement = null;

    /** The component for the window's slot, if it exists */
    let component: SvelteComponent = null;

    /** Sets the position of the window relatively to the target */
    async function setPosition(
        target: HTMLElement,
        options: { width?: number; height?: number }
    ) {
        previewWindow.style.top = "0px";
        previewWindow.style.left = "0px";
        const previewWindowRect = previewWindow.getBoundingClientRect();
        const previewWindowWidth = options?.width ?? previewWindowRect.width;
        const previewWindowHeight = options?.width ?? previewWindowRect.height;
        await tick();

        const targetRect = target.getBoundingClientRect();
        const targetX = targetRect.x;
        const targetY = targetRect.y;
        const targetWidth = targetRect.width;
        const targetHeight = targetRect.height;

        // Check if the previewWindow is out of bounds
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;

        // Check the four rectangles that are around the target
        const rects = [
            {
                x: 0,
                y: 0,
                width: windowWidth,
                height: targetY,
                dir: "top",
            },
            {
                x: 0,
                y: targetY + targetHeight,
                width: windowWidth,
                height: windowHeight - targetY - targetHeight,
                dir: "bottom",
            },
            {
                x: 0,
                y: 0,
                width: targetX,
                height: windowHeight,
                dir: "left",
            },
            {
                x: targetX + targetWidth,
                y: 0,
                width: windowWidth - targetX - targetWidth,
                height: windowHeight,
                dir: "right",
            },
        ];

        // Get the best rectangle with the biggest area
        let newRects = [...rects].sort((r1, r2) => {
            return (
                Math.min(r2.width, previewWindowWidth) *
                    Math.min(r2.height, previewWindowHeight) -
                Math.min(r1.width, previewWindowWidth) *
                    Math.min(r1.height, previewWindowHeight)
            );
        });

        // Place the previewWindow in the first rectangle
        const rect = newRects[0];

        let startX = rect.x;
        let startY = rect.y;

        // Place the previewWindow to the edge of the target
        if (rect.dir === "top") {
            startX = targetX + targetWidth / 2 - previewWindowWidth / 2;
            startY = targetY - previewWindowHeight;
            startY -= Math.min(20, startY + 20);
        } else if (rect.dir === "bottom") {
            startX = targetX + targetWidth / 2 - previewWindowWidth / 2;
            startY = targetY + targetHeight;
            startY += Math.min(20, windowHeight - startY - 20);
        } else if (rect.dir === "left") {
            startX = targetX - previewWindowWidth;
            startY = targetY + targetHeight / 2 - previewWindowHeight / 2;
            startX -= Math.min(20, startX + 20);
        } else if (rect.dir === "right") {
            startX = targetX + targetWidth;
            startY = targetY + targetHeight / 2 - previewWindowHeight / 2;
            startX += Math.min(20, windowWidth - startX - 20);
        }

        // Check if it's out of bounds
        if (startX < 0) {
            startX = 0;
        }
        if (startX + previewWindowWidth > windowWidth) {
            startX = windowWidth - previewWindowWidth;
        }
        // Check if it's out of bounds
        if (startY < 0) {
            startY = 0;
        }
        if (startY + previewWindowHeight > windowHeight) {
            startY = windowHeight - previewWindowHeight;
        }

        // Place the previewWindow
        previewWindow.style.left = `${startX}px`;
        previewWindow.style.top = `${startY}px`;
    }

    /** Sets the slot of the window */
    async function setSlot(options: PreviewWindowOptions) {
        if (options.slot) {
            if (options.slot.innerHTML) {
                previewWindow.innerHTML = options.slot.innerHTML;
            } else if (options.slot.component && options.slot.props) {
                component = new options.slot.component({
                    target: previewWindow,
                    props: options.slot.props,
                });
            }
        }
    }

    /** Shows the Preview Window */
    export function showPreviewWindow(
        options: PreviewWindowOptions = {
            target: document.body,
        }
    ) {
        let target = options.target as HTMLElement;

        {
            if (options.width) previewWindow.style.width = `${options.width}px`;
            else previewWindow.style.removeProperty("width");

            if (options.height)
                previewWindow.style.height = `${options.height}px`;
            else previewWindow.style.removeProperty("height");

            if (options.maxWidth)
                previewWindow.style.maxWidth = `${options.maxWidth}px`;
            else previewWindow.style.removeProperty("max-width");

            if (options.maxHeight)
                previewWindow.style.maxHeight = `${options.maxHeight}px`;
            else previewWindow.style.removeProperty("max-height");
        }

        previewWindow.showModal();
        // Place the previewWindow
        setPosition(target, options);
        // Set the content
        setSlot(options);
    }

    /** Hides the Preview Window and clears its slot */
    export function closePreviewWindow() {
        previewWindow.close();
        if (component) {
            component.$destroy();
            component = null;
        }
        previewWindow.innerHTML = "";
    }
</script>

<script lang="ts">
    let previewWindowEl: HTMLDialogElement;

    function onKeyDown(event: KeyboardEvent) {
        if (event.key === "Escape") {
            event.preventDefault();
            event.stopPropagation();
            closePreviewWindow();
        }
    }

    onMount(() => {
        previewWindow = previewWindowEl;
    });
</script>

<svelte:window
    on:resize={closePreviewWindow}
    on:keydown={onKeyDown}
    on:blur={closePreviewWindow}
/>

<!-- The Preview Window
    Slot gets added later
-->
<dialog
    id="preview-window"
    class="modal"
    on:click={closePreviewWindow}
    on:keydown|preventDefault
    bind:this={previewWindowEl}
/>

<style lang="scss">
    #preview-window {
        position: fixed;
        padding: 5px;
        margin: 0;
        border-radius: 8px;

        background: var(--preview-bg);
        color: var(--preview-fg);
        border: 1px solid var(--preview-border);
        box-shadow: 0 0 5px var(--preview-border);

        overflow: auto;
        grid-template-columns: 1fr;
        grid-template-rows: 1fr;

        &[open] {
            display: grid;
        }

        &:focus {
            outline: none;
        }
    }
</style>
