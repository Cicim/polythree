<script lang="ts">
    import { getContext } from "svelte";
    import Select from "src/components/Select.svelte";
    import type { Brush } from "../editor/brushes";
    import { resizeY } from "src/systems/resize";

    /** Set this to true if you are editing the levels */
    export let levelMode: boolean;
    export let selection: Brush;
    export let hidden: boolean;

    let editingMode:
        | "none"
        | "brush-list"
        | "borders"
        | "brush"
        | "brush-level" = "brush";

    // TODO: Derive from selection
    $: multiselecting = false;

    const context = getContext("context");
</script>

<svelte:window />

<div class="a">
    <Select
        options={[
            ["none", "None"],
            ["brush-list", "Brush List"],
            ["borders", "Borders"],
            ["brush", "Brush"],
            ["brush-level", "Brush Level"],
        ]}
        bind:value={editingMode}
    />
</div>
<div class="sidebar-container" class:hidden>
    <!-- ANCHOR Level Mode sidebar -->
    <div class="level" class:hidden={!levelMode}>levelMode ON</div>
    <!-- ANCHOR Layout Mode sidebar -->
    <div class="layout" class:hidden={levelMode}>
        <!-- Brush List, hidden if mode is not brush-list -->
        <div
            class:hidden={editingMode !== "brush-list"}
            class="brush-list-view"
        >
            Brush List View
        </div>
        <!-- Mutliselect preview, hidden if not multiselecting or mode is brush-list -->
        <div
            class:hidden={!multiselecting || editingMode === "brush-list"}
            class="multi-selection-view"
        >
            Multi Selection
        </div>
        <!-- Selection bar, hidden if editing something -->
        <div class:hidden={editingMode !== "none"} class="topbar-view">
            Selection
        </div>
        <!-- Borders editing view, hidden if not editing borders -->
        <div
            class="borders-view"
            class:hidden={editingMode !== "borders"}
            use:resizeY={{
                minHeight: () => window.innerHeight * 0.1,
                maxHeight: () => window.innerHeight * 0.33,
                startHeight: 200,
            }}
        >
            Borders
            <div class="resize-handle top" />
        </div>
        <!-- Brush editing view, hidden if not editing brushes -->
        <div
            class="brush-view"
            class:hidden={editingMode !== "brush" &&
                editingMode !== "brush-level"}
            use:resizeY={{
                minHeight: () => Math.min(100, window.innerHeight * 0.2),
                maxHeight: () => window.innerHeight * 0.5,
                startHeight: 200,
            }}
        >
            Brush
            <div class="resize-handle top" />
        </div>
        <!-- Level picker for brush editing, hidden if not editing brushes levels -->
        <div class:hidden={editingMode !== "brush-level"} class="level-view">
            Level
        </div>
        <!-- Palette picker. Always visible -->
        <div class:hidden={editingMode === "brush-list"} class="palette-view">
            Palette
        </div>
        <div class:hidden={editingMode === "brush-list"} class="footbar-view">
            Footbar!
        </div>
    </div>
</div>

<style lang="scss">
    .a {
        position: fixed;
        top: 8px;
        z-index: 1000;
        width: 296px;
        display: flex;
        flex-direction: column;
    }

    .sidebar-container {
        display: grid;
        height: 100%;
        grid-template-columns: 1fr;
        position: relative;
        user-select: none;
    }

    .layout {
        display: flex;
        flex-direction: column;
        flex-wrap: wrap;
        align-items: stretch;
        position: relative;
    }

    .layout > div:not(:first-child):not(.resize-) {
        border-top: 1px solid var(--light-shadow);
    }

    .topbar-view {
        background: var(--strong-bg);
        height: 120px;
    }
    .footbar-view {
        height: 20px;
        background: var(--tabs-bg);
    }
    .borders-view {
        display: grid;
        grid-template-rows: minmax(0, 1fr) 0;
    }
    .brush-view {
        display: grid;
        grid-template-rows: minmax(0, 1fr) 0;
    }
    .level-view {
        flex: 1;
    }
    .palette-view {
        flex: 4;
        flex-shrink: 1;
    }
    .multi-selection-view {
        max-height: 25%;
        min-height: 40px;
    }
    .brush-list-view {
        flex: 1;
    }
</style>
