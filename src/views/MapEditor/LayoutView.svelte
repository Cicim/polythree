<script lang="ts">
    import { getContext } from "svelte";
    import type { MapEditorContext } from "../MapEditor";
    import LayoutViewArea from "./layout/LayoutViewArea.svelte";
    import LayoutSidebar from "./layout/LayoutSidebar.svelte";
    import ScriptsSidebar from "./scripts/ScriptsSidebar.svelte";
    import type { Brush } from "./editor/brushes";
    import { resizeX } from "src/systems/resize";

    const context: MapEditorContext = getContext("context");

    let selection: Brush = null;

    // The currently open tab (layout, level or scripts)
    $: activeTab = context.selectedTab;
</script>

<div class="editor">
    <div class="toolbar">Toolbar</div>
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
            bind:selection
            levelMode={$activeTab === "level"}
        />
        <ScriptsSidebar hidden={$activeTab !== "scripts"} />
    </div>
</div>

<style lang="scss">
    .editor {
        width: 100%;
        height: 100%;
        max-height: 100%;
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
        grid-area: toolbar;
        background: var(--main-bg);
        box-shadow: 0 1px 0 var(--light-shadow);
        z-index: 1;
    }

    .sidebar {
        position: relative;
        grid-area: sidebar;
        background: var(--medium-bg);
        box-shadow: -1px 0 0 var(--light-shadow);
        z-index: 2;
        grid-template-columns: 0 1fr;
    }
</style>
