<script lang="ts">
    import { getContext } from "svelte";
    import LayoutViewArea from "./layout/LayoutViewArea.svelte";
    import LayoutSidebar from "./layout/LayoutSidebar.svelte";
    import ScriptsSidebar from "./scripts/ScriptsSidebar.svelte";
    import { resizeX } from "src/systems/resize";
    import ToolButton from "./ToolButton.svelte";
    import { EditorTool } from "./editor/tools";
    import type { MapEditorContext } from "../MapEditor";
    import TextToolButton from "./TextToolButton.svelte";
    import { IconOption, Menu, Separator } from "src/systems/context_menu";

    const context: MapEditorContext = getContext("context");
    const tab = context.selectedTab;
    let selectedToolStore = context.selectedTool;
    const layoutLocked = context.map.isLayoutLocked;
    const playingAnimations = context.animations.playing;

    $: $playingAnimations,
        (() => {
            if ($playingAnimations) {
                context.animations.play();
            } else {
                context.animations.stop();
            }
        })();

    function closeOtherEditorsWithSameLayout() {
        const toClose = [];
        for (const view of context.getOtherViews()) {
            if (
                view.map.ownedLayouts.includes(context.layoutId) ||
                view.layoutId === context.layoutId
            )
                toClose.push(view);
        }
        for (const view of toClose.reverse()) {
            view.close();
        }
    }

    function goToLayoutOwner() {
        for (const view of context.getOtherViews()) {
            if (view.map.ownedLayouts.includes(context.layoutId)) {
                view.select();
                return;
            }
        }
    }

    // The currently open tab (layout, level or scripts)
    $: activeTab = context.selectedTab;
</script>

<div class="editor">
    <div class="toolbar">
        <div class="buttons">
            {#if $tab !== "events"}
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
            {#if $tab !== "events"}
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
                    action="map_editor/change_tilesets"
                    menu={new Menu([
                        new IconOption(
                            "Change Tilesets",
                            "mdi:puzzle",
                            "map_editor/change_tilesets"
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
            {#if $layoutLocked && ($tab === "layout" || $tab === "permissions")}
                <span class="separator" />
                <TextToolButton
                    on:click={closeOtherEditorsWithSameLayout}
                    title="Another Editor was editing this Layout first.<br><br>Click here to close other Map Editors<br> or click on the menu to see<br> which actions can be performed."
                    theme="warning"
                    icon="mdi:lock"
                    menu={new Menu([
                        new IconOption(
                            "Close Owner Editors",
                            "mdi:close",
                            closeOtherEditorsWithSameLayout
                        ),
                        new IconOption(
                            "Go to Owner Editor",
                            "typcn:export",
                            goToLayoutOwner
                        ),
                    ])}
                />
            {/if}
        </div>
    </div>
    <div class="area">
        <LayoutViewArea editLevels={$activeTab === "permissions"} />
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
            hidden={$activeTab !== "layout" && $activeTab !== "permissions"}
            permissionMode={$activeTab === "permissions"}
        />
        <ScriptsSidebar hidden={$activeTab !== "events"} />
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
