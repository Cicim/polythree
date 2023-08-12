import MapEditor from "./MapEditor.svelte";
import { TabbedEditorContext, type TabbedEditorTabs } from "../systems/contexts";
import { activeView, openViews } from "src/systems/views";
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
import type { BrushMaterial } from "./MapEditor/editor/brushes";
import type { BrushesChangesData } from "./MapEditor/editor/brush_changes";
import { EditorTool, Tool, toolFunctions } from "./MapEditor/editor/tools";
import { EditorChanges } from "src/systems/changes";
import type { SidebarState } from "./MapEditor/layout/LayoutSidebar.svelte";
import { loadBrushesForTilesets, saveBrushesForTilesets } from "./MapEditor/editor/brush_serialization";
import { BlocksData, NULL, type ImportedBlocksData } from "./MapEditor/editor/blocks_data";
import initWasmFunctions, { load_tileset, render_blocks_data } from "src/wasm/map-canvas/pkg";

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
    map_data: BlocksData;
    border_data: BlocksData;
    header: MapLayout;
}

export interface ImportedMapLayoutData {
    index: number;
    bits_per_block: number;
    map_data: ImportedBlocksData;
    border_data: ImportedBlocksData;
    header: MapLayout;
}

interface ImportedTilesetsData {
    tiles: number[][][];
    metatiles: number[][];
    metatile_layers: number[];
    palettes: number[][];

    tile_limit: number;
    metatile_limit: number;
}

export interface TilesetsData {
    tiles: Uint8Array;
    metatiles: Uint16Array;
    metatileLayers: Uint8Array;
    palettes: Uint8Array;

    tileLimit: number;
    metatileLimit: number;
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


    // Brushes
    /** The list of brushes loaded for these tilesets */
    public brushes: Writable<BrushMaterial[]>;
    /** The brush that's being currently edited */
    public editingBrush: Writable<BrushMaterial>;
    /** The state from which you entered brush editing */
    public editingBrushEnteredFromState: SidebarState;
    /** The index of the editing brush within the brushes */
    public editingBrushIndex: number;
    /** The changes that are applied to the editing brush */
    public editingBrushChanges: Writable<EditorChanges<null>>;
    /** A clone of the brush you've just started editing right
     * before you made any edits to it */
    public editingBrushClone: Writable<BrushMaterial>;
    /** The changes that are applied to the brushes store */
    public brushesChanges: EditorChanges<BrushesChangesData>;

    // Tileset Palette
    /** Tileset bottom tiles for quick drawing */
    public botTiles: CanvasRenderingContext2D;
    /** Tileset top tiles for quick drawing */
    public topTiles: CanvasRenderingContext2D;
    /** The image data of the bottom tiles */
    private botTilesData: ImageData;
    /** The image data of the top tiles */
    private topTilesData: ImageData;

    /** Length of the two tilesets (might not be a multiple of 8) */
    public tilesetsLength: number;
    /** The block data for the tilset level editor */
    public tilesetBlocks: Writable<BlocksData>;
    /** The changes that are applied to the tileset level editor */
    public tilesetLevelChanges: EditorChanges<null>;

    // Keybindings callbacks
    public moveOnPaletteCB: (dirX: number, dirY: number, select: boolean) => void = () => { };

    // Tileset
    private tileset1Offset: number;
    private tileset2Offset: number;
    private tileset1Length: number;
    private tileset2Length: number;

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

    public async close(): Promise<boolean> {
        // Try to save the map's configs before closing
        if (!get(this.isLoading)) {
            // Save the tileset levels if edits were made
            if (get(this.tilesetLevelChanges.unsaved)) {
                try {
                    await this.exportTilesetsLevels();
                }
                catch (err) {
                    await spawnDialog(AlertDialog, {
                        title: "Error while saving Tileset Levels",
                        message: err
                    });
                }
            }

            // Save the brushes if edits were made
            if (get(this.brushesChanges.unsaved)) {
                try {
                    await this.saveBrushesForTilesets();
                }
                catch (err) {
                    await spawnDialog(AlertDialog, {
                        title: "Error while saving Brushes",
                        message: err
                    });
                }
            }

        }
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
            this.close();
            return;
        }

        // Load the map layout data
        const layoutResults = await this.queryLayoutUntilValid(headerData.header.map_layout_id);
        if (layoutResults === null) {
            // If the user asked to quit, close the editor
            this.close();
            return;
        }
        const [layoutId, layoutOffset, importedLayoutData] = layoutResults;
        headerData.header.map_layout_id = layoutId;
        headerData.header.map_layout = { offset: layoutOffset };
        // Convert the imported data to a map layout data
        const layoutData: MapLayoutData = {
            bits_per_block: importedLayoutData.bits_per_block,
            header: importedLayoutData.header,
            index: importedLayoutData.index,
            border_data: BlocksData.fromImportedBlockData(importedLayoutData.border_data),
            map_data: BlocksData.fromImportedBlockData(importedLayoutData.map_data),
        };

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
            this.close();
            return;
        }

        const tilesetResults = await this.queryTilesetsUntilValid(
            getPtrOffset(layoutData.header.primary_tileset),
            getPtrOffset(layoutData.header.secondary_tileset)
        );
        if (tilesetResults === null) {
            // If the user asked to quit, close the editor
            this.close();
            return;
        }
        const [tileset1, tileset2, tilesetsData] = tilesetResults;
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
            this.close();
            return;
        }

        // Load the wasm functions
        await initWasmFunctions();

        // Convert tilesetData to images
        const tilesets = this.loadTilesetsData(tilesetsData);
        this.data.set({ header: headerData, layout: layoutData, tilesets });

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
        const tilesetsLength = tilesetsData.metatiles.length;
        this.tilesetsLength = tilesetsLength;
        const tilesetBlocks = new BlocksData(8, Math.ceil(tilesetsLength / 8))
        // Set the blockData for the tilesets to be the ascending number of tiles 
        // with the permissions you've read from the configs
        for (let y = 0; y < tilesetBlocks.height; y++) {
            for (let x = 0; x < 8; x++)
                tilesetBlocks.set(x, y, y * 8 + x, importedTilesetLevels[y * 8 + x]);
        }

        // Set the tiles after the last block in the last row to null
        if (tilesetsLength % 8 !== 0)
            for (let x = tilesetsLength % 8; x < 8; x++)
                tilesetBlocks.set(x, tilesetBlocks.height - 1, NULL, NULL);

        this.tilesetBlocks = writable(tilesetBlocks);
        this.tilesetLevelChanges = new EditorChanges(null);

        this.material = writable(new PaletteMaterial(
            BlocksData.fromBlockData(get(this.tilesetBlocks).get(0, 0))
        ));
        this.selectedTool = writable(EditorTool.Pencil);

        // Load brushes
        await this.loadBrushesForTilesets();
        this.brushesChanges = new EditorChanges<BrushesChangesData>([
            this.brushes, this.material,
            () => BlocksData.fromBlockData(get(this.tilesetBlocks).get(0, 0))
        ]);
        // Set the currently editing brush
        this.editingBrush = writable(null);
        this.editingBrushClone = writable(null);
        this.editingBrushChanges = writable(null);

        // Update the cosmetics
        this._cosmeticHasSideTabs = true;
        // Trigger a re-render
        activeView.set(this);
        this.isLoading.set(false);
    }

    /** Constructs the tileset data used by the renderers from the `ImportedTilesetsData` */
    private loadTilesetsData(imported: ImportedTilesetsData): TilesetsData {
        // Compress everything to UIntArrays
        // Metatile layers are straightforward
        const metatileLayers = Uint8Array.from(imported.metatile_layers);

        // Metatiles need to be flattened
        const metatiles = new Uint16Array(imported.metatiles.length * 8);
        let written = 0;
        for (const metatile of imported.metatiles)
            for (const tile of metatile)
                metatiles[written++] = tile;

        // Palettes are more complicated, since colors need to be extracted
        const palettes = new Uint8Array(16 * 16 * 4);
        written = 0;
        for (const palette of imported.palettes) {
            for (const color of palette) {
                // Get the color from GBA format
                const r = (color & 0x1F) << 3;
                const g = ((color >> 5) & 0x1F) << 3;
                const b = ((color >> 10) & 0x1F) << 3;

                // Save them in RGBA format
                palettes[written++] = r;
                palettes[written++] = g;
                palettes[written++] = b;
                palettes[written++] = 255;
            }
        }

        // Tiles need to be flattened
        const tiles = new Uint8Array(8 * 8 * imported.tiles.length);
        written = 0;
        for (const tile of imported.tiles)
            for (const row of tile)
                for (const pixel of row)
                    tiles[written++] = pixel;

        // Initialize the renderer with the data
        load_tileset(this.tileset1Offset, this.tileset2Offset,
            metatiles, metatileLayers, tiles, palettes);

        // Render the tilesets onto the cache
        this.initTilesetCache(imported.metatiles.length);

        return {
            metatiles,
            metatileLayers,
            palettes,
            tiles,

            tileLimit: imported.tile_limit,
            metatileLimit: imported.metatile_limit,
        };
    }

    private initTilesetCache(size: number) {
        // Create the top and bottom canvas
        const top = document.createElement("canvas");
        this.topTiles = top.getContext("2d");

        const bot = document.createElement("canvas");
        top.width = bot.width = 16 * size;
        top.height = bot.height = 16;
        this.botTiles = bot.getContext("2d");

        // Get the image datas
        const topData = this.topTiles.getImageData(0, 0, top.width, top.height);
        const botData = this.botTiles.getImageData(0, 0, bot.width, bot.height);
        this.topTilesData = topData;
        this.botTilesData = botData;

        // Create the blocks data to render
        const metatiles = new Uint16Array(size);
        for (let i = 0; i < size; i++)
            metatiles[i] = i;

        // Render the tiles
        this.renderMetatiles(botData, topData, {
            metatiles,
            width: size,
            height: 1,
        });

        // Put the image data
        this.topTiles.putImageData(topData, 0, 0);
        this.botTiles.putImageData(botData, 0, 0);

        this.updateTilesetCache();
    }

    public updateTilesetCache() {
        const size = this.botTilesData.width / 16;

        // Create the blocks data to render
        const metatiles = new Uint16Array(size);
        for (let i = 0; i < size; i++)
            metatiles[i] = i;

        this.renderMetatiles(this.botTilesData, this.topTilesData, {
            metatiles,
            width: size,
            height: 1,
        });

        // Put the image data
        this.topTiles.putImageData(this.topTilesData, 0, 0);
        this.botTiles.putImageData(this.botTilesData, 0, 0);
    }

    // ANCHOR Error Handling
    /** Ask the user for a layout until that layout is valid for this map */
    private async queryLayoutUntilValid(id?: number): Promise<[number, number, ImportedMapLayoutData]> {
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
    private async queryTilesetsUntilValid(tileset1: number, tileset2: number): Promise<[number, number, ImportedTilesetsData]> {
        while (true) {
            try {
                return [
                    tileset1, tileset2,
                    await invoke('get_tilesets_rendering_data', { tileset1, tileset2 })
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

    // ANCHOR Tileset Levels
    private async importTilesetsLevels(): Promise<number[]> {
        // Get the tileset levels
        const t1Levels = await this._parseTilesetLevels(this.tileset1Offset, this.tileset1Length);
        const t2Levels = await this._parseTilesetLevels(this.tileset2Offset, this.tileset2Length);

        return [...t1Levels, ...t2Levels];
    }

    public async exportTilesetsLevels(): Promise<void> {
        // Get the tileset levels from the editor
        const tilesetLevels = get(this.tilesetBlocks).levels;
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

    private async _parseTilesetLevels(tilesetOffset: number, tilesetLength: number): Promise<Uint16Array> {
        const levelChars = get(config).tileset_levels[tilesetOffset];

        // If you can't find the levelChars, return a list of null as long as the tileset
        if (levelChars === undefined) {
            // Update the configs with the new tileset levels
            config.update(config => {
                config.tileset_levels[tilesetOffset] = "";
                return config;
            });
            await invoke("update_tileset_level", { tileset: tilesetOffset, levels: "" })
            return new Uint16Array(tilesetLength).fill(NULL);
        }
        // Otherwise, read the data from the levelChars
        else {
            const data = new Uint16Array(tilesetLength).fill(NULL);

            for (let i = 0; i < levelChars.length; i++) {
                const char = levelChars[i];
                if (char === "=") data[i] = NULL;
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

    private _encodeTilesetLevels(levels: Uint16Array) {
        let levelChars = "";
        let nullsEncountered = 0;

        for (const level of levels) {
            if (level === NULL) {
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

                if (compressedLevel === 29) levelChars += "/";
                else levelChars += String.fromCharCode(compressedLevel + 63);
            }
        }

        return levelChars;
    }

    // ANCHOR Custom Brushes
    private async loadBrushesForTilesets() {
        this.brushes = writable(await loadBrushesForTilesets(this.tileset1Offset, this.tileset2Offset));
    }

    private async saveBrushesForTilesets() {
        await saveBrushesForTilesets(this.tileset1Offset, this.tileset2Offset, get(this.brushes), this.tileset1Length);
    }

    // ANCHOR Editor Methods
    public renderMetatiles(bottomImageData: ImageData, topImageData: ImageData, blocksData: {
        metatiles: Uint16Array,
        width: number,
        height: number
    }, range: TileSelection = null) {
        if (range === null) {
            range = {
                x: 0,
                y: 0,
                width: blocksData.width,
                height: blocksData.height
            }
        }

        render_blocks_data(
            bottomImageData.data as unknown as Uint8Array,
            topImageData.data as unknown as Uint8Array,
            blocksData.metatiles, blocksData.width, blocksData.height,
            this.tileset1Offset, this.tileset2Offset,
            range.x, range.y, range.x + range.width, range.y + range.height);
    }

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
    public moveOnPalette(dirX: number, dirY: number, select: boolean) {
        const tab = get(this.selectedTab);
        if (tab !== "layout" && tab !== "level") return;

        this.moveOnPaletteCB(dirX, dirY, select);
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
    "map_editor/palette_move_up": (view: MapEditorContext) => {
        view.moveOnPalette(0, -1, false);
    },
    "map_editor/palette_select_up": (view: MapEditorContext) => {
        view.moveOnPalette(0, -1, true);
    },
    "map_editor/palette_move_down": (view: MapEditorContext) => {
        view.moveOnPalette(0, 1, false);
    },
    "map_editor/palette_select_down": (view: MapEditorContext) => {
        view.moveOnPalette(0, 1, true);
    },
    "map_editor/palette_move_left": (view: MapEditorContext) => {
        view.moveOnPalette(-1, 0, false);
    },
    "map_editor/palette_select_left": (view: MapEditorContext) => {
        view.moveOnPalette(-1, 0, true);
    },
    "map_editor/palette_move_right": (view: MapEditorContext) => {
        view.moveOnPalette(1, 0, false);
    },
    "map_editor/palette_select_right": (view: MapEditorContext) => {
        view.moveOnPalette(1, 0, true);
    },
});