import MapEditor from "./MapEditor.svelte";
import { TabbedEditorContext } from "../systems/contexts";
import { openViews } from "src/systems/views";
import { redefineBindings } from "src/systems/bindings";
import { get, type Writable } from "svelte/store";
import { spawnDialog } from "src/systems/dialogs";
import AlertDialog from "src/components/dialog/AlertDialog.svelte";
import { invoke } from "@tauri-apps/api";
import LayoutPickerDialog from "./MapEditor/dialogs/LayoutPickerDialog.svelte";
import { getPtrOffset } from "src/systems/rom";
import TilesetPickerDialog from "./MapEditor/dialogs/TilesetPickerDialog.svelte";
import { config } from "src/systems/global";

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
    map_data: number[][];
    border_data: number[][];
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


    constructor(id: MapEditorProperties) {
        // Create the editor element
        super(MapEditor, { ...id });
        this.subtitle.set(id.group + "." + id.index);
        this.selectedTab.set("layout");
    }
}

redefineBindings({
    "map_editor/select_layout": (view: MapEditorContext) => {
        view.component.selectLayoutEditor();
    },
    "map_editor/select_level": (view: MapEditorContext) => {
        view.component.selectLevelEditor();
    },
    "map_editor/select_scripts": (view: MapEditorContext) => {
        view.component.selectScriptsEditor();
    },
    "map_editor/select_encounters": (view: MapEditorContext) => {
        view.component.selectEncountersEditor();
    },
    "map_editor/select_connections": (view: MapEditorContext) => {
        view.component.selectConnectionsEditor();
    },
    "map_editor/select_header": (view: MapEditorContext) => {
        view.component.selectHeaderEditor();
    },

});