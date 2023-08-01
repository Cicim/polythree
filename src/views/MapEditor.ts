import MapEditor from "./MapEditor.svelte";
import { TabbedEditorContext } from "../systems/contexts";
import { openViews } from "src/systems/views";
import { redefineBindings } from "src/systems/bindings";
import { get, writable, type Writable } from "svelte/store";
import { spawnDialog } from "src/systems/dialogs";
import AlertDialog from "src/components/dialog/AlertDialog.svelte";
import { invoke } from "@tauri-apps/api";
import LayoutPickerDialog from "./MapEditor/dialogs/LayoutPickerDialog.svelte";
import { getPtrOffset } from "src/systems/rom";
import TilesetPickerDialog from "./MapEditor/dialogs/TilesetPickerDialog.svelte";
import { config } from "src/systems/global";
import { PaintingMaterial, PaletteMaterial } from "./MapEditor/editor/materials";
import type { BrushMaterial, BrushesChangesData } from "./MapEditor/editor/brushes";
import { EditorTool, Tool, toolFunctions } from "./MapEditor/editor/tools";
import { EditorChanges } from "src/systems/changes";

export interface MapEditorProperties {
    group: number;
    index: number;
}

export interface MapHeaderData {
    header: MapHeader,
    connections?: unknown,
    events?: unknown,
    map_scripts?: unknown,
}

export interface MapLayoutData {
    index: number;
    bits_per_block: number;
    map_data: BlockData[][];
    border_data: BlockData[][];
    header: MapLayout;
}

export type TilesetData = [HTMLImageElement, HTMLImageElement][];

export interface MapEditorData {
    header: MapHeaderData,
    layout?: MapLayoutData,
    tilesets?: TilesetData,
}

export class MapEditorContext extends TabbedEditorContext {
    public name = "Map Editor";
    public singularTab = true;
    declare public identifier: MapEditorProperties;
    declare public component: MapEditor;
    declare public data: Writable<MapEditorData>;


    // Drawing
    /** The currently selected material */
    public material: Writable<PaintingMaterial>;
    /** The selected tool's id */
    public selectedTool: Writable<EditorTool>;

    // Brushes
    /** The list of brushes loaded for this tileset */
    public brushes: Writable<BrushMaterial[]>;
    /** The brush you're currently editing, if any */
    public editingBrush: Writable<BrushMaterial>;
    /** The index of the editing brush withing the brushes */
    public editingBrushIndex: number;
    /** The changes that are applied to the editing brush */
    public editingBrushChanges: Writable<EditorChanges<null>>;
    /** A clone of the brush you've just started editing at the moment 
     * before you made any edits to it */
    public editingBrushClone: Writable<BrushMaterial>;
    /** The changes that are applied to the brushes store */
    public brushesChanges: EditorChanges<BrushesChangesData>;

    // Tileset Palette
    /** The block data for the tilset level editor */
    public tilesetBlocks: Writable<BlockData[][]>;
    /** The changes that are applied to the tileset level editor */
    public tilesetLevelChanges: EditorChanges<null>;


    private tileset1Offset: number;
    private tileset2Offset: number;
    private tileset1Length: number;
    private tileset2Length: number;

    public tabs = {
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
        },
        "layout": {
            title: "Layout",
            icon: "mdi:grid",
        }
    }

    public async save(): Promise<boolean> {
        if (this.startSaving()) return;
        // Wait 1 seconds
        await new Promise(resolve => setTimeout(resolve, 1000));

        return this.doneSaving();
    }

    public async close(): Promise<boolean> {
        if (!get(this.isLoading))
            this.exportTilesetsLevels();
        return super.close();
    }

    public async load() {
        this.isLoading.set(true);
        this._cosmeticHasSideTabs = false;

        // Load the map header data
        let headerData: MapHeaderData;
        try {
            headerData = await invoke('get_map_header_data', {
                group: this.identifier.group,
                index: this.identifier.index,
            });
        }
        catch (message) {
            // If the map header failed to load, close the editor
            await spawnDialog(AlertDialog, {
                title: "Failed to load map header",
                message,
            });
            this.isLoading.set(false);
            this.close();
            return;
        }

        // Load the map layout data
        const layoutResults = await this.loadLayoutUntilValid(headerData.header.map_layout_id);
        if (layoutResults === null) {
            // If the user asked to quit, close the editor
            this.isLoading.set(false);
            this.close();
            return;
        }
        const [layoutId, layoutOffset, layoutData] = layoutResults;
        headerData.header.map_layout_id = layoutId;
        headerData.header.map_layout = { offset: layoutOffset };

        // Update the rom with the new layout id
        try {
            await invoke('update_map_header', {
                group: this.identifier.group, index: this.identifier.index,
                header: headerData.header
            });
        }
        catch (message) {
            // If the map header failed to load, close the editor
            await spawnDialog(AlertDialog, {
                title: "Failed to update map header",
                message,
            });
            this.isLoading.set(false);
            this.close();
            return;
        }

        const tilesetResults = await this.loadTilesetsUntilValid(
            getPtrOffset(layoutData.header.primary_tileset),
            getPtrOffset(layoutData.header.secondary_tileset)
        );
        if (tilesetResults === null) {
            // If the user asked to quit, close the editor
            this.isLoading.set(false);
            this.close();
            return;
        }
        const [tileset1, tileset2, tilesetData] = tilesetResults;
        this.tileset1Offset = tileset1;
        this.tileset2Offset = tileset2;
        layoutData.header.primary_tileset = { offset: tileset1 };
        layoutData.header.secondary_tileset = { offset: tileset2 };

        // Update the rom with the new tileset ids
        try {
            await invoke('update_layout_header', {
                id: layoutId,
                header: layoutData.header
            });
        }
        catch (message) {
            // If the map header failed to load, close the editor
            await spawnDialog(AlertDialog, {
                title: "Failed to update layout header",
                message,
            });
            this.isLoading.set(false);
            this.close();
            return;
        }

        // Convert tilesetData to images
        const lowPromises: Promise<HTMLImageElement>[] = [];
        const hiPromises: Promise<HTMLImageElement>[] = [];
        for (const metatile of tilesetData) {
            lowPromises.push(this.convertStringToImage(metatile[0]));
            hiPromises.push(this.convertStringToImage(metatile[1]));
        }
        const lowImages = await Promise.all(lowPromises);
        const hiImages = await Promise.all(hiPromises);
        const allImages: TilesetData = lowImages.map((low, i) => [low, hiImages[i]])

        this.data.set({ header: headerData, layout: layoutData, tilesets: allImages });

        // Get the tilesets lengths
        try {
            [this.tileset1Length, this.tileset2Length] =
                await invoke('get_tilesets_lengths', { tileset1, tileset2 }) as [number, number];
        }
        catch (message) {
            // If the map header failed to load, close the editor
            await spawnDialog(AlertDialog, {
                title: "Could not load tilesets lengths",
                message,
            });
            this.isLoading.set(false);
            this.close();
            return;
        }

        // Get the levels for these tilesets from config
        const importedTilesetLevels = await this.importTilesetsLevels();
        // Compose the block data for the tileset level editor
        const tilesetBlocks = new Array(Math.ceil(allImages.length / 8));
        for (let y = 0; y < tilesetBlocks.length; y++) {
            tilesetBlocks[y] = [];
            for (let x = 0; x < 8; x++)
                tilesetBlocks[y][x] = [y * 8 + x, importedTilesetLevels[y * 8 + x]];
        }
        this.tilesetBlocks = writable(tilesetBlocks);
        this.tilesetLevelChanges = new EditorChanges(null);

        this.material = writable(new PaletteMaterial([[tilesetBlocks[0][0]]]));
        this.selectedTool = writable(EditorTool.Pencil);

        // TODO Get from configs
        this.brushes = writable([]);
        this.brushesChanges = new EditorChanges<BrushesChangesData>([this.brushes, this.material, () => get(this.tilesetBlocks)[0][0]]);
        // Set the currently editing brush
        this.editingBrush = writable(null);
        this.editingBrushClone = writable(null);
        this.editingBrushChanges = writable(null);

        // Update the cosmetics
        this._cosmeticHasSideTabs = true;
        // Trigger a re-render
        openViews.update(views => views);
        this.isLoading.set(false);
    }

    /** Ask the user for a layout until that layout is valid for this map */
    private async loadLayoutUntilValid(id?: number): Promise<[number, number, MapLayoutData]> {
        while (true) {
            try {
                // Get the layout offset
                const offset: number = await invoke('get_layout_offset', { id });
                return [id, offset, await invoke('get_map_layout_data', { id })];
            }
            catch (message) {
                // Spawn a dialog asking the user to select a layout
                const layoutId: number = await spawnDialog(LayoutPickerDialog, {
                    reason: `Could not load layout ${id}: ${message}`
                });

                // If the user asked to quit, close the editor
                if (layoutId === null) {
                    return null;
                }
                // Otherwise, try again with the new layout id
                id = layoutId;
            }
        }
    }

    /** Ask the user for tilesets until they are valid for this map */
    private async loadTilesetsUntilValid(tileset1: number, tileset2: number): Promise<[number, number, [string, string][]]> {
        while (true) {
            try {
                return [
                    tileset1, tileset2,
                    await invoke('get_rendered_tilesets', { tileset1, tileset2 })
                ];
            }
            catch (message) {
                const names = get(config).tileset_names;

                const tilesets = await spawnDialog(TilesetPickerDialog, {
                    reason: `Could not load tilesets (${names[tileset1]}, 
                        ${names[tileset2]}): ${message}`
                });

                if (tilesets === null) return null;

                [tileset1, tileset2] = tilesets;
            }
        }
    }

    /** Convert a string to an image */
    private async convertStringToImage(string: string): Promise<HTMLImageElement> {
        const image = new Image();
        image.src = string;
        await new Promise(resolve => image.onload = resolve);
        return image;
    }

    private async importTilesetsLevels(): Promise<number[]> {
        // Get the tileset levels
        const t1Levels = await this._parseTilesetLevels(this.tileset1Offset, this.tileset1Length);
        const t2Levels = await this._parseTilesetLevels(this.tileset2Offset, this.tileset2Length);

        return [...t1Levels, ...t2Levels];
    }

    public async exportTilesetsLevels(): Promise<void> {
        // Get the tileset levels from the editor
        const tilesetLevels = get(this.tilesetBlocks).flat().map(block => block[1]);
        // Divide the two tilsets based on the lengths
        const t1Levels = tilesetLevels.slice(0, this.tileset1Length);
        const t2Levels = tilesetLevels.slice(this.tileset1Length, this.tileset1Length + this.tileset2Length);
        // Convert the levels to a string
        const t1LevelChars = this._encodeTilesetLevels(t1Levels);
        const t2LevelChars = this._encodeTilesetLevels(t2Levels);
        // Update the configs with the new tileset levels
        config.update(config => {
            config.tileset_levels[this.tileset1Offset] = t1LevelChars;
            config.tileset_levels[this.tileset2Offset] = t2LevelChars;
            return config;
        });
        // Update the tileset the configs jsons too
        await invoke("update_tileset_level", { tileset: this.tileset1Offset, levels: t1LevelChars });
        await invoke("update_tileset_level", { tileset: this.tileset2Offset, levels: t2LevelChars });
    }

    private async _parseTilesetLevels(tilesetOffset: number, tilesetLength: number) {
        const levelChars = get(config).tileset_levels[tilesetOffset];

        // If you can't find the levelChars, return a list of null as long as the tileset
        if (levelChars === undefined) {
            // Update the configs with the new tileset levels
            config.update(config => {
                config.tileset_levels[tilesetOffset] = "";
                return config;
            });
            await invoke("update_tileset_level", { tileset: tilesetOffset, levels: "" })
            return new Array(tilesetLength).fill(null);
        }
        // Otherwise, read the data from the levelChars
        else {
            const data = new Array(tilesetLength).fill(null);

            for (let i = 0; i < levelChars.length; i++) {
                const char = levelChars[i];
                if (char === "=") data[i] = null;
                else {
                    if (char === "/") data[i] = 29;
                    else data[i] = levelChars.charCodeAt(i) - 63;

                    // Convert it back to the original format
                    if (data[i] % 2 === 0)
                        data[i] = Math.floor(data[i] / 2);
                    else
                        data[i] = Math.floor(data[i] / 2) + 0x100;
                }


            }

            return data;
        }
    }

    private _encodeTilesetLevels(levels: number[]) {
        let levelChars = "";
        let nullsEncountered = 0;

        for (const level of levels) {
            if (level === null) {
                nullsEncountered++;
                continue;
            }
            else {
                // Add the nulls   
                levelChars += "=".repeat(nullsEncountered);
                nullsEncountered = 0;

                let compressedLevel = (level & 0xFF) * 2;
                if (level & 0x100)
                    compressedLevel++;
                if (level === null)
                    compressedLevel = null;

                if (compressedLevel === 29) levelChars += "/";
                else levelChars += String.fromCharCode(compressedLevel + 63);
            }
        }

        return levelChars;
    }

    constructor(id: MapEditorProperties) {
        // Create the editor element
        super(MapEditor, { ...id });
        this.subtitle.set(id.group + "." + id.index);
        this.selectedTab.set("layout");
    }

    // ANCHOR Editor Methods
    public get toolClass(): typeof Tool {
        return toolFunctions[get(this.selectedTool)];
    }


    // ANCHOR Editor Actions
    public selectLayoutEditor() {
        this.changeTab("layout");
    }
    public selectLevelEditor() {
        this.changeTab("level");
    }
    public selectScriptsEditor() {
        this.changeTab("scripts");
    }
    public selectEncountersEditor() {
        this.changeTab("encounters");
    }
    public selectConnectionsEditor() {
        this.changeTab("connections");
    }
    public selectHeaderEditor() {
        this.changeTab("header");
    }
    public zoomIn: () => void = () => { };
    public zoomOut: () => void = () => { };

    public undoTilesetChanges() {
        this.tilesetLevelChanges.undo();
    }
    public redoTilesetChanges() {
        this.tilesetLevelChanges.redo();
    }

    public async undo() {
        if (get(this.editingBrushChanges) !== null)
            get(this.editingBrushChanges).undo();
        else
            super.undo();
    }
    public async redo() {
        if (get(this.editingBrushChanges) !== null)
            get(this.editingBrushChanges).redo();
        else
            super.redo();
    }
}

redefineBindings({
    "map_editor/select_layout": (view: MapEditorContext) => {
        view.selectLayoutEditor();
    },
    "map_editor/select_level": (view: MapEditorContext) => {
        view.selectLevelEditor();
    },
    "map_editor/select_scripts": (view: MapEditorContext) => {
        view.selectScriptsEditor();
    },
    "map_editor/select_encounters": (view: MapEditorContext) => {
        view.selectEncountersEditor();
    },
    "map_editor/select_connections": (view: MapEditorContext) => {
        view.selectConnectionsEditor();
    },
    "map_editor/select_header": (view: MapEditorContext) => {
        view.selectHeaderEditor();
    },
    "map_editor/zoom_in": (view: MapEditorContext) => {
        view.zoomIn();
    },
    "map_editor/zoom_out": (view: MapEditorContext) => {
        view.zoomOut();
    },
    "map_editor/undo_tileset_level_changes": (view: MapEditorContext) => {
        view.undoTilesetChanges();
    },
    "map_editor/redo_tileset_level_changes": (view: MapEditorContext) => {
        view.redoTilesetChanges();
    },
});