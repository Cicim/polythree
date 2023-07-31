<script lang="ts">
    import type { MapEditorContext } from "src/views/MapEditor";
    import { getContext } from "svelte";
    import { SidebarState } from "../LayoutSidebar.svelte";
    import ToolButton from "../../ToolButton.svelte";
    import BrushCard from "../BrushCard.svelte";

    export let state: SidebarState;
    export let levelMode: boolean;

    const context: MapEditorContext = getContext("context");
    const editingBrush = context.editingBrush;
    const brushes = context.brushes;
</script>

<div
    class:hidden={levelMode || state !== SidebarState.BrushList}
    class="brush-list-view"
>
    <div class="topbar">
        <div class="left">
            <ToolButton
                icon="mdi:plus"
                title="Create Brush"
                on:click={() => {}}
                theme="transparent"
            />
        </div>
        <div class="center">BRUSH LIST</div>
        <div class="right">
            <ToolButton
                icon="mdi:close"
                title="Close"
                on:click={() => (state = SidebarState.Palette)}
                theme="transparent"
            />
        </div>
    </div>
    <div class="brush-container">
        {#key $editingBrush}
            {#each $brushes as brush, i}
                <BrushCard {brush} index={i} />
            {:else}
                <div class="no-brushes">There are no brushes</div>
            {/each}
        {/key}
    </div>
</div>

<style lang="scss">
    .brush-list-view {
        display: grid;
        grid-template-rows: max-content calc(100vh - 104px);
        border-bottom: none !important;
        container-type: inline-size;

        .no-brushes {
            grid-column: 1 / -1;
            display: flex;
            justify-content: center;
            padding-top: 1em;
            color: var(--weak-fg);
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
