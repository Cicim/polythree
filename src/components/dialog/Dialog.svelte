<script lang="ts">
    import type { SvelteComponent } from "svelte";

    export let dialogComponent: typeof SvelteComponent;
    export let close: (value: unknown) => any;

    let dialogElement: HTMLDialogElement;
    export function getDialog() {
        return dialogElement;
    }

    function closeOnEscape(event: KeyboardEvent) {
        if (event.code === "Escape") {
            close(null);
        }
    }

    function closeOnClickOutside(event: MouseEvent) {
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
    <svelte:component this={dialogComponent} {close} {...$$restProps} />
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
