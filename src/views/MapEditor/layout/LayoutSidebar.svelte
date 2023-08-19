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
    import { getContext, onDestroy } from "svelte";
    import type { MapEditorContext } from "src/views/MapEditor";
    import BrushList from "./sidebar/brush/BrushList.svelte";
    import TopBar from "./sidebar/TopBar.svelte";
    import BrushPalette from "./sidebar/brush/BrushPalette.svelte";
    import BordersEditor from "./sidebar/BordersEditor.svelte";
    import BrushEditor from "./sidebar/brush/BrushEditor.svelte";
    import PermissionPaletteContainer from "./sidebar/PermissionPaletteContainer.svelte";
    import TilePaletteContainer from "./sidebar/TilePaletteContainer.svelte";
    import TilesetLevelEditorContainer from "./sidebar/TilesetLevelEditorContainer.svelte";
    import SelectionPreviewContainer from "./sidebar/SelectionPreviewContainer.svelte";
    import { SelectionMaterial } from "../editor/materials";
    import LoadingScreen from "src/components/LoadingScreen.svelte";

    /** Set this to true if you are editing the levels */
    export let permissionMode: boolean;
    export let hidden: boolean;

    let levelPalette: PermissionPaletteContainer;
    let tilePalette: TilePaletteContainer;

    const context: MapEditorContext = getContext("context");
    const material = context.material;
    const loadingBrushes = context.brushes.loading;

    // Update the moveOnPalette callback
    context.palette.setMoveCallback(
        (dirX: number, dirY: number, select: boolean) => {
            if (permissionMode || state === SidebarState.BrushLevel)
                levelPalette.moveOnPalette(dirX, dirY, select);
            else tilePalette.moveOnPalette(dirX, dirY, select);
        }
    );

    let state: SidebarState = SidebarState.Palette;

    // Exit from the BrushList state if you just selected a material that was not a brush
    const unsubscribeFromMaterial = material.subscribe((material) => {
        if (
            state === SidebarState.BrushList &&
            material instanceof SelectionMaterial
        )
            state = SidebarState.Palette;
    });

    onDestroy(() => {
        unsubscribeFromMaterial();
    });
</script>

<svelte:window />

<div class="sidebar-container" class:hidden>
    {#if $loadingBrushes}
        <LoadingScreen />
    {:else}
        <!-- Brush List -->
        <BrushList {permissionMode} bind:state />
    {/if}
    <!-- Top bar -->
    <TopBar {permissionMode} bind:state />
    {#if $loadingBrushes}
        <LoadingScreen />
    {:else}
        <!-- Brushes Container -->
        <BrushPalette {permissionMode} bind:state />
    {/if}
    <!-- Borders editing view -->
    <BordersEditor {permissionMode} bind:state />
    <!-- Brush editing view -->
    <BrushEditor {permissionMode} bind:state />
    <!-- Permissions Palette -->
    <PermissionPaletteContainer
        {permissionMode}
        bind:state
        bind:this={levelPalette}
    />
    <!-- Tile palette view -->
    <TilePaletteContainer {permissionMode} bind:state bind:this={tilePalette} />
    <!-- Palette Permissions Editing -->
    <TilesetLevelEditorContainer {permissionMode} />
    <!-- Mutliselect preview -->
    <SelectionPreviewContainer {permissionMode} bind:state />
</div>

<style lang="scss">
    .sidebar-container {
        position: relative;
        user-select: none;
        display: flex;
        overflow: hidden;
        flex-direction: column;
        flex-wrap: wrap;
        align-items: stretch;

        & :global(> div:not(.resize)) {
            border-bottom: 1px solid var(--light-shadow);
        }

        :global(.topbar) {
            height: 36px;
            background: var(--main-bg);

            display: grid;
            grid-template-columns: minmax(32px, min-content) minmax(0, 1fr) minmax(
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
