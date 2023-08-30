import { redefineBindings } from "src/systems/bindings";
import { getPtrOffset } from "src/systems/rom";
import type { MapEditorContext } from "src/views/MapEditor";
import { get } from "svelte/store";
import { spawnLayoutPickerDialog } from "../dialogs/LayoutPickerDialog.svelte";
import { spawnResizeMapDialog } from "../dialogs/ResizeMapDialog.svelte";
import { spawnTilesetPickerDialog } from "../dialogs/TilesetPickerDialog.svelte";
import { EditorTool } from "../editor/tools";
import { UpdateLayoutChange, UpdateTilesetsChange } from "./map_module";
import type { PaletteModule } from "./palette_module";

export class ActionsModule {
    constructor(public context: MapEditorContext) { }

    // ANCHOR Getters
    public get palette(): PaletteModule { return this.context.palette; }
    public get tab(): string { return this.context.tab; }
    public get map() { return this.context.map; }
    public get brushes() { return this.context.brushes; }
    public get animations() { return this.context.animations; }
    public get selectedTool() { return this.context.selectedTool; }
    public get material() { return this.context.material; }
    public get $data() { return get(this.context.data); }
    public get layoutLocked() { return get(this.context.map.isLayoutLocked); }

    // ANCHOR Methods
    public selectLayoutEditor() {
        this.context.changeTab("layout");
    }
    public selectPermissionsEditor() {
        this.context.changeTab("permissions");
    }
    public selectEventsEditor() {
        this.context.changeTab("events");
    }
    public selectEncountersEditor() {
        this.context.changeTab("encounters");
    }
    public selectConnectionsEditor() {
        this.context.changeTab("connections");
    }
    public selectHeaderEditor() {
        this.context.changeTab("header");
    }
    public zoomIn: () => void = () => { };
    public zoomOut: () => void = () => { };

    public undoTilesetChanges() {
        this.palette.undoChanges();
    }
    public redoTilesetChanges() {
        this.palette.redoChanges();
    }

    public async resizeMap() {
        if (this.layoutLocked) return
        // Ask the user for confirmation
        await spawnResizeMapDialog({
            layoutName: "Map",
            context: this.context,
            canvas: this.map.mainCanvas,
            blocks: this.map.$data.layout.map_data,
        });
    }
    public async resizeBorders() {
        if (this.tab !== "permissions" && this.tab !== "layout" || this.layoutLocked) return
        // Ask the user for confirmation
        await spawnResizeMapDialog({
            layoutName: "Borders",
            context: this.context,
            canvas: this.map.bordersCanvas,
            blocks: this.map.$data.layout.border_data,
            MAX_WIDTH: 4,
            MAX_HEIGHT: 4,
            MAX_MAP_AREA: 4,
        });
    }
    public async updateLayout() {
        // Ask the user for confirmation
        const newIdResult = await spawnLayoutPickerDialog({
            reason: "Choose a new layout to use for this map.",
            isReasonError: false,
            initialLayout: this.$data.header.header.map_layout_id,
        });
        // If the user didn't choose a layout, cancel
        if (!newIdResult) return;

        // Update the layout
        const change = new UpdateLayoutChange(this.context, newIdResult);
        // Apply the change
        change.tab = this.context.tab;
        await change.firstApply();
        if (!change.applyWorked) return;
        // Push the change if it worked
        else this.context.changes.pushNoApply(change);
    }
    public async updateTilesets() {
        // Ask the user for confirmation
        const dialogResult = await spawnTilesetPickerDialog({
            reason: "Choose a new tileset to use for this map.",
            isReasonError: false,
            primaryTileset: getPtrOffset(this.$data.layout.header.primary_tileset),
            secondaryTileset: getPtrOffset(this.$data.layout.header.secondary_tileset),
        });
        // If the user didn't choose a tileset, cancel
        if (!dialogResult) return;

        // Update the tilesets
        const change = new UpdateTilesetsChange(this.context, ...dialogResult);

        // Apply the change
        change.tab = this.context.tab;
        await change.firstApply();
        if (!change.applyWorked) return;
        // Push the change if it worked
        else this.context.changes.pushNoApply(change);
    }

    public static redefineBindings() {
        redefineBindings({
            "map_editor/select_layout": (view: MapEditorContext) => {
                view.actions.selectLayoutEditor();
            },
            "map_editor/select_permissions": (view: MapEditorContext) => {
                view.actions.selectPermissionsEditor();
            },
            "map_editor/select_events": (view: MapEditorContext) => {
                view.actions.selectEventsEditor();
            },
            "map_editor/select_encounters": (view: MapEditorContext) => {
                view.actions.selectEncountersEditor();
            },
            "map_editor/select_connections": (view: MapEditorContext) => {
                view.actions.selectConnectionsEditor();
            },
            "map_editor/select_header": (view: MapEditorContext) => {
                view.actions.selectHeaderEditor();
            },
            "map_editor/zoom_in": (view: MapEditorContext) => {
                view.actions.zoomIn();
            },
            "map_editor/zoom_out": (view: MapEditorContext) => {
                view.actions.zoomOut();
            },
            "map_editor/undo_tileset_permissions_changes": (view: MapEditorContext) => {
                view.actions.undoTilesetChanges();
            },
            "map_editor/redo_tileset_permissions_changes": (view: MapEditorContext) => {
                view.actions.redoTilesetChanges();
            },
            "map_editor/palette_move_up": (view: MapEditorContext) => {
                view.palette.move(0, -1, false);
            },
            "map_editor/palette_select_up": (view: MapEditorContext) => {
                view.palette.move(0, -1, true);
            },
            "map_editor/palette_move_down": (view: MapEditorContext) => {
                view.palette.move(0, 1, false);
            },
            "map_editor/palette_select_down": (view: MapEditorContext) => {
                view.palette.move(0, 1, true);
            },
            "map_editor/palette_move_left": (view: MapEditorContext) => {
                view.palette.move(-1, 0, false);
            },
            "map_editor/palette_select_left": (view: MapEditorContext) => {
                view.palette.move(-1, 0, true);
            },
            "map_editor/palette_move_right": (view: MapEditorContext) => {
                view.palette.move(1, 0, false);
            },
            "map_editor/palette_select_right": (view: MapEditorContext) => {
                view.palette.move(1, 0, true);
            },
            "map_editor/select_pencil": (view: MapEditorContext) => {
                view.selectedTool.set(EditorTool.Pencil);
            },
            "map_editor/select_rectangle": (view: MapEditorContext) => {
                view.selectedTool.set(EditorTool.Rectangle);
            },
            "map_editor/select_fill": (view: MapEditorContext) => {
                view.selectedTool.set(EditorTool.Fill);
            },
            "map_editor/select_replace": (view: MapEditorContext) => {
                view.selectedTool.set(EditorTool.Replace);
            },
            "map_editor/export_map": (view: MapEditorContext) => {
                console.log("Export Map");
            },
            "map_editor/import_map": (view: MapEditorContext) => {
                console.log("Import Map");
            },
            "map_editor/toggle_animations": (view: MapEditorContext) => {
                view.animations.togglePlaying();
            },
            "map_editor/resize_main_map": (view: MapEditorContext) => {
                view.actions.resizeMap();
            },
            "map_editor/resize_borders_map": (view: MapEditorContext) => {
                view.actions.resizeBorders();
            },
            "map_editor/change_layout": (view: MapEditorContext) => {
                view.actions.updateLayout();
            },
            "map_editor/change_tilesets": (view: MapEditorContext) => {
                view.actions.updateTilesets();
            }
        });
    }
}