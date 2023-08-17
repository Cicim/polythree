<script lang="ts">
    import { IconOption, Menu, Separator } from "src/systems/context_menu";
    import TextToolButton from "./TextToolButton.svelte";
    import { getContext } from "svelte";
    import type { MapEditorContext } from "../MapEditor";
    import ToolButton from "./ToolButton.svelte";

    const context: MapEditorContext = getContext("context");
    const changes = context.changes;
    const changed = changes.updateStore;
</script>

<div class="toolbar">
    <div class="buttons">
        <TextToolButton
            icon="carbon:save"
            text="Save"
            action="editor/save"
            title="Save Changes"
        />
        <TextToolButton
            text="Import"
            icon="bx:import"
            action="map_editor/import_map"
            title="Import Map"
            menu={new Menu([
                new IconOption(
                    "Import All Map Data",
                    "mdi:import",
                    "map_editor/import_map"
                ),
                new Separator("Specific Imports"),
                new IconOption("Import Layout Data", "mdi:grid", () => {}),
                new IconOption(
                    "Import Script Data",
                    "mdi:script-text",
                    () => {}
                ),
                new IconOption("Import Connections Data", "mdi:link", () => {}),
                new IconOption(
                    "Import Encounters Data",
                    "mdi:account-group",
                    () => {}
                ),
                new IconOption(
                    "Import Header Data",
                    "mdi:file-document-edit-outline",
                    () => {}
                ),
                new Separator("Config Imports"),
                new IconOption("Import Brushes", "mdi:brush", () => {}),
                new IconOption("Import Tileset Levels", "mdi:map", () => {}),
            ])}
        />
        <TextToolButton
            text="Export"
            icon="bx:export"
            action="map_editor/export_map"
            title="Export Map"
            menu={new Menu([
                new IconOption(
                    "Export All Map Data",
                    "mdi:export",
                    "map_editor/export_map"
                ),
                new Separator("Specific Exports"),
                new IconOption("Export Layout Data", "mdi:grid", () => {}),
                new IconOption(
                    "Export Script Data",
                    "mdi:script-text",
                    () => {}
                ),
                new IconOption("Export Connections Data", "mdi:link", () => {}),
                new IconOption(
                    "Export Encounters Data",
                    "mdi:account-group",
                    () => {}
                ),
                new IconOption(
                    "Export Header Data",
                    "mdi:file-document-edit-outline",
                    () => {}
                ),
                new Separator("Config Exports"),
                new IconOption("Export Brushes", "mdi:brush", () => {}),
                new IconOption("Export Tileset Levels", "mdi:map", () => {}),
            ])}
        />
        {#key $changed}
            <ToolButton
                icon="mdi:undo"
                title="Undo {changes.stack[
                    changes.top - 1
                ]?.changeName?.()} ({changes.stack[changes.top - 1]?.tab})"
                disabled={changes.top === 0}
                on:click={() => context.undo()}
            />
        {/key}
        {#key $changed}
            <ToolButton
                icon="mdi:redo"
                title="Redo {changes.stack[
                    changes.top
                ]?.changeName?.()} ({changes.stack[changes.top]?.tab})"
                disabled={changes.stack.length === changes.top}
                on:click={() => context.redo()}
            />
        {/key}
    </div>
</div>

<style lang="scss">
    .toolbar {
        grid-area: toolbar;
        z-index: 10;
        background: inherit;
    }
</style>
