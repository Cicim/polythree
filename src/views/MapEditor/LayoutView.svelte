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
    import TextToolButton from "./TextToolButton.svelte";
    import { IconOption, Menu, Separator } from "src/systems/context_menu";

    const context: MapEditorContext = getContext("context");
    const tab = context.selectedTab;
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
            {#if $tab !== "scripts"}
                <ToolButton
                    bind:group={$selectedToolStore}
                    value={EditorTool.Pencil}
                    action="map_editor/select_pencil"
                    icon="mdi:pencil"
                    title="Pencil"
                />
                <ToolButton
                    bind:group={$selectedToolStore}
                    value={EditorTool.Rectangle}
                    action="map_editor/select_rectangle"
                    icon="mdi:square"
                    title="Rectangle"
                />
                <ToolButton
                    bind:group={$selectedToolStore}
                    value={EditorTool.Fill}
                    action="map_editor/select_fill"
                    icon="mdi:bucket"
                    title="Fill"
                />
                <ToolButton
                    bind:group={$selectedToolStore}
                    value={EditorTool.Replace}
                    action="map_editor/select_replace"
                    icon="mdi:wand"
                    title="Replace"
                />
                <span class="separator" />
                <ToolButton
                    icon="mdi:pinwheel"
                    title="Start/Stop Animations"
                    action="map_editor/toggle_animations"
                    active={$playingAnimations}
                    rotateOnActive={true}
                    on:click={() => ($playingAnimations = !$playingAnimations)}
                />
                <span class="separator" />
            {/if}
        </div>
        <div class="actions">
            {#if $tab !== "scripts"}
                <TextToolButton
                    title="Resize Map"
                    icon="mdi:resize"
                    action="map_editor/resize_main_map"
                    menu={new Menu([
                        new IconOption(
                            "Resize Map",
                            "mdi:resize",
                            "map_editor/resize_main_map"
                        ),
                        new IconOption(
                            "Resize Borders",
                            "mdi:resize",
                            "map_editor/resize_borders_map"
                        ),
                    ])}
                />
                <TextToolButton
                    title="Change Tilesets"
                    icon="mdi:puzzle"
                    menu={new Menu([
                        new IconOption(
                            "Change Tilesets",
                            "mdi:puzzle",
                            () => {}
                        ),
                        new Separator(),
                        new IconOption(
                            "Open Tilesets Editor",
                            "typcn:export",
                            () => {}
                        ),
                    ])}
                />
            {/if}
            {#if $layoutLocked && ($tab === "layout" || $tab === "level")}
                <span class="separator" />
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
