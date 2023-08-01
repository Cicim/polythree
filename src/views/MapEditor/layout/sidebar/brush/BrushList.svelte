<script lang="ts">
    import type { MapEditorContext } from "src/views/MapEditor";
    import { getContext } from "svelte";
    import { SidebarState } from "../../LayoutSidebar.svelte";
    import ToolButton from "../../../ToolButton.svelte";
    import BrushCard from "./BrushCard.svelte";
    import {
        AddBrushChange,
        SimpleBrush,
    } from "src/views/MapEditor/editor/brushes";
    import Input from "src/components/Input.svelte";

    export let state: SidebarState;
    export let levelMode: boolean;

    const context: MapEditorContext = getContext("context");
    const brushes = context.brushes;
    const changes = context.brushesChanges;

    let filterString: string = "";
    function clearFilter(event: KeyboardEvent) {
        if (event.key === "Escape") {
            filterString = "";
            (event.target as HTMLInputElement).value = "";
        }
    }

    function createBrush() {
        // Add it to the list of brushes
        changes.push(new AddBrushChange(new SimpleBrush()));
    }
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
                on:click={createBrush}
                theme="transparent"
            />
            {#key $brushes}
                <ToolButton
                    icon="mdi:undo"
                    title="Undo"
                    on:click={() => changes.undo()}
                    theme="transparent"
                    disabled={changes.top === 0}
                />
            {/key}
        </div>
        <div class="center">BRUSH LIST</div>
        <div class="right">
            {#key $brushes}
                <ToolButton
                    icon="mdi:redo"
                    title="Redo"
                    on:click={() => changes.redo()}
                    theme="transparent"
                    disabled={changes.stack.length === changes.top}
                />
            {/key}
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
        {#key $brushes}
            {#each $brushes as brush, i}
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
        grid-template-rows: max-content max-content calc(100vh - 104px);
        border-bottom: none !important;
        container-type: inline-size;

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
