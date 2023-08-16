<script lang="ts">
    import { getContext } from "svelte";
    import LayoutViewArea from "./layout/LayoutViewArea.svelte";
    import LayoutSidebar from "./layout/LayoutSidebar.svelte";
    import ScriptsSidebar from "./scripts/ScriptsSidebar.svelte";
    import { resizeX } from "src/systems/resize";
    import ToolButton from "./ToolButton.svelte";
    import { EditorTool } from "./editor/tools";
    import type { MapEditorContext } from "../MapEditor";
    import { tooltip } from "src/systems/tooltip";

    const context: MapEditorContext = getContext("context");
    const changes = context.changes;
    const changed = changes.updateStore;
    let selectedToolStore = context.selectedTool;
    const layoutLocked = context.layoutLocked;
    const playingAnimations = context.animations.playing;

    $: $playingAnimations,
        (() => {
            if ($playingAnimations) {
                context.animations.play();
            } else {
                context.animations.stop();
            }
        })();

    // The currently open tab (layout, level or scripts)
    $: activeTab = context.selectedTab;
</script>

<div class="editor">
    <div class="toolbar">
        <div class="buttons">
            <ToolButton
                bind:group={$selectedToolStore}
                value={EditorTool.Pencil}
                icon="mdi:pencil"
                title="Pencil"
                theme="secondary"
            />
            <ToolButton
                bind:group={$selectedToolStore}
                value={EditorTool.Rectangle}
                icon="mdi:square"
                title="Rectangle"
            />
            <ToolButton
                bind:group={$selectedToolStore}
                value={EditorTool.Fill}
                icon="mdi:bucket"
                title="Fill"
            />
            <ToolButton
                bind:group={$selectedToolStore}
                value={EditorTool.Replace}
                icon="mdi:wand"
                title="Replace"
            />
            <span class="separator" />
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
            <span class="separator" />
            <ToolButton
                icon="mdi:pinwheel"
                title="Start/Stop Animations"
                active={$playingAnimations}
                rotateOnActive={true}
                on:click={() => ($playingAnimations = !$playingAnimations)}
            />
        </div>
        <div class="actions">
            {#if $layoutLocked}
                <!-- svelte-ignore a11y-click-events-have-key-events -->
                <div
                    class="action"
                    use:tooltip
                    tooltip="Another Editor was editing this Layout first.<br><br>Close the other Map Editors or click here<br>to see which actions can be performed."
                    on:click={() => console.log("TODO")}
                >
                    <iconify-icon icon="mdi:lock" inline />
                    Editing Locked
                </div>
            {/if}
        </div>
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
        display: grid;
        grid-template-columns: 1fr max-content;
        align-items: center;
        gap: 8px;

        overflow-x: auto;
        overflow-y: hidden;

        grid-area: toolbar;
        background: var(--main-bg);
        box-shadow: 0 1px 0 var(--light-shadow);
        z-index: 1;

        .buttons {
            display: flex;
            flex-flow: row nowrap;
            padding: 0 2px;
            gap: 2px;

            .separator {
                color: transparent;
            }
        }

        .actions {
            display: flex;
            flex-flow: row nowrap;
            padding: 0 2px;
            gap: 2px;

            .action {
                padding: 4px 8px;
                border-radius: 8px;
                cursor: pointer;
                background: var(--warn-card-bg);
                color: var(--warn-card-fg);
                border: 1px solid var(--warn-card-border);
                justify-self: last baseline;

                &:hover {
                    background: var(--warn-card-bg-hover);
                    color: var(--warn-card-fg-hover);
                    border-color: var(--warn-card-border-hover);
                }
            }
        }

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
