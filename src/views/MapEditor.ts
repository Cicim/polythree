import MapEditor from "./MapEditor.svelte";
import { TabbedEditorContext } from "../systems/contexts";
import { openViews } from "src/systems/views";
import { redefineBindings } from "src/systems/bindings";
import type { Writable } from "svelte/store";
import { spawnDialog } from "src/systems/dialogs";
import AlertDialog from "src/components/dialog/AlertDialog.svelte";
import { invoke } from "@tauri-apps/api";

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
    // Unknown
}


export interface MapEditorData {
    header: MapHeaderData,
    layout?: MapLayoutData,
    tilesets?: [HTMLImageElement, HTMLImageElement][],
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
        const layoutData = await this.loadLayoutUntilValid(headerData.header.map_layout_id);
        if (layoutData === null) {
            // If the user asked to quit, close the editor
            this.isLoading.set(false);
            this.close();
            return;
        }

        this.data.set({ header: headerData, layout: layoutData });


        // Update the cosmetics
        this._cosmeticHasSideTabs = true;
        // Trigger a re-render
        openViews.update(views => views);
        this.isLoading.set(false);
    }

    /** Ask the user for a layout until that layout is valid for this map */
    private async loadLayoutUntilValid(id?: number): Promise<MapLayoutData> {
        while (true) {
            try {
                return await invoke('get_map_layout_data', { id });
            }
            catch (message) {
                // Spawn a dialog asking the user to select a layout
                // TODO Replace AlertDialog with a custom dialog
                const layoutId = await spawnDialog(AlertDialog, {
                    title: "Cannot load layout",
                    message: message + "\nUsing 1",
                });

                // If the user asked to quit, close the editor
                if (layoutId === null) {
                    return null;
                }

                // Try again with the new layout id
                id = 1;
            }
        }
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