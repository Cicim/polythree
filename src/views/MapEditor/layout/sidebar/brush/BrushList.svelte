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
    import Input from "src/components/Input.svelte";
    import {
        IconOption,
        Menu,
        showContextMenu,
    } from "src/systems/context_menu";
    import { BrushesModule } from "src/views/MapEditor/context/brushes_module";

    export let state: SidebarState;
    export let permissionMode: boolean;

    const context: MapEditorContext = getContext("context");
    const editingList = BrushesModule.editingList;
    const primaryBrushes = context.brushes.primary;
    const secondaryBrushes = context.brushes.secondary;

    let filterString: string = "";
    function clearFilter(event: KeyboardEvent) {
        if (event.key === "Escape") {
            filterString = "";
            (event.target as HTMLInputElement).value = "";
        }
    }

    /** Returns a callback that when executed creates a brush of the initially given class */
    function createBrushCreateCallback(Type: any) {
        return () => {
            primaryBrushes.update((brushes) => {
                brushes.push(new Type(context.tileset1Offset));
                return brushes;
            });
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
        <Input
            type="text"
            placeholder="Filter"
            bind:value={filterString}
            on:keydown={clearFilter}
        />
    </div>
    <div class="brush-container">
        {#key $editingList}
            {#each [...$primaryBrushes, ...$secondaryBrushes] as brush (brush.uid)}
                <BrushCard
                    show={brush.name
                        .toLowerCase()
                        .includes(filterString.toLowerCase())}
                    {brush}
                />
            {:else}
                <div class="no-brushes">There are no brushes</div>
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

            :global(input) {
                padding: 8px;
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
