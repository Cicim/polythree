<script lang="ts">
    import type { SvelteComponent } from "svelte";

    /** The component of the dialog content */
    export let dialogComponent: typeof SvelteComponent;
    /** The close function that returns a value in the Promise */
    export let close: (value: unknown) => any;

    /** The dialog element */
    let dialogElement: HTMLDialogElement;
    /** The dialog content container element */
    let contentElement: SvelteComponent;
    
    export function getDialog() {
        return dialogElement;
    }

    /**
     * When pressing the escape key.
     * Closes the dialog, unless the content has the `noEscapeClose` prop set to `true`.
     */
    function closeOnEscape(event: KeyboardEvent) {
        if (dialogElement.open && contentElement?.noEscapeClose) return;
        
        if (event.code === "Escape") {
            close(null);
        }
    }

    /**
     * When clicking outside of the dialog window.
     * Closes it, unless the content has the `noOutsideClose` prop set to `true`.
     */
    function closeOnClickOutside(event: MouseEvent) {
        if (dialogElement.open && contentElement?.noOutsideClose) return;

        const { x, y, width, height } = (<HTMLDialogElement>(
            dialogElement.children[0]
        )).getBoundingClientRect();

        if (
            event.clientX < x - 8 ||
            event.clientX > x + width + 8 ||
            event.clientY < y - 4 ||
            event.clientY > y + height + 4
        ) {
            close(null);
        }
    }
</script>

<svelte:window
    on:keydown|stopPropagation={closeOnEscape}
    on:mouseup={closeOnClickOutside}
/>

<!-- The dialog -->
<dialog class="dialog modal" bind:this={dialogElement}>
    <!-- The dialog content container -->
    <svelte:component
        this={dialogComponent}
        bind:this={contentElement}
        {close}
        {...$$restProps}
    />
</dialog>

<style lang="scss">
    dialog {
        background: var(--dialog-bg);
        padding: 0.25em 0.5em;
        border: 1px solid var(--dialog-border);
        border-radius: 4px;

        box-shadow: 5px 5px 10px var(--dialog-shadow);

        &::backdrop {
            background: #0008;
            backdrop-filter: blur(5px);
            -webkit-backdrop-filter: blur(5px);
        }

        &:focus {
            outline: none;
        }
    }
</style>
