<script lang="ts">
    import type { MapEditorContext } from "src/views/MapEditor";
    import { getContext } from "svelte";
    import { SidebarState } from "../../LayoutSidebar.svelte";
    import ToolButton from "../../../ToolButton.svelte";
    import BrushCard from "./BrushCard.svelte";
    import {
        SimpleBrush,
        NinePatchBrush,
    } from "src/views/MapEditor/editor/brushes";
    import {
        IconOption,
        Menu,
        showContextMenu,
    } from "src/systems/context_menu";
    import { BrushesModule } from "src/views/MapEditor/modules/brushes_module";
    import SearchBar from "src/components/SearchBar.svelte";

    export let state: SidebarState;
    export let permissionMode: boolean;

    const context: MapEditorContext = getContext("context");
    const editingList = BrushesModule.editingList;
    const primaryBrushes = context.brushes.primary;
    const secondaryBrushes = context.brushes.secondary;
    const editingBrush = context.brushes.editing;
    const brushNew = context.brushes.brushNew;

    let filterString: string = "";
    function clearFilter() {
        filterString = "";
    }

    /** Returns a callback that when executed creates a brush of the initially given class */
    function createBrushCreateCallback(Type: any) {
        return () => {
            const brush = new Type(context.tileset1Offset);
            primaryBrushes.update((brushes) => {
                brushes.push(brush);
                return brushes;
            });
            // Start editing the brush
            $editingBrush = brush;
            $brushNew = true;
        };
    }

    // List of options for new brushes
    const newBrushMenu = new Menu([
        ...[SimpleBrush, NinePatchBrush].map(
            (B) =>
                new IconOption(B.typeName, B.icon, createBrushCreateCallback(B))
        ),
    ]);
</script>

<div
    class:hidden={permissionMode || state !== SidebarState.BrushList}
    class="brush-list-view"
>
    <div class="topbar">
        <div class="left">
            <ToolButton
                icon="mdi:plus"
                title="Create Brush"
                theme="transparent"
                on:click={(event) =>
                    showContextMenu(event.detail.target, newBrushMenu)}
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
    <div class="searchbar">
        <SearchBar
            submitOnInput={true}
            placeholder="Filter"
            bind:value={filterString}
            on:escape={clearFilter}
        />
    </div>
    <div class="brush-container">
        {#key $editingList}
            {#each [...$primaryBrushes, ...$secondaryBrushes].filter( (brush) => brush.name
                        .toLowerCase()
                        .includes(filterString.toLowerCase()) ) as brush (brush.uid)}
                <BrushCard {brush} />
            {:else}
                {#if filterString !== ""}
                    <div class="no-brushes">No brushes found</div>
                {:else}
                    <div class="no-brushes">There are no brushes</div>
                {/if}
            {/each}
        {/key}
    </div>
</div>

<style lang="scss">
    .brush-list-view {
        display: grid;
        grid-template-rows: max-content max-content 1fr;
        border-bottom: none !important;
        overflow: hidden;

        .no-brushes {
            grid-column: 1 / -1;
            display: flex;
            justify-content: center;
            padding-top: 1em;
            color: var(--weak-fg);
        }

        .searchbar {
            display: grid;

            :global(.searchbar) {
                margin: 8px 8px 2px;
                z-index: 10;
            }
        }

        .brush-container {
            display: grid;
            align-content: flex-start;
            gap: 8px;
            padding: 8px;
            overflow-x: hidden;

            grid-template-columns: repeat(auto-fill, minmax(266px, 1fr));
        }
    }
</style>
