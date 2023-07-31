<script lang="ts">
    import { SidebarState } from "../LayoutSidebar.svelte";
    import TilePalette from "../TilePalette.svelte";

    export let levelMode: boolean;
    export let state: SidebarState;
</script>

<div
    class:hidden={levelMode ||
        state === SidebarState.BrushList ||
        state === SidebarState.BrushLevel}
    class="tile-palette-view"
>
    <div class="palette-container">
        <TilePalette />
    </div>
</div>
<div
    class:hidden={levelMode ||
        state === SidebarState.BrushList ||
        state === SidebarState.BrushLevel}
    class="footbar"
>
    Footbar!
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
</style>
