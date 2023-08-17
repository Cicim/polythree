import { invoke } from "@tauri-apps/api";
import { config } from "src/systems/global";
import { spawnDialog } from "src/systems/dialogs";
import { getPtrOffset } from "src/systems/rom";
import type { MapEditorContext } from "src/views/MapEditor";
import initWasmFunctions, { load_tileset, render_blocks_data } from "src/wasm/map-canvas/pkg/map_canvas";
import { get } from "svelte/store";
import { BlocksData, type ImportedBlocksData } from "../editor/blocks_data";
import AlertDialog from "src/components/dialog/AlertDialog.svelte";
import LayoutPickerDialog from "../dialogs/LayoutPickerDialog.svelte";
import TilesetPickerDialog from "../dialogs/TilesetPickerDialog.svelte";
import type MapCanvas from "../../MapEditor/editor/MapCanvas.svelte";

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


export class MapModule {
    private context: MapEditorContext;

    /** Tileset bottom tiles for quick drawing */
    public botTiles: CanvasRenderingContext2D;
    /** Tileset top tiles for quick drawing */
    public topTiles: CanvasRenderingContext2D;
    /** The image data of the bottom tiles */
    private botTilesData: ImageData;
    /** The image data of the top tiles */
    private topTilesData: ImageData;
    /** The main map data canvas */
    public mainCanvas: MapCanvas;
    /** The borders data canvas */
    public bordersCanvas: MapCanvas;

    // ANCHOR Getters & Setters
    public get identifier() { return this.context.identifier }
    public get data() { return this.context.data }
    public get loading() { return this.context.loading }
    public get $data() { return get(this.data) }

    public get tileset1Offset() { return this.context.tileset1Offset }
    public set tileset1Offset(value: number) { this.context.tileset1Offset = value }
    public get tileset2Offset() { return this.context.tileset2Offset }
    public set tileset2Offset(value: number) { this.context.tileset2Offset = value }
    public get tileset1Length() { return this.context.tileset1Length }
    public set tileset1Length(value: number) { this.context.tileset1Length = value }
    public get tileset2Length() { return this.context.tileset2Length }
    public set tileset2Length(value: number) { this.context.tileset2Length = value }
    public get tilesetLengths() { return this.$data.tilesets.metatiles.length / 8 }

    // ANCHOR Main Methods
    constructor(context: MapEditorContext) {
        this.context = context;
    }

    public async load(): Promise<boolean> {
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
            this.context.close();
            return false;
        }

        // Load the map layout data
        const layoutResults = await this.queryLayoutUntilValid(headerData.header.map_layout_id);
        if (layoutResults === null) {
            // If the user asked to quit, close the editor
            this.context.close();
            return false;
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
            this.context.close();
            return false;
        }

        const tilesetResults = await this.queryTilesetsUntilValid(
            getPtrOffset(layoutData.header.primary_tileset),
            getPtrOffset(layoutData.header.secondary_tileset)
        );
        if (tilesetResults === null) {
            // If the user asked to quit, close the editor
            this.context.close();
            return false;
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
            this.context.close();
            return false;
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
            this.context.close();
            return false;
        }

        // Everything was loaded successfully
        return true;
    }

    // ANCHOR Secondary Methods

    /** Updates the tileset cache */
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
    /** Renders the metatiles onto the given image datas */
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

    // ANCHOR Private Methods

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
    /** Caches the tilesets */
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
}