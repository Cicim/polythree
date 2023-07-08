import MapEditor from "./MapEditor.svelte";
import { EditorContext } from "../systems/contexts";
import { Bindings } from "src/systems/bindings";
import { openViews } from "src/systems/views";

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

    public actions = {
        "map_editor/select_layout": () => {
            this.component.selectLayoutEditor();
        },
        "map_editor/select_level": () => {
            this.component.selectLevelEditor();
        },
        "map_editor/select_scripts": () => {
            this.component.selectScriptsEditor();
        },
        "map_editor/select_encounters": () => {
            this.component.selectEncountersEditor();
        },
        "map_editor/select_connections": () => {
            this.component.selectConnectionsEditor();
        },
        "map_editor/select_header": () => {
            this.component.selectHeaderEditor();
        },
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

        this.data.set({});

        // Update the cosmetics
        this._cosmeticHasSideTabs = true;
        // Trigger a re-render
        openViews.update(views => views);
        this.isLoading.set(false);
    }

    public onSelect = () => {
        const binding = this.component.getActiveBinding();
        if (!binding) return;
        Bindings.register(binding);
    }
    public onDeselect = () => {
        const binding = this.component.getActiveBinding();
        Bindings.unregister(binding);
    }

    public constructor(id: MapEditorProperties) {
        // Create the editor element
        super(MapEditor, { ...id });
        this.subtitle.set(id.group + "." + id.index);
    }
}