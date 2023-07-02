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

<dialog
    id="tooltip"
    class="modal"
    on:click={closeTooltip}
    on:keydown={onKeyDown}
>
    <div class="tooltip-content">
        Lorem ipsum dolor sit amet consectetur adipisicing elit. Quisquam, quos
        voluptatibus. Quisquam, quos voluptatibus. Quisquam, quos voluptatibus.
        Quisquam, quos voluptatibus. Quisquam, quos voluptatibus. Quisquam, quos
        voluptatibus. Quisquam, quos voluptatibus. Quisquam, quos voluptatibus.
        Quisquam, quos voluptatibus. Quisquam, quos voluptatibus. Quisquam, quos
        voluptatibus. Quisquam, quos voluptatibus. Quisquam, quos voluptatibus.
        Quisquam, quos voluptatibus. Quisquam, quos voluptatibus. Quisquam, quos
        Lorem ipsum dolor sit amet consectetur adipisicing elit. Quisquam, quos
        voluptatibus. Quisquam, quos voluptatibus. Quisquam, quos voluptatibus.
        Quisquam, quos voluptatibus. Quisquam, quos voluptatibus. Quisquam, quos
        voluptatibus. Quisquam, quos voluptatibus. Quisquam, quos voluptatibus.
        Quisquam, quos voluptatibus. Quisquam, quos voluptatibus. Quisquam, quos
        voluptatibus. Quisquam, quos voluptatibus. Quisquam, quos voluptatibus.
        Quisquam, quos voluptatibus. Quisquam, quos voluptatibus. Quisquam, quos
    </div>
</dialog>

<style lang="scss">
    #tooltip {
        position: fixed;
        padding: 0;
        margin: 0;
        border: none;
        border-radius: 8px;

        border: 1px solid white;
        background: var(--tooltip-bg);
        overflow: auto;
        grid-template-columns: 1fr;
        grid-template-rows: 1fr;

        &[open] {
            display: grid;
        }
    }
    .tooltip-content {
        width: 100%;
        background: black;
        color: white;
    }
</style>
