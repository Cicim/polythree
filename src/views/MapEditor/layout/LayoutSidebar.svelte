<script lang="ts">
    import { getContext } from "svelte";
    import Select from "src/components/Select.svelte";
    import type { Brush } from "../editor/brushes";
    import { resizeX } from "src/systems/resize";

    /** Set this to true if you are editing the levels */
    export let levelMode: boolean;
    export let selection: Brush;

    let editingMode:
        | "none"
        | "brush-list"
        | "borders"
        | "brush"
        | "brush-level" = "brush";

    // TODO: Derive from selection
    $: multiselecting = false;

    const context = getContext("context");
</script>

<svelte:window />

<div class="a">
    <Select
        options={[
            ["none", "None"],
            ["brush-list", "Brush List"],
            ["borders", "Borders"],
            ["brush", "Brush"],
            ["brush-level", "Brush Level"],
        ]}
        bind:value={editingMode}
    />
</div>
<div
    class="sidebar-container"
    use:resizeX={{
        startWidth: 300,
        maxWidth: () => Math.round(window.innerWidth * 0.5),
    }}
>
    <div class="resize-bar" />

    {#if levelMode}
        levelMode ON
    {:else}
        <div class="layout">
            {#if editingMode === "brush-list"}
                <div class="brush-list-view">Brush List View</div>
            {:else}
                {#if multiselecting}
                    <div class="multi-selection-view">Multi Selection</div>
                {/if}
                {#if editingMode === "none"}
                    <div class="topbar-view">Selection</div>
                {:else if editingMode === "borders"}
                    <div class="borders-view">Borders</div>
                {:else}
                    <div class="brush-view">Brush</div>
                    {#if editingMode === "brush-level"}
                        <div class="level-view">Level</div>
                    {/if}
                {/if}
                <div class="palette-view">Palette</div>
                <div class="footbar-view">Footbar!</div>
            {/if}
        </div>
    {/if}
</div>

<style lang="scss">
    .a {
        position: absolute;
        top: 8px;
        width: 296px;
        display: flex;
        flex-direction: column;
    }

    .sidebar-container {
        display: grid;
        height: 100%;
        min-width: 300px;
        grid-template-columns: 0 1fr;
        user-select: none;
    }

    .resize-bar {
        &::before {
            content: "";
            position: absolute;
            width: 4px;
            margin-left: -4px;
            top: 40px;
            bottom: 24px;

            transition: box-shadow 50ms ease-in-out;
        }

        &.resizing,
        &:hover {
            &::before {
                box-shadow: inset -2px 0 0 2px var(--light-shadow);
            }
        }

        cursor: col-resize;
    }

    .layout {
        display: flex;
        flex-direction: column;
        flex-wrap: wrap;
        align-items: stretch;
    }

    .layout > div:not(:first-child) {
        border-top: 1px solid var(--light-shadow);
    }

    .topbar-view {
        background: var(--strong-bg);
        height: 120px;
    }
    .footbar-view {
        height: 20px;
        background: var(--tabs-bg);
    }
    .borders-view {
        flex: 1;
    }
    .brush-view {
        flex: 1;
    }
    .level-view {
        flex: 1;
    }
    .palette-view {
        flex: 4;
        flex-shrink: 1;
    }
    .multi-selection-view {
        max-height: 25%;
        min-height: 40px;
    }
    .brush-list-view {
        flex: 1;
    }
</style>
