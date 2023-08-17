import { redefineBindings } from "src/systems/bindings";
import { spawnDialog } from "src/systems/dialogs";
import type { MapEditorContext } from "src/views/MapEditor";
import ResizeMapDialog from "../dialogs/ResizeMapDialog.svelte";
import { EditorTool } from "../editor/tools";
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



    // ANCHOR Methods
    public selectLayoutEditor() {
        this.context.changeTab("layout");
    }
    public selectLevelEditor() {
        this.context.changeTab("level");
    }
    public selectScriptsEditor() {
        this.context.changeTab("scripts");
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
        if (this.tab !== "level" && this.tab !== "layout") return
        // Ask the user for confirmation
        await spawnDialog(ResizeMapDialog, {
            layoutName: "Map",
            context: this.context,
            canvas: this.map.mainCanvas,
            blocks: this.map.$data.layout.map_data,
        });
    }
    public async resizeBorders() {
        if (this.tab !== "level" && this.tab !== "layout") return
        // Ask the user for confirmation
        await spawnDialog(ResizeMapDialog, {
            layoutName: "Borders",
            context: this.context,
            canvas: this.map.bordersCanvas,
            blocks: this.map.$data.layout.border_data,
            MAX_WIDTH: 4,
            MAX_HEIGHT: 4,
            MAX_MAP_AREA: 4,
        });
    }

    public static redefineBindings() {
        redefineBindings({
            "map_editor/select_layout": (view: MapEditorContext) => {
                view.actions.selectLayoutEditor();
            },
            "map_editor/select_level": (view: MapEditorContext) => {
                view.actions.selectLevelEditor();
            },
            "map_editor/select_scripts": (view: MapEditorContext) => {
                view.actions.selectScriptsEditor();
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
            "map_editor/undo_tileset_level_changes": (view: MapEditorContext) => {
                view.actions.undoTilesetChanges();
            },
            "map_editor/redo_tileset_level_changes": (view: MapEditorContext) => {
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
                if (view.tab === "layout" || view.tab === "level")
                    view.selectedTool.set(EditorTool.Pencil);
            },
            "map_editor/select_rectangle": (view: MapEditorContext) => {
                if (view.tab === "layout" || view.tab === "level")
                    view.selectedTool.set(EditorTool.Rectangle);
            },
            "map_editor/select_fill": (view: MapEditorContext) => {
                if (view.tab === "layout" || view.tab === "level")
                    view.selectedTool.set(EditorTool.Fill);
            },
            "map_editor/select_replace": (view: MapEditorContext) => {
                if (view.tab === "layout" || view.tab === "level")
                    view.selectedTool.set(EditorTool.Replace);
            },
            "map_editor/export_map": (view: MapEditorContext) => {
                console.log("Export Map");
            },
            "map_editor/import_map": (view: MapEditorContext) => {
                console.log("Import Map");
            },
            "map_editor/toggle_animations": (view: MapEditorContext) => {
                if (view.tab === "layout" || view.tab === "level")
                    view.animations.togglePlaying();
            },
            "map_editor/resize_main_map": (view: MapEditorContext) => {
                view.actions.resizeMap();
            },
            "map_editor/resize_borders_map": (view: MapEditorContext) => {
                view.actions.resizeBorders();
            },
        });
    }
}