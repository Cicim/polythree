<script lang="ts">
    import { tooltip } from "src/systems/tooltip";
    import { SidebarState } from "../LayoutSidebar.svelte";
    import TilePalette from "../TilePalette.svelte";

    export let levelMode: boolean;
    export let state: SidebarState;

    let hoveringTile: number;
    let selectedTile: number | [number, number, number];
</script>

<div
    class:hidden={levelMode ||
        state === SidebarState.BrushList ||
        state === SidebarState.BrushLevel}
    class="tile-palette-view"
>
    <div class="palette-container">
        <TilePalette bind:hoveringTile bind:selectedTile />
    </div>
</div>
<div
    class:hidden={levelMode ||
        state === SidebarState.BrushList ||
        state === SidebarState.BrushLevel}
    class="footbar"
>
    {#if hoveringTile != null}
        <span class="hover">
            <iconify-icon inline icon="ri:cursor-fill" />
            <span class="number">
                {hoveringTile.toString().padStart(4, "0")}
            </span>
        </span>
    {/if}
    {#if selectedTile != null}
        <span
            class="selected"
            use:tooltip
            tooltip={`Selected Tile${
                typeof selectedTile === "number" ? "" : "s"
            }`}
        >
            <iconify-icon inline icon="mdi:selection" />
            {#if typeof selectedTile === "number"}
                <span class="number">
                    {selectedTile.toString().padStart(4, "0")}
                </span>
            {:else}
                <span class="number"
                    >{selectedTile[0].toString().padStart(4, "0")}</span
                >, ({selectedTile[1]}x{selectedTile[2]})
            {/if}
        </span>
    {/if}
</div>

<style lang="scss">
    .tile-palette-view {
        display: flex;
        flex: 4;
        overflow: hidden;

        .palette-container {
            width: 100%;
            height: 100%;
            overflow-y: auto;
        }
    }

    .footbar {
        padding: 0 0.5em;
        color: var(--weak-fg);

        .number {
            font-family: monospace;
            color: var(--main-fg);
        }

        .hover {
            float: right;
        }
    }
</style>
