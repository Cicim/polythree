import { EditorChanges } from "src/systems/changes";
import { spawnErrorDialog } from "src/systems/dialogs";
import type { MapEditorContext } from "src/views/MapEditor";
import { get, writable, type Writable } from "svelte/store";
import { BlocksData, NULL } from "../editor/blocks_data";
import type MapCanvas from "../editor/MapCanvas.svelte";
import { config } from "src/systems/global";
import { invoke } from "@tauri-apps/api";

export class PaletteModule {
    private context: MapEditorContext;

    /** Length of the two tilesets (might not be a multiple of 8) */
    public fullLength: number;
    /** The block data for the tileset level editor */
    public blocks: Writable<BlocksData>;
    /** The reference to the MapCanvas for the tilesetBlocks */
    public mapCanvas: Writable<MapCanvas>;
    /** The changes that are applied to the tileset level editor */
    public changes: EditorChanges<null>;
    // Keybindings callbacks
    public moveCB: (dirX: number, dirY: number, select: boolean) => void = () => { };
    /** The number of blocks at the end that are not in the tileset */
    public lastRowLength: number;

    // ANCHOR Main Methods
    constructor(context: MapEditorContext) {
        this.context = context;
    }

    public async load(metatilesLength: number) {
        // Get the levels for these tilesets from config
        const importedTilesetLevels = await this.importLevels();
        // Compose the block data for the tileset level editor
        this.fullLength = metatilesLength;
        const tilesetBlocks = new BlocksData(8, Math.ceil(this.fullLength / 8))
        // Set the blockData for the tilesets to be the ascending number of tiles 
        // with the permissions you've read from the configs
        for (let y = 0; y < tilesetBlocks.height; y++) {
            for (let x = 0; x < 8; x++)
                tilesetBlocks.set(x, y, y * 8 + x, importedTilesetLevels[y * 8 + x]);
        }

        // Set the removed tiles number
        this.lastRowLength = this.fullLength % 8;
        // Set the tiles after the last block in the last row to null
        if (this.lastRowLength !== 0)
            for (let x = this.lastRowLength; x < 8; x++)
                tilesetBlocks.set(x, tilesetBlocks.height - 1, NULL, NULL);

        // Update the blocks
        this.blocks = writable(tilesetBlocks);
        this.mapCanvas = writable(null);
        this.changes = new EditorChanges(null);
    }

    public async save() {
        if (get(this.changes.unsaved)) {
            try {
                await this.exportLevels();
            }
            catch (e) {
                await spawnErrorDialog(e, "Error while saving Tileset Levels");
            }
        }

    }

    // ANCHOR Secondary Methods
    public tryToRebuildLevels() {
        this.$mapCanvas?.rebuildLevels();
    }
    public undoChanges() {
        this.changes.undo();
    }
    public redoChanges() {
        this.changes.redo();
    }
    public move(dirX: number, dirY: number, select: boolean) {
        const tab = get(this.context.selectedTab);
        if (tab !== "layout" && tab !== "level") return;

        this.moveCB(dirX, dirY, select);
    }
    public setMoveCallback(cb: (dirX: number, dirY: number, select: boolean) => void) {
        this.moveCB = cb;
    }
    /** Synchronizes changes with all other MapEditors with the same tilesets */
    public synchronizeChanges(blocks: BlocksData) {
        let viewsSharingBothTilesets: MapEditorContext[] = [];
        let viewsSharingPrimaryTileset: MapEditorContext[] = [];
        let viewsSharingSecondaryTileset: MapEditorContext[] = [];

        // Loop through each MapEditor layout that shares the same tileset
        for (const view of this.context.getOtherViews()) {
            if (view.tileset1Offset === this.tileset1Offset) {
                if (view.tileset2Offset === this.tileset2Offset)
                    viewsSharingBothTilesets.push(view);
                else viewsSharingPrimaryTileset.push(view);
            } else if (view.tileset2Offset === this.tileset2Offset)
                viewsSharingSecondaryTileset.push(view);
        }

        // Update each mapEditor with the correct portion of the levels
        for (const view of viewsSharingBothTilesets) {
            view.palette.blocks.update((blocksData: BlocksData) => {
                blocksData.updateLevels(blocks.levels);
                return blocksData;
            });
        }
        for (const view of viewsSharingPrimaryTileset) {
            view.palette.blocks.update((blocksData: BlocksData) => {
                blocksData.updateLevels(blocks.levels, 0, view.tileset1Length);
                return blocksData;
            });
        }
        for (const view of viewsSharingSecondaryTileset) {
            view.palette.blocks.update((blocksData: BlocksData) => {
                blocksData.updateLevels(
                    blocks.levels,
                    view.tileset1Length,
                    view.tileset2Length
                );
                return blocksData;
            });
        }
    }

    // ANCHOR Getters
    private get tileset1Offset() { return this.context.tileset1Offset }
    private get tileset2Offset() { return this.context.tileset2Offset }
    private get tileset1Length() { return this.context.tileset1Length }
    private get tileset2Length() { return this.context.tileset2Length }
    public get $blocks() { return get(this.blocks) }
    private get $mapCanvas() { return get(this.mapCanvas) }

    // ANCHOR Private Methods
    /** Imports the tilesetLevels from the configs */
    private async importLevels(): Promise<number[]> {
        // Get the tileset levels
        const t1Levels = await this._getLevels(this.tileset1Offset, this.tileset1Length);
        const t2Levels = await this._getLevels(this.tileset2Offset, this.tileset2Length);

        return [...t1Levels, ...t2Levels];
    }

    /** Saves the tileset levels to json and updates the configs */
    private async exportLevels(): Promise<void> {
        // Get the tileset levels from the editor
        const tilesetLevels = this.$blocks.levels;
        // Divide the two tilsets based on the lengths
        const t1Levels = tilesetLevels.slice(0, this.tileset1Length);
        const t2Levels = tilesetLevels.slice(this.tileset1Length, this.tileset1Length + this.tileset2Length);
        // Convert the levels to a string
        const t1LevelChars = this._encodeLevels(t1Levels);
        const t2LevelChars = this._encodeLevels(t2Levels);
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

    /** Returns the tileset levels for the specified tileset. 
     * Uses the length to create a new one in case it doesn't exist yet */
    private async _getLevels(tilesetOffset: number, tilesetLength: number): Promise<Uint16Array> {
        const levelChars = get(config).tileset_levels[tilesetOffset];

        // If you can't find the levelChars, return a list of null as long as the tileset
        if (levelChars === undefined) {
            // Update the configs with the new tileset levels
            config.update(config => {
                config.tileset_levels[tilesetOffset] = "";
                return config;
            });
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

    /** Encodes the levels array into a more space-efficient string */
    private _encodeLevels(levels: Uint16Array): string {
        let encodedString = "";
        /** Number of NULL permissions you've encountered.
         * If the tileset ends with NULLs, they last NULLs are not encoded
         */
        let nullsEncountered = 0;

        for (const level of levels) {
            if (level === NULL) {
                nullsEncountered++;
                continue;
            }
            else {
                // Add the nulls   
                encodedString += "=".repeat(nullsEncountered);
                nullsEncountered = 0;

                let compressedLevel = (level & 0xFF) * 2;
                if (level & 0x100)
                    compressedLevel++;

                if (compressedLevel === 29) encodedString += "/";
                else encodedString += String.fromCharCode(compressedLevel + 63);
            }
        }

        return encodedString;
    }
}