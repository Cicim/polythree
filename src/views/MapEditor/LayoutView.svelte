<script lang="ts">
    import { getContext } from "svelte";
    import LayoutViewArea from "./layout/LayoutViewArea.svelte";
    import LayoutSidebar from "./layout/LayoutSidebar.svelte";
    import ScriptsSidebar from "./scripts/ScriptsSidebar.svelte";
    import { resizeX } from "src/systems/resize";
    import ToolButton from "./ToolButton.svelte";
    import { EditorTool } from "./editor/tools";
    import type { MapEditorContext } from "../MapEditor";

    const context: MapEditorContext = getContext("context");
    const changes = context.changes;
    const changed = changes.updateStore;
    let selectedToolStore = context.selectedTool;

    // The currently open tab (layout, level or scripts)
    $: activeTab = context.selectedTab;
</script>

<div class="editor">
    <div class="toolbar">
        <ToolButton
            bind:group={$selectedToolStore}
            value={EditorTool.Pencil}
            icon="mdi:pencil"
            title="Pencil"
            theme="secondary"
        />
        <ToolButton
            bind:group={$selectedToolStore}
            value={EditorTool.Fill}
            icon="mdi:bucket"
            title="Fill"
        />
        <ToolButton
            bind:group={$selectedToolStore}
            value={EditorTool.Rectangle}
            icon="mdi:square"
            title="Rectangle"
        />
        <ToolButton
            bind:group={$selectedToolStore}
            value={EditorTool.Replace}
            icon="mdi:wand"
            title="Replace"
        />
        |
        {#key $changed}
            <ToolButton
                icon="mdi:undo"
                title="Undo ({changes.top})"
                disabled={changes.top === 0}
                on:click={() => context.undo()}
            />
        {/key}
        {#key $changed}
            <ToolButton
                icon="mdi:redo"
                title="Redo ({changes.stack.length - changes.top})"
                disabled={changes.stack.length === changes.top}
                on:click={() => context.redo()}
            />
        {/key}
    </div>
    <div class="area">
        <LayoutViewArea editLevels={$activeTab === "level"} />
    </div>
    <div
        class="sidebar"
        use:resizeX={{
            startWidth: 300,
            minWidth: 300,
            maxWidth: () => Math.round(window.innerWidth * 0.5),
        }}
    >
        <div class="resize-handle left" />
        <LayoutSidebar
            hidden={$activeTab !== "layout" && $activeTab !== "level"}
            levelMode={$activeTab === "level"}
        />
        <ScriptsSidebar hidden={$activeTab !== "scripts"} />
    </div>
</div>

<style lang="scss">
    .editor {
        height: 100%;
        overflow: hidden;

        display: grid;
        grid-template-columns: minmax(0, 1fr) min-content;
        grid-template-rows: 36px minmax(0, 1fr);
        grid-template-areas:
            "toolbar sidebar"
            "area sidebar";
    }

    .area {
        grid-area: area;
        background: var(--main-bg);
        place-items: stretch;
    }

    .toolbar {
        display: flex;
        flex-flow: row nowrap;
        align-items: center;

        padding: 0 2px;
        overflow-x: auto;
        overflow-y: hidden;
        gap: 2px;

        grid-area: toolbar;
        background: var(--main-bg);
        box-shadow: 0 1px 0 var(--light-shadow);
        z-index: 1;

        color: transparent;

        &::-webkit-scrollbar {
            -webkit-appearance: none;
            display: none;
        }
    }

    .sidebar {
        position: relative;
        grid-area: sidebar;
        background: var(--medium-bg);
        box-shadow: -1px 0 0 var(--light-shadow);
        z-index: 2;
        display: grid;
        grid-template-columns: 0 minmax(0, 1fr);
        height: 100%;
    }
</style>
