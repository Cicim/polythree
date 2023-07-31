<script lang="ts">
    import { resizeY } from "src/systems/resize";
    import { SidebarState } from "../../LayoutSidebar.svelte";
    import { getContext } from "svelte";
    import type { MapEditorContext } from "src/views/MapEditor";
    import BrushCard from "./BrushCard.svelte";

    export let state: SidebarState;
    export let levelMode: boolean;

    const context: MapEditorContext = getContext("context");
    const editingBrush = context.editingBrush;
    const brushes = context.brushes;
</script>

<div
    class="brushes-container"
    class:hidden={levelMode || state !== SidebarState.Palette}
    use:resizeY={{
        minHeight: () => Math.max(100, window.innerHeight * 0.1),
        maxHeight: () => Math.min(288, window.innerHeight * 0.33),
        startHeight: 100,
    }}
>
    <div class="brushes" class:no-brushes={$brushes.length === 0}>
        {#key $editingBrush}
            {#each $brushes as brush, i}
                <BrushCard small={true} {brush} index={i} />
            {/each}
        {/key}
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <div class="view-all" on:click={() => (state = SidebarState.BrushList)}>
            <iconify-icon icon="material-symbols:list" width="2em" />
            <br />
            View All Brushes
        </div>
    </div>
    <div class="resize-handle top" />
</div>

<style lang="scss">
    .brushes-container {
        display: grid;
        grid-template-rows: minmax(0, 1fr) 0;
        overflow-x: hidden;
        overflow-y: auto;
        align-items: flex-start;

        .brushes {
            display: flex;
            flex-flow: row wrap;
            padding: 6px 8px;
            gap: 8px;
            overflow-x: hidden;
            width: calc(100% - 16px);
            height: calc(100% - 12px);
            place-content: flex-start;

            &.no-brushes {
                place-content: center;
            }

            .view-all {
                width: 75px;
                height: 75px;
                text-align: center;
                padding: 5px;
                cursor: pointer;

                &:hover {
                    color: var(--accent-fg);
                    text-decoration: underline;
                    iconify-icon {
                        color: var(--accent-fg);
                    }
                }
            }
        }
    }
</style>
