import MapEditor from "./MapEditor.svelte";
import { TabbedEditorContext, type TabbedEditorTabs } from "../systems/contexts";
import { activeView } from "src/systems/views";
import { get, writable, type Writable } from "svelte/store";
import { PaintingMaterial, PaletteMaterial } from "./MapEditor/editor/materials";
import { EditorTool, Tool, toolFunctions } from "./MapEditor/editor/tools";
import { BlocksData } from "./MapEditor/editor/blocks_data";
import { BrushesModule } from "./MapEditor/modules/brushes_module";
import { PaletteModule } from "./MapEditor/modules/palette_module";
import { MapModule, type TilesetsData } from "./MapEditor/modules/map_module";
import { AnimationsModule } from "./MapEditor/modules/animations_module";
import { ActionsModule } from "./MapEditor/modules/actions_module";

export interface MapEditorProperties {
    group: number;
    index: number;
}

export interface MapEditorData {
    header: Writable<MapData>,
    layout?: Writable<MapLayoutData>,
    tilesets?: Writable<TilesetsData>,
}

type MapEditorTabsIds = "layout" | "permissions" | "events" | "connections" | "encounters" | "header";

export enum MapEditorTabs {
    Layout = "layout",
    Permissions = "permissions",
    Events = "events",
    Connections = "connections",
    Encounters = "encounters",
    Header = "header",
}

export class MapEditorContext extends TabbedEditorContext<MapEditorTabsIds> {
    public static icon = "mingcute:map-2-fill";
    public name = "Map Editor";
    public singularTab = true;
    declare public identifier: MapEditorProperties;
    declare public component: MapEditor;
    public data: MapEditorData = {
        header: writable(null),
        layout: writable(null),
        tilesets: writable(null),
    };

    constructor(id: MapEditorProperties) {
        // Create the editor element
        super(MapEditor, { ...id });
        this.subtitle.set(id.group + "." + id.index);
        this.selectedTab.set("layout");
    }

    // Drawing
    /** The currently selected material */
    public material: Writable<PaintingMaterial>;
    /** The selected tool's id */
    public selectedTool: Writable<EditorTool>;

    // Modules
    public map: MapModule = new MapModule(this);
    public brushes: BrushesModule = new BrushesModule(this);
    public palette: PaletteModule = new PaletteModule(this);
    public animations: AnimationsModule = new AnimationsModule(this);
    public actions: ActionsModule = new ActionsModule(this);

    // Tileset
    public tileset1Offset: number;
    public tileset2Offset: number;
    public tileset1Length: number;
    public tileset2Length: number;
    public layoutId: number;
    public layoutOffset: number;

    public tabs: TabbedEditorTabs<MapEditorTabsIds> = {
        [MapEditorTabs.Header]: {
            title: "Header",
            icon: "mdi:file-document-edit-outline",
        },
        [MapEditorTabs.Encounters]: {
            title: "Encounters",
            icon: "mdi:account-group",
        },
        [MapEditorTabs.Connections]: {
            title: "Connections",
            icon: "mdi:link",
        },
        [MapEditorTabs.Events]: {
            title: "Events",
            icon: "mdi:script-text",
        },
        [MapEditorTabs.Permissions]: {
            title: "Permissions",
            icon: "mdi:map",
            isLocked: false,
        },
        [MapEditorTabs.Layout]: {
            title: "Layout",
            icon: "mdi:grid",
            isLocked: false,
        }
    }

    public async save(): Promise<boolean> {
        if (this.startSaving()) return;
        // Wait 1 seconds
        await new Promise(resolve => setTimeout(resolve, 1000));

        return this.doneSaving();
    }

    public onSelect = () => {
        this.palette.tryToRebuildPermissions();
    };

    /** Close all modules before closing the tab */
    public async onBeforeClose() {
        // Try to save the map's configs before closing
        if (!this.isLoading) {
            // Save the tileset levels
            await this.palette.save();
            // Save the brushes
            await this.brushes.save();
        }
        // Unlocks acquired layouts
        this.map.onClose();
        // Closes running timeouts
        this.animations.exit();
    }

    public async load() {
        this.loading.set(true);
        this._cosmeticHasSideTabs = false;

        // Load the header data
        if (!await this.map.load()) {
            this.close();
            return;
        }
        // Load the palette
        await this.palette.load(this.map.tilesetLengths);
        // Load brushes
        await this.brushes.load();

        // Load a basic material
        this.material = writable(new PaletteMaterial(
            BlocksData.fromBlockData(this.palette.$blocks.get(0, 0))
        ));
        // Select the pencil
        this.selectedTool = writable(EditorTool.Pencil);

        // Update the cosmetics
        this._cosmeticHasSideTabs = true, activeView.update(_ => _);
        // Start rendering the editor
        this.loading.set(false);

        // Load the animations when ready
        this.animations.load();
    }

    // ANCHOR Editor Methods
    public get toolClass(): typeof Tool {
        return toolFunctions[get(this.selectedTool)];
    }


    // ANCHOR Editor Actions
    public async undo() {
        if (this.brushes.isEditing)
            this.brushes.undoBrushChanges();
        else
            super.undo();
    }
    public async redo() {
        if (this.brushes.isEditing)
            this.brushes.redoBrushChanges();
        else
            super.redo();
    }
    public get layoutLocked() { return this.map.isLayoutLocked; }
}

ActionsModule.redefineBindings();