<script lang="ts">
    import { tooltip } from "src/systems/tooltip";
    import { SidebarState } from "../LayoutSidebar.svelte";
    import TilePalette from "../TilePalette.svelte";

    export let levelMode: boolean;
    export let state: SidebarState;

    let tilePalette: TilePalette;

    let hoveringTile: number;
    let selectedTile: number | [number, number, number];
    let fitToContainer: boolean = false;

    export function moveOnPalette(dirX: number, dirY: number, select: boolean) {
        tilePalette.moveOnPalette(dirX, dirY, select);
    }
</script>

<div
    class:hidden={levelMode ||
        state === SidebarState.BrushList ||
        state === SidebarState.BrushLevel}
    class="tile-palette-view"
>
    <div class="palette-container">
        <TilePalette
            bind:this={tilePalette}
            bind:fitToContainer
            bind:hoveringTile
            bind:selectedTile
        />
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
    <!-- Toggle fitToContainer -->
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    {#if fitToContainer}
        <span
            use:tooltip
            tooltip="Reset to fixed size"
            class="toggle-size"
            on:click={() => (fitToContainer = !fitToContainer)}
        >
            <iconify-icon icon="fluent:arrow-fit-16-regular" inline />Reset
            Width
        </span>
    {:else}
        <span
            use:tooltip
            tooltip={"Fit the Palette to the Container"}
            class="toggle-size"
            on:click={() => (fitToContainer = !fitToContainer)}
        >
            <iconify-icon icon="fluent:arrow-fit-in-16-regular" inline />Fit
            Width
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
        text-overflow: ellipsis;
        white-space: nowrap;

        .toggle-size {
            float: right;
            padding: 0 0.25em;
            cursor: pointer;
            border-radius: 2px;

            iconify-icon {
                padding-right: 4px;
            }

            &:hover {
                background: var(--light-shadow);
                text-decoration: underline;
            }
            &:active {
                background: var(--medium-shadow);
                color: var(--accent-fg);
            }
        }

        .number {
            font-family: monospace;
            color: var(--main-fg);
        }

        .hover {
            float: right;
        }
    }
</style>
