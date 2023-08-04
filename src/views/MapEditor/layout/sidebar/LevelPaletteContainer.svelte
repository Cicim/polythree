<script lang="ts">
    import { resizeY } from "src/systems/resize";
    import { SidebarState } from "../LayoutSidebar.svelte";
    import LevelPalette from "../LevelPalette.svelte";

    export let levelMode: boolean;
    export let state: SidebarState;

    let levelPalette: LevelPalette;

    export function moveOnPalette(dirX: number, dirY: number, select: boolean) {
        levelPalette.moveOnPalette(dirX, dirY, select);
    }
</script>

<div
    class="level-palette-view"
    class:flexed={!levelMode}
    class:hidden={!levelMode && state !== SidebarState.BrushLevel}
    use:resizeY={{
        maxHeight: () => Math.min(310, window.innerHeight * 0.33),
        minHeight: () => window.innerHeight * 0.1,
        startHeight: 310,
    }}
>
    <div class="level-palette-container">
        <LevelPalette bind:this={levelPalette} />
    </div>
    <div class="resize-handle top" class:hidden={!levelMode} />
</div>

<style lang="scss">
    .level-palette-view {
        display: grid;
        grid-template-rows: minmax(0, 1fr) 0;
        overflow: hidden;

        &.flexed {
            flex: 1;
        }

        .level-palette-container {
            overflow-y: auto;
        }
    }
</style>
