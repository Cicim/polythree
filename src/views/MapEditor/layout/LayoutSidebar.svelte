<script lang="ts">
    import { getContext } from "svelte";
    import type { Writable } from "svelte/store";
    import Select from "src/components/Select.svelte";
    import { resizeY } from "src/systems/resize";
    import type { MapEditorContext } from "src/views/MapEditor";
    import BrushCard from "./BrushCard.svelte";
    import Button from "src/components/Button.svelte";
    import ToolButton from "../ToolButton.svelte";
    import TilePalette from "./TilePalette.svelte";
    import {
        SelectionMaterial,
        type PaintingMaterial,
    } from "../editor/materials";
    import MapPreview from "src/views/MapList/MapPreview.svelte";
    import SelectionPreview from "./SelectionPreview.svelte";

    /** Set this to true if you are editing the levels */
    export let levelMode: boolean;
    export let hidden: boolean;

    enum LayoutState {
        None,
        BrushList,
        Borders,
        Brush,
        BrushLevel,
    }

    const context: MapEditorContext = getContext("context");
    const brushesStore = context.brushes;
    const material: Writable<PaintingMaterial> = context.material;

    let state: LayoutState = LayoutState.None;

    $: selection = $material instanceof SelectionMaterial ? $material : null;
</script>

<svelte:window />

<div class="a">
    <Select
        options={[
            [LayoutState.None, "None"],
            [LayoutState.BrushList, "Brush List"],
            [LayoutState.Borders, "Borders"],
            [LayoutState.Brush, "Brush"],
            [LayoutState.BrushLevel, "Brush Level"],
        ]}
        bind:value={state}
    />
</div>
<div class="sidebar-container" class:hidden>
    <!-- ANCHOR Level Mode sidebar -->
    <div class="level" class:hidden={!levelMode}>levelMode ON</div>
    <!-- ANCHOR Layout Mode sidebar -->
    <div class="layout" class:hidden={levelMode}>
        <!-- ANCHOR - Brush List -->
        <div
            class:hidden={state !== LayoutState.BrushList}
            class="brush-list-view"
        >
            <div class="topbar">
                <ToolButton
                    icon="mdi:close"
                    title="Close"
                    on:click={() => (state = LayoutState.None)}
                    theme="transparent"
                />
            </div>
            <div class="brush-container">
                {#each $brushesStore as brush, i}
                    <BrushCard {brush} index={i} />
                {/each}
            </div>
        </div>
        <!-- ANCHOR - Mutliselect preview -->
        <div
            class:hidden={selection === null || state === LayoutState.BrushList}
            class="multi-selection-view"
        >
            {#key selection}
                {#if selection !== null}
                    <SelectionPreview {selection} />
                {/if}
            {/key}
        </div>
        <!-- ANCHOR - Top bar -->
        <div class:hidden={state !== LayoutState.None} class="topbar-view">
            <Button on:click={() => (state = LayoutState.Borders)}>
                <iconify-icon icon="mdi:border-all" width="1.5em" />
                Borders
            </Button>
            <Button on:click={() => (state = LayoutState.BrushList)}>
                <iconify-icon icon="mdi:format-list-bulleted" width="1.5em" />
                Brush List
            </Button>
            <Button>
                <iconify-icon icon="mdi:puzzle" width="1.5em" />
                Edit Tilesets
            </Button>
        </div>
        <!-- ANCHOR - Brushes Container -->
        <div
            class="brushes-container"
            class:hidden={state !== LayoutState.None}
            use:resizeY={{
                minHeight: () => Math.max(100, window.innerHeight * 0.1),
                maxHeight: () => Math.min(288, window.innerHeight * 0.33),
                startHeight: 100,
            }}
        >
            <div class="brushes">
                {#each $brushesStore as brush, i}
                    <BrushCard small={true} {brush} index={i} />
                {/each}
                <!-- svelte-ignore a11y-click-events-have-key-events -->
                <div
                    class="view-all"
                    on:click={() => (state = LayoutState.BrushList)}
                >
                    <iconify-icon icon="material-symbols:list" width="2em" />
                    <br />
                    View All Brushes
                </div>
            </div>
            <div class="resize-handle top" />
        </div>
        <!-- ANCHOR - Borders editing view -->
        <div
            class="borders-view"
            class:hidden={state !== LayoutState.Borders}
            use:resizeY={{
                minHeight: () => window.innerHeight * 0.1,
                maxHeight: () => window.innerHeight * 0.33,
                startHeight: 200,
            }}
        >
            Borders
            <div class="resize-handle top" />
        </div>
        <!-- ANCHOR - Brush editing view -->
        <div
            class="brush-view"
            class:hidden={state !== LayoutState.Brush &&
                state !== LayoutState.BrushLevel}
            use:resizeY={{
                minHeight: () => Math.min(100, window.innerHeight * 0.2),
                maxHeight: () => window.innerHeight * 0.5,
                startHeight: 200,
            }}
        >
            Brush
            <div class="resize-handle top" />
        </div>
        <!-- ANCHOR - Level picker for brush editing -->
        <div class:hidden={state !== LayoutState.BrushLevel} class="level-view">
            Level
        </div>
        <!-- ANCHOR - Palette picker -->
        <div
            class:hidden={state === LayoutState.BrushList}
            class="palette-view"
        >
            <div class="palette-container">
                <TilePalette />
            </div>
        </div>
        <div
            class:hidden={state === LayoutState.BrushList}
            class="footbar-view"
        >
            Footbar!
        </div>
    </div>
</div>

<style lang="scss">
    .a {
        position: fixed;
        top: 8px;
        z-index: 1000;
        width: 296px;
        display: flex;
        flex-direction: column;
    }

    .sidebar-container {
        position: relative;
        user-select: none;
        display: flex;
        overflow: hidden;
    }

    .layout {
        flex: 1;

        display: flex;
        flex-direction: column;
        flex-wrap: wrap;
        align-items: stretch;
        position: relative;
    }

    .layout > div:not(:first-child):not(.resize-) {
        border-top: 1px solid var(--light-shadow);
    }

    // ANCHOR Topbar Style
    .topbar-view {
        background: var(--main-bg);
        height: min-content;
        display: flex;
        gap: 8px;
        padding: 8px;
        justify-content: space-evenly;

        > :global(.button) {
            margin: 0;
            padding: 0;
            display: flex;
            gap: 4px;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            flex: 1;
            height: 60px;
            text-align: center;
            white-space: normal;
        }
    }

    .brushes-container {
        display: grid;
        grid-template-rows: minmax(0, 1fr) 0;
        overflow-x: hidden;
        overflow-y: auto;
        align-items: flex-start;

        .brushes {
            display: flex;
            flex-flow: row wrap;
            padding: 8px;
            gap: 8px;
            overflow-x: hidden;

            .view-all {
                width: 75px;
                height: 75px;
                text-align: center;
                padding: 5px;
                cursor: pointer;

                &:hover {
                    color: var(--accent-fg);
                    iconify-icon {
                        color: var(--accent-fg);
                    }
                }
            }
        }
    }

    .footbar-view {
        height: 20px;
        background: var(--tabs-bg);
    }
    .borders-view {
        display: grid;
        grid-template-rows: minmax(0, 1fr) 0;
    }
    .brush-view {
        display: grid;
        grid-template-rows: minmax(0, 1fr) 0;
    }
    .level-view {
        flex: 1;
    }
    .palette-view {
        display: flex;
        flex: 4;
        overflow: hidden;

        .palette-container {
            width: 100%;
            height: 100%;
            overflow-y: auto;
        }
    }
    .multi-selection-view {
        max-height: 25%;
        min-height: 20px;
    }
    .brush-list-view {
        display: grid;
        grid-template-rows: max-content calc(100vh - 104px);
        container-type: inline-size;

        .topbar {
            height: 36px;
            display: flex;
            flex-flow: row nowrap;
            padding: 0 2px;
            justify-content: flex-end;
            align-items: center;
            gap: 2px;
            box-shadow: 0 0 2px 0 var(--hard-shadow);
            z-index: 4;
        }

        .brush-container {
            display: grid;
            align-content: flex-start;
            gap: 8px;
            padding: 8px;
            overflow-x: hidden;

            grid-template-columns: 1fr;

            @container (min-width: 584px) {
                grid-template-columns: 1fr 1fr;
            }

            @container (min-width: 862px) {
                grid-template-columns: 1fr 1fr 1fr;
            }
        }
    }
</style>
