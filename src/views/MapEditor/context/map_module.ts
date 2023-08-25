import { invoke } from "@tauri-apps/api";
import { config } from "src/systems/global";
import { spawnErrorDialog } from "src/components/dialog/Dialog.svelte";
import { getPtrOffset } from "src/systems/rom";
import type { MapEditorContext } from "src/views/MapEditor";
import initWasmFunctions, { load_tileset, render_blocks_data } from "src/wasm/map-canvas/pkg/map_canvas";
import { get, writable, type Writable } from "svelte/store";
import { BlocksData, type ImportedBlocksData } from "../editor/blocks_data";
import { spawnLayoutPickerDialog } from "../dialogs/LayoutPickerDialog.svelte";
import { spawnTilesetPickerDialog } from "../dialogs/TilesetPickerDialog.svelte";
import type MapCanvas from "../../MapEditor/editor/MapCanvas.svelte";
import { Change } from "src/systems/changes";

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

export class UpdateLayoutChange extends Change {
    static changeName = "Update Layout";
    public applyWorked: boolean;

    private oldLayoutId: number;
    private oldLayoutData: MapLayoutData;

    constructor(private context: MapEditorContext, private newLayoutId: number) {
        super();
        this.oldLayoutId = context.map.$data.header.header.map_layout_id;
        this.oldLayoutData = context.map.cloneLayoutData(context.map.$data.layout);
    }

    public updatePrev(): boolean {
        return false;
    }

    private async update(layoutId: number) {
        const result = await this.context.map.updateLayout(layoutId);
        if (result)
            this.context.map.updateLayoutLock();
        return result;
    }

    public async revert(): Promise<void> {
        await this.context.map.setLayout(this.oldLayoutId, this.oldLayoutData);
        this.context.map.releaseLayoutLock(this.newLayoutId);
    }
    public async apply(): Promise<void> {
        const res = this.update(this.newLayoutId);
        if (!res) {
            await spawnErrorDialog("Failed to update layout: the layout you've already changed to in the past is now invalid.");
        }
    }
    public async firstApply(): Promise<void> {
        this.applyWorked = await this.update(this.newLayoutId);
    }

}

export class UpdateTilesetsChange extends Change {

    static changeName = "Update Tilesets";
    public applyWorked: boolean;

    private oldTileset1Offset: number;
    private oldTileset2Offset: number;

    constructor(public context: MapEditorContext,
        private newTileset1Offset: number, private newTileset2Offset: number
    ) {
        super();
        this.oldTileset1Offset = context.map.tileset1Offset;
        this.oldTileset2Offset = context.map.tileset2Offset;
    }

    public updatePrev(): boolean { return false }

    public async revert() {
        await this.update(this.oldTileset1Offset, this.oldTileset2Offset);
    }
    public async apply() {
        const success = await this.update(this.newTileset1Offset, this.newTileset2Offset);
        if (!success)
            await spawnErrorDialog("Failed to update the tilesets. They have become invalid.")
    }
    public async firstApply() {
        this.applyWorked = await this.update(this.newTileset1Offset, this.newTileset2Offset);
    }

    private async update(tileset1: number, tileset2: number): Promise<boolean> {
        const result = await this.context.map.updateTilesets(tileset1, tileset2);
        return result;
    }
}

export class MapModule {
    private context: MapEditorContext;

    /** List of all the layouts that have been locked from being edited
     * + only used in the layout editor in the MapEditor */
    public static lockedLayouts: Writable<number[]> = writable([]);
    /** The list of layouts this MapEditor owns and doesn't allow other editors to touch */
    public ownedLayouts: number[] = [];
    /** If the layout being edited currently is locked by another MapEditor */
    public isLayoutLocked: Writable<boolean> = writable(false);

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
    public get layoutId() { return this.context.layoutId }
    public set layoutId(value: number) { this.context.layoutId = value }
    public get layoutOffset() { return this.context.layoutOffset }
    public set layoutOffset(value: number) { this.context.layoutOffset = value }

    // ANCHOR Main Methods
    constructor(context: MapEditorContext) {
        this.context = context;
    }

    /** Loads everything the first time */
    public async load(): Promise<boolean> {
        // Load the map header data
        const header = await this.loadHeader();
        if (!header) return false;

        // Load the map layout data
        const layout = await this.loadLayout(header);
        if (!layout) return false;

        // Load the tilesets
        const tilesets = await this.loadTilesets(layout);
        if (!tilesets) return false;

        // Update the layout lock
        this.updateLayoutLock();

        // Everything was loaded successfully
        this.data.set({ header, layout, tilesets });
        return true;
    }

    public onClose() {
        this.releaseLayoutLocks();
    }

    /** Loads the header data */
    public async loadHeader(): Promise<MapHeaderData> {
        try {
            return await invoke('get_map_header_data', {
                group: this.identifier.group,
                index: this.identifier.index,
            }) as MapHeaderData;
        }
        catch (e) {
            // If the map header failed to load, close the editor
            await spawnErrorDialog(e, "Failed to load map header");
            return null;
        }
    }

    /** Loads and validates the layout. Asks the user to input another one if the given one is invalid.
     * Returns if it failed to update the layout or if the user cancelled to dialog. */
    /** Loads the layout data */
    public async loadLayout(headerData: MapHeaderData): Promise<MapLayoutData> {
        const isData = !headerData;
        // If no layout was passed, use the context data
        if (isData)
            headerData = this.$data.header;

        // Save the old layout data
        const oldLayoutId = headerData.header.map_layout_id;
        const oldLayoutOffset = getPtrOffset(headerData.header.map_layout);

        // Load the new layout data
        const layoutResults = await this.queryLayoutUntilValid(headerData.header.map_layout_id);
        if (layoutResults === null) {
            // If the user asked to quit exit
            return null;
        }
        // Parse the new layout data
        const [layoutId, layoutOffset, layoutData] = layoutResults;

        // Update the rom with the new layout id
        try {
            // Update the header
            headerData.header.map_layout_id = layoutId;
            headerData.header.map_layout = { offset: layoutOffset };
            await invoke('update_map_header', {
                group: this.identifier.group, index: this.identifier.index,
                header: headerData.header
            });
            // Save the new layout data
            this.layoutId = layoutId;
            this.layoutOffset = layoutOffset;
            // Update the data
            if (isData)
                this.data.update(data => { return { ...data, header: headerData } });
        }
        // Failed to update the map header
        catch (e) {
            // Restore old layout indices
            headerData.header.map_layout_id = oldLayoutId;
            headerData.header.map_layout = { offset: oldLayoutOffset };
            // If the map header failed to load, close the editor
            await spawnErrorDialog(e, "Failed to update map header");
            return null;
        }

        return layoutData;
    }

    /** Loads the tilesets data and renders the blocks */
    public async loadTilesets(layoutData: MapLayoutData = this.$data.layout): Promise<TilesetsData> {
        const tilesetResults = await this.queryTilesetsUntilValid(
            getPtrOffset(layoutData.header.primary_tileset),
            getPtrOffset(layoutData.header.secondary_tileset)
        );
        if (tilesetResults === null) {
            // If the user asked to quit, close the editor
            return null;
        }
        const oldTileset1 = this.tileset1Offset;
        const oldTileset2 = this.tileset2Offset;

        const [tileset1, tileset2, loadedTilesetsData] = tilesetResults;
        layoutData.header.primary_tileset = { offset: tileset1 };
        layoutData.header.secondary_tileset = { offset: tileset2 };

        // Update the rom with the new tileset ids
        try {
            await invoke('update_layout_header', {
                id: this.layoutId,
                header: layoutData.header
            });
        }
        catch (e) {
            // If the map header failed to load, close the editor
            await spawnErrorDialog(e, "Failed to update layout header");
            return null;
        }

        // Load the wasm functions
        await initWasmFunctions();

        // Get the tilesets lengths
        try {
            [this.tileset1Length, this.tileset2Length] =
                await invoke('get_tilesets_lengths', { tileset1, tileset2 }) as [number, number];
            this.tileset1Offset = tileset1;
            this.tileset2Offset = tileset2;
        }
        catch (e) {
            // Revert the tilesets
            layoutData.header.primary_tileset = { offset: oldTileset1 };
            layoutData.header.secondary_tileset = { offset: oldTileset2 };
            // If the map header failed to load, close the editor
            await spawnErrorDialog(e, "Could not load tilesets lengths");
            return null;
        }

        return this.loadTilesetsData(loadedTilesetsData);
    }

    // ANCHOR Secondary Methods
    /** Updates the layout to the given index. Returns true if all went well, false otherwise */
    public async updateLayout(newLayoutId: number): Promise<boolean> {
        // Load the new layout data
        const layoutResults = await this.loadLayoutData(newLayoutId);

        // If the layout failed to load, restore the old layout
        if (typeof layoutResults === "string") {
            spawnErrorDialog(layoutResults, "Failed to load layout");
            return false;
        }

        // Parse the new layout data
        const [layoutId, layoutOffset, layoutData] = layoutResults;

        // Update the tilesets
        if (!await this.updateTilesets(
            getPtrOffset(layoutData.header.primary_tileset),
            getPtrOffset(layoutData.header.secondary_tileset)
        )) return false;

        // Update the data
        this.layoutId = layoutId;
        this.layoutOffset = layoutOffset;
        this.data.update(data => {
            data.header.header.map_layout_id = layoutId;

            return {
                ...data,
                layout: this.updateLayoutData(data.layout, layoutData)
            }
        });
        return true;
    }

    /** Updates the layout to the given data. Returns true if all went well, false otherwise */
    public async setLayout(index: number, layoutData: MapLayoutData): Promise<boolean> {
        // Get the offset from the index
        try {
            const offset: number = await invoke('get_layout_offset', { id: index });

            // Create a clone of the layoutData
            layoutData = this.cloneLayoutData(layoutData);

            // Update the tilesets
            const result = await this.updateTilesets(
                getPtrOffset(layoutData.header.primary_tileset),
                getPtrOffset(layoutData.header.secondary_tileset)
            );
            if (!result) return false;

            // Update the data
            this.layoutId = index;
            this.layoutOffset = offset;
            this.data.update(data => {
                data.header.header.map_layout_id = index;
                return {
                    ...data,
                    layout: this.updateLayoutData(data.layout, layoutData)
                }
            });
            return true;
        }
        catch (error) {
            await spawnErrorDialog(error, "Could not get map layout offset");
            return false;
        }
    }

    /** Creates a copy of the given layout data */
    public cloneLayoutData(data: MapLayoutData): MapLayoutData {
        return {
            ...data,
            border_data: data.border_data.clone(),
            map_data: data.map_data.clone(),
            header: { ...data.header },
        };
    }
    /** Updates the given layoutData with the given data and returns the same updated reference */
    public updateLayoutData(toUpdate: MapLayoutData, data: MapLayoutData): MapLayoutData {
        toUpdate.bits_per_block = data.bits_per_block;
        toUpdate.border_data.update(data.border_data);
        toUpdate.map_data.update(data.map_data);
        toUpdate.index = data.index;
        toUpdate.header = data.header;
        return toUpdate;
    }

    /** Updates the tilesets to the given offsets. Returns true if all went well, false otherwise */
    public async updateTilesets(tileset1: number, tileset2: number): Promise<boolean> {
        let loadedTilesetsData: ImportedTilesetsData;
        try {
            loadedTilesetsData =
                await invoke('get_tilesets_rendering_data', { tileset1, tileset2 });
        }
        catch (err) {
            await spawnErrorDialog(err, "Could not load tilesets");
            return false;
        }

        // Reupdate the brushes and palette after saving them
        await this.context.palette.save();
        await this.context.brushes.save();

        // Update the tilesetLength and offsets
        try {
            [this.tileset1Length, this.tileset2Length] =
                await invoke('get_tilesets_lengths', { tileset1, tileset2 }) as [number, number];
            this.tileset1Offset = tileset1;
            this.tileset2Offset = tileset2;
        }
        catch (e) {
            // If the map header failed to load, close the editor
            await spawnErrorDialog(e, "Could not load tilesets lengths");
            return false;
        }

        // Load the tilesets data
        const tilesetsData = this.loadTilesetsData(loadedTilesetsData);
        if (tilesetsData === null) {
            return false;
        }

        // Update the data
        this.data.update(data => {
            data.layout.header.primary_tileset = { offset: this.tileset1Offset };
            data.layout.header.secondary_tileset = { offset: this.tileset2Offset };
            data.tilesets = tilesetsData;
            return data;
        });

        await this.context.brushes.load();
        await this.context.palette.load(this.tilesetLengths);

        return true;
    }

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


    // ANCHOR Layout locking methods
    /** Updates the isLayoutLocked for this editor */
    public updateLayoutLock(): void {
        // Check if the layout is locked
        const isLocked = get(MapModule.lockedLayouts).includes(this.layoutId);
        // If it's not locked by someone else, claim it
        if (!isLocked) this.claimLayoutLock();
        return this.isLayoutLocked.set(!this.ownedLayouts.includes(this.layoutId));
    }

    /** Release a single layout from the lock */
    public releaseLayoutLock(layoutIdToUnlock: number) {
        // See if the layout is locked
        const index = this.ownedLayouts.indexOf(layoutIdToUnlock);
        this.updateLayoutLock();
        if (index !== -1) {
            // If it is, remove it from the list of owned layouts
            this.ownedLayouts.splice(index, 1);
            MapModule.lockedLayouts.update(layouts => {
                layouts.splice(layouts.indexOf(layoutIdToUnlock), 1);
                return layouts;
            });
            // Update the views
            this.updateViewsOfLockRelease();
        }
    }

    /** Acquires a lock for the current layout and notifies the rest of the editors */
    private claimLayoutLock() {
        // Push it to the list of owned layouts
        this.ownedLayouts.push(this.layoutId);
        // Notify the rest of the editors
        MapModule.lockedLayouts.update(layouts => {
            layouts.push(this.layoutId);
            return layouts;
        });
    }

    /** Releases all locked layouts and notifies the rest of the editors */
    public releaseLayoutLocks() {
        // Release all the layouts locked by this editor
        MapModule.lockedLayouts.update(layouts => {
            for (const layout of this.ownedLayouts)
                layouts.splice(layouts.indexOf(layout), 1);
            return layouts;
        });
        // Clear the owned layouts
        this.ownedLayouts.splice(0, this.ownedLayouts.length);
        this.updateViewsOfLockRelease();
    }

    /** Updates the other views when the lock is released */
    private updateViewsOfLockRelease() {
        // Update all the other editors
        for (const view of this.context.getOtherViews()) {
            view.map.updateLayoutLock();
        }
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
    private async queryLayoutUntilValid(id?: number): Promise<[number, number, MapLayoutData]> {
        while (true) {
            try {
                const result = await this.loadLayoutData(id);
                if (typeof result === 'string') {
                    throw result;
                }
                return result;
            }
            catch (message) {
                // Spawn a dialog asking the user to select a layout
                const layoutId = await spawnLayoutPickerDialog({
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
    private async loadLayoutData(id: number): Promise<[index: number, offset: number, importedData: MapLayoutData] | string> {
        try {
            // Get the layout offset
            const offset: number = await invoke('get_layout_offset', { id });
            const importedLayoutData: ImportedMapLayoutData = await invoke('get_map_layout_data', { id });
            // Convert the imported data to a map layout data
            const layoutData: MapLayoutData = {
                bits_per_block: importedLayoutData.bits_per_block,
                header: importedLayoutData.header,
                index: importedLayoutData.index,
                border_data: BlocksData.fromImportedBlockData(importedLayoutData.border_data),
                map_data: BlocksData.fromImportedBlockData(importedLayoutData.map_data),
            };
            return [id, offset, layoutData];
        }
        catch (message) {
            return message;
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

                const tilesets = await spawnTilesetPickerDialog({
                    reason: `Could not load tilesets (${names[tileset1]},
                        ${names[tileset2]}): ${message}`
                });

                if (tilesets === null) return null;

                [tileset1, tileset2] = tilesets;
            }
        }
    }
}