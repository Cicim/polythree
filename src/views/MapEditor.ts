import MapEditor from "./MapEditor.svelte";
import { EditorContext } from "../systems/contexts";
import { Bindings } from "src/systems/bindings";

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

    public actions = {
        "map_editor/print_group": () => {
            console.log("Printing group", this.identifier.group);
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
        this.data.set({});
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
    }
}