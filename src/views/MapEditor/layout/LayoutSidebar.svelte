<script lang="ts" context="module">
    export enum SidebarState {
        Palette,
        BrushList,
        Borders,
        Brush,
        BrushLevel,
    }
</script>

<script lang="ts">
    import { getContext } from "svelte";
    import Select from "src/components/Select.svelte";
    import type { MapEditorContext } from "src/views/MapEditor";
    import BrushList from "./sidebar/BrushList.svelte";
    import TopBar from "./sidebar/TopBar.svelte";
    import BrushPalette from "./sidebar/BrushPalette.svelte";
    import BordersEditor from "./sidebar/BordersEditor.svelte";
    import BrushEditor from "./sidebar/BrushEditor.svelte";
    import LevelPaletteContainer from "./sidebar/LevelPaletteContainer.svelte";
    import TilePaletteContainer from "./sidebar/TilePaletteContainer.svelte";
    import TilesetLevelEditorContainer from "./sidebar/TilesetLevelEditorContainer.svelte";
    import SelectionPreviewContainer from "./sidebar/SelectionPreviewContainer.svelte";

    /** Set this to true if you are editing the levels */
    export let levelMode: boolean;
    export let hidden: boolean;

    const context: MapEditorContext = getContext("context");
    const editingBrush = context.editingBrush;

    let state: SidebarState = SidebarState.BrushList;

    $: (() => {
        if ($editingBrush !== null) {
            state = SidebarState.Brush;
        }
    })();
</script>

<svelte:window />

<div class="a">
    <Select
        options={[
            [SidebarState.Palette, "Palette"],
            [SidebarState.BrushList, "Brush List"],
            [SidebarState.Borders, "Borders"],
            [SidebarState.Brush, "Brush"],
            [SidebarState.BrushLevel, "Brush Level"],
        ]}
        bind:value={state}
    />
</div>
<div class="sidebar-container" class:hidden>
    <div class="sidebar-content">
        <!-- Brush List -->
        <BrushList {levelMode} bind:state />
        <!-- Top bar -->
        <TopBar {levelMode} bind:state />
        <!-- Brushes Container -->
        <BrushPalette {levelMode} bind:state />
        <!-- Borders editing view -->
        <BordersEditor {levelMode} bind:state />
        <!-- Brush editing view -->
        <BrushEditor {levelMode} bind:state />
        <!-- Level Palette -->
        <LevelPaletteContainer {levelMode} bind:state />
        <!-- Tile palette view -->
        <TilePaletteContainer {levelMode} bind:state />
        <!-- Palette Permissions Editing -->
        <TilesetLevelEditorContainer {levelMode} />
        <!-- Mutliselect preview -->
        <SelectionPreviewContainer {levelMode} bind:state />
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

    .sidebar-content {
        flex: 1;

        display: flex;
        flex-direction: column;
        flex-wrap: wrap;
        align-items: stretch;
        position: relative;

        & :global(> div:not(.resize)) {
            border-bottom: 1px solid var(--light-shadow);
        }

        :global(.topbar) {
            height: 36px;
            background: var(--main-bg);

            display: grid;
            grid-template-columns: minmax(32px, min-content) 1fr minmax(
                    32px,
                    min-content
                );
            grid-template-areas: "left center right";

            :global(.left) {
                grid-area: left;
                justify-content: left;
            }
            :global(.center) {
                grid-area: center;
                justify-content: center;
            }
            :global(.right) {
                grid-area: right;
                justify-content: right;
            }

            :global(.left),
            :global(.right),
            :global(.center) {
                display: flex;
                flex-flow: row nowrap;
                padding: 0 2px;
                justify-content: center;
                align-items: center;
                gap: 2px;
                background: var(--main-bg);
            }

            :global(.center) {
                text-align: center;
                color: var(--weak-fg);
                text-transform: uppercase;
            }

            box-shadow: 0 0 2px 0 var(--hard-shadow);
            z-index: 4;
        }

        :global(.footbar) {
            height: 20px;
            background: var(--tabs-bg);
            border-bottom: none !important;
        }
    }
</style>
