import { EditorChanges } from "src/systems/changes";
import { spawnErrorDialog } from "src/components/dialog/ErrorDialog.svelte";
import type { MapEditorContext } from "src/views/MapEditor";
import { get, writable, type Writable } from "svelte/store";
import { BlocksData, NULL_METATILE, NULL_PERMISSION } from "../editor/blocks_data";
import type MapCanvas from "../editor/MapCanvas.svelte";
import { config } from "src/systems/global";
import { invoke, RustFn } from "src/systems/invoke";
import { PaletteMaterial } from "../editor/materials";

export class PaletteModule {
    private context: MapEditorContext;

    /** Length of the two tilesets (might not be a multiple of 8) */
    public fullLength: number;
    /** The block data for the tileset permission editor */
    public blocks: Writable<BlocksData> = writable(null);
    /** The reference to the MapCanvas for the tilesetBlocks */
    public mapCanvas: Writable<MapCanvas> = writable(null);
    /** The changes that are applied to the tileset permission editor */
    public changes: EditorChanges;
    // Keybindings callbacks
    public moveCB: (dirX: number, dirY: number, select: boolean) => void = () => { };
    /** The number of blocks at the end that are not in the tileset */
    public lastRowLength: number;

    /** If the palette is currently loading */
    public loading: Writable<boolean> = writable(false);

    // ANCHOR Main Methods
    constructor(context: MapEditorContext) {
        this.context = context;
    }

    public async load(metatilesLength: number) {
        this.loading.set(true);
        // Get the permissions for these tilesets from config
        const importedTilesetPermissions = await this.importPermissions();
        // Compose the block data for the tileset permission editor
        this.fullLength = metatilesLength;
        const tilesetBlocks = new BlocksData(8, Math.ceil(this.fullLength / 8))
        // Set the blockData for the tilesets to be the ascending number of tiles 
        // with the permissions you've read from the configs
        for (let y = 0; y < tilesetBlocks.height; y++) {
            for (let x = 0; x < 8; x++)
                tilesetBlocks.set(x, y, y * 8 + x, importedTilesetPermissions[y * 8 + x]);
        }

        // Set the removed tiles number
        this.lastRowLength = this.fullLength % 8;
        // Set the tiles after the last block in the last row to null
        if (this.lastRowLength !== 0)
            for (let x = this.lastRowLength; x < 8; x++)
                tilesetBlocks.set(x, tilesetBlocks.height - 1, NULL_METATILE, NULL_PERMISSION);

        // Update the blocks
        this.blocks.set(tilesetBlocks);
        this.mapCanvas.set(null);
        this.changes = new EditorChanges(null);
        this.loading.set(false);
    }

    public async save() {
        if (get(this.changes.unsaved)) {
            try {
                await this.exportPermissions();
            }
            catch (e) {
                await spawnErrorDialog(e, "Error while saving the Tilesets' Permissions");
            }
        }

    }

    // ANCHOR Secondary Methods
    public getMetatileZeroBrush(): PaletteMaterial {
        return new PaletteMaterial(new BlocksData(1, 1, ...this.$blocks.get(0, 0)));
    }
    public tryToRebuildPermissions() {
        this.$mapCanvas?.rebuildPermissions();
    }
    public undoChanges() {
        this.changes.undo();
    }
    public redoChanges() {
        this.changes.redo();
    }
    public move(dirX: number, dirY: number, select: boolean) {
        const tab = get(this.context.selectedTab);
        if (tab !== "layout" && tab !== "permissions") return;

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

        // Update each mapEditor with the correct portion of the permissions
        for (const view of viewsSharingBothTilesets) {
            view.palette.blocks.update((blocksData: BlocksData) => {
                blocksData.updatePermissions(blocks.permissions);
                return blocksData;
            });
        }
        for (const view of viewsSharingPrimaryTileset) {
            view.palette.blocks.update((blocksData: BlocksData) => {
                blocksData.updatePermissions(blocks.permissions, 0, view.tileset1Length);
                return blocksData;
            });
        }
        for (const view of viewsSharingSecondaryTileset) {
            view.palette.blocks.update((blocksData: BlocksData) => {
                blocksData.updatePermissions(
                    blocks.permissions,
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
    /** Imports the tilesetPermissions from the configs */
    private async importPermissions(): Promise<number[]> {
        // Get the tileset permissions
        const t1Permissions = await this._getPermissions(this.tileset1Offset, this.tileset1Length);
        const t2Permission = await this._getPermissions(this.tileset2Offset, this.tileset2Length);

        return [...t1Permissions, ...t2Permission];
    }

    /** Saves the tileset permissions to json and updates the configs */
    private async exportPermissions(): Promise<void> {
        // Get the tileset permissions from the editor
        const tilesetPermissions = this.$blocks.permissions;
        // Divide the two tilsets based on the lengths
        const t1Permissions = tilesetPermissions.slice(0, this.tileset1Length);
        const t2Permission = tilesetPermissions.slice(this.tileset1Length, this.tileset1Length + this.tileset2Length);
        // Convert the permissions to a string
        const t1PermissionChars = this._encodePermissions(t1Permissions);
        const t2PermissionChars = this._encodePermissions(t2Permission);
        // Update the configs with the new tileset permissions
        config.update(config => {
            config.tileset_levels[this.tileset1Offset] = t1PermissionChars;
            config.tileset_levels[this.tileset2Offset] = t2PermissionChars;
            return config;
        });
        // Update the tileset the configs jsons too
        await invoke(RustFn.update_tileset_level, { tileset: this.tileset1Offset, levels: t1PermissionChars });
        await invoke(RustFn.update_tileset_level, { tileset: this.tileset2Offset, levels: t2PermissionChars });
    }

    /** Returns the tileset permissions for the specified tileset. 
     * Uses the length to create a new one in case it doesn't exist yet */
    private async _getPermissions(tilesetOffset: number, tilesetLength: number): Promise<Uint8Array> {
        const permissionEncodedString = get(config).tileset_levels[tilesetOffset];

        // If you can't find the levelChars, return a list of null as long as the tileset
        if (permissionEncodedString === undefined) {
            return new Uint8Array(tilesetLength).fill(NULL_PERMISSION);
        }
        // Otherwise, read the data from the levelChars
        else {
            const data = new Uint8Array(tilesetLength).fill(NULL_PERMISSION);

            for (let i = 0; i < permissionEncodedString.length; i++) {
                const char = permissionEncodedString[i];
                if (char === "=") data[i] = NULL_PERMISSION;
                else {
                    data[i] = permissionEncodedString.charCodeAt(i) - 63;
                }
            }

            return data;
        }
    }

    /** Encodes the permissions array into a more space-efficient string */
    private _encodePermissions(permissions: Uint8Array): string {
        let encodedString = "";
        /** Number of NULL permissions you've encountered.
         * If the tileset ends with NULLs, they last NULLs are not encoded
         */
        let nullsEncountered = 0;

        for (const perm of permissions) {
            if (perm === NULL_PERMISSION) {
                nullsEncountered++;
                continue;
            }
            else {
                // Add the nulls   
                encodedString += "=".repeat(nullsEncountered);
                nullsEncountered = 0;

                encodedString += String.fromCharCode(perm + 63);
            }
        }

        return encodedString;
    }
}