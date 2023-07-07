<script lang="ts">
    import { closeTooltip } from "src/systems/tooltip";

    function onKeyDown(event: KeyboardEvent) {
        if (event.key === "Escape") {
            event.preventDefault();
            event.stopPropagation();
            closeTooltip();
        }
    }
</script>

<svelte:window on:resize={closeTooltip} on:keydown={onKeyDown}  />

<dialog
    id="tooltip"
    class="modal"
    on:click={closeTooltip}
    on:keydown|preventDefault
/>

<style lang="scss">
    #tooltip {
        position: fixed;
        padding: 5px;
        margin: 0;
        border-radius: 8px;

        background: var(--tooltip-bg);
        color: var(--tooltip-fg);
        border: 1px solid var(--tooltip-border);
        box-shadow: 0 0 5px var(--tooltip-border);

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
