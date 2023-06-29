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
            event.target
        )).getBoundingClientRect();

        if (
            event.clientX < x ||
            event.clientX > x + width ||
            event.clientY < y ||
            event.clientY > y + height
        ) {
            close(null);
        }
    }
</script>

<svelte:window on:keydown|stopPropagation={closeOnEscape} on:mouseup={closeOnClickOutside} />

<!-- The dialog -->
<dialog class="dialog modal" bind:this={dialogElement}>
    <!-- The dialog content container -->
    <svelte:component this={dialogComponent} {close} {...$$restProps} />
</dialog>

<style lang="scss">
    dialog {
        background: var(--dialog-bg);
        padding: 10px;
        border: 0px;
        border-radius: 10px;

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
