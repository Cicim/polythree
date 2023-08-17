import MapEditor from "./MapEditor.svelte";
import { TabbedEditorContext, type TabbedEditorTabs } from "../systems/contexts";
import { activeView, ViewContext } from "src/systems/views";
import { get, writable, type Writable } from "svelte/store";
import { PaintingMaterial, PaletteMaterial } from "./MapEditor/editor/materials";
import { EditorTool, Tool, toolFunctions } from "./MapEditor/editor/tools";
import { BlocksData } from "./MapEditor/editor/blocks_data";
import { BrushesModule } from "./MapEditor/context/brushes_module";
import { PaletteModule } from "./MapEditor/context/palette_module";
import { MapModule, type MapHeaderData, type MapLayoutData, type TilesetsData } from "./MapEditor/context/map_module";
import { AnimationsModule } from "./MapEditor/context/animations_module";
import { ActionsModule } from "./MapEditor/context/actions_module";

export interface MapEditorProperties {
    group: number;
    index: number;
}

export interface MapEditorData {
    header: MapHeaderData,
    layout?: MapLayoutData,
    tilesets?: TilesetsData,
}

export class MapEditorContext extends TabbedEditorContext {
    public name = "Map Editor";
    public singularTab = true;
    declare public identifier: MapEditorProperties;
    declare public component: MapEditor;
    declare public data: Writable<MapEditorData>;

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
    /** True if the layout cannot be edited */
    public layoutLocked: Writable<boolean> = writable(false);

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

    public tabs: TabbedEditorTabs = {
        "header": {
            title: "Header",
            icon: "mdi:file-document-edit-outline",
        },
        "encounters": {
            title: "Encounters",
            icon: "mdi:account-group",
        },
        "connections": {
            title: "Connections",
            icon: "mdi:link",
        },
        "scripts": {
            title: "Scripts",
            icon: "mdi:script-text",
        },
        "level": {
            title: "Level",
            icon: "mdi:map",
            isLocked: false,
        },
        "layout": {
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
        this.palette.tryToRebuildLevels();
    };

    public async close(): Promise<boolean> {
        // Try to save the map's configs before closing
        if (!this.isLoading) {
            // Save the tileset levels
            await this.palette.save();
            // Save the brushes
            await this.brushes.save();
        }
        this.animations.exit();
        return super.close();
    }

    public async load() {
        this.loading.set(true);
        this._cosmeticHasSideTabs = false;

        // Load the header data
        if (!await this.map.load()) return;
        // Load the tileset
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
        this._cosmeticHasSideTabs = true, activeView.set(this as ViewContext);
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
}

ActionsModule.redefineBindings();