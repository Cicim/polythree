import MapEditor from "./MapEditor.svelte";
import { EditorContext } from "../systems/contexts";
import { openViews } from "src/systems/views";
import { redefineBindings } from "src/systems/bindings";

export interface MapEditorProperties {
    group: number;
    index: number;
}

export interface MapEditorData {
    name: string;
    width: number;
    height: number;
    tileset: number;
    tilemap: number[][];
};

export class MapEditorContext extends EditorContext {
    public name = "Map Editor";
    public singularTab = true;
    declare public identifier: MapEditorProperties;
    declare public component: MapEditor;

    public _cosmeticHasSideTabs = true;

    public async save(): Promise<boolean> {
        if (this.startSaving()) return;
        // Wait 1 seconds
        await new Promise(resolve => setTimeout(resolve, 1000));

        return this.doneSaving();
    }

    public async load() {
        this.isLoading.set(true);
        this._cosmeticHasSideTabs = false;

        this.data.set({});

        // Update the cosmetics
        this._cosmeticHasSideTabs = true;
        // Trigger a re-render
        openViews.update(views => views);
        this.isLoading.set(false);
    }

    public onSelect = () => {
    }
    public onDeselect = () => {
    }

    public constructor(id: MapEditorProperties) {
        // Create the editor element
        super(MapEditor, { ...id });
        this.subtitle.set(id.group + "." + id.index);
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